"""
Adaptive Query Execution (AQE) Simulator.

This module simulates how Spark's AQE feature optimizes queries at runtime.
AQE makes three main optimizations:
1. Coalesce shuffle partitions (reduce small partitions)
2. Handle skewed joins (split large partitions)
3. Dynamically switch join strategies (e.g., SortMerge → Broadcast)

All simulations are shape-based and evidence-driven.
"""

from dataclasses import dataclass, field
from enum import Enum
from typing import Literal, Optional

from app.simulators.shape_playground import DataFrameShape


class AQEOptimizationType(str, Enum):
    """Types of AQE optimizations."""
    
    COALESCE_PARTITIONS = "coalesce_partitions"
    SKEW_JOIN = "skew_join"
    DYNAMIC_JOIN_STRATEGY = "dynamic_join_strategy"


@dataclass
class PartitionCoalesceResult:
    """Result of partition coalescing simulation."""
    
    before_partitions: int
    after_partitions: int
    optimization_triggered: bool
    explanation: str
    evidence: dict[str, float] = field(default_factory=dict)
    confidence: Literal["high", "medium", "low"] = "high"


@dataclass
class SkewHandlingResult:
    """Result of skew join handling simulation."""
    
    skew_detected: bool
    optimization_applied: bool
    num_skewed_partitions: int
    num_splits: int
    estimated_task_time_reduction_pct: float
    explanation: str
    evidence: dict[str, float] = field(default_factory=dict)
    confidence: Literal["high", "medium", "low"] = "medium"


@dataclass
class JoinStrategyResult:
    """Result of dynamic join strategy switching."""
    
    original_strategy: str
    optimized_strategy: str
    strategy_changed: bool
    explanation: str
    evidence: dict[str, float] = field(default_factory=dict)
    confidence: Literal["high", "medium", "low"] = "high"


@dataclass
class AQEOptimization:
    """Single AQE optimization that was applied."""
    
    optimization_type: AQEOptimizationType
    explanation: str
    before_value: str
    after_value: str
    confidence: Literal["high", "medium", "low"]


@dataclass
class AQESimulationResult:
    """Full AQE simulation result."""
    
    aqe_enabled: bool
    optimizations_applied: list[AQEOptimization]
    before_metrics: dict[str, float]
    after_metrics: dict[str, float]
    summary: str
    confidence: Literal["high", "medium", "low"] = "medium"


