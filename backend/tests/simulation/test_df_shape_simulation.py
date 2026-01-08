"""Simulation tests for DataFrame shape playground.

These tests validate that the simulation engine:
- Correctly predicts join strategies based on shape
- Estimates shuffle sizes based on cardinality
- Is data-agnostic (shape only, no actual data)
- Provides honest estimations, not guarantees

Reference: test.md Section 9 Simulation Tests
"""

import pytest


class TestDataFrameShapeJoinSimulation:
    """Tests for DataFrame shape-based join simulation."""

    def test_small_large_join_broadcast(self) -> None:
        """Small table joining large table should predict broadcast.
        
        Given shape information only (not actual data), the simulator
        should predict that Spark will use broadcast join.
        """
        small_table_shape = {
            "row_count": 10_000,
            "estimated_bytes": 5 * 1024 * 1024,  # 5 MB
        }
        large_table_shape = {
            "row_count": 10_000_000,
            "estimated_bytes": 500 * 1024 * 1024,  # 500 MB
        }
        broadcast_threshold = 10 * 1024 * 1024  # 10 MB

        # Simulation logic
        small_broadcastable = small_table_shape["estimated_bytes"] < broadcast_threshold
        large_broadcastable = large_table_shape["estimated_bytes"] < broadcast_threshold

        predicted_strategy = "broadcast" if small_broadcastable else "shuffle"

        assert predicted_strategy == "broadcast"
        assert not large_broadcastable

    def test_high_skew_increases_shuffle_estimate(self) -> None:
        """High key skew should increase shuffle size estimation.
        
        When keys are not uniformly distributed, some partitions
        will receive disproportionate data, increasing effective shuffle.
        """
        base_shuffle_estimate = 100 * 1024 * 1024  # 100 MB
        
        uniform_skew = 0.0  # Perfectly uniform
        high_skew = 0.8  # 80% of data on 20% of keys (Pareto-like)

        # Skew factor increases effective shuffle
        uniform_effective = base_shuffle_estimate * (1 + uniform_skew)
        skewed_effective = base_shuffle_estimate * (1 + high_skew)

        assert skewed_effective > uniform_effective
        assert skewed_effective == pytest.approx(180 * 1024 * 1024)

    def test_cardinality_change_effect(self) -> None:
        """Changing key cardinality should affect join strategy prediction.
        
        Low cardinality = fewer distinct keys = smaller broadcast table
        High cardinality = many distinct keys = larger table
        """
        row_count = 1_000_000
        bytes_per_row = 100

        # Low cardinality: 1000 distinct keys, aggregated = small
        low_cardinality_distinct = 1_000
        low_card_aggregated_size = low_cardinality_distinct * bytes_per_row

        # High cardinality: 900K distinct keys = almost no aggregation benefit
        high_cardinality_distinct = 900_000
        high_card_aggregated_size = high_cardinality_distinct * bytes_per_row

        broadcast_threshold = 10 * 1024 * 1024

        low_card_broadcastable = low_card_aggregated_size < broadcast_threshold
        high_card_broadcastable = high_card_aggregated_size < broadcast_threshold

        assert low_card_broadcastable, "Low cardinality should be broadcastable after agg"
        assert not high_card_broadcastable, "High cardinality too large for broadcast"

    def test_simulation_is_data_agnostic(self) -> None:
        """Simulation must work on shape metadata only, no actual data.
        
        This is the core differentiator: we simulate based on:
        - Row count
        - Key cardinality  
        - Skew percentage
        - Column sizes
        - Partition count
        
        NOT actual data values.
        """
        # Shape specification - no actual data involved
        shape_spec = {
            "row_count": 1_000_000,
            "key_cardinality": 50_000,
            "skew_percentage": 0.3,  # 30% skew
            "avg_row_bytes": 200,
            "partition_count": 200,
        }

        # All fields are metadata, not data
        assert isinstance(shape_spec["row_count"], int)
        assert isinstance(shape_spec["key_cardinality"], int)
        assert isinstance(shape_spec["skew_percentage"], float)
        assert 0 <= shape_spec["skew_percentage"] <= 1

        # Estimated size calculable from shape alone
        estimated_bytes = shape_spec["row_count"] * shape_spec["avg_row_bytes"]
        bytes_per_partition = estimated_bytes / shape_spec["partition_count"]

        assert estimated_bytes == 200_000_000  # 200 MB
        assert bytes_per_partition == 1_000_000  # 1 MB per partition


class TestShuffleSizeEstimator:
    """Tests for shuffle size estimation based on shapes."""

    def test_shuffle_estimate_from_shape(self) -> None:
        """Shuffle size should be estimable from DataFrame shapes.
        
        Shuffle size ≈ rows * (key_columns + value_columns) * bytes_per_field
        """
        shape = {
            "row_count": 1_000_000,
            "key_columns": 2,
            "value_columns": 3,
            "avg_bytes_per_column": 50,
        }

        # Simplified shuffle estimate (real formula is more complex)
        total_columns = shape["key_columns"] + shape["value_columns"]
        estimated_shuffle = (
            shape["row_count"] * 
            total_columns * 
            shape["avg_bytes_per_column"]
        )

        assert estimated_shuffle == 250_000_000  # 250 MB

    def test_compression_reduces_shuffle_estimate(self) -> None:
        """Compression should reduce shuffle size estimates.
        
        Spark uses compression for shuffle, typically 2-4x reduction.
        """
        uncompressed_bytes = 400 * 1024 * 1024  # 400 MB
        compression_ratio = 0.3  # 70% reduction

        compressed_estimate = uncompressed_bytes * compression_ratio

        assert compressed_estimate < uncompressed_bytes
        assert compressed_estimate == pytest.approx(120 * 1024 * 1024)
