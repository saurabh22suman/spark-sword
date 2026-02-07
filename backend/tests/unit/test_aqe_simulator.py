"""
Tests for AQE (Adaptive Query Execution) Simulator.

These tests verify that:
1. AQE coalesce partitions behavior is simulated correctly
2. AQE skew join handling is modeled accurately
3. Dynamic join strategy switching is explained properly
4. All insights are evidence-based and honest
"""

import pytest
from app.simulators.aqe_simulator import (
    AQESimulator,
    AQEOptimization,
    AQEOptimizationType,
    AQESimulationResult,
    PartitionCoalesceResult,
    SkewHandlingResult,
    JoinStrategyResult,
)
from app.simulators.shape_playground import DataFrameShape


@pytest.fixture
def aqe_simulator():
    """Fixture for AQE simulator."""
    return AQESimulator()


@pytest.fixture
def baseline_shape():
    """Baseline DataFrame shape for testing."""
    return DataFrameShape(
        rows=10_000_000,
        partitions=200,
        skew_factor=1.0,
        avg_row_size_bytes=100,
    )


@pytest.fixture
def skewed_shape():
    """Skewed DataFrame shape."""
    return DataFrameShape(
        rows=10_000_000,
        partitions=200,
        skew_factor=5.0,  # High skew
        avg_row_size_bytes=100,
    )


# ============================================================================
# Partition Coalescing Tests
# ============================================================================


def test_aqe_coalesce_reduces_small_partitions(aqe_simulator, baseline_shape):
    """Test that AQE coalescing reduces partition count when appropriate."""
    # Scenario: After shuffle, we have 200 partitions but only 100MB total
    # AQE should coalesce to fewer partitions
    result = aqe_simulator.simulate_coalesce(
        shape=baseline_shape,
        post_shuffle_bytes=100_000_000,  # 100MB
        target_partition_size_bytes=128_000_000,  # 128MB target
    )
    
    assert isinstance(result, PartitionCoalesceResult)
    assert result.before_partitions == 200
    assert result.after_partitions < 200
    assert result.after_partitions >= 1
    assert result.optimization_triggered is True
    assert "coalesced" in result.explanation.lower()
    
    # Evidence-based assertion: smaller partition count
    assert result.evidence["avg_partition_size_before"] < result.evidence["target_partition_size"]


def test_aqe_coalesce_does_not_trigger_for_large_partitions(aqe_simulator, baseline_shape):
    """Test that AQE does NOT coalesce when partitions are already large enough."""
    # Scenario: 200 partitions with 50GB total = 256MB avg per partition
    # This is already larger than target, no coalescing needed
    result = aqe_simulator.simulate_coalesce(
        shape=baseline_shape,
        post_shuffle_bytes=50_000_000_000,  # 50GB
        target_partition_size_bytes=128_000_000,  # 128MB target
    )
    
    assert result.optimization_triggered is False
    assert result.before_partitions == result.after_partitions
    assert "no coalescing" in result.explanation.lower() or "not triggered" in result.explanation.lower()


def test_aqe_coalesce_explains_partition_reduction(aqe_simulator, baseline_shape):
    """Test that coalescing explanation cites runtime statistics."""
    result = aqe_simulator.simulate_coalesce(
        shape=baseline_shape,
        post_shuffle_bytes=500_000_000,  # 500MB
        target_partition_size_bytes=128_000_000,
    )
    
    # Explanation must reference:
    # - Runtime statistics (not static config)
    # - Partition size calculation
    # - Task overhead reduction
    assert "runtime" in result.explanation.lower() or "actual" in result.explanation.lower()
    assert "partition" in result.explanation.lower()
    assert len(result.evidence) > 0
    assert "avg_partition_size_before" in result.evidence


# ============================================================================
# Skew Join Handling Tests
# ============================================================================


def test_aqe_detects_skew_in_join(aqe_simulator, skewed_shape):
    """Test that AQE detects skewed partitions in joins."""
    result = aqe_simulator.simulate_skew_join(
        left_shape=skewed_shape,
        right_shape=skewed_shape,
        skew_threshold_factor=5.0,
    )
    
    assert isinstance(result, SkewHandlingResult)
    assert result.skew_detected is True
    assert result.num_skewed_partitions > 0
    assert "skew" in result.explanation.lower()
    
    # Evidence: must show partition size distribution
    assert "max_partition_size" in result.evidence
    assert "median_partition_size" in result.evidence
    assert result.evidence["max_partition_size"] >= result.evidence["median_partition_size"] * 5


