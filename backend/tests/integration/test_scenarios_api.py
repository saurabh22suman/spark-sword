"""Integration tests for Scenario API endpoints.

Tests:
- GET /scenarios - List all scenarios
- GET /scenarios/{id} - Get specific scenario with simulation
- 404 for unknown scenario
"""

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client():
    """Test client for API testing."""
    return TestClient(app)


class TestListScenarios:
    """Tests for GET /scenarios endpoint."""

    def test_returns_list_of_scenarios(self, client):
        """GET /scenarios returns list of all scenarios."""
        response = client.get("/api/scenarios/")
        
        assert response.status_code == 200
        scenarios = response.json()
        
        # Should have all 24 built-in scenarios (5 original + 7 new + 12 production)
        assert len(scenarios) == 24
        
    def test_scenarios_have_required_fields(self, client):
        """Each scenario has required summary fields."""
        response = client.get("/api/scenarios/")
        scenarios = response.json()
        
        for scenario in scenarios:
            assert "id" in scenario
            assert "title" in scenario
            assert "level" in scenario
            assert "spark_concepts" in scenario
            assert "real_world_context" in scenario
            
    def test_includes_expected_scenario_ids(self, client):
        """Scenarios include all required IDs (original 5 + 7 new + 12 production)."""
        response = client.get("/api/scenarios/")
        scenarios = response.json()
        
        ids = {s["id"] for s in scenarios}
        # Original 5 scenarios
        original_ids = {
            "simple_filter",
            "groupby_aggregation",
            "join_without_broadcast",
            "skewed_join_key",
            "too_many_output_files",
        }
        # New 7 scenarios per scenario-dag-spec.md Part B
        new_ids = {
            "multi_step_etl",
            "pre_aggregation_join",
            "window_function",
            "skewed_aggregation",
            "star_schema_join",
            "write_amplification",
            "union_aggregation",
        }
        # 12 production pain point scenarios
        production_ids = {
            "small-files-explosion",
            "broadcast-hint-backfire",
            "aqe-mystery",
            "cache-oom",
            "window-function-skew",
            "partition-sizing-tradeoffs",
            "distinct-vs-groupby-dedup",
            "salted-join",
            "multiple-shuffles-sequence",
            "coalesce-before-write",
            "dynamic-partition-overwrite",
            "explode-join-trap",
        }
        expected_ids = original_ids | new_ids | production_ids
        
        assert ids == expected_ids
        
    def test_level_values_are_valid(self, client):
        """Scenario levels are BASIC or INTERMEDIATE (no ADVANCED per spec)."""
        response = client.get("/api/scenarios/")
        scenarios = response.json()
        
        valid_levels = {"basic", "intermediate"}
        for scenario in scenarios:
            assert scenario["level"] in valid_levels


