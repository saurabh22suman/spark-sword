"""Tests for DuckDB storage service.

These tests validate:
- Database schema creation
- Event log storage
- Data retrieval
- Query operations for analysis
"""

import pytest

from app.models.spark_events import (
    JobInfo,
    ParsedEventLog,
    StageInfo,
    TaskInfo,
)
from app.services.duckdb_service import DuckDBService


@pytest.fixture
def db_service() -> DuckDBService:
    """Create an in-memory DuckDB service."""
    service = DuckDBService()
    yield service
    service.close()


@pytest.fixture
def sample_parsed_log() -> ParsedEventLog:
    """Create a sample parsed event log for testing."""
    return ParsedEventLog(
        application_id="app-test-001",
        application_name="TestApplication",
        spark_version="3.5.0",
        start_time=1704110400000,
        end_time=1704110500000,
        jobs=[
            JobInfo(
                job_id=0,
                submission_time=1704110401000,
                completion_time=1704110450000,
                status="SUCCEEDED",
                stage_ids=[0, 1],
            ),
        ],
        stages=[
            StageInfo(
                stage_id=0,
                attempt_id=0,
                name="map at analysis.py:10",
                num_tasks=100,
                parent_ids=[],
                status="SUCCEEDED",
                submission_time=1704110402000,
                completion_time=1704110420000,
                input_bytes=1000000000,  # 1GB
                output_bytes=500000000,  # 500MB
                shuffle_read_bytes=0,
                shuffle_write_bytes=200000000,  # 200MB
                spill_bytes=0,
            ),
            StageInfo(
                stage_id=1,
                attempt_id=0,
                name="reduce at analysis.py:20",
                num_tasks=50,
                parent_ids=[0],
                status="SUCCEEDED",
                submission_time=1704110421000,
                completion_time=1704110445000,
                input_bytes=0,
                output_bytes=100000000,  # 100MB
                shuffle_read_bytes=200000000,  # 200MB
                shuffle_write_bytes=0,
                spill_bytes=50000000,  # 50MB spill
            ),
        ],
        tasks=[
            TaskInfo(
                task_id=0,
                stage_id=0,
                attempt=0,
                executor_id="exec-1",
                host="worker-1",
                status="SUCCEEDED",
                launch_time=1704110402500,
                finish_time=1704110410000,
                duration_ms=7500,
                input_bytes=10000000,
                output_bytes=5000000,
                shuffle_read_bytes=0,
                shuffle_write_bytes=2000000,
                spill_bytes=0,
            ),
            TaskInfo(
                task_id=1,
                stage_id=0,
                attempt=0,
                executor_id="exec-2",
                host="worker-2",
                status="SUCCEEDED",
                launch_time=1704110402500,
                finish_time=1704110415000,
                duration_ms=12500,  # Slower task
                input_bytes=20000000,  # 2x input
                output_bytes=10000000,
                shuffle_read_bytes=0,
                shuffle_write_bytes=4000000,
                spill_bytes=0,
            ),
        ],
        total_events=15,
        unknown_events=0,
    )


class TestDuckDBSchemaCreation:
    """Tests for database schema initialization."""

    def test_schema_creates_all_tables(self, db_service: DuckDBService) -> None:
        """All required tables should be created on initialization."""
        tables = db_service.conn.execute(
            "SELECT table_name FROM information_schema.tables WHERE table_schema = 'main'"
        ).fetchall()
        table_names = {t[0] for t in tables}

        assert "applications" in table_names
        assert "jobs" in table_names
        assert "stages" in table_names
        assert "tasks" in table_names
        assert "stage_dependencies" in table_names


