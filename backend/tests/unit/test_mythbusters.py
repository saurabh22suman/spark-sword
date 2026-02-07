"""Tests for Myth Busters Backend Model.

Following TDD Red-Green-Refactor-Verify:
- Tests define expected SparkMyth model behavior before implementation
- Tests validate myth content structure (myth, truth, why, demo_component, severity)
- Tests ensure myths are actionable (link to existing tutorial components)
- No Spark execution involved - this is educational content validation
"""

import pytest
from pydantic import ValidationError

from app.api.mythbusters import SparkMyth, MythCategory, MythSeverity, get_all_myths, get_myths_by_category


class TestSparkMythModel:
    """Test SparkMyth Pydantic model validation."""

    def test_valid_myth_creation(self):
        """Test creating a valid Spark myth with all required fields."""
        myth = SparkMyth(
            id="more-partitions-faster",
            myth="More partitions always means faster execution",
            truth="More partitions beyond available cores adds scheduling overhead",
            why="Spark's scheduler has overhead per task. With 10,000 partitions on 4 cores, you spend more time scheduling than processing.",
            evidence_type="interactive",
            demo_component="PartitionPlayground",
            category=MythCategory.PERFORMANCE,
            severity=MythSeverity.COMMON,
            tags=["partitions", "parallelism", "performance"],
        )
        
        assert myth.id == "more-partitions-faster"
        assert myth.myth == "More partitions always means faster execution"
        assert myth.demo_component == "PartitionPlayground"
        assert myth.category == MythCategory.PERFORMANCE
        assert myth.severity == MythSeverity.COMMON

    def test_myth_without_demo_component(self):
        """Test creating a myth without an interactive demo (text-only myth)."""
        myth = SparkMyth(
            id="text-only-myth",
            myth="Some myth statement",
            truth="The actual truth",
            why="Explanation of why",
            evidence_type="explanation",
            category=MythCategory.MEMORY,
            severity=MythSeverity.SUBTLE,
            tags=["memory"],
        )
        
        assert myth.demo_component is None
        assert myth.evidence_type == "explanation"

    def test_myth_categories_are_valid(self):
        """Test that myth categories are properly constrained."""
        valid_categories = ["performance", "memory", "shuffle", "joins", "configs", "general"]
        
        for category_value in valid_categories:
            myth = SparkMyth(
                id=f"myth-{category_value}",
                myth="Test myth",
                truth="Test truth",
                why="Test why",
                evidence_type="explanation",
                category=category_value,
                severity=MythSeverity.COMMON,
                tags=["test"],
            )
            assert myth.category.value == category_value

    def test_myth_severity_levels(self):
        """Test that severity levels are properly constrained."""
        valid_severities = ["common", "dangerous", "subtle"]
        
        for severity_value in valid_severities:
            myth = SparkMyth(
                id=f"myth-{severity_value}",
                myth="Test myth",
                truth="Test truth",
                why="Test why",
                evidence_type="explanation",
                category=MythCategory.GENERAL,
                severity=severity_value,
                tags=["test"],
            )
            assert myth.severity.value == severity_value

    def test_myth_tags_for_searchability(self):
        """Test that myths have searchable tags."""
        myth = SparkMyth(
            id="cache-everything",
            myth="You should cache every DataFrame",
            truth="Caching too much causes memory pressure and evictions",
            why="Cached data must fit in memory. Exceeding capacity triggers evictions, slowing down the job.",
            evidence_type="interactive",
            demo_component="CacheGoneWrongDemo",
            category=MythCategory.MEMORY,
            severity=MythSeverity.DANGEROUS,
            tags=["cache", "memory", "eviction", "storage"],
        )
        
        assert len(myth.tags) == 4
        assert "cache" in myth.tags
        assert "memory" in myth.tags

    def test_myth_missing_required_fields(self):
        """Test that missing required fields raises ValidationError."""
        with pytest.raises(ValidationError) as exc_info:
            SparkMyth(
                id="incomplete-myth",
                # Missing myth, truth, why, category, severity
            )
        
        errors = exc_info.value.errors()
        missing_fields = {error["loc"][0] for error in errors}
        assert "myth" in missing_fields
        assert "truth" in missing_fields
        assert "why" in missing_fields


