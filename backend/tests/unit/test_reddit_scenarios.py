"""Tests for Production Scenarios.

Following TDD Red-Green-Refactor-Verify:
- Tests define realistic scenarios users encounter in production
- Tests validate scenario structure and educational value
- Tests ensure scenarios are explainable via Spark internals
- No guaranteed performance claims

Production Pain Points Covered:
1. Small files explosion (100k tiny parquet files)
2. Broadcast hint backfire (5GB table broadcasted)
3. AQE mysteries (why did my job behavior change?)
4. Cache OOM (cached too much, executors died)
5. Window function skew (partition by user_id)
6. Partition sizing tradeoffs (1 vs 200 vs 10000 partitions)
7. Distinct vs groupBy deduplication
8. Salted join technique
9. Multiple shuffles in sequence
10. Coalesce before write
11. Dynamic partition overwrite
12. Explode + join performance trap
"""

import pytest

from app.scenarios import (
    Scenario,
    ScenarioLevel,
    ScenarioRegistry,
    get_scenario_by_id,
    list_scenarios,
)


class TestProductionScenarios:
    """Test scenarios based on real production pain points."""

    def test_small_files_explosion_scenario_exists(self):
        """Test scenario for 100k+ tiny parquet files (common production issue)."""
        scenario = get_scenario_by_id("small-files-explosion")
        
        assert scenario is not None
        assert scenario.title == "Small Files Explosion"
        assert scenario.level == ScenarioLevel.INTERMEDIATE
        assert "small files" in scenario.spark_concepts
        assert "file listing overhead" in scenario.spark_concepts
        assert scenario.expected_stages >= 2

    def test_broadcast_hint_backfire_scenario_exists(self):
        """Test scenario for incorrectly broadcasting large tables."""
        scenario = get_scenario_by_id("broadcast-hint-backfire")
        
        assert scenario is not None
        assert scenario.title == "Broadcast Hint Backfire"
        assert scenario.level == ScenarioLevel.INTERMEDIATE
        assert "broadcast join" in scenario.spark_concepts
        assert "OOM" in scenario.story or "memory" in scenario.story
        assert scenario.expected_shuffles >= 0

    def test_aqe_mystery_scenario_exists(self):
        """Test scenario explaining AQE behavior changes."""
        scenario = get_scenario_by_id("aqe-mystery")
        
        assert scenario is not None
        assert scenario.title == "AQE Mystery"
        assert scenario.level == ScenarioLevel.INTERMEDIATE
        assert "adaptive query execution" in scenario.spark_concepts or "AQE" in scenario.spark_concepts
        assert "why did behavior change" in scenario.story.lower() or "different" in scenario.story.lower()

    def test_cache_oom_scenario_exists(self):
        """Test scenario for caching too much data causing OOM."""
        scenario = get_scenario_by_id("cache-oom")
        
        assert scenario is not None
        assert scenario.title == "Cache OOM"
        assert scenario.level == ScenarioLevel.INTERMEDIATE
        assert "cache" in scenario.spark_concepts
        assert "memory" in scenario.spark_concepts
        assert "memory" in scenario.story.lower() or "oom" in scenario.story.lower()

    def test_window_function_skew_scenario_exists(self):
        """Test scenario for window functions with skewed partitions."""
        scenario = get_scenario_by_id("window-function-skew")
        
        assert scenario is not None
        assert scenario.title == "Window Function Skew"
        assert scenario.level == ScenarioLevel.INTERMEDIATE
        assert "window function" in scenario.spark_concepts
        assert "skew" in scenario.spark_concepts
        assert scenario.expected_skew is True

    def test_partition_sizing_tradeoffs_scenario_exists(self):
        """Test scenario showing partition count impact (1 vs 200 vs 10k)."""
        scenario = get_scenario_by_id("partition-sizing-tradeoffs")
        
        assert scenario is not None
        assert scenario.title == "Partition Sizing Tradeoffs"
        assert scenario.level == ScenarioLevel.INTERMEDIATE
        assert "partitions" in scenario.spark_concepts
        assert "trade" in scenario.explanation_goal.lower()  # Contains "Trade-off"

    def test_distinct_vs_groupby_dedup_scenario_exists(self):
        """Test scenario comparing distinct() vs groupBy deduplication."""
        scenario = get_scenario_by_id("distinct-vs-groupby-dedup")
        
        assert scenario is not None
        assert scenario.title == "Distinct vs GroupBy Deduplication"
        assert scenario.level == ScenarioLevel.BASIC
        assert "distinct" in scenario.spark_concepts
        assert "groupBy" in scenario.spark_concepts

    def test_salted_join_scenario_exists(self):
        """Test scenario demonstrating salted join technique for skew."""
        scenario = get_scenario_by_id("salted-join")
        
        assert scenario is not None
        assert scenario.title == "Salted Join"
        assert scenario.level == ScenarioLevel.INTERMEDIATE
        assert "salting" in scenario.spark_concepts or "skew" in scenario.spark_concepts
        assert "join" in scenario.spark_concepts

    def test_multiple_shuffles_sequence_scenario_exists(self):
        """Test scenario showing impact of chained shuffles."""
        scenario = get_scenario_by_id("multiple-shuffles-sequence")
        
        assert scenario is not None
        assert scenario.title == "Multiple Shuffles in Sequence"
        assert scenario.level == ScenarioLevel.INTERMEDIATE
        assert scenario.expected_shuffles >= 3
        assert "shuffle" in scenario.spark_concepts

    def test_coalesce_before_write_scenario_exists(self):
        """Test scenario for coalesce before write optimization."""
        scenario = get_scenario_by_id("coalesce-before-write")
        
        assert scenario is not None
        assert scenario.title == "Coalesce Before Write"
        assert scenario.level == ScenarioLevel.BASIC
        assert "coalesce" in scenario.spark_concepts
        assert "write" in scenario.spark_concepts

    def test_dynamic_partition_overwrite_scenario_exists(self):
        """Test scenario for dynamic partition overwrite behavior."""
        scenario = get_scenario_by_id("dynamic-partition-overwrite")
        
        assert scenario is not None
        assert scenario.title == "Dynamic Partition Overwrite"
        assert scenario.level == ScenarioLevel.INTERMEDIATE
        assert "partitioning" in scenario.spark_concepts or "dynamic partition" in scenario.spark_concepts

    def test_explode_join_trap_scenario_exists(self):
        """Test scenario for explode + join data explosion."""
        scenario = get_scenario_by_id("explode-join-trap")
        
        assert scenario is not None
        assert scenario.title == "Explode + Join Trap"
        assert scenario.level == ScenarioLevel.INTERMEDIATE
        assert "explode" in scenario.spark_concepts
        assert "join" in scenario.spark_concepts
        assert "data explosion" in scenario.story.lower() or "cartesian" in scenario.story.lower()

    def test_all_new_scenarios_have_required_fields(self):
        """Test that all new scenarios have required metadata."""
        new_scenario_ids = [
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
        ]
        
        for scenario_id in new_scenario_ids:
            scenario = get_scenario_by_id(scenario_id)
            assert scenario is not None, f"Scenario {scenario_id} not found"
            assert len(scenario.title) > 0
            assert len(scenario.story) > 50  # Meaningful story
            assert len(scenario.logical_operations) > 0
            assert scenario.expected_stages > 0
            assert len(scenario.explanation_goal) > 30  # Meaningful explanation

    def test_new_scenarios_are_realistic(self):
        """Test that scenarios reflect real production issues."""
        scenario = get_scenario_by_id("small-files-explosion")
        
        # Should mention realistic file counts (150,000 or thousands)
        assert "150" in scenario.story or "thousand" in scenario.story.lower()
        
        # Should have realistic context
        assert len(scenario.real_world_context) > 20

    def test_total_scenario_count_is_24_plus(self):
        """Test that we have at least 24 scenarios (12 original + 12 new)."""
        all_scenarios = list_scenarios()
        
        assert len(all_scenarios) >= 24

    def test_scenarios_have_no_guaranteed_optimizations(self):
        """Test that scenarios don't promise guaranteed performance improvements."""
        forbidden_words = ["guaranteed", "always faster", "best practice", "must use"]
        
        new_scenario_ids = [
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
        ]
        
        for scenario_id in new_scenario_ids:
            scenario = get_scenario_by_id(scenario_id)
            combined_text = (scenario.story + scenario.explanation_goal).lower()
            
            for word in forbidden_words:
                assert word not in combined_text, f"Scenario {scenario_id} contains forbidden word '{word}'"
