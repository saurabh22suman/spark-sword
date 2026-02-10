"""Tests for DataFrame Shape Playground.

The Shape Playground enables what-if analysis by simulating how
DataFrame shape changes affect execution characteristics WITHOUT
running actual Spark jobs.

Key principle: Spark performance depends on execution shape, not raw data.

Reference: plan.md - DataFrame Shape Playground section
"""

import pytest

from app.simulators.shape_playground import (
    DataFrameShape,
    ShapePlayground,
    SimulationResult,
    ShapeChange,
    PartitionStrategy,
)


class TestDataFrameShape:
    """Tests for DataFrame shape modeling."""

    def test_create_basic_shape(self) -> None:
        """Create a basic DataFrame shape."""
        shape = DataFrameShape(
            rows=1_000_000,
            columns=10,
            avg_row_size_bytes=100,
            partitions=200,
        )
        
        assert shape.rows == 1_000_000
        assert shape.columns == 10
        assert shape.partitions == 200
    
    def test_calculate_total_size(self) -> None:
        """Total size should be rows * avg_row_size."""
        shape = DataFrameShape(
            rows=1_000_000,
            avg_row_size_bytes=100,
            partitions=200,
        )
        
        assert shape.total_size_bytes == 100_000_000  # 100MB
    
    def test_calculate_partition_size(self) -> None:
        """Partition size should be total_size / partitions."""
        shape = DataFrameShape(
            rows=1_000_000,
            avg_row_size_bytes=100,
            partitions=200,
        )
        
        # 100MB / 200 partitions = 500KB per partition
        assert shape.partition_size_bytes == 500_000
    
    def test_shape_with_skew(self) -> None:
        """Shape can have skew factor to model uneven distribution."""
        shape = DataFrameShape(
            rows=1_000_000,
            avg_row_size_bytes=100,
            partitions=200,
            skew_factor=5.0,  # Some partitions 5x larger than average
        )
        
        assert shape.skew_factor == 5.0
        assert shape.max_partition_size_bytes == shape.partition_size_bytes * 5.0


class TestShapeTransformations:
    """Tests for simulating transformations on shapes."""

    def test_filter_reduces_rows(self) -> None:
        """Filter operation reduces row count by selectivity."""
        playground = ShapePlayground()
        input_shape = DataFrameShape(
            rows=1_000_000,
            avg_row_size_bytes=100,
            partitions=200,
        )
        
        # 10% selectivity filter
        result = playground.simulate_filter(input_shape, selectivity=0.1)
        
        assert result.output_shape.rows == 100_000  # 10% of original
        assert result.output_shape.partitions == 200  # Partitions unchanged
        assert result.shuffle_bytes == 0  # Filter is narrow

    def test_groupby_estimates_shuffle(self) -> None:
        """GroupBy estimates shuffle data volume."""
        playground = ShapePlayground()
        input_shape = DataFrameShape(
            rows=1_000_000,
            avg_row_size_bytes=100,
            partitions=200,
        )
        
        # GroupBy with 1000 unique keys
        result = playground.simulate_groupby(
            input_shape,
            num_groups=1000,
            aggregation_ratio=0.001,  # 1000 output rows
        )
        
        # Shuffle is approximately total input size
        assert result.shuffle_bytes > 0
        # Output rows equal num_groups
        assert result.output_shape.rows == 1000

    def test_join_estimates_output_size(self) -> None:
        """Join estimates output size based on join type and selectivity."""
        playground = ShapePlayground()
        left_shape = DataFrameShape(
            rows=1_000_000,
            avg_row_size_bytes=100,
            partitions=200,
        )
        right_shape = DataFrameShape(
            rows=200_000,  # 20MB - definitely above 10MB broadcast threshold
            avg_row_size_bytes=100,
            partitions=100,
        )
        
        # Inner join with 1:1 match ratio
        result = playground.simulate_join(
            left_shape,
            right_shape,
            join_type="inner",
            selectivity=1.0,
        )
        
        # Output rows bounded by smaller table for 1:1 join
        assert result.output_shape.rows <= max(left_shape.rows, right_shape.rows)
        # Both tables too large for broadcast, so shuffle required
        assert result.shuffle_bytes > 0

    def test_broadcast_join_no_shuffle_for_small_table(self) -> None:
        """Broadcast join avoids shuffle when small table fits in memory."""
        playground = ShapePlayground()
        large_shape = DataFrameShape(
            rows=10_000_000,
            avg_row_size_bytes=100,
            partitions=1000,
        )
        small_shape = DataFrameShape(
            rows=1_000,
            avg_row_size_bytes=100,
            partitions=10,
        )
        
        # Small table is 100KB, well under broadcast threshold
        result = playground.simulate_join(
            large_shape,
            small_shape,
            join_type="inner",
            broadcast_threshold_bytes=10_000_000,  # 10MB
        )
        
        # Only large table shuffle (if any), small table is broadcast
        assert result.broadcast_bytes == small_shape.total_size_bytes

    def test_repartition_changes_partition_count(self) -> None:
        """Repartition changes partition count and causes full shuffle."""
        playground = ShapePlayground()
        input_shape = DataFrameShape(
            rows=1_000_000,
            avg_row_size_bytes=100,
            partitions=200,
        )
        
        result = playground.simulate_repartition(input_shape, new_partitions=500)
        
        assert result.output_shape.partitions == 500
        assert result.shuffle_bytes == input_shape.total_size_bytes