def test_aqe_splits_skewed_partitions(aqe_simulator, skewed_shape):
    """Test that AQE splits large skewed partitions."""
    result = aqe_simulator.simulate_skew_join(
        left_shape=skewed_shape,
        right_shape=skewed_shape,
        skew_threshold_factor=5.0,
    )
    
    assert result.skew_detected is True
    assert result.optimization_applied is True
    assert result.num_splits > 0
    
    # After splitting, task time should be more balanced
    assert result.estimated_task_time_reduction_pct > 0
    assert result.estimated_task_time_reduction_pct <= 100


def test_aqe_skew_not_triggered_for_balanced_data(aqe_simulator, baseline_shape):
    """Test that AQE skew handling does NOT trigger for balanced data."""
    result = aqe_simulator.simulate_skew_join(
        left_shape=baseline_shape,  # skew_factor = 1.0
        right_shape=baseline_shape,
        skew_threshold_factor=5.0,
    )
    
    assert result.skew_detected is False
    assert result.optimization_applied is False
    assert result.num_splits == 0
    assert "balanced" in result.explanation.lower() or "no skew" in result.explanation.lower()


def test_aqe_skew_explanation_is_honest(aqe_simulator, skewed_shape):
    """Test that skew handling explanation is evidence-based and honest."""
    result = aqe_simulator.simulate_skew_join(
        left_shape=skewed_shape,
        right_shape=skewed_shape,
        skew_threshold_factor=5.0,
    )
    
    # Must NOT claim guaranteed improvement
    explanation_lower = result.explanation.lower()
    assert "guarantee" not in explanation_lower
    assert "always" not in explanation_lower
    
    # Must reference runtime detection
    assert "runtime" in explanation_lower or "detected" in explanation_lower
    
    # Must include confidence level
    assert result.confidence in ["high", "medium", "low"]


# ============================================================================
# Dynamic Join Strategy Tests
# ============================================================================


def test_aqe_converts_sortmergejoin_to_broadcast(aqe_simulator, baseline_shape):
    """Test that AQE can dynamically switch join strategy when appropriate."""
    # Scenario: Right side becomes small after filtering
    small_right_shape = DataFrameShape(
        rows=1_000,  # Small enough for broadcast
        partitions=1,
        skew_factor=1.0,
        avg_row_size_bytes=100,
    )
    
    result = aqe_simulator.simulate_dynamic_join_strategy(
        left_shape=baseline_shape,
        right_shape=small_right_shape,
        broadcast_threshold_bytes=10_000_000,  # 10MB
    )
    
    assert isinstance(result, JoinStrategyResult)
    assert result.original_strategy == "SortMergeJoin"
    assert result.optimized_strategy == "BroadcastHashJoin"
    assert result.strategy_changed is True
    
    # Evidence: right side size is below broadcast threshold
    assert result.evidence["right_size_bytes"] < 10_000_000


def test_aqe_does_not_convert_large_table_to_broadcast(aqe_simulator, baseline_shape):
    """Test that AQE does NOT broadcast large tables."""
    large_right_shape = DataFrameShape(
        rows=50_000_000,
        partitions=200,
        skew_factor=1.0,
        avg_row_size_bytes=100,
    )
    
    result = aqe_simulator.simulate_dynamic_join_strategy(
        left_shape=baseline_shape,
        right_shape=large_right_shape,
        broadcast_threshold_bytes=10_000_000,  # 10MB
    )
    
    assert result.strategy_changed is False
    assert result.original_strategy == result.optimized_strategy
    assert "too large" in result.explanation.lower() or "exceeds" in result.explanation.lower()


def test_aqe_join_strategy_cites_runtime_statistics(aqe_simulator, baseline_shape):
    """Test that join strategy explanation references runtime stats."""
    small_right_shape = DataFrameShape(
        rows=1_000,
        partitions=1,
        skew_factor=1.0,
        avg_row_size_bytes=100,
    )
    
    result = aqe_simulator.simulate_dynamic_join_strategy(
        left_shape=baseline_shape,
        right_shape=small_right_shape,
        broadcast_threshold_bytes=10_000_000,
    )
    
    # Must reference actual data statistics, not static analysis
    assert "runtime" in result.explanation.lower() or "actual" in result.explanation.lower()
    assert "statistics" in result.explanation.lower() or "size" in result.explanation.lower()
    
    # Evidence must include measured sizes
    assert "left_size_bytes" in result.evidence
    assert "right_size_bytes" in result.evidence


# ============================================================================
# Full AQE Simulation Tests
# ============================================================================


