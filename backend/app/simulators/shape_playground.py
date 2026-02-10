"""DataFrame Shape Playground.

A simulation engine that models how DataFrame shape changes affect
Spark execution characteristics WITHOUT running actual Spark jobs.

Key principle: Spark performance depends on execution shape, not raw data.
This allows honest what-if analysis based on:
- Row counts
- Partition counts
- Data sizes
- Skew factors

IMPORTANT: This is a simulation tool. It provides ESTIMATES with
confidence levels, never guaranteed predictions.
"""

from dataclasses import dataclass, field
from enum import Enum
from typing import Literal, Optional


class PartitionStrategy(str, Enum):
    """Partitioning strategies for DataFrames."""
    
    HASH = "hash"
    RANGE = "range"
    ROUND_ROBIN = "round_robin"
    CUSTOM = "custom"


@dataclass
class DataFrameShape:
    """Model of a DataFrame's shape characteristics.
    
    This captures the structural properties that affect execution,
    without needing actual data.
    """
    
    rows: int
    avg_row_size_bytes: int = 100
    columns: int = 10
    partitions: int = 200
    skew_factor: float = 1.0  # 1.0 = uniform, >1 = some partitions larger
    partition_strategy: PartitionStrategy = PartitionStrategy.HASH
    
    @property
    def total_size_bytes(self) -> int:
        """Total estimated size of DataFrame."""
        return self.rows * self.avg_row_size_bytes
    
    @property
    def partition_size_bytes(self) -> int:
        """Average size per partition."""
        if self.partitions == 0:
            return self.total_size_bytes
        return self.total_size_bytes // self.partitions
    
    @property
    def max_partition_size_bytes(self) -> float:
        """Estimated max partition size accounting for skew."""
        return self.partition_size_bytes * self.skew_factor
    
    @property
    def rows_per_partition(self) -> int:
        """Average rows per partition."""
        if self.partitions == 0:
            return self.rows
        return self.rows // self.partitions


@dataclass
class ShapeChange:
    """Record of how shape changed through an operation."""
    
    operation: str
    input_rows: int
    output_rows: int
    shuffle_bytes: int = 0
    spill_bytes: int = 0
    notes: str = ""


@dataclass
class SimulationResult:
    """Result of a shape simulation.
    
    Always includes confidence levels and ranges rather than
    exact predictions.
    
    Per must-have spec Feature 3, every simulation MUST include:
    - Why Spark chose this path
    - Which parameter influenced the outcome most
    - Confidence level with justification
    """
    
    output_shape: DataFrameShape
    shuffle_bytes: int = 0
    broadcast_bytes: int = 0
    spill_bytes_estimate: int = 0
    cache_memory_bytes: int = 0  # For cache operation
    
    # Task time estimates (ranges, not exact)
    estimated_min_task_ms: int = 0
    estimated_max_task_ms: int = 0
    
    # Confidence and warnings
    confidence: Literal["high", "medium", "low"] = "medium"
    has_warning: bool = False
    warning_message: str = ""
    
    # Spec-required explanation fields
    spark_path_explanation: str = ""  # Why Spark chose this path
    dominant_factor: str = ""  # Which parameter influenced outcome most
    confidence_justification: str = ""  # Why this confidence level
    
    # Additional context
    notes: list[str] = field(default_factory=list)
    
    def add_note(self, note: str) -> None:
        """Add an explanatory note."""
        self.notes.append(note)


@dataclass
class ChainStep:
    """A single step in an operation chain.
    
    Captures intermediate state for step-by-step execution visualization.
    Includes Spark's decision process for educational purposes.
    """
    operation_type: str
    input_shape: DataFrameShape
    output_shape: DataFrameShape
    shuffle_bytes: int = 0
    is_stage_boundary: bool = False
    result: Optional[SimulationResult] = None
    spark_decision: str = ""  # Explains WHY Spark made this choice


@dataclass
class ChainDAGNode:
    """Node in the chain's mini-DAG."""
    label: str
    node_type: str
    stage: int


@dataclass
class ChainDAG:
    """Mini-DAG for operation chain visualization."""
    nodes: list[ChainDAGNode] = field(default_factory=list)


@dataclass
class ChainResult:
    """Result of simulating an operation chain."""
    steps: list[ChainStep] = field(default_factory=list)
    total_shuffle_bytes: int = 0
    stage_count: int = 1
    dag: Optional[ChainDAG] = None