class TestSkewSimulation:
    """Tests for simulating skew effects."""

    def test_skew_increases_max_task_time(self) -> None:
        """Data skew increases maximum task duration estimate."""
        playground = ShapePlayground()
        
        # Uniform distribution
        uniform_shape = DataFrameShape(
            rows=1_000_000,
            avg_row_size_bytes=100,
            partitions=200,
            skew_factor=1.0,
        )
        
        # Skewed distribution
        skewed_shape = DataFrameShape(
            rows=1_000_000,
            avg_row_size_bytes=100,
            partitions=200,
            skew_factor=10.0,
        )
        
        uniform_result = playground.simulate_groupby(uniform_shape, num_groups=100)
        skewed_result = playground.simulate_groupby(skewed_shape, num_groups=100)
        
        # Skewed shape should have higher max task estimate
        assert skewed_result.estimated_max_task_ms > uniform_result.estimated_max_task_ms

    def test_skew_detection_warning(self) -> None:
        """High skew should generate warning in simulation."""
        playground = ShapePlayground()
        skewed_shape = DataFrameShape(
            rows=1_000_000,
            avg_row_size_bytes=100,
            partitions=200,
            skew_factor=10.0,
        )
        
        result = playground.simulate_groupby(skewed_shape, num_groups=100)
        
        assert result.has_warning
        assert "skew" in result.warning_message.lower()


class TestWhatIfAnalysis:
    """Tests for what-if scenario analysis."""

    def test_compare_partition_strategies(self) -> None:
        """Compare different partitioning strategies."""
        playground = ShapePlayground()
        input_shape = DataFrameShape(
            rows=10_000_000,
            avg_row_size_bytes=100,
            partitions=100,  # Low partition count
        )
        
        # What if we increase partitions?
        result_100 = playground.simulate_groupby(input_shape, num_groups=1000)
        
        input_shape_more = DataFrameShape(
            rows=10_000_000,
            avg_row_size_bytes=100,
            partitions=1000,  # More partitions
        )
        result_1000 = playground.simulate_groupby(input_shape_more, num_groups=1000)
        
        # More partitions should reduce per-task data
        assert result_1000.output_shape.partition_size_bytes < result_100.output_shape.partition_size_bytes

    def test_shape_change_tracking(self) -> None:
        """Track how shape changes through pipeline."""
        playground = ShapePlayground()
        
        # Start with large DataFrame
        shape = DataFrameShape(rows=10_000_000, avg_row_size_bytes=100, partitions=200)
        
        # Apply transformations
        changes: list[ShapeChange] = []
        
        # Filter
        result = playground.simulate_filter(shape, selectivity=0.1)
        changes.append(ShapeChange(
            operation="filter",
            input_rows=shape.rows,
            output_rows=result.output_shape.rows,
        ))
        shape = result.output_shape
        
        # GroupBy
        result = playground.simulate_groupby(shape, num_groups=1000)
        changes.append(ShapeChange(
            operation="groupBy",
            input_rows=shape.rows,
            output_rows=result.output_shape.rows,
            shuffle_bytes=result.shuffle_bytes,
        ))
        
        assert len(changes) == 2
        assert changes[0].output_rows == 1_000_000  # 10% after filter
        assert changes[1].output_rows == 1000  # After groupBy


