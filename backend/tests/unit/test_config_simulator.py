"""Tests for Config Impact Simulator.

The Config Impact Simulator helps users understand how Spark
configuration changes affect execution behavior.

It provides:
- Explanations of what each config does
- Impact predictions based on DataFrame shape
- Trade-off analysis between different settings

Reference: plan.md - Config Impact Simulator section
"""

import pytest

from app.simulators.config_simulator import (
    ConfigImpact,
    ConfigSimulator,
    SparkConfig,
    ConfigCategory,
    ImpactLevel,
)
from app.simulators.shape_playground import DataFrameShape


class TestSparkConfigDefinitions:
    """Tests for Spark config definitions and explanations."""

    def test_get_shuffle_partitions_config(self) -> None:
        """Get info about spark.sql.shuffle.partitions."""
        simulator = ConfigSimulator()
        config = simulator.get_config("spark.sql.shuffle.partitions")
        
        assert config is not None
        assert config.name == "spark.sql.shuffle.partitions"
        assert config.default_value == "200"
        assert config.category == ConfigCategory.SHUFFLE
        assert "partition" in config.description.lower()

    def test_get_broadcast_threshold_config(self) -> None:
        """Get info about spark.sql.autoBroadcastJoinThreshold."""
        simulator = ConfigSimulator()
        config = simulator.get_config("spark.sql.autoBroadcastJoinThreshold")
        
        assert config is not None
        assert config.category == ConfigCategory.JOIN
        assert "broadcast" in config.description.lower()

    def test_get_adaptive_execution_config(self) -> None:
        """Get info about spark.sql.adaptive.enabled."""
        simulator = ConfigSimulator()
        config = simulator.get_config("spark.sql.adaptive.enabled")
        
        assert config is not None
        assert config.category == ConfigCategory.ADAPTIVE
        assert config.default_value == "true"

    def test_unknown_config_returns_none(self) -> None:
        """Unknown config should return None, not error."""
        simulator = ConfigSimulator()
        config = simulator.get_config("spark.unknown.config")
        
        assert config is None

    def test_list_configs_by_category(self) -> None:
        """List all configs in a category."""
        simulator = ConfigSimulator()
        shuffle_configs = simulator.list_configs(category=ConfigCategory.SHUFFLE)
        
        assert len(shuffle_configs) > 0
        assert all(c.category == ConfigCategory.SHUFFLE for c in shuffle_configs)


class TestConfigImpactSimulation:
    """Tests for simulating config impact."""

    def test_shuffle_partitions_impact_on_large_data(self) -> None:
        """Increasing shuffle partitions benefits large data."""
        simulator = ConfigSimulator()
        shape = DataFrameShape(
            rows=100_000_000,  # 100M rows
            avg_row_size_bytes=100,
            partitions=200,
        )
        
        # Simulate increasing partitions from 200 to 2000
        impact = simulator.simulate_config_change(
            config_name="spark.sql.shuffle.partitions",
            current_value="200",
            new_value="2000",
            shape=shape,
        )
        
        assert impact is not None
        assert impact.impact_level in (ImpactLevel.HIGH, ImpactLevel.MEDIUM)
        assert "partition" in impact.explanation.lower()
        # Should mention reduced memory pressure per task
        assert any("memory" in note.lower() or "task" in note.lower() 
                   for note in impact.benefits)

    def test_shuffle_partitions_impact_on_small_data(self) -> None:
        """Too many partitions hurts small data performance."""
        simulator = ConfigSimulator()
        shape = DataFrameShape(
            rows=10_000,  # 10K rows - small
            avg_row_size_bytes=100,
            partitions=200,
        )
        
        # Simulate increasing partitions on small data
        impact = simulator.simulate_config_change(
            config_name="spark.sql.shuffle.partitions",
            current_value="200",
            new_value="2000",
            shape=shape,
        )
        
        # Should warn about overhead
        assert impact.has_warning
        assert any("overhead" in note.lower() or "small" in note.lower() 
                   for note in impact.drawbacks)

    def test_broadcast_threshold_impact(self) -> None:
        """Broadcast threshold affects join strategy."""
        simulator = ConfigSimulator()
        shape = DataFrameShape(
            rows=1_000_000,
            avg_row_size_bytes=100,
            partitions=200,
        )
        
        # Increase broadcast threshold
        impact = simulator.simulate_config_change(
            config_name="spark.sql.autoBroadcastJoinThreshold",
            current_value="10485760",  # 10MB
            new_value="104857600",  # 100MB
            shape=shape,
        )
        
        assert impact is not None
        assert "broadcast" in impact.explanation.lower()

    def test_adaptive_execution_impact(self) -> None:
        """AQE affects runtime optimization."""
        simulator = ConfigSimulator()
        shape = DataFrameShape(
            rows=10_000_000,
            avg_row_size_bytes=100,
            partitions=200,
        )
        
        impact = simulator.simulate_config_change(
            config_name="spark.sql.adaptive.enabled",
            current_value="false",
            new_value="true",
            shape=shape,
        )
        
        assert impact is not None
        assert impact.impact_level in (ImpactLevel.HIGH, ImpactLevel.MEDIUM)
        assert "adaptive" in impact.explanation.lower()