class TestMythCollection:
    """Test myth collection and filtering functions."""

    def test_get_all_myths_returns_list(self):
        """Test that get_all_myths returns a non-empty list."""
        myths = get_all_myths()
        
        assert isinstance(myths, list)
        assert len(myths) >= 12  # Spec requires 12+ myths
        assert all(isinstance(m, SparkMyth) for m in myths)

    def test_all_myths_have_unique_ids(self):
        """Test that all myth IDs are unique."""
        myths = get_all_myths()
        myth_ids = [m.id for m in myths]
        
        assert len(myth_ids) == len(set(myth_ids)), "Duplicate myth IDs found"

    def test_get_myths_by_category_filters_correctly(self):
        """Test filtering myths by category."""
        performance_myths = get_myths_by_category(MythCategory.PERFORMANCE)
        
        assert all(m.category == MythCategory.PERFORMANCE for m in performance_myths)
        assert len(performance_myths) > 0

    def test_reddit_pain_points_covered(self):
        """Test that myths cover common Reddit pain points.
        
        Based on external research, these myths should exist:
        - More partitions = faster (FALSE)
        - Cache everything (FALSE)
        - Broadcast join always wins (FALSE)
        - Repartition is free (FALSE)
        - AQE fixes everything (FALSE)
        - Larger executors = faster (FALSE)
        """
        myths = get_all_myths()
        myth_ids = [m.id for m in myths]
        
        # Check for key Reddit pain points
        expected_myth_topics = [
            "partition",  # Partition myths
            "cache",      # Cache myths
            "broadcast",  # Join strategy myths
            "repartition",  # Repartition myths
        ]
        
        for topic in expected_myth_topics:
            assert any(topic in myth_id for myth_id in myth_ids), \
                f"No myth found covering '{topic}' pain point"

    def test_myths_link_to_existing_components(self):
        """Test that myths with demo_component reference real tutorial components.
        
        Following the spec, myths should link to existing components like:
        - PartitionPlayground
        - CacheGoneWrongDemo
        - JoinStrategySimulator
        - RepartitionDemo
        - ShuffleCostSimulator
        """
        myths = get_all_myths()
        myths_with_demos = [m for m in myths if m.demo_component]
        
        valid_components = [
            "PartitionPlayground",
            "CacheGoneWrongDemo",
            "JoinStrategySimulator",
            "RepartitionDemo",
            "ShuffleCostSimulator",
            "SkewExplosionDemo",
            "BroadcastThresholdDemo",
            "ExecutorMemorySimulator",
            "LazyEvalSimulator",
            "FileExplosionVisualizer",
        ]
        
        for myth in myths_with_demos:
            assert myth.demo_component in valid_components, \
                f"Myth '{myth.id}' references unknown component '{myth.demo_component}'"

    def test_at_least_one_dangerous_myth(self):
        """Test that we have at least one 'dangerous' severity myth."""
        myths = get_all_myths()
        dangerous_myths = [m for m in myths if m.severity == MythSeverity.DANGEROUS]
        
        assert len(dangerous_myths) > 0, "Should have at least one dangerous myth"

    def test_myths_have_why_explanations(self):
        """Test that all myths have detailed 'why' explanations."""
        myths = get_all_myths()
        
        for myth in myths:
            assert len(myth.why) > 50, \
                f"Myth '{myth.id}' has too short 'why' explanation ({len(myth.why)} chars)"
            
            # Should reference Spark behavior
            spark_keywords = ["spark", "executor", "task", "partition", "shuffle", "memory", "driver"]
            assert any(keyword in myth.why.lower() for keyword in spark_keywords), \
                f"Myth '{myth.id}' explanation doesn't reference Spark internals"