class TestGetScenario:
    """Tests for GET /scenarios/{id} endpoint."""
    
    def test_returns_scenario_with_simulation(self, client):
        """GET /scenarios/{id} returns scenario and simulation preview."""
        response = client.get("/api/scenarios/simple_filter")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "scenario" in data
        assert "simulation" in data
        
    def test_scenario_has_full_details(self, client):
        """Scenario response includes all detail fields."""
        response = client.get("/api/scenarios/simple_filter")
        data = response.json()
        
        scenario = data["scenario"]
        
        # All required fields from ScenarioDetail
        assert scenario["id"] == "simple_filter"
        assert "title" in scenario
        assert "level" in scenario
        assert "spark_concepts" in scenario
        assert "real_world_context" in scenario
        assert "story" in scenario
        assert "logical_operations" in scenario
        assert "expected_stages" in scenario
        assert "expected_shuffles" in scenario
        assert "expected_skew" in scenario
        assert "evidence_signals" in scenario
        assert "explanation_goal" in scenario
        assert "playground_defaults" in scenario
        
    def test_simulation_preview_has_required_fields(self, client):
        """Simulation preview includes metrics and explanations."""
        response = client.get("/api/scenarios/groupby_aggregation")
        data = response.json()
        
        simulation = data["simulation"]
        
        # Per spec - must include explanation fields
        assert "shuffle_bytes" in simulation
        assert "estimated_min_task_ms" in simulation
        assert "estimated_max_task_ms" in simulation
        assert "confidence" in simulation
        assert "spark_path_explanation" in simulation
        assert "dominant_factor" in simulation
        assert "notes" in simulation
        
    def test_filter_scenario_no_shuffle(self, client):
        """Simple filter scenario has no shuffle (narrows without exchange)."""
        response = client.get("/api/scenarios/simple_filter")
        data = response.json()
        
        scenario = data["scenario"]
        assert scenario["expected_shuffles"] == 0
        
        simulation = data["simulation"]
        assert simulation["shuffle_bytes"] == 0
        
    def test_groupby_scenario_has_shuffle(self, client):
        """GroupBy scenario correctly shows shuffle."""
        response = client.get("/api/scenarios/groupby_aggregation")
        data = response.json()
        
        scenario = data["scenario"]
        assert scenario["expected_shuffles"] == 1
        
        simulation = data["simulation"]
        assert simulation["shuffle_bytes"] > 0
        
    def test_join_scenario_has_shuffle(self, client):
        """Join without broadcast scenario has shuffle."""
        response = client.get("/api/scenarios/join_without_broadcast")
        data = response.json()
        
        scenario = data["scenario"]
        assert scenario["expected_shuffles"] >= 1
        
    def test_skewed_join_has_skew_flag(self, client):
        """Skewed join scenario is marked with expected_skew=True."""
        response = client.get("/api/scenarios/skewed_join_key")
        data = response.json()
        
        scenario = data["scenario"]
        assert scenario["expected_skew"] is True
        
        # Simulation should show skew via time variance
        simulation = data["simulation"]
        time_variance = simulation["estimated_max_task_ms"] - simulation["estimated_min_task_ms"]
        assert time_variance > 0  # Skew creates variance
        
    def test_unknown_scenario_returns_404(self, client):
        """Unknown scenario ID returns 404 with message."""
        response = client.get("/api/scenarios/unknown_scenario_xyz")
        
        assert response.status_code == 404
        data = response.json()
        assert "not found" in data["detail"].lower()


class TestScenarioPlaygroundDefaults:
    """Tests that playground defaults are correctly included."""
    
    def test_filter_scenario_defaults(self, client):
        """Filter scenario includes selectivity in defaults."""
        response = client.get("/api/scenarios/simple_filter")
        data = response.json()
        
        defaults = data["scenario"]["playground_defaults"]
        
        assert "rows" in defaults
        assert "selectivity" in defaults
        assert defaults["operation"] == "filter"
        
    def test_groupby_scenario_defaults(self, client):
        """GroupBy scenario includes num_groups in defaults."""
        response = client.get("/api/scenarios/groupby_aggregation")
        data = response.json()
        
        defaults = data["scenario"]["playground_defaults"]
        
        assert "rows" in defaults
        assert "num_groups" in defaults
        assert defaults["operation"] == "groupby"
        
    def test_join_scenario_defaults(self, client):
        """Join scenario includes right_rows in defaults."""
        response = client.get("/api/scenarios/join_without_broadcast")
        data = response.json()
        
        defaults = data["scenario"]["playground_defaults"]
        
        assert "rows" in defaults
        assert "right_rows" in defaults
        assert defaults["operation"] == "join"


class TestScenarioExplanationGoals:
    """Tests that scenarios include educational explanation goals."""
    
    def test_filter_explains_narrow_transformation(self, client):
        """Filter scenario goal explains narrow transformation."""
        response = client.get("/api/scenarios/simple_filter")
        data = response.json()
        
        goal = data["scenario"]["explanation_goal"]
        
        # Should teach about narrow/wide distinction
        assert any(word in goal.lower() for word in ["narrow", "partition", "shuffle"])
        
    def test_groupby_explains_shuffle(self, client):
        """GroupBy scenario goal explains shuffle."""
        response = client.get("/api/scenarios/groupby_aggregation")
        data = response.json()
        
        goal = data["scenario"]["explanation_goal"]
        
        assert "shuffle" in goal.lower()
        
    def test_skew_scenario_explains_imbalance(self, client):
        """Skewed join scenario goal explains data imbalance."""
        response = client.get("/api/scenarios/skewed_join_key")
        data = response.json()
        
        goal = data["scenario"]["explanation_goal"]
        
        assert any(word in goal.lower() for word in ["skew", "imbalance", "hot"])