class TestSimulationHonesty:
    """Tests ensuring simulations are honest about uncertainty."""

    def test_simulation_includes_confidence(self) -> None:
        """Simulation results must include confidence levels."""
        playground = ShapePlayground()
        shape = DataFrameShape(rows=1_000_000, avg_row_size_bytes=100, partitions=200)
        
        result = playground.simulate_groupby(shape, num_groups=1000)
        
        # Must have confidence indicator
        assert hasattr(result, "confidence")
        assert result.confidence in ("high", "medium", "low")

    def test_simulation_never_claims_exact_runtime(self) -> None:
        """Simulations must not claim to predict exact runtime."""
        playground = ShapePlayground()
        shape = DataFrameShape(rows=1_000_000, avg_row_size_bytes=100, partitions=200)
        
        result = playground.simulate_groupby(shape, num_groups=1000)
        
        # Should have range, not exact value
        assert result.estimated_min_task_ms is not None
        assert result.estimated_max_task_ms is not None
        assert result.estimated_max_task_ms >= result.estimated_min_task_ms

    def test_simulation_is_data_agnostic(self) -> None:
        """Two shapes with same dimensions should produce same estimates.
        
        This proves simulation is based on shape, not data content.
        """
        playground = ShapePlayground()
        
        shape1 = DataFrameShape(rows=1_000_000, avg_row_size_bytes=100, partitions=200)
        shape2 = DataFrameShape(rows=1_000_000, avg_row_size_bytes=100, partitions=200)
        
        result1 = playground.simulate_groupby(shape1, num_groups=1000)
        result2 = playground.simulate_groupby(shape2, num_groups=1000)
        
        # Same shape should produce identical estimates
        assert result1.shuffle_bytes == result2.shuffle_bytes
        assert result1.output_shape.rows == result2.output_shape.rows


class TestSimulationExplanations:
    """Tests for spec-required explanation fields.
    
    Per must-have Feature 3, every simulation MUST include:
    - Why Spark chose this path
    - Which parameter influenced the outcome most
    - Confidence level with justification
    """

    def test_filter_has_spark_path_explanation(self) -> None:
        """Filter simulation explains why Spark chose narrow path."""
        playground = ShapePlayground()
        shape = DataFrameShape(rows=1_000_000, avg_row_size_bytes=100, partitions=200)
        
        result = playground.simulate_filter(shape, selectivity=0.1)
        
        assert result.spark_path_explanation
        assert "narrow" in result.spark_path_explanation.lower()

    def test_filter_has_dominant_factor(self) -> None:
        """Filter simulation identifies dominant parameter."""
        playground = ShapePlayground()
        shape = DataFrameShape(rows=1_000_000, avg_row_size_bytes=100, partitions=200)
        
        result = playground.simulate_filter(shape, selectivity=0.1)
        
        assert result.dominant_factor
        assert len(result.dominant_factor) > 10

    def test_filter_has_confidence_justification(self) -> None:
        """Filter simulation justifies confidence level."""
        playground = ShapePlayground()
        shape = DataFrameShape(rows=1_000_000, avg_row_size_bytes=100, partitions=200)
        
        result = playground.simulate_filter(shape, selectivity=0.1)
        
        assert result.confidence_justification
        assert "high" in result.confidence_justification.lower()

    def test_groupby_has_spark_path_explanation(self) -> None:
        """GroupBy simulation explains why Spark chose shuffle."""
        playground = ShapePlayground()
        shape = DataFrameShape(rows=1_000_000, avg_row_size_bytes=100, partitions=200)
        
        result = playground.simulate_groupby(shape, num_groups=1000)
        
        assert result.spark_path_explanation
        assert "shuffle" in result.spark_path_explanation.lower()

    def test_groupby_has_dominant_factor(self) -> None:
        """GroupBy simulation identifies dominant parameter."""
        playground = ShapePlayground()
        shape = DataFrameShape(rows=1_000_000, avg_row_size_bytes=100, partitions=200)
        
        result = playground.simulate_groupby(shape, num_groups=1000)
        
        assert result.dominant_factor
        assert "row" in result.dominant_factor.lower() or "skew" in result.dominant_factor.lower()

    def test_join_broadcast_explains_path(self) -> None:
        """Broadcast join explains why broadcast was chosen."""
        playground = ShapePlayground()
        left = DataFrameShape(rows=10_000_000, avg_row_size_bytes=100, partitions=200)
        right = DataFrameShape(rows=1_000, avg_row_size_bytes=100, partitions=10)  # Small table
        
        result = playground.simulate_join(left, right)
        
        assert result.spark_path_explanation
        assert "broadcast" in result.spark_path_explanation.lower()

    def test_join_sortmerge_explains_path(self) -> None:
        """Sort-merge join explains why shuffle was required."""
        playground = ShapePlayground()
        left = DataFrameShape(rows=10_000_000, avg_row_size_bytes=100, partitions=200)
        right = DataFrameShape(rows=5_000_000, avg_row_size_bytes=100, partitions=200)  # Large table
        
        result = playground.simulate_join(left, right)
        
        assert result.spark_path_explanation
        assert "sort" in result.spark_path_explanation.lower() or "shuffle" in result.spark_path_explanation.lower()

    def test_repartition_has_full_explanation(self) -> None:
        """Repartition simulation has all three explanation fields."""
        playground = ShapePlayground()
        shape = DataFrameShape(rows=1_000_000, avg_row_size_bytes=100, partitions=200)
        
        result = playground.simulate_repartition(shape, new_partitions=500)
        
        assert result.spark_path_explanation
        assert result.dominant_factor
        assert result.confidence_justification
        
        # Content checks
        assert "shuffle" in result.spark_path_explanation.lower()
        assert "partition" in result.dominant_factor.lower()
        assert "high" in result.confidence_justification.lower()


