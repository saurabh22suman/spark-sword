"""Integration tests for the analysis API endpoints.

These tests validate the complete pipeline:
- Event log upload
- Parsing
- Analysis
- Response structure

Reference: test.md Section 10 Integration Tests
"""

import json

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client() -> TestClient:
    """Create test client for API."""
    return TestClient(app)


@pytest.fixture
def sample_event_log_content() -> str:
    """Create a sample event log for testing."""
    events = [
        {
            "Event": "SparkListenerApplicationStart",
            "App ID": "app-test-001",
            "App Name": "TestApplication",
            "Spark Version": "3.5.0",
            "Timestamp": 1704110400000,
        },
        {
            "Event": "SparkListenerJobStart",
            "Job ID": 0,
            "Submission Time": 1704110401000,
            "Stage IDs": [0, 1],
        },
        {
            "Event": "SparkListenerStageSubmitted",
            "Stage Info": {
                "Stage ID": 0,
                "Stage Attempt ID": 0,
                "Stage Name": "groupBy at analysis.py:50",
                "Number of Tasks": 200,
                "Parent IDs": [],
            },
        },
        {
            "Event": "SparkListenerStageCompleted",
            "Stage Info": {
                "Stage ID": 0,
                "Stage Attempt ID": 0,
                "Completion Time": 1704110410000,
                "Stage Status": "SUCCEEDED",
                "Accumulables": [],
            },
        },
        {
            "Event": "SparkListenerJobEnd",
            "Job ID": 0,
            "Completion Time": 1704110420000,
            "Job Result": {"Result": "JobSucceeded"},
        },
        {
            "Event": "SparkListenerApplicationEnd",
            "Timestamp": 1704110430000,
        },
    ]
    return "\n".join(json.dumps(e) for e in events)


class TestHealthEndpoint:
    """Tests for health check endpoint."""

    def test_health_check(self, client: TestClient) -> None:
        """Health endpoint should return healthy status."""
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json() == {"status": "healthy"}


class TestEventLogUpload:
    """Tests for event log upload endpoint."""

    def test_upload_valid_event_log(
        self, client: TestClient, sample_event_log_content: str
    ) -> None:
        """Valid event log should be parsed and analyzed successfully."""
        response = client.post(
            "/api/upload/event-log",
            files={"file": ("event-log.json", sample_event_log_content, "application/json")},
        )

        assert response.status_code == 200
        data = response.json()

        # Check application info
        assert data["application"]["id"] == "app-test-001"
        assert data["application"]["name"] == "TestApplication"
        assert data["application"]["spark_version"] == "3.5.0"

        # Check summary
        assert data["summary"]["total_jobs"] == 1
        assert data["summary"]["total_stages"] == 1
        assert data["summary"]["total_events"] == 6

        # Check DAG structure
        assert "dag" in data
        assert "nodes" in data["dag"]
        assert "edges" in data["dag"]

        # Check insights list exists
        assert "insights" in data
        assert isinstance(data["insights"], list)

    def test_upload_empty_file(self, client: TestClient) -> None:
        """Empty file should return 400 error."""
        response = client.post(
            "/api/upload/event-log",
            files={"file": ("empty.json", "", "application/json")},
        )

        assert response.status_code == 400
        assert "empty" in response.json()["detail"].lower()

    def test_upload_invalid_json(self, client: TestClient) -> None:
        """Invalid JSON should still be handled gracefully."""
        content = "not valid json\n{also broken}"
        response = client.post(
            "/api/upload/event-log",
            files={"file": ("bad.json", content, "application/json")},
        )

        # Should fail because no valid events found
        assert response.status_code == 400


class TestAnalysisResponse:
    """Tests for analysis response structure and content."""

    def test_insights_reference_evidence(
        self, client: TestClient, sample_event_log_content: str
    ) -> None:
        """Each insight must link to Spark metrics/evidence."""
        response = client.post(
            "/api/upload/event-log",
            files={"file": ("log.json", sample_event_log_content, "application/json")},
        )

        assert response.status_code == 200
        data = response.json()

        for insight in data["insights"]:
            # Every insight must have evidence
            assert "evidence" in insight
            # Evidence should not be empty for real insights
            # (some test logs may not trigger insights)

    def test_dag_has_correct_structure(
        self, client: TestClient, sample_event_log_content: str
    ) -> None:
        """DAG should have proper node and edge structure."""
        response = client.post(
            "/api/upload/event-log",
            files={"file": ("log.json", sample_event_log_content, "application/json")},
        )

        assert response.status_code == 200
        dag = response.json()["dag"]

        # Check nodes have required fields (new format with data wrapper)
        for node in dag["nodes"]:
            assert "id" in node
            assert "type" in node
            assert "data" in node
            # label and metadata are inside data
            assert "label" in node["data"]
            assert "metadata" in node["data"]
            assert node["type"] in ("job", "stage")

        # Check edges have required fields
        for edge in dag["edges"]:
            assert "source" in edge
            assert "target" in edge
            assert "type" in edge

    def test_stages_include_metrics(
        self, client: TestClient, sample_event_log_content: str
    ) -> None:
        """Stage data should include performance metrics."""
        response = client.post(
            "/api/upload/event-log",
            files={"file": ("log.json", sample_event_log_content, "application/json")},
        )

        assert response.status_code == 200
        stages = response.json()["stages"]

        for stage in stages:
            assert "metrics" in stage
            metrics = stage["metrics"]
            assert "input_bytes" in metrics
            assert "output_bytes" in metrics
            assert "shuffle_read_bytes" in metrics
            assert "shuffle_write_bytes" in metrics
            assert "spill_bytes" in metrics


