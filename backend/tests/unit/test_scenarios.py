"""Tests for Real-Life Scenario System.

Per real-life-scenario-spec.md, scenarios are teaching artifacts that help users understand:
- "Why did Spark create this stage?"
- "Why did this shuffle happen?"
- "Why is this job slow even though the code looks simple?"

Testing Requirements (from spec Section 7):
- Snapshot test for DAG shape
- Assertion on shuffle presence/absence
- Explanation text verification
"""

import pytest
from app.scenarios import (
    Scenario,
    ScenarioLevel,
    ScenarioRegistry,
    get_scenario_by_id,
    list_scenarios,
)


class TestScenarioModel:
    """Tests for the Scenario data model."""

    def test_scenario_has_required_metadata(self) -> None:
        """Scenario must have all required metadata fields."""
        scenario = Scenario(
            id="simple_filter",
            title="Simple Filter",
            level=ScenarioLevel.BASIC,
            spark_concepts=["narrow_transformation"],
            real_world_context="Filtering valid records from a large dataset",
            story="You need to filter out invalid records before processing.",
            logical_operations=["read", "filter", "write"],
            expected_stages=1,
            expected_shuffles=0,
            evidence_signals=["task_duration"],
            explanation_goal="Filters do not require data movement.",
        )
        
        assert scenario.id == "simple_filter"
        assert scenario.title == "Simple Filter"
        assert scenario.level == ScenarioLevel.BASIC
        assert "narrow_transformation" in scenario.spark_concepts
    
    def test_scenario_level_must_be_basic_or_intermediate(self) -> None:
        """Scenario level must be basic or intermediate (no advanced per spec)."""
        assert ScenarioLevel.BASIC.value == "basic"
        assert ScenarioLevel.INTERMEDIATE.value == "intermediate"
        
        # Should not have advanced level per spec
        assert not hasattr(ScenarioLevel, "ADVANCED")
    
    def test_scenario_must_have_story(self) -> None:
        """Every scenario must have a human-readable story."""
        scenario = Scenario(
            id="test",
            title="Test",
            level=ScenarioLevel.BASIC,
            spark_concepts=["test"],
            real_world_context="Testing",
            story="This is the story that appears in the UI.",
            logical_operations=["read"],
            expected_stages=1,
            expected_shuffles=0,
            evidence_signals=[],
            explanation_goal="Test goal",
        )
        
        assert len(scenario.story) > 0
        assert "story" in scenario.story.lower() or len(scenario.story) > 10


class TestScenarioRegistry:
    """Tests for scenario registration and retrieval."""

    def test_registry_has_required_scenarios(self) -> None:
        """Registry must contain all 5 required scenarios from spec."""
        scenarios = list_scenarios()
        scenario_ids = [s.id for s in scenarios]
        
        # Required scenarios per spec Section 4
        assert "simple_filter" in scenario_ids
        assert "groupby_aggregation" in scenario_ids
        assert "join_without_broadcast" in scenario_ids
        assert "skewed_join_key" in scenario_ids
        assert "too_many_output_files" in scenario_ids
    
    def test_get_scenario_by_id(self) -> None:
        """Can retrieve individual scenario by ID."""
        scenario = get_scenario_by_id("simple_filter")
        
        assert scenario is not None
        assert scenario.id == "simple_filter"
        assert scenario.title == "Simple Filter"
    
    def test_get_nonexistent_scenario_returns_none(self) -> None:
        """Getting nonexistent scenario returns None."""
        scenario = get_scenario_by_id("nonexistent_scenario")
        
        assert scenario is None


class TestScenario1SimpleFilter:
    """Tests for Scenario 1: Simple Filter (Baseline)."""

    def test_simple_filter_metadata(self) -> None:
        """Simple filter scenario has correct metadata."""
        scenario = get_scenario_by_id("simple_filter")
        
        assert scenario.level == ScenarioLevel.BASIC
        assert "narrow_transformation" in scenario.spark_concepts
    
    def test_simple_filter_no_shuffle(self) -> None:
        """Simple filter expects no shuffle."""
        scenario = get_scenario_by_id("simple_filter")
        
        assert scenario.expected_shuffles == 0
    
    def test_simple_filter_single_stage(self) -> None:
        """Simple filter expects single stage."""
        scenario = get_scenario_by_id("simple_filter")
        
        assert scenario.expected_stages == 1
    
    def test_simple_filter_explanation_goal(self) -> None:
        """Simple filter teaches that filters don't require data movement."""
        scenario = get_scenario_by_id("simple_filter")
        
        assert "data movement" in scenario.explanation_goal.lower() or \
               "no shuffle" in scenario.explanation_goal.lower() or \
               "narrow" in scenario.explanation_goal.lower()