def test_aqe_full_simulation_combines_optimizations(aqe_simulator, skewed_shape):
    """Test that full AQE simulation applies all applicable optimizations."""
    result = aqe_simulator.simulate_full_aqe(
        shape=skewed_shape,
        operation_type="join",
        aqe_enabled=True,
    )
    
    assert isinstance(result, AQESimulationResult)
    assert len(result.optimizations_applied) > 0
    
    # Should include multiple optimization types
    opt_types = [opt.optimization_type for opt in result.optimizations_applied]
    
    # For skewed join, should detect and handle skew
    assert any(t == AQEOptimizationType.SKEW_JOIN for t in opt_types)


def test_aqe_disabled_returns_no_optimizations(aqe_simulator, baseline_shape):
    """Test that disabling AQE results in no optimizations."""
    result = aqe_simulator.simulate_full_aqe(
        shape=baseline_shape,
        operation_type="groupby",
        aqe_enabled=False,
    )
    
    assert len(result.optimizations_applied) == 0
    assert "disabled" in result.summary.lower() or "not enabled" in result.summary.lower()


def test_aqe_simulation_includes_before_after_metrics(aqe_simulator, baseline_shape):
    """Test that AQE simulation provides before/after comparison metrics."""
    result = aqe_simulator.simulate_full_aqe(
        shape=baseline_shape,
        operation_type="join",
        aqe_enabled=True,
    )
    
    assert result.before_metrics is not None
    assert result.after_metrics is not None
    
    # Metrics should include partition count, shuffle bytes, task count
    assert "partition_count" in result.before_metrics
    assert "partition_count" in result.after_metrics


def test_aqe_simulation_is_data_agnostic(aqe_simulator, baseline_shape):
    """Test that AQE simulation is shape-based, not data-value based."""
    # Same shape should produce same results
    result1 = aqe_simulator.simulate_full_aqe(
        shape=baseline_shape,
        operation_type="groupby",
        aqe_enabled=True,
    )
    
    result2 = aqe_simulator.simulate_full_aqe(
        shape=baseline_shape,
        operation_type="groupby",
        aqe_enabled=True,
    )
    
    # Results should be deterministic for same shape
    assert len(result1.optimizations_applied) == len(result2.optimizations_applied)
    assert result1.summary == result2.summary


def test_aqe_simulation_never_guarantees_improvement(aqe_simulator, skewed_shape):
    """Test that AQE simulation never claims guaranteed performance improvement."""
    result = aqe_simulator.simulate_full_aqe(
        shape=skewed_shape,
        operation_type="join",
        aqe_enabled=True,
    )
    
    # Check all explanations and summary for forbidden language
    all_text = result.summary
    for opt in result.optimizations_applied:
        all_text += " " + opt.explanation
    
    all_text_lower = all_text.lower()
    
    # Forbidden: guaranteed improvements
    assert "guarantee" not in all_text_lower
    assert "always faster" not in all_text_lower
    assert "will improve" not in all_text_lower
    
    # Should use conditional language
    assert any(word in all_text_lower for word in ["can", "may", "typically", "estimated", "potential"])


# ============================================================================
# Edge Cases and Error Handling
# ============================================================================


def test_aqe_handles_zero_partitions_gracefully(aqe_simulator):
    """Test that AQE simulation handles edge case of zero partitions."""
    invalid_shape = DataFrameShape(
        rows=0,
        partitions=0,
        skew_factor=1.0,
        avg_row_size_bytes=100,
    )
    
    result = aqe_simulator.simulate_full_aqe(
        shape=invalid_shape,
        operation_type="filter",
        aqe_enabled=True,
    )
    
    # Should not crash, should explain no data scenario
    assert isinstance(result, AQESimulationResult)
    assert "empty" in result.summary.lower() or "no data" in result.summary.lower()


def test_aqe_handles_extremely_skewed_data(aqe_simulator):
    """Test that AQE handles extreme skew (99% data in one partition)."""
    extreme_skew_shape = DataFrameShape(
        rows=100_000_000,
        partitions=200,
        skew_factor=100.0,  # Extreme skew
        avg_row_size_bytes=100,
    )
    
    result = aqe_simulator.simulate_skew_join(
        left_shape=extreme_skew_shape,
        right_shape=extreme_skew_shape,
        skew_threshold_factor=5.0,
    )
    
    assert result.skew_detected is True
    assert result.num_skewed_partitions > 0
    
    # Should acknowledge severe skew in explanation
    assert "severe" in result.explanation.lower() or "extreme" in result.explanation.lower()