class TestTradeOffAnalysis:
    """Tests for analyzing trade-offs between configs."""

    def test_memory_vs_speed_tradeoff(self) -> None:
        """Analyze trade-off between memory usage and speed."""
        simulator = ConfigSimulator()
        shape = DataFrameShape(
            rows=50_000_000,
            avg_row_size_bytes=100,
            partitions=200,
        )
        
        # Fewer partitions = more memory per task but less overhead
        tradeoffs = simulator.analyze_tradeoffs(
            config_name="spark.sql.shuffle.partitions",
            options=["100", "500", "1000", "2000"],
            shape=shape,
        )
        
        assert len(tradeoffs) == 4
        # Each option should have impact analysis
        for option in tradeoffs:
            assert option.value is not None
            assert option.impact is not None

    def test_recommend_optimal_config(self) -> None:
        """Recommend optimal config based on data shape."""
        simulator = ConfigSimulator()
        shape = DataFrameShape(
            rows=50_000_000,  # 50M rows, 5GB
            avg_row_size_bytes=100,
            partitions=200,
        )
        
        recommendation = simulator.recommend(
            config_name="spark.sql.shuffle.partitions",
            shape=shape,
        )
        
        assert recommendation is not None
        assert recommendation.recommended_value is not None
        assert recommendation.reasoning is not None
        # Should explain why this value is recommended
        assert len(recommendation.reasoning) > 0


class TestConfigExplanations:
    """Tests for human-readable config explanations."""

    def test_explain_config_simply(self) -> None:
        """Get simple explanation of config purpose."""
        simulator = ConfigSimulator()
        explanation = simulator.explain("spark.sql.shuffle.partitions")
        
        assert explanation is not None
        # Should be understandable
        assert len(explanation) > 50
        assert "partition" in explanation.lower()

    def test_explain_impact_in_context(self) -> None:
        """Explain config impact for specific workload."""
        simulator = ConfigSimulator()
        shape = DataFrameShape(
            rows=10_000_000,
            avg_row_size_bytes=100,
            partitions=200,
        )
        
        explanation = simulator.explain_in_context(
            config_name="spark.sql.shuffle.partitions",
            value="200",
            shape=shape,
        )
        
        assert explanation is not None
        # Should reference the actual data size
        assert "MB" in explanation or "GB" in explanation or "task" in explanation.lower()


class TestConfigValidation:
    """Tests for config value validation."""

    def test_validate_numeric_config(self) -> None:
        """Numeric configs should be validated."""
        simulator = ConfigSimulator()
        
        # Valid value
        assert simulator.validate_value("spark.sql.shuffle.partitions", "200") is True
        
        # Invalid value
        assert simulator.validate_value("spark.sql.shuffle.partitions", "abc") is False
        assert simulator.validate_value("spark.sql.shuffle.partitions", "-1") is False

    def test_validate_boolean_config(self) -> None:
        """Boolean configs should accept true/false."""
        simulator = ConfigSimulator()
        
        assert simulator.validate_value("spark.sql.adaptive.enabled", "true") is True
        assert simulator.validate_value("spark.sql.adaptive.enabled", "false") is True
        assert simulator.validate_value("spark.sql.adaptive.enabled", "yes") is False

    def test_validate_byte_config(self) -> None:
        """Byte configs should accept size strings."""
        simulator = ConfigSimulator()
        
        assert simulator.validate_value("spark.sql.autoBroadcastJoinThreshold", "10485760") is True
        assert simulator.validate_value("spark.sql.autoBroadcastJoinThreshold", "10m") is True
        assert simulator.validate_value("spark.sql.autoBroadcastJoinThreshold", "1g") is True