class ShapePlayground:
    """Simulator for DataFrame shape transformations.
    
    Provides what-if analysis based on shape characteristics.
    All results are ESTIMATES with confidence levels.
    """
    
    # Rough estimate: 1MB/s processing rate per task
    BYTES_PER_MS = 1_000_000 / 1000  # 1MB per second = 1000 bytes per ms
    
    # Threshold for broadcast joins
    DEFAULT_BROADCAST_THRESHOLD = 10 * 1024 * 1024  # 10MB
    
    def simulate_filter(
        self,
        input_shape: DataFrameShape,
        selectivity: float,
    ) -> SimulationResult:
        """Simulate filter operation.
        
        Filter is a narrow transformation - no shuffle required.
        
        Args:
            input_shape: Input DataFrame shape.
            selectivity: Fraction of rows that pass filter (0.0-1.0).
            
        Returns:
            SimulationResult with estimated output shape.
        """
        output_rows = int(input_shape.rows * selectivity)
        
        output_shape = DataFrameShape(
            rows=output_rows,
            avg_row_size_bytes=input_shape.avg_row_size_bytes,
            columns=input_shape.columns,
            partitions=input_shape.partitions,  # Partitions unchanged
            skew_factor=input_shape.skew_factor,  # Skew may persist
        )
        
        # Estimate task time based on scan
        min_time = int(input_shape.partition_size_bytes / self.BYTES_PER_MS)
        max_time = int(input_shape.max_partition_size_bytes / self.BYTES_PER_MS)
        
        # Determine dominant factor
        dominant = "selectivity" if selectivity < 0.5 else "partition_count"
        
        return SimulationResult(
            output_shape=output_shape,
            shuffle_bytes=0,  # Filter is narrow
            estimated_min_task_ms=min_time,
            estimated_max_task_ms=max_time,
            confidence="high",  # Filter is predictable
            spark_path_explanation=(
                "Filter is a narrow transformation. Spark processes each partition "
                "independently without moving data between executors. No shuffle is required."
            ),
            dominant_factor=(
                f"The '{dominant}' parameter has the most impact. "
                + (f"With {selectivity*100:.0f}% selectivity, output size is significantly reduced."
                   if selectivity < 0.5 else
                   f"With {input_shape.partitions} partitions, parallelism determines throughput.")
            ),
            confidence_justification=(
                "High confidence because filter behavior is deterministic - "
                "it always processes data locally within partitions."
            ),
        )
    
    def simulate_groupby(
        self,
        input_shape: DataFrameShape,
        num_groups: int,
        aggregation_ratio: Optional[float] = None,
    ) -> SimulationResult:
        """Simulate groupBy operation.
        
        GroupBy is a wide transformation - requires shuffle.
        
        Args:
            input_shape: Input DataFrame shape.
            num_groups: Estimated number of unique groups.
            aggregation_ratio: Output rows / input rows (default: num_groups/rows).
            
        Returns:
            SimulationResult with estimated output shape and shuffle.
        """
        # Calculate output rows
        if aggregation_ratio is not None:
            output_rows = int(input_shape.rows * aggregation_ratio)
        else:
            output_rows = num_groups
        
        # Shuffle is approximately the full input size
        shuffle_bytes = input_shape.total_size_bytes
        
        # Output shape
        output_shape = DataFrameShape(
            rows=output_rows,
            avg_row_size_bytes=input_shape.avg_row_size_bytes,
            columns=input_shape.columns,
            partitions=input_shape.partitions,
            skew_factor=1.0,  # GroupBy may reduce skew (or create it)
        )
        
        # Task time estimates
        # Shuffle adds overhead: read + write + network
        shuffle_overhead_factor = 3.0
        base_time = input_shape.partition_size_bytes / self.BYTES_PER_MS
        min_time = int(base_time * shuffle_overhead_factor)
        max_time = int(base_time * shuffle_overhead_factor * input_shape.skew_factor)
        
        # Check for skew warning
        has_warning = input_shape.skew_factor > 3.0
        warning_msg = ""
        if has_warning:
            warning_msg = (
                f"High skew factor ({input_shape.skew_factor}x) detected. "
                "Some tasks may take significantly longer than average. "
                "Consider salting keys or pre-aggregation."
            )
        
        result = SimulationResult(
            output_shape=output_shape,
            shuffle_bytes=shuffle_bytes,
            estimated_min_task_ms=min_time,
            estimated_max_task_ms=max_time,
            confidence="medium",  # GroupBy depends on key distribution
            has_warning=has_warning,
            warning_message=warning_msg,
            spark_path_explanation=(
                "GroupBy is a wide transformation. Spark must shuffle all data to "
                "colocate rows with identical keys on the same executor for aggregation."
            ),
            dominant_factor=(
                f"The 'skew_factor' parameter has the most impact. "
                f"With {input_shape.skew_factor}x skew, some partitions will process "
                f"significantly more data than others."
                if input_shape.skew_factor > 2.0 else
                f"The 'row_count' parameter has the most impact. "
                f"With {input_shape.rows:,} rows, shuffle volume is ~{shuffle_bytes / 1_000_000:.0f}MB."
            ),
            confidence_justification=(
                "Medium confidence because actual performance depends on key distribution, "
                "which we cannot observe without the data. Skew may be better or worse than estimated."
            ),
        )
        
        result.add_note(f"Estimated {num_groups} unique groups")
        result.add_note(f"Full shuffle required: ~{shuffle_bytes / 1_000_000:.1f}MB")
        
        return result
    
    def simulate_join(
        self,
        left_shape: DataFrameShape,
        right_shape: DataFrameShape,
        join_type: str = "inner",
        selectivity: float = 1.0,
        broadcast_threshold_bytes: int = DEFAULT_BROADCAST_THRESHOLD,
    ) -> SimulationResult:
        """Simulate join operation.
        
        Join behavior depends on table sizes:
        - Small table: Broadcast join (no shuffle)
        - Large tables: Sort-merge join (full shuffle)
        
        Args:
            left_shape: Left DataFrame shape.
            right_shape: Right DataFrame shape.
            join_type: Type of join (inner, left, right, outer).
            selectivity: Fraction of rows that match (0.0-1.0).
            broadcast_threshold_bytes: Max size for broadcast.
            
        Returns:
            SimulationResult with estimated output and shuffle/broadcast.
        """
        # Determine if broadcast is possible
        smaller_size = min(left_shape.total_size_bytes, right_shape.total_size_bytes)
        can_broadcast = smaller_size <= broadcast_threshold_bytes
        
        # Determine which table to broadcast
        broadcast_bytes = 0
        shuffle_bytes = 0
        
        if can_broadcast:
            # Broadcast smaller table
            if left_shape.total_size_bytes <= right_shape.total_size_bytes:
                broadcast_bytes = left_shape.total_size_bytes
            else:
                broadcast_bytes = right_shape.total_size_bytes
        else:
            # Full shuffle of both tables
            shuffle_bytes = left_shape.total_size_bytes + right_shape.total_size_bytes
        
        # Estimate output rows based on join type
        if join_type == "inner":
            output_rows = int(min(left_shape.rows, right_shape.rows) * selectivity)
        elif join_type == "left":
            output_rows = int(left_shape.rows * selectivity)
        elif join_type == "right":
            output_rows = int(right_shape.rows * selectivity)
        else:  # outer
            output_rows = int((left_shape.rows + right_shape.rows) * selectivity)
        
        # Combine row sizes
        combined_row_size = left_shape.avg_row_size_bytes + right_shape.avg_row_size_bytes
        
        # Output partitions based on larger table
        output_partitions = max(left_shape.partitions, right_shape.partitions)
        
        output_shape = DataFrameShape(
            rows=output_rows,
            avg_row_size_bytes=combined_row_size,
            columns=left_shape.columns + right_shape.columns,
            partitions=output_partitions,
        )
        
        # Task time estimates
        total_input = left_shape.total_size_bytes + right_shape.total_size_bytes
        if can_broadcast:
            # Broadcast is faster
            base_time = total_input / output_partitions / self.BYTES_PER_MS
            min_time = int(base_time)
            max_time = int(base_time * max(left_shape.skew_factor, right_shape.skew_factor))
            confidence: Literal["high", "medium", "low"] = "high"
            path_explanation = (
                f"Broadcast Join: The smaller table ({smaller_size / 1_000_000:.1f}MB) is below the "
                f"broadcast threshold ({broadcast_threshold_bytes / 1_000_000:.1f}MB). "
                "Spark broadcasts it to all executors, avoiding shuffle."
            )
            dominant = (
                f"The 'right table size' parameter is dominant. At {smaller_size / 1_000_000:.1f}MB, "
                "it qualifies for broadcast, eliminating expensive shuffle operations."
            )
            confidence_just = (
                "High confidence because broadcast join behavior is predictable - "
                "the small table is replicated to all executors."
            )
        else:
            # Sort-merge join is more complex
            base_time = total_input / output_partitions / self.BYTES_PER_MS
            min_time = int(base_time * 3)  # Shuffle overhead
            max_time = int(base_time * 5 * max(left_shape.skew_factor, right_shape.skew_factor))
            confidence = "medium"
            path_explanation = (
                f"Sort-Merge Join: Both tables exceed broadcast threshold "
                f"({broadcast_threshold_bytes / 1_000_000:.1f}MB). "
                "Spark must shuffle both tables to colocate matching keys."
            )
            dominant = (
                f"The 'combined data size' is dominant. At {total_input / 1_000_000:.1f}MB total, "
                "shuffle volume drives execution time."
            )
            confidence_just = (
                "Medium confidence because sort-merge join performance depends on key distribution, "
                "which affects how evenly data is partitioned after shuffle."
            )
        
        result = SimulationResult(
            output_shape=output_shape,
            shuffle_bytes=shuffle_bytes,
            broadcast_bytes=broadcast_bytes,
            estimated_min_task_ms=min_time,
            estimated_max_task_ms=max_time,
            confidence=confidence,
            spark_path_explanation=path_explanation,
            dominant_factor=dominant,
            confidence_justification=confidence_just,
        )
        
        if can_broadcast:
            result.add_note(f"Broadcast join possible ({broadcast_bytes / 1_000_000:.1f}MB)")
        else:
            result.add_note(f"Sort-merge join required, shuffle ~{shuffle_bytes / 1_000_000:.1f}MB")
        
        return result
    
    def simulate_repartition(
        self,
        input_shape: DataFrameShape,
        new_partitions: int,
    ) -> SimulationResult:
        """Simulate repartition operation.
        
        Repartition causes a full shuffle to redistribute data.
        
        Args:
            input_shape: Input DataFrame shape.
            new_partitions: Target number of partitions.
            
        Returns:
            SimulationResult with estimated shuffle.
        """
        # Full shuffle
        shuffle_bytes = input_shape.total_size_bytes
        
        output_shape = DataFrameShape(
            rows=input_shape.rows,
            avg_row_size_bytes=input_shape.avg_row_size_bytes,
            columns=input_shape.columns,
            partitions=new_partitions,
            skew_factor=1.0,  # Repartition should even out skew
        )
        
        # Task time
        base_time = shuffle_bytes / new_partitions / self.BYTES_PER_MS
        min_time = int(base_time * 2)  # Shuffle overhead
        max_time = int(base_time * 3)
        
        # Determine dominant factor
        partition_change = new_partitions / input_shape.partitions if input_shape.partitions > 0 else 1
        
        result = SimulationResult(
            output_shape=output_shape,
            shuffle_bytes=shuffle_bytes,
            estimated_min_task_ms=min_time,
            estimated_max_task_ms=max_time,
            confidence="high",  # Repartition is predictable
            spark_path_explanation=(
                f"Repartition forces a full shuffle to redistribute {input_shape.rows:,} rows "
                f"into {new_partitions} new partitions. All data moves across the network."
            ),
            dominant_factor=(
                f"The 'new_partitions' parameter is dominant. "
                f"Changing from {input_shape.partitions} to {new_partitions} partitions "
                f"({'increases' if partition_change > 1 else 'decreases'} parallelism by {abs(partition_change - 1) * 100:.0f}%)."
            ),
            confidence_justification=(
                "High confidence because repartition behavior is deterministic - "
                "all data is shuffled using round-robin or hash partitioning."
            ),
        )
        
        result.add_note(f"Full shuffle: {shuffle_bytes / 1_000_000:.1f}MB -> {new_partitions} partitions")
        
        return result
    
    def simulate_coalesce(
        self,
        input_shape: DataFrameShape,
        new_partitions: int,
    ) -> SimulationResult:
        """Simulate coalesce operation.
        
        Coalesce reduces partitions without full shuffle (narrow).
        Can only reduce, not increase partitions.
        
        Args:
            input_shape: Input DataFrame shape.
            new_partitions: Target number of partitions (must be <= current).
            
        Returns:
            SimulationResult with no shuffle.
        """
        # Coalesce cannot increase partitions
        actual_partitions = min(new_partitions, input_shape.partitions)
        
        output_shape = DataFrameShape(
            rows=input_shape.rows,
            avg_row_size_bytes=input_shape.avg_row_size_bytes,
            columns=input_shape.columns,
            partitions=actual_partitions,
            skew_factor=input_shape.skew_factor,  # Skew may worsen
        )
        
        # No shuffle
        min_time = int(input_shape.partition_size_bytes / self.BYTES_PER_MS)
        max_time = int(input_shape.max_partition_size_bytes / self.BYTES_PER_MS)
        
        result = SimulationResult(
            output_shape=output_shape,
            shuffle_bytes=0,
            estimated_min_task_ms=min_time,
            estimated_max_task_ms=max_time,
            confidence="high",
        )
        
        if new_partitions > input_shape.partitions:
            result.has_warning = True
            result.warning_message = (
                f"Coalesce cannot increase partitions. "
                f"Requested {new_partitions} but keeping {input_shape.partitions}. "
                "Use repartition() to increase partitions."
            )
        
        return result

    def simulate_window(
        self,
        input_shape: DataFrameShape,
        partition_columns: int = 1,
        has_order_by: bool = True,
    ) -> SimulationResult:
        """Simulate window function operation.
        
        Window functions with partitionBy require shuffle.
        Without partitionBy, all data goes to single partition (dangerous).
        
        Args:
            input_shape: Input DataFrame shape.
            partition_columns: Number of partition columns (0 = no partition).
            has_order_by: Whether window has ORDER BY clause.
            
        Returns:
            SimulationResult with shuffle estimate.
        """
        if partition_columns == 0:
            # No partitionBy = all data to single partition
            shuffle_bytes = input_shape.total_size_bytes
            output_shape = DataFrameShape(
                rows=input_shape.rows,
                avg_row_size_bytes=input_shape.avg_row_size_bytes,
                columns=input_shape.columns + 1,  # Window adds column
                partitions=1,  # Single partition!
                skew_factor=1.0,
            )
            
            return SimulationResult(
                output_shape=output_shape,
                shuffle_bytes=shuffle_bytes,
                has_warning=True,
                warning_message=(
                    "Window without partitionBy forces all data to single partition. "
                    "This is extremely slow for large datasets. Add a partitionBy clause."
                ),
                confidence="high",
                spark_path_explanation=(
                    "Window functions without partitionBy collect all data to one partition "
                    "to compute the window frame. This eliminates parallelism."
                ),
                dominant_factor=(
                    "The absence of partitionBy is dominant. All data must go to one task."
                ),
                confidence_justification=(
                    "High confidence because window behavior without partitionBy is deterministic."
                ),
            )
        
        # With partitionBy - shuffle to colocate partition keys
        shuffle_bytes = input_shape.total_size_bytes
        
        output_shape = DataFrameShape(
            rows=input_shape.rows,  # Window doesn't change row count
            avg_row_size_bytes=input_shape.avg_row_size_bytes,
            columns=input_shape.columns + 1,  # Window adds column
            partitions=input_shape.partitions,
            skew_factor=input_shape.skew_factor,
        )
        
        base_time = input_shape.partition_size_bytes / self.BYTES_PER_MS
        sort_factor = 2.0 if has_order_by else 1.0
        
        return SimulationResult(
            output_shape=output_shape,
            shuffle_bytes=shuffle_bytes,
            estimated_min_task_ms=int(base_time * 3 * sort_factor),
            estimated_max_task_ms=int(base_time * 5 * sort_factor * input_shape.skew_factor),
            confidence="medium",
            spark_path_explanation=(
                "Window function with partitionBy requires shuffle to colocate rows with "
                "the same partition key. Spark then computes the window frame within each partition."
            ),
            dominant_factor=(
                f"The 'partition_columns' count affects shuffle. With {partition_columns} "
                f"column(s), data is redistributed based on those keys."
            ),
            confidence_justification=(
                "Medium confidence because actual performance depends on key cardinality "
                "and distribution of partition column values."
            ),
        )

    def simulate_distinct(
        self,
        input_shape: DataFrameShape,
        estimated_duplicates_ratio: float = 0.0,
    ) -> SimulationResult:
        """Simulate distinct operation.
        
        Distinct requires shuffle to find duplicates across partitions.
        
        Args:
            input_shape: Input DataFrame shape.
            estimated_duplicates_ratio: Fraction of rows that are duplicates (0.0-1.0).
            
        Returns:
            SimulationResult with shuffle estimate.
        """
        output_rows = int(input_shape.rows * (1 - estimated_duplicates_ratio))
        shuffle_bytes = input_shape.total_size_bytes
        
        output_shape = DataFrameShape(
            rows=output_rows,
            avg_row_size_bytes=input_shape.avg_row_size_bytes,
            columns=input_shape.columns,
            partitions=input_shape.partitions,
            skew_factor=input_shape.skew_factor,
        )
        
        base_time = input_shape.partition_size_bytes / self.BYTES_PER_MS
        
        return SimulationResult(
            output_shape=output_shape,
            shuffle_bytes=shuffle_bytes,
            estimated_min_task_ms=int(base_time * 3),
            estimated_max_task_ms=int(base_time * 4 * input_shape.skew_factor),
            confidence="medium",
            spark_path_explanation=(
                "Distinct requires shuffle to compare rows across partitions. "
                "Spark hashes all columns and redistributes data to find duplicates."
            ),
            dominant_factor=(
                f"The 'duplicates_ratio' affects output size. "
                f"With {estimated_duplicates_ratio*100:.0f}% duplicates, "
                f"output is reduced to {output_rows:,} rows."
            ),
            confidence_justification=(
                "Medium confidence because duplicate detection depends on actual data values, "
                "which we cannot observe without the data."
            ),
        )

    def simulate_union(
        self,
        shape1: DataFrameShape,
        shape2: DataFrameShape,
    ) -> SimulationResult:
        """Simulate union operation.
        
        Union is a narrow transformation - just concatenates DataFrames.
        No shuffle required.
        
        Args:
            shape1: First DataFrame shape.
            shape2: Second DataFrame shape.
            
        Returns:
            SimulationResult with no shuffle.
        """
        output_rows = shape1.rows + shape2.rows
        output_partitions = shape1.partitions + shape2.partitions
        
        # Weighted average row size
        total_size = shape1.total_size_bytes + shape2.total_size_bytes
        avg_row_size = total_size // output_rows if output_rows > 0 else shape1.avg_row_size_bytes
        
        output_shape = DataFrameShape(
            rows=output_rows,
            avg_row_size_bytes=avg_row_size,
            columns=shape1.columns,  # Union requires same schema
            partitions=output_partitions,
            skew_factor=max(shape1.skew_factor, shape2.skew_factor),
        )
        
        base_time = max(shape1.partition_size_bytes, shape2.partition_size_bytes) / self.BYTES_PER_MS
        
        return SimulationResult(
            output_shape=output_shape,
            shuffle_bytes=0,  # No shuffle
            estimated_min_task_ms=int(base_time),
            estimated_max_task_ms=int(base_time * output_shape.skew_factor),
            confidence="high",
            spark_path_explanation=(
                "Union is a narrow transformation that concatenates DataFrames without "
                "moving data. Partitions from both inputs are preserved."
            ),
            dominant_factor=(
                f"The combined partition count is dominant. Output has {output_partitions} "
                f"partitions ({shape1.partitions} + {shape2.partitions})."
            ),
            confidence_justification=(
                "High confidence because union behavior is deterministic - "
                "it simply combines partition lists without shuffling."
            ),
        )

    def simulate_orderby(
        self,
        input_shape: DataFrameShape,
    ) -> SimulationResult:
        """Simulate orderBy (global sort) operation.
        
        OrderBy requires range partitioning shuffle for global ordering.
        
        Args:
            input_shape: Input DataFrame shape.
            
        Returns:
            SimulationResult with shuffle estimate.
        """
        shuffle_bytes = input_shape.total_size_bytes
        
        output_shape = DataFrameShape(
            rows=input_shape.rows,
            avg_row_size_bytes=input_shape.avg_row_size_bytes,
            columns=input_shape.columns,
            partitions=input_shape.partitions,
            skew_factor=1.0,  # Sort produces even distribution
        )
        
        base_time = input_shape.partition_size_bytes / self.BYTES_PER_MS
        
        return SimulationResult(
            output_shape=output_shape,
            shuffle_bytes=shuffle_bytes,
            estimated_min_task_ms=int(base_time * 4),  # Sort is expensive
            estimated_max_task_ms=int(base_time * 6 * input_shape.skew_factor),
            confidence="medium",
            spark_path_explanation=(
                "OrderBy requires range partitioning to achieve global sort order. "
                "Spark samples data to determine range boundaries, then shuffles "
                "each row to its correct partition based on sort key values."
            ),
            dominant_factor=(
                f"The 'data_size' is dominant. Sorting {input_shape.total_size_bytes / 1_000_000:.0f}MB "
                f"requires full shuffle plus sort within each partition."
            ),
            confidence_justification=(
                "Medium confidence because range partitioning effectiveness depends on "
                "sort key distribution, which affects partition balance."
            ),
        )

    def simulate_cache(
        self,
        input_shape: DataFrameShape,
        storage_level: str = "MEMORY_ONLY",
    ) -> SimulationResult:
        """Simulate cache/persist operation.
        
        Cache stores DataFrame in memory (or disk) for reuse.
        No shuffle, but uses memory/disk resources.
        
        Args:
            input_shape: Input DataFrame shape.
            storage_level: Storage level (MEMORY_ONLY, DISK_ONLY, MEMORY_AND_DISK).
            
        Returns:
            SimulationResult with cache memory estimate.
        """
        # In-memory storage typically uses ~2-5x raw size due to object overhead
        memory_overhead = 2.5 if "MEMORY" in storage_level else 1.0
        cache_memory = int(input_shape.total_size_bytes * memory_overhead)
        
        output_shape = input_shape  # Cache doesn't change shape
        
        base_time = input_shape.partition_size_bytes / self.BYTES_PER_MS
        
        if "DISK" in storage_level:
            spark_explanation = (
                "Cache with DISK storage writes partitions to local disk. "
                "This adds I/O overhead but prevents recomputation on reuse."
            )
            disk_note = "Disk I/O will add latency on cache reads."
        else:
            spark_explanation = (
                "Cache with MEMORY storage keeps partitions in executor memory. "
                "Fast access but consumes memory that could be used for computation."
            )
            disk_note = ""
        
        result = SimulationResult(
            output_shape=output_shape,
            shuffle_bytes=0,
            cache_memory_bytes=cache_memory,
            estimated_min_task_ms=int(base_time),
            estimated_max_task_ms=int(base_time * input_shape.skew_factor),
            confidence="high",
            spark_path_explanation=spark_explanation,
            dominant_factor=(
                f"The 'storage_level' is dominant. {storage_level} requires "
                f"~{cache_memory / 1_000_000:.0f}MB of storage across the cluster."
            ),
            confidence_justification=(
                "High confidence because cache behavior is deterministic - "
                "all partitions are stored according to the specified level."
            ),
        )
        
        if disk_note:
            result.add_note(disk_note)
        
        return result

    def _build_step_decision_explanation(
        self,
        operation_type: str,
        result: SimulationResult,
        input_shape: DataFrameShape,
        output_shape: DataFrameShape,
    ) -> str:
        """Build step-by-step explanation of Spark's decision process.
        
        This creates educational explanations showing Spark's "thought process"
        for each operation, helping users understand WHY decisions were made.
        
        Args:
            operation_type: Type of operation (filter, join, groupby, etc.)
            result: SimulationResult containing decision details
            input_shape: Shape before operation
            output_shape: Shape after operation
            
        Returns:
            Human-readable explanation of Spark's decision
        """
        # Use the existing spark_path_explanation as base
        base_explanation = result.spark_path_explanation
        
        # Add step-specific context
        if operation_type == "join":
            if result.broadcast_bytes > 0:
                right_size_mb = result.broadcast_bytes / 1_000_000
                threshold_mb = ShapePlayground.DEFAULT_BROADCAST_THRESHOLD / 1_000_000
                return (
                    f"Checking join strategy... Right table is {right_size_mb:.1f}MB. "
                    f"Since this is below broadcast threshold ({threshold_mb:.1f}MB), "
                    f"Spark chooses Broadcast Hash Join to avoid shuffle."
                )
            else:
                threshold_mb = ShapePlayground.DEFAULT_BROADCAST_THRESHOLD / 1_000_000
                return (
                    f"Checking join strategy... Right table is too large for broadcast "
                    f"(>{threshold_mb:.1f}MB). "
                    f"Spark chooses Sort-Merge Join, which requires shuffle of "
                    f"{result.shuffle_bytes / 1_000_000:.1f}MB."
                )
        
        elif operation_type == "groupby":
            return (
                f"GroupBy requires colocating rows with same keys. "
                f"Spark triggers shuffle of {result.shuffle_bytes / 1_000_000:.1f}MB "
                f"across {output_shape.partitions} partitions, creating a stage boundary."
            )
        
        elif operation_type == "filter":
            reduction_pct = (1 - output_shape.rows / input_shape.rows) * 100 if input_shape.rows > 0 else 0
            return (
                f"Filter is a narrow transformation - each partition processes independently. "
                f"Reduced data by {reduction_pct:.1f}%, keeping {output_shape.partitions} partitions. "
                f"No shuffle needed."
            )
        
        elif operation_type == "repartition":
            return (
                f"Repartition changes partition count from {input_shape.partitions} to {output_shape.partitions}. "
                f"Requires full shuffle of {result.shuffle_bytes / 1_000_000:.1f}MB to redistribute data evenly."
            )
        
        elif operation_type == "coalesce":
            return (
                f"Coalesce reduces partitions from {input_shape.partitions} to {output_shape.partitions} "
                f"by combining existing partitions. No shuffle required (narrow transformation)."
            )
        
        elif operation_type == "window":
            if result.shuffle_bytes > 0:
                return (
                    f"Window function with PARTITION BY requires grouping data. "
                    f"Spark shuffles {result.shuffle_bytes / 1_000_000:.1f}MB to colocate partition keys."
                )
            else:
                return (
                    f"Window function without PARTITION BY processes each partition independently. "
                    f"No shuffle needed."
                )
        
        elif operation_type == "distinct":
            return (
                f"Distinct requires finding duplicates across partitions. "
                f"Spark shuffles {result.shuffle_bytes / 1_000_000:.1f}MB to identify unique rows."
            )
        
        elif operation_type == "orderby":
            return (
                f"Global ordering requires range partitioning. "
                f"Spark shuffles {result.shuffle_bytes / 1_000_000:.1f}MB using range partitioner "
                f"to create sorted partitions."
            )
        
        elif operation_type == "cache":
            storage_mb = result.cache_memory_bytes / 1_000_000
            return (
                f"Caching {storage_mb:.1f}MB in memory for faster reuse. "
                f"Trade-off: saves recomputation time but consumes executor memory."
            )
        
        elif operation_type == "union":
            return (
                f"Union concatenates DataFrames without shuffling. "
                f"Resulting DataFrame has {output_shape.partitions} partitions "
                f"({input_shape.partitions} from each side)."
            )
        
        # Fallback to base explanation
        return base_explanation

    def simulate_chain(
        self,
        input_shape: DataFrameShape,
        operations: list[dict],
    ) -> ChainResult:
        """Simulate a chain of operations.
        
        Per dataframe-playground-spec.md Section 5.3, users build operation chains
        and see how data flows through them.
        
        Args:
            input_shape: Starting DataFrame shape.
            operations: List of operation dicts with type and parameters.
            
        Returns:
            ChainResult with steps, total shuffle, stage count, and DAG.
        """
        steps: list[ChainStep] = []
        current_shape = input_shape
        total_shuffle = 0
        stage_count = 1  # Start with read stage
        dag_nodes: list[ChainDAGNode] = [
            ChainDAGNode(label="Read", node_type="read", stage=0)
        ]
        current_stage = 0
        
        for op in operations:
            op_type = op.get("type", "")
            result: Optional[SimulationResult] = None
            is_stage_boundary = False
            
            if op_type == "filter":
                selectivity = op.get("selectivity", 0.5)
                result = self.simulate_filter(current_shape, selectivity)
                
            elif op_type == "groupby":
                num_groups = op.get("num_groups", 1000)
                result = self.simulate_groupby(current_shape, num_groups)
                is_stage_boundary = True
                
            elif op_type == "join":
                right_rows = op.get("right_rows", 100000)
                right_shape = DataFrameShape(
                    rows=right_rows,
                    avg_row_size_bytes=current_shape.avg_row_size_bytes,
                    partitions=current_shape.partitions,
                )
                result = self.simulate_join(current_shape, right_shape)
                # Shuffle join creates stage boundary
                if result.shuffle_bytes > 0:
                    is_stage_boundary = True
                
            elif op_type == "repartition":
                new_partitions = op.get("new_partitions", 200)
                result = self.simulate_repartition(current_shape, new_partitions)
                is_stage_boundary = True
                
            elif op_type == "distinct":
                dup_ratio = op.get("duplicates_ratio", 0.0)
                result = self.simulate_distinct(current_shape, dup_ratio)
                is_stage_boundary = True
                
            elif op_type == "orderby":
                result = self.simulate_orderby(current_shape)
                is_stage_boundary = True
                
            elif op_type == "window":
                partition_cols = op.get("partition_columns", 1)
                result = self.simulate_window(current_shape, partition_cols)
                is_stage_boundary = True
                
            elif op_type == "union":
                other_rows = op.get("other_rows", current_shape.rows)
                other_shape = DataFrameShape(
                    rows=other_rows,
                    avg_row_size_bytes=current_shape.avg_row_size_bytes,
                    partitions=current_shape.partitions,
                )
                result = self.simulate_union(current_shape, other_shape)
                
            elif op_type == "cache":
                storage = op.get("storage_level", "MEMORY_ONLY")
                result = self.simulate_cache(current_shape, storage)
            
            if result:
                if is_stage_boundary:
                    current_stage += 1
                    stage_count += 1
                
                # Build Spark decision explanation for step-by-step mode
                spark_decision = self._build_step_decision_explanation(
                    op_type, result, current_shape, result.output_shape
                )
                
                step = ChainStep(
                    operation_type=op_type,
                    input_shape=current_shape,
                    output_shape=result.output_shape,
                    shuffle_bytes=result.shuffle_bytes,
                    is_stage_boundary=is_stage_boundary,
                    result=result,
                    spark_decision=spark_decision,
                )
                steps.append(step)
                
                total_shuffle += result.shuffle_bytes
                current_shape = result.output_shape
                
                # Build DAG node
                node_type = "shuffle" if is_stage_boundary else "narrow_op"
                dag_nodes.append(ChainDAGNode(
                    label=op_type.title(),
                    node_type=node_type,
                    stage=current_stage,
                ))
        
        return ChainResult(
            steps=steps,
            total_shuffle_bytes=total_shuffle,
            stage_count=stage_count,
            dag=ChainDAG(nodes=dag_nodes),
        )