class TestScenario2GroupByAggregation:
    """Tests for Scenario 2: GroupBy Aggregation."""

    def test_groupby_metadata(self) -> None:
        """GroupBy scenario has correct metadata."""
        scenario = get_scenario_by_id("groupby_aggregation")
        
        assert scenario.level == ScenarioLevel.BASIC
        assert "shuffle" in scenario.spark_concepts or "wide_transformation" in scenario.spark_concepts
    
    def test_groupby_has_shuffle(self) -> None:
        """GroupBy expects shuffle."""
        scenario = get_scenario_by_id("groupby_aggregation")
        
        assert scenario.expected_shuffles >= 1
    
    def test_groupby_multiple_stages(self) -> None:
        """GroupBy expects stage split."""
        scenario = get_scenario_by_id("groupby_aggregation")
        
        assert scenario.expected_stages >= 2
    
    def test_groupby_explanation_teaches_shuffle(self) -> None:
        """GroupBy teaches why groupBy always shuffles."""
        scenario = get_scenario_by_id("groupby_aggregation")
        
        assert "shuffle" in scenario.explanation_goal.lower()


class TestScenario3JoinWithoutBroadcast:
    """Tests for Scenario 3: Join Without Broadcast."""

    def test_join_metadata(self) -> None:
        """Join scenario has correct metadata."""
        scenario = get_scenario_by_id("join_without_broadcast")
        
        assert scenario.level in [ScenarioLevel.BASIC, ScenarioLevel.INTERMEDIATE]
        assert "sort_merge_join" in scenario.spark_concepts or "shuffle" in scenario.spark_concepts
    
    def test_join_has_two_shuffles(self) -> None:
        """Sort-merge join expects two shuffles (one per table)."""
        scenario = get_scenario_by_id("join_without_broadcast")
        
        assert scenario.expected_shuffles >= 2
    
    def test_join_explanation_teaches_cost(self) -> None:
        """Join teaches why joins are expensive without broadcast."""
        scenario = get_scenario_by_id("join_without_broadcast")
        
        assert "expensive" in scenario.explanation_goal.lower() or \
               "broadcast" in scenario.explanation_goal.lower()


class TestScenario4SkewedJoinKey:
    """Tests for Scenario 4: Skewed Join Key."""

    def test_skew_metadata(self) -> None:
        """Skew scenario has correct metadata."""
        scenario = get_scenario_by_id("skewed_join_key")
        
        assert scenario.level == ScenarioLevel.INTERMEDIATE
        assert "data_skew" in scenario.spark_concepts or "straggler" in scenario.spark_concepts
    
    def test_skew_evidence_includes_task_variance(self) -> None:
        """Skew scenario evidence includes task duration variance."""
        scenario = get_scenario_by_id("skewed_join_key")
        
        assert "task_duration_variance" in scenario.evidence_signals or \
               "task_duration" in scenario.evidence_signals
    
    def test_skew_explanation_teaches_parallelism(self) -> None:
        """Skew teaches how it impacts parallelism."""
        scenario = get_scenario_by_id("skewed_join_key")
        
        assert "skew" in scenario.explanation_goal.lower() or \
               "parallelism" in scenario.explanation_goal.lower()


class TestScenario5TooManyOutputFiles:
    """Tests for Scenario 5: Too Many Output Files."""

    def test_output_files_metadata(self) -> None:
        """Output files scenario has correct metadata."""
        scenario = get_scenario_by_id("too_many_output_files")
        
        assert scenario.level == ScenarioLevel.INTERMEDIATE
        assert "partitioning" in scenario.spark_concepts or "write_amplification" in scenario.spark_concepts
    
    def test_output_files_explanation_teaches_write_partitioning(self) -> None:
        """Teaches why write-time partitioning matters."""
        scenario = get_scenario_by_id("too_many_output_files")
        
        assert "partitioning" in scenario.explanation_goal.lower() or \
               "file" in scenario.explanation_goal.lower() or \
               "write" in scenario.explanation_goal.lower()


class TestScenarioToDict:
    """Tests for scenario serialization to API response."""

    def test_scenario_to_dict(self) -> None:
        """Scenario can be serialized to dict for API."""
        scenario = get_scenario_by_id("simple_filter")
        data = scenario.to_dict()
        
        assert "id" in data
        assert "title" in data
        assert "level" in data
        assert "spark_concepts" in data
        assert "story" in data
        assert "explanation_goal" in data