class TestAdvancedOperations:
    """Tests for advanced operations per dataframe-playground-spec.md Section 5.2."""

    def test_simulate_window_requires_shuffle(self) -> None:
        """Window function requires shuffle for partitionBy."""
        playground = ShapePlayground()
        shape = DataFrameShape(rows=1_000_000, avg_row_size_bytes=100, partitions=200)
        
        result = playground.simulate_window(shape, partition_columns=1, has_order_by=True)
        
        assert result.shuffle_bytes > 0
        assert "shuffle" in result.spark_path_explanation.lower()

    def test_simulate_window_without_partition_no_shuffle(self) -> None:
        """Window without partitionBy uses single partition."""
        playground = ShapePlayground()
        shape = DataFrameShape(rows=1_000_000, avg_row_size_bytes=100, partitions=200)
        
        result = playground.simulate_window(shape, partition_columns=0, has_order_by=True)
        
        # Should warn about single partition
        assert result.has_warning
        assert "single" in result.warning_message.lower() or "one partition" in result.warning_message.lower()

    def test_simulate_distinct_requires_shuffle(self) -> None:
        """Distinct requires shuffle to find duplicates across partitions."""
        playground = ShapePlayground()
        shape = DataFrameShape(rows=1_000_000, avg_row_size_bytes=100, partitions=200)
        
        result = playground.simulate_distinct(shape, estimated_duplicates_ratio=0.2)
        
        assert result.shuffle_bytes > 0
        assert result.output_shape.rows == 800_000  # 20% duplicates removed

    def test_simulate_union_no_shuffle(self) -> None:
        """Union is a narrow transformation - no shuffle needed."""
        playground = ShapePlayground()
        shape1 = DataFrameShape(rows=1_000_000, avg_row_size_bytes=100, partitions=200)
        shape2 = DataFrameShape(rows=500_000, avg_row_size_bytes=100, partitions=100)
        
        result = playground.simulate_union(shape1, shape2)
        
        assert result.shuffle_bytes == 0
        assert result.output_shape.rows == 1_500_000
        assert result.output_shape.partitions == 300  # Combined

    def test_simulate_orderby_requires_shuffle(self) -> None:
        """OrderBy requires shuffle to sort globally."""
        playground = ShapePlayground()
        shape = DataFrameShape(rows=1_000_000, avg_row_size_bytes=100, partitions=200)
        
        result = playground.simulate_orderby(shape)
        
        assert result.shuffle_bytes > 0
        assert "range" in result.spark_path_explanation.lower() or "sort" in result.spark_path_explanation.lower()

    def test_simulate_cache_explains_memory_usage(self) -> None:
        """Cache shows estimated memory usage."""
        playground = ShapePlayground()
        shape = DataFrameShape(rows=1_000_000, avg_row_size_bytes=100, partitions=200)
        
        result = playground.simulate_cache(shape, storage_level="MEMORY_ONLY")
        
        assert result.shuffle_bytes == 0  # No shuffle
        assert result.cache_memory_bytes > 0
        assert "memory" in result.spark_path_explanation.lower()

    def test_simulate_cache_disk_warns_about_io(self) -> None:
        """Cache to disk warns about I/O overhead."""
        playground = ShapePlayground()
        shape = DataFrameShape(rows=1_000_000, avg_row_size_bytes=100, partitions=200)
        
        result = playground.simulate_cache(shape, storage_level="DISK_ONLY")
        
        assert "disk" in result.spark_path_explanation.lower()