class TestEventLogStorage:
    """Tests for storing event logs."""

    def test_store_event_log_returns_app_id(
        self, db_service: DuckDBService, sample_parsed_log: ParsedEventLog
    ) -> None:
        """Storing an event log should return the application ID."""
        app_id = db_service.store_event_log(sample_parsed_log)
        assert app_id == "app-test-001"

    def test_store_event_log_without_app_id_raises_error(
        self, db_service: DuckDBService
    ) -> None:
        """Storing a log without app ID should raise ValueError."""
        log = ParsedEventLog(
            application_id=None,
            application_name=None,
            total_events=0,
        )
        with pytest.raises(ValueError, match="application ID"):
            db_service.store_event_log(log)

    def test_stored_application_retrievable(
        self, db_service: DuckDBService, sample_parsed_log: ParsedEventLog
    ) -> None:
        """Stored application info should be retrievable."""
        db_service.store_event_log(sample_parsed_log)
        app = db_service.get_application("app-test-001")

        assert app is not None
        assert app["name"] == "TestApplication"
        assert app["spark_version"] == "3.5.0"
        assert app["start_time"] == 1704110400000
        assert app["end_time"] == 1704110500000

    def test_stored_jobs_retrievable(
        self, db_service: DuckDBService, sample_parsed_log: ParsedEventLog
    ) -> None:
        """Stored jobs should be retrievable."""
        db_service.store_event_log(sample_parsed_log)
        jobs = db_service.get_jobs("app-test-001")

        assert len(jobs) == 1
        assert jobs[0]["job_id"] == 0
        assert jobs[0]["status"] == "SUCCEEDED"
        assert jobs[0]["num_stages"] == 2

    def test_stored_stages_retrievable(
        self, db_service: DuckDBService, sample_parsed_log: ParsedEventLog
    ) -> None:
        """Stored stages should be retrievable with metrics."""
        db_service.store_event_log(sample_parsed_log)
        stages = db_service.get_stages("app-test-001")

        assert len(stages) == 2

        # Check first stage
        stage0 = stages[0]
        assert stage0["name"] == "map at analysis.py:10"
        assert stage0["num_tasks"] == 100
        assert stage0["shuffle_write_bytes"] == 200000000

        # Check second stage
        stage1 = stages[1]
        assert stage1["name"] == "reduce at analysis.py:20"
        assert stage1["shuffle_read_bytes"] == 200000000
        assert stage1["spill_bytes"] == 50000000

    def test_stored_tasks_retrievable(
        self, db_service: DuckDBService, sample_parsed_log: ParsedEventLog
    ) -> None:
        """Stored tasks should be retrievable."""
        db_service.store_event_log(sample_parsed_log)
        tasks = db_service.get_tasks("app-test-001")

        assert len(tasks) == 2
        assert tasks[0]["executor_id"] == "exec-1"
        assert tasks[1]["executor_id"] == "exec-2"

    def test_get_tasks_filtered_by_stage(
        self, db_service: DuckDBService, sample_parsed_log: ParsedEventLog
    ) -> None:
        """Tasks should be filterable by stage ID."""
        db_service.store_event_log(sample_parsed_log)
        tasks = db_service.get_tasks("app-test-001", stage_id=0)

        assert len(tasks) == 2
        assert all(t["stage_id"] == 0 for t in tasks)


class TestDuckDBQueries:
    """Tests for analytical queries."""

    def test_query_stage_shuffle_stats(
        self, db_service: DuckDBService, sample_parsed_log: ParsedEventLog
    ) -> None:
        """Shuffle statistics query should return correct data."""
        db_service.store_event_log(sample_parsed_log)
        stats = db_service.query_stage_shuffle_stats("app-test-001")

        assert len(stats) == 2

        # Stage 0 is a shuffle producer
        stage0 = stats[0]
        assert stage0["shuffle_write_bytes"] == 200000000
        assert stage0["role"] == "shuffle_producer"

        # Stage 1 is a shuffle consumer
        stage1 = stats[1]
        assert stage1["shuffle_read_bytes"] == 200000000
        assert stage1["consumer_role"] == "shuffle_consumer"

    def test_query_task_skew(
        self, db_service: DuckDBService, sample_parsed_log: ParsedEventLog
    ) -> None:
        """Task skew query should calculate correct metrics."""
        db_service.store_event_log(sample_parsed_log)
        skew = db_service.query_task_skew("app-test-001", stage_id=0)

        assert skew["task_count"] == 2
        assert skew["min_duration"] == 7500
        assert skew["max_duration"] == 12500
        # avg = (7500 + 12500) / 2 = 10000
        assert skew["avg_duration"] == 10000
        # skew_ratio = 12500 / 10000 = 1.25
        assert skew["skew_ratio"] == 1.25


class TestDuckDBNonExistent:
    """Tests for handling non-existent data."""

    def test_get_nonexistent_application(self, db_service: DuckDBService) -> None:
        """Getting non-existent application should return None."""
        app = db_service.get_application("non-existent-app")
        assert app is None

    def test_get_jobs_empty_application(self, db_service: DuckDBService) -> None:
        """Getting jobs for non-existent application returns empty list."""
        jobs = db_service.get_jobs("non-existent-app")
        assert jobs == []