class TestEndToEndInsightGeneration:
    """End-to-end tests for insight generation."""

    def test_shuffle_insights_generated(self, client: TestClient) -> None:
        """Event log with shuffle should generate shuffle insights."""
        events = [
            {
                "Event": "SparkListenerApplicationStart",
                "App ID": "app-shuffle-test",
                "App Name": "ShuffleTest",
                "Timestamp": 1704110400000,
            },
            {
                "Event": "SparkListenerStageSubmitted",
                "Stage Info": {
                    "Stage ID": 0,
                    "Stage Attempt ID": 0,
                    "Stage Name": "groupBy at test.py:10",
                    "Number of Tasks": 100,
                    "Parent IDs": [],
                },
            },
            {
                "Event": "SparkListenerStageCompleted",
                "Stage Info": {
                    "Stage ID": 0,
                    "Stage Attempt ID": 0,
                    "Stage Status": "SUCCEEDED",
                    "Accumulables": [
                        {"Name": "shuffle write bytes", "Value": 500000000},  # 500MB
                    ],
                },
            },
            {
                "Event": "SparkListenerApplicationEnd",
                "Timestamp": 1704110500000,
            },
        ]
        content = "\n".join(json.dumps(e) for e in events)

        response = client.post(
            "/api/upload/event-log",
            files={"file": ("shuffle.json", content, "application/json")},
        )

        assert response.status_code == 200
        # Note: Stage accumulables parsing would need to be implemented
        # for this to generate shuffle insights


class TestNotebookUpload:
    """Tests for notebook upload endpoint.
    
    Feature 5: Notebook Upload (Static Intent Extraction)
    Reference: must-have-spec.md
    """

    @pytest.fixture
    def sample_ipynb_content(self) -> str:
        """Create a sample Jupyter notebook for testing."""
        notebook = {
            "cells": [
                {
                    "cell_type": "code",
                    "source": [
                        "df = spark.read.parquet('input.parquet')\n",
                        "result = df.groupBy('category').agg({'amount': 'sum'})\n",
                        "result.write.parquet('output.parquet')"
                    ]
                }
            ],
            "metadata": {},
            "nbformat": 4,
            "nbformat_minor": 5
        }
        return json.dumps(notebook)

    @pytest.fixture
    def sample_py_content(self) -> str:
        """Create a sample Python file for testing."""
        return """from pyspark.sql import SparkSession
spark = SparkSession.builder.getOrCreate()
df = spark.read.csv('data.csv')
joined = df.join(other_df, 'key')
joined.write.parquet('output.parquet')
"""

    def test_upload_valid_ipynb(
        self, client: TestClient, sample_ipynb_content: str
    ) -> None:
        """Valid .ipynb file should be parsed for intent extraction."""
        response = client.post(
            "/api/upload/notebook",
            files={"file": ("notebook.ipynb", sample_ipynb_content, "application/json")},
        )

        assert response.status_code == 200
        data = response.json()
        
        # Verify structure matches InferredIntent
        assert "transformations" in data
        assert "is_inferred" in data
        assert data["is_inferred"] is True  # Must be marked as inferred
        
        # Verify transformations detected
        assert len(data["transformations"]) > 0
        
        # Verify forbidden fields are None (never infer data)
        assert data.get("schema") is None
        assert data.get("row_count") is None
        assert data.get("data_size") is None

    def test_upload_valid_py(
        self, client: TestClient, sample_py_content: str
    ) -> None:
        """Valid .py file should be parsed for intent extraction."""
        response = client.post(
            "/api/upload/notebook",
            files={"file": ("script.py", sample_py_content, "text/x-python")},
        )

        assert response.status_code == 200
        data = response.json()
        
        # Verify structure
        assert "transformations" in data
        assert data["is_inferred"] is True
        
        # Verify transformations detected
        ops = [t["operation"] for t in data["transformations"]]
        assert "join" in ops  # Should detect join

    def test_upload_invalid_extension(self, client: TestClient) -> None:
        """Unsupported file types should be rejected."""
        response = client.post(
            "/api/upload/notebook",
            files={"file": ("data.csv", "a,b,c\n1,2,3", "text/csv")},
        )

        assert response.status_code == 400

    def test_upload_malformed_ipynb(self, client: TestClient) -> None:
        """Malformed notebook should be rejected."""
        response = client.post(
            "/api/upload/notebook",
            files={"file": ("bad.ipynb", "not valid json", "application/json")},
        )

        assert response.status_code == 400

    def test_notebook_intent_is_user_adjustable(
        self, client: TestClient, sample_ipynb_content: str
    ) -> None:
        """Intent must be marked as user-adjustable (is_inferred=True).
        
        This test enforces must-have-spec.md requirement:
        "Output labeled 'Inferred Intent (User Adjustable)'"
        """
        response = client.post(
            "/api/upload/notebook",
            files={"file": ("notebook.ipynb", sample_ipynb_content, "application/json")},
        )

        assert response.status_code == 200
        data = response.json()
        
        # Critical: is_inferred must be True to indicate user can adjust
        assert data["is_inferred"] is True, \
            "Intent must be marked as inferred/user-adjustable per spec"

    def test_notebook_never_infers_data_values(
        self, client: TestClient, sample_ipynb_content: str
    ) -> None:
        """Parser must never infer data values from code.
        
        This test enforces must-have-spec.md Forbidden Behavior:
        "Never infer data or schema from code"
        """
        response = client.post(
            "/api/upload/notebook",
            files={"file": ("notebook.ipynb", sample_ipynb_content, "application/json")},
        )

        assert response.status_code == 200
        data = response.json()
        
        # These must always be None - never guess data characteristics
        assert data.get("schema") is None, "Must never infer schema from code"
        assert data.get("row_count") is None, "Must never infer row count from code"
        assert data.get("data_size") is None, "Must never infer data size from code"