class TestOperationChain:
    """Tests for operation chain simulation per spec 5.3."""

    def test_chain_filter_then_groupby(self) -> None:
        """Chain: filter reduces data before groupby shuffle."""
        playground = ShapePlayground()
        shape = DataFrameShape(rows=10_000_000, avg_row_size_bytes=100, partitions=200)
        
        operations = [
            {"type": "filter", "selectivity": 0.1},
            {"type": "groupby", "num_groups": 1000},
        ]
        
        result = playground.simulate_chain(shape, operations)
        
        # Filter first reduces rows to 1M
        assert len(result.steps) == 2
        assert result.steps[0].output_shape.rows == 1_000_000
        # GroupBy shuffle is on reduced data
        assert result.total_shuffle_bytes < shape.total_size_bytes

    def test_chain_groupby_then_filter(self) -> None:
        """Chain: groupby first means full shuffle before filter."""
        playground = ShapePlayground()
        shape = DataFrameShape(rows=10_000_000, avg_row_size_bytes=100, partitions=200)
        
        operations = [
            {"type": "groupby", "num_groups": 1000},
            {"type": "filter", "selectivity": 0.1},
        ]
        
        result = playground.simulate_chain(shape, operations)
        
        # GroupBy shuffles full dataset
        assert len(result.steps) == 2
        assert result.total_shuffle_bytes >= shape.total_size_bytes

    def test_chain_tracks_stage_count(self) -> None:
        """Chain counts stage boundaries (shuffles)."""
        playground = ShapePlayground()
        shape = DataFrameShape(rows=1_000_000, avg_row_size_bytes=100, partitions=200)
        
        operations = [
            {"type": "filter", "selectivity": 0.5},  # No shuffle
            {"type": "groupby", "num_groups": 100},  # Shuffle = stage boundary
            {"type": "filter", "selectivity": 0.5},  # No shuffle
        ]
        
        result = playground.simulate_chain(shape, operations)
        
        assert result.stage_count == 2  # Read stage + post-shuffle stage

    def test_chain_produces_mini_dag(self) -> None:
        """Chain produces a mini DAG for visualization."""
        playground = ShapePlayground()
        shape = DataFrameShape(rows=1_000_000, avg_row_size_bytes=100, partitions=200)
        
        operations = [
            {"type": "filter", "selectivity": 0.5},
            {"type": "groupby", "num_groups": 100},
        ]
        
        result = playground.simulate_chain(shape, operations)
        
        assert result.dag is not None
        assert len(result.dag.nodes) >= 3  # Read + Filter + GroupBy

    def test_chain_compares_reordering(self) -> None:
        """Demonstrate cost difference between orderings."""
        playground = ShapePlayground()
        shape = DataFrameShape(rows=10_000_000, avg_row_size_bytes=100, partitions=200)
        
        # Filter first
        result1 = playground.simulate_chain(shape, [
            {"type": "filter", "selectivity": 0.1},
            {"type": "groupby", "num_groups": 1000},
        ])
        
        # GroupBy first
        result2 = playground.simulate_chain(shape, [
            {"type": "groupby", "num_groups": 1000},
            {"type": "filter", "selectivity": 0.1},
        ])
        
        # Filter first should have less shuffle
        assert result1.total_shuffle_bytes < result2.total_shuffle_bytes