class AQESimulator:
    """Simulator for Adaptive Query Execution (AQE) optimizations.
    
    Simulates how AQE would optimize a query at runtime based on
    actual partition statistics.
    """
    
    # Default target partition size for coalescing (128MB)
    DEFAULT_TARGET_PARTITION_SIZE = 128 * 1024 * 1024
    
    # Skew threshold: partition is skewed if it's N× larger than median
    DEFAULT_SKEW_THRESHOLD_FACTOR = 5.0
    
    # Default broadcast threshold (10MB)
    DEFAULT_BROADCAST_THRESHOLD = 10 * 1024 * 1024
    
    def simulate_coalesce(
        self,
        shape: DataFrameShape,
        post_shuffle_bytes: int,
        target_partition_size_bytes: int = DEFAULT_TARGET_PARTITION_SIZE,
    ) -> PartitionCoalesceResult:
        """Simulate AQE partition coalescing after shuffle.
        
        AQE reads runtime statistics after shuffle completes and decides
        whether to coalesce small partitions.
        
        Args:
            shape: Current DataFrame shape
            post_shuffle_bytes: Total shuffle output size
            target_partition_size_bytes: Target size per partition
            
        Returns:
            PartitionCoalesceResult with before/after partition count
        """
        if shape.partitions == 0 or post_shuffle_bytes == 0:
            return PartitionCoalesceResult(
                before_partitions=0,
                after_partitions=0,
                optimization_triggered=False,
                explanation="Empty dataset — no partitions to coalesce",
                evidence={},
            )
        
        avg_partition_size = post_shuffle_bytes / shape.partitions
        
        evidence = {
            "avg_partition_size_before": avg_partition_size,
            "target_partition_size": target_partition_size_bytes,
            "total_shuffle_bytes": post_shuffle_bytes,
        }
        
        # AQE coalesces if avg partition size is smaller than target
        if avg_partition_size < target_partition_size_bytes:
            # Calculate new partition count to reach target size
            optimal_partitions = max(1, int(post_shuffle_bytes / target_partition_size_bytes))
            
            explanation = (
                f"AQE detected small partitions at runtime after shuffle. "
                f"Average partition size was {self._format_bytes(avg_partition_size)}, "
                f"below target of {self._format_bytes(target_partition_size_bytes)}. "
                f"Coalesced {shape.partitions} partitions → {optimal_partitions} partitions "
                f"to reduce task overhead."
            )
            
            return PartitionCoalesceResult(
                before_partitions=shape.partitions,
                after_partitions=optimal_partitions,
                optimization_triggered=True,
                explanation=explanation,
                evidence=evidence,
            )
        else:
            explanation = (
                f"No coalescing triggered. "
                f"Average partition size ({self._format_bytes(avg_partition_size)}) "
                f"already meets or exceeds target ({self._format_bytes(target_partition_size_bytes)})."
            )
            
            return PartitionCoalesceResult(
                before_partitions=shape.partitions,
                after_partitions=shape.partitions,
                optimization_triggered=False,
                explanation=explanation,
                evidence=evidence,
            )
    
    def simulate_skew_join(
        self,
        left_shape: DataFrameShape,
        right_shape: DataFrameShape,
        skew_threshold_factor: float = DEFAULT_SKEW_THRESHOLD_FACTOR,
    ) -> SkewHandlingResult:
        """Simulate AQE skew join handling.
        
        AQE detects skewed partitions at runtime by examining partition sizes
        after shuffle. If a partition is N× larger than median, AQE splits it.
        
        Args:
            left_shape: Left DataFrame shape
            right_shape: Right DataFrame shape
            skew_threshold_factor: Threshold for skew detection
            
        Returns:
            SkewHandlingResult with skew detection and handling details
        """
        if left_shape.partitions == 0 or right_shape.partitions == 0:
            return SkewHandlingResult(
                skew_detected=False,
                optimization_applied=False,
                num_skewed_partitions=0,
                num_splits=0,
                estimated_task_time_reduction_pct=0.0,
                explanation="Empty dataset — no skew to handle",
                evidence={},
            )
        
        # Calculate partition sizes based on skew factor
        # In a skewed distribution, if skew_factor = 5:
        # - Most partitions have avg/skew_factor size
        # - A few partitions have much larger size
        # - max_partition_size / median_partition_size = skew_factor
        total_bytes = left_shape.rows * left_shape.avg_row_size_bytes
        avg_partition_size = total_bytes / left_shape.partitions
        
        # Model: median is smaller, max is larger to maintain avg
        # If skew_factor = 5, median ~ avg/2, max ~ avg * skew_factor * 2
        median_partition_size = avg_partition_size / max(1.5, left_shape.skew_factor / 2)
        max_partition_size = median_partition_size * left_shape.skew_factor
        
        evidence = {
            "max_partition_size": max_partition_size,
            "median_partition_size": median_partition_size,
            "skew_factor": max_partition_size / median_partition_size if median_partition_size > 0 else 0,
        }
        
        # Skew detected if max is significantly larger than median
        skew_detected = left_shape.skew_factor >= skew_threshold_factor
        
        if not skew_detected:
            return SkewHandlingResult(
                skew_detected=False,
                optimization_applied=False,
                num_skewed_partitions=0,
                num_splits=0,
                estimated_task_time_reduction_pct=0.0,
                explanation=(
                    f"No significant skew detected. "
                    f"Partition sizes are balanced (max/median ratio: {left_shape.skew_factor:.1f}×)."
                ),
                evidence=evidence,
            )
        
        # Skew detected — apply optimization
        # Estimate number of skewed partitions (heuristic: ~5-10% of partitions)
        num_skewed = max(1, int(left_shape.partitions * 0.05))
        
        # Split each skewed partition into multiple smaller partitions
        # Heuristic: split into ceil(skew_factor) parts
        splits_per_partition = int(left_shape.skew_factor)
        total_splits = num_skewed * splits_per_partition
        
        # Task time reduction: skewed tasks took factor× longer
        # After splitting, longest task is ~1/factor of original
        reduction_pct = min(100, (1 - 1 / left_shape.skew_factor) * 100)
        
        # Add severity descriptor for extreme skew
        severity = ""
        if left_shape.skew_factor >= 50:
            severity = "Extreme "
        elif left_shape.skew_factor >= 20:
            severity = "Severe "
        
        explanation = (
            f"{severity}Skew detected at runtime. "
            f"Found {num_skewed} partitions that were {left_shape.skew_factor:.1f}× larger than median "
            f"({self._format_bytes(max_partition_size)} vs {self._format_bytes(median_partition_size)}). "
            f"Split skewed partitions into {splits_per_partition} smaller partitions each, "
            f"potentially reducing longest task time by ~{reduction_pct:.0f}%."
        )
        
        return SkewHandlingResult(
            skew_detected=True,
            optimization_applied=True,
            num_skewed_partitions=num_skewed,
            num_splits=total_splits,
            estimated_task_time_reduction_pct=reduction_pct,
            explanation=explanation,
            evidence=evidence,
        )
    
    def simulate_dynamic_join_strategy(
        self,
        left_shape: DataFrameShape,
        right_shape: DataFrameShape,
        broadcast_threshold_bytes: int = DEFAULT_BROADCAST_THRESHOLD,
    ) -> JoinStrategyResult:
        """Simulate AQE dynamic join strategy switching.
        
        AQE reads actual table sizes at runtime and can switch from
        SortMergeJoin to BroadcastHashJoin if one side is small enough.
        
        Args:
            left_shape: Left DataFrame shape
            right_shape: Right DataFrame shape
            broadcast_threshold_bytes: Max size for broadcast
            
        Returns:
            JoinStrategyResult with strategy decision
        """
        left_size = left_shape.rows * left_shape.avg_row_size_bytes
        right_size = right_shape.rows * right_shape.avg_row_size_bytes
        
        evidence = {
            "left_size_bytes": left_size,
            "right_size_bytes": right_size,
            "broadcast_threshold_bytes": broadcast_threshold_bytes,
        }
        
        # Default strategy for large tables is SortMergeJoin
        original_strategy = "SortMergeJoin"
        
        # AQE can switch to BroadcastHashJoin if smaller side fits in memory
        smaller_size = min(left_size, right_size)
        
        if smaller_size <= broadcast_threshold_bytes:
            # Switch to broadcast
            explanation = (
                f"AQE detected at runtime that the smaller table size "
                f"({self._format_bytes(smaller_size)}) fits below broadcast threshold "
                f"({self._format_bytes(broadcast_threshold_bytes)}). "
                f"Dynamically switched from {original_strategy} to BroadcastHashJoin, "
                f"eliminating shuffle on the smaller side."
            )
            
            return JoinStrategyResult(
                original_strategy=original_strategy,
                optimized_strategy="BroadcastHashJoin",
                strategy_changed=True,
                explanation=explanation,
                evidence=evidence,
            )
        else:
            # Keep SortMergeJoin
            explanation = (
                f"Both tables are too large to broadcast "
                f"(smaller side: {self._format_bytes(smaller_size)}, "
                f"threshold: {self._format_bytes(broadcast_threshold_bytes)}). "
                f"Keeping {original_strategy} strategy."
            )
            
            return JoinStrategyResult(
                original_strategy=original_strategy,
                optimized_strategy=original_strategy,
                strategy_changed=False,
                explanation=explanation,
                evidence=evidence,
            )
    
    def simulate_full_aqe(
        self,
        shape: DataFrameShape,
        operation_type: str,
        aqe_enabled: bool = True,
    ) -> AQESimulationResult:
        """Simulate full AQE optimization for a given operation.
        
        This combines all AQE optimizations that would apply.
        
        Args:
            shape: DataFrame shape
            operation_type: Operation type (join, groupby, filter, etc.)
            aqe_enabled: Whether AQE is enabled
            
        Returns:
            AQESimulationResult with all applicable optimizations
        """
        if not aqe_enabled:
            return AQESimulationResult(
                aqe_enabled=False,
                optimizations_applied=[],
                before_metrics=self._get_metrics(shape),
                after_metrics=self._get_metrics(shape),
                summary="AQE is disabled — no runtime optimizations applied.",
            )
        
        if shape.partitions == 0:
            return AQESimulationResult(
                aqe_enabled=True,
                optimizations_applied=[],
                before_metrics={},
                after_metrics={},
                summary="Empty dataset — no data to optimize.",
            )
        
        optimizations = []
        before_metrics = self._get_metrics(shape)
        after_metrics = before_metrics.copy()
        
        # Apply relevant optimizations based on operation type
        if operation_type in ["join", "groupby", "repartition"]:
            # These operations produce shuffles where coalescing may help
            total_bytes = shape.rows * shape.avg_row_size_bytes
            coalesce_result = self.simulate_coalesce(shape, total_bytes)
            
            if coalesce_result.optimization_triggered:
                optimizations.append(AQEOptimization(
                    optimization_type=AQEOptimizationType.COALESCE_PARTITIONS,
                    explanation=coalesce_result.explanation,
                    before_value=f"{coalesce_result.before_partitions} partitions",
                    after_value=f"{coalesce_result.after_partitions} partitions",
                    confidence=coalesce_result.confidence,
                ))
                after_metrics["partition_count"] = coalesce_result.after_partitions
        
        if operation_type == "join" and shape.skew_factor >= self.DEFAULT_SKEW_THRESHOLD_FACTOR:
            # Skewed join — apply skew handling
            skew_result = self.simulate_skew_join(shape, shape)
            
            if skew_result.optimization_applied:
                optimizations.append(AQEOptimization(
                    optimization_type=AQEOptimizationType.SKEW_JOIN,
                    explanation=skew_result.explanation,
                    before_value=f"{skew_result.num_skewed_partitions} skewed partitions",
                    after_value=f"Split into {skew_result.num_splits} partitions",
                    confidence=skew_result.confidence,
                ))
        
        # Generate summary
        if optimizations:
            summary = (
                f"AQE applied {len(optimizations)} optimization(s): "
                f"{', '.join(opt.optimization_type.value for opt in optimizations)}. "
                f"These changes happened at runtime based on actual data statistics."
            )
        else:
            summary = (
                "AQE is enabled but did not trigger any optimizations. "
                "Current execution plan is already efficient for this data shape."
            )
        
        return AQESimulationResult(
            aqe_enabled=True,
            optimizations_applied=optimizations,
            before_metrics=before_metrics,
            after_metrics=after_metrics,
            summary=summary,
        )
    
    def _get_metrics(self, shape: DataFrameShape) -> dict[str, float]:
        """Get metrics for a given shape."""
        return {
            "partition_count": shape.partitions,
            "row_count": shape.rows,
            "total_size_bytes": shape.rows * shape.avg_row_size_bytes,
            "skew_factor": shape.skew_factor,
        }
    
    def _format_bytes(self, bytes_val: float) -> str:
        """Format bytes for human readability."""
        for unit in ["B", "KB", "MB", "GB", "TB"]:
            if bytes_val < 1024:
                return f"{bytes_val:.1f} {unit}"
            bytes_val /= 1024
        return f"{bytes_val:.1f} PB"