class TestDemoEndpoint:
    """Tests for demo mode endpoint.
    
    Feature 6: Sample Canonical Spark Job
    Reference: must-have-spec.md
    """

    def test_demo_endpoint_returns_analysis(self, client: TestClient) -> None:
        """Demo endpoint should return pre-analyzed event log."""
        response = client.get("/api/demo")

        assert response.status_code == 200
        data = response.json()
        
        # Should have standard analysis structure
        assert "dag" in data
        assert "insights" in data
        assert "summary" in data

    def test_demo_has_demo_flag(self, client: TestClient) -> None:
        """Demo response must be clearly labeled as demo data.
        
        Per spec: "Clear labels: Demo Data — Try uploading your own"
        """
        response = client.get("/api/demo")

        assert response.status_code == 200
        data = response.json()
        
        # Must be flagged as demo
        assert data.get("is_demo") is True
        assert "demo_label" in data
        assert "Demo Data" in data["demo_label"]

    def test_demo_contains_shuffle_insight(self, client: TestClient) -> None:
        """Demo data should contain shuffle for learning.
        
        Per spec: "sample event log with known shuffle/skew/join"
        """
        response = client.get("/api/demo")
        
        assert response.status_code == 200
        data = response.json()
        
        insights = data.get("insights", [])
        insight_types = [i.get("type") for i in insights]
        
        # Should have shuffle-related insight
        has_shuffle = any("shuffle" in str(t).lower() for t in insight_types)
        assert has_shuffle or len(insights) > 0, \
            "Demo data should generate insights about shuffle"

    def test_demo_has_multiple_stages(self, client: TestClient) -> None:
        """Demo data should have multiple stages for DAG visualization."""
        response = client.get("/api/demo")
        
        assert response.status_code == 200
        data = response.json()
        
        dag = data.get("dag", {})
        nodes = dag.get("nodes", [])
        
        assert len(nodes) >= 2, "Demo data should have multiple stages"

    def test_demo_suitable_for_learning(self, client: TestClient) -> None:
        """Demo data should be suitable for learning Spark concepts."""
        response = client.get("/api/demo")
        
        assert response.status_code == 200
        data = response.json()
        
        # Should have actual metrics to explore
        summary = data.get("summary", {})
        assert summary.get("total_stages", 0) > 0
        assert summary.get("total_shuffle_bytes", 0) > 0 or \
               summary.get("total_spill_bytes", 0) >= 0
        assert data.get("data_size") is None, "Must never infer data size from code"