class TestStepByStepExecution:
    """Tests for step-by-step execution mode (Python Tutor pattern)."""

    def test_simulate_chain_returns_intermediate_states(self) -> None:
        """Each step should capture intermediate shape state."""
        playground = ShapePlayground()
        shape = DataFrameShape(rows=1_000_000, avg_row_size_bytes=100, partitions=200)
        
        operations = [
            {"type": "filter", "selectivity": 0.5},
            {"type": "groupby", "num_groups": 100},
        ]
        
        result = playground.simulate_chain(shape, operations)
        
        # Should have one step per operation
        assert len(result.steps) == 2
        
        # First step: filter reduces rows
        filter_step = result.steps[0]
        assert filter_step.operation_type == "filter"
        assert filter_step.output_shape.rows == 500_000  # 50% selectivity
        assert filter_step.input_shape.rows == 1_000_000
        
        # Second step: groupby on filtered data
        groupby_step = result.steps[1]
        assert groupby_step.operation_type == "groupby"
        assert groupby_step.input_shape.rows == 500_000  # Input from previous step
        assert groupby_step.is_stage_boundary is True

    def test_step_includes_spark_decision_explanation(self) -> None:
        """Each step should explain WHY Spark made a decision."""
        playground = ShapePlayground()
        shape = DataFrameShape(rows=1_000_000, avg_row_size_bytes=100, partitions=200)
        
        operations = [
            {"type": "join", "right_rows": 500, "join_type": "inner"},
        ]
        
        result = playground.simulate_chain(shape, operations)
        
        join_step = result.steps[0]
        
        # Step should include Spark's decision process
        assert hasattr(join_step, "spark_decision")
        assert join_step.spark_decision is not None
        assert "broadcast" in join_step.spark_decision.lower() or "shuffle" in join_step.spark_decision.lower()
        
        # Should explain the threshold check
        assert "threshold" in join_step.spark_decision.lower() or "size" in join_step.spark_decision.lower()

    def test_shuffle_boundary_detection_in_steps(self) -> None:
        """Steps should clearly mark shuffle boundaries."""
        playground = ShapePlayground()
        shape = DataFrameShape(rows=1_000_000, avg_row_size_bytes=100, partitions=200)
        
        operations = [
            {"type": "filter", "selectivity": 0.8},  # Narrow
            {"type": "groupby", "num_groups": 1000},  # Wide (shuffle)
            {"type": "filter", "selectivity": 0.5},  # Narrow again
        ]
        
        result = playground.simulate_chain(shape, operations)
        
        assert len(result.steps) == 3
        
        # First filter: narrow, no stage boundary
        assert result.steps[0].is_stage_boundary is False
        assert result.steps[0].shuffle_bytes == 0
        
        # GroupBy: wide, creates stage boundary
        assert result.steps[1].is_stage_boundary is True
        assert result.steps[1].shuffle_bytes > 0
        
        # Second filter: narrow, no stage boundary
        assert result.steps[2].is_stage_boundary is False
        assert result.steps[2].shuffle_bytes == 0

    def test_step_partition_state_evolution(self) -> None:
        """Steps should show how partition count/size evolves."""
        playground = ShapePlayground()
        shape = DataFrameShape(rows=1_000_000, avg_row_size_bytes=100, partitions=200)
        
        operations = [
            {"type": "filter", "selectivity": 0.1},  # Reduces size but keeps partitions
            {"type": "repartition", "new_partitions": 100},  # Changes partition count
        ]
        
        result = playground.simulate_chain(shape, operations)
        
        filter_step = result.steps[0]
        # Filter preserves partition count
        assert filter_step.output_shape.partitions == 200
        # But reduces data
        assert filter_step.output_shape.rows == 100_000
        
        repartition_step = result.steps[1]
        # Repartition changes partition count
        assert repartition_step.output_shape.partitions == 100
        assert repartition_step.is_stage_boundary is True

    def test_step_includes_operation_result(self) -> None:
        """Each step should include full SimulationResult for details."""
        playground = ShapePlayground()
        shape = DataFrameShape(rows=1_000_000, avg_row_size_bytes=100, partitions=200)
        
        operations = [
            {"type": "groupby", "num_groups": 100},
        ]
        
        result = playground.simulate_chain(shape, operations)
        
        step = result.steps[0]
        
        # Should have full result attached
        assert step.result is not None
        assert step.result.confidence in ["high", "medium", "low"]
        assert step.result.spark_path_explanation is not None
        assert step.result.dominant_factor is not None
