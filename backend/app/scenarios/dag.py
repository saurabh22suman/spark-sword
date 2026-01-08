"""Scenario DAG Component.

Per scenario-dag-spec.md Part A, the Scenario DAG is a teaching DAG that:
- Shows how Spark executes each scenario
- Makes stage boundaries and shuffles obvious at a glance
- Is static and deterministic per scenario

The Scenario DAG MUST:
- Represent logical Spark execution shape
- Be embedded in scenario detail view
- Have explicit stage boundaries

The Scenario DAG MUST NOT:
- Depend on real event logs
- Attempt task-level detail
- Expose executor metrics
"""

from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Optional


class DAGNodeType(str, Enum):
    """Allowed node types per spec A3.2.
    
    No custom nodes allowed.
    """
    READ = "read"
    NARROW_OP = "narrow_op"
    SHUFFLE = "shuffle"
    JOIN = "join"
    AGGREGATE = "aggregate"
    SORT = "sort"
    WRITE = "write"


@dataclass
class ScenarioDAGNode:
    """A node in the Scenario DAG.
    
    Per spec A4, every node MUST provide:
    - What Spark is doing
    - Why it is required
    """
    node_type: DAGNodeType
    label: str
    stage: int
    what_spark_does: str  # Mandatory explanation
    why_required: str     # Mandatory explanation
    is_stage_boundary: bool = False
    
    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary for API response."""
        return {
            "node_type": self.node_type.value,
            "label": self.label,
            "stage": self.stage,
            "what_spark_does": self.what_spark_does,
            "why_required": self.why_required,
            "is_stage_boundary": self.is_stage_boundary,
        }


@dataclass
class ScenarioDAG:
    """Complete Scenario DAG with nodes.
    
    Per spec A3.1:
    - Orientation: top → bottom
    - Nodes stacked vertically
    - One job only
    """
    nodes: list[ScenarioDAGNode] = field(default_factory=list)
    stage_count: int = 1
    shuffle_count: int = 0
    
    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary for API response."""
        return {
            "nodes": [n.to_dict() for n in self.nodes],
            "stage_count": self.stage_count,
            "shuffle_count": self.shuffle_count,
        }


# ============================================================
# DAG Definitions for Each Scenario
# ============================================================

def _build_simple_filter_dag() -> ScenarioDAG:
    """DAG for Scenario 1: Simple Filter."""
    return ScenarioDAG(
        nodes=[
            ScenarioDAGNode(
                node_type=DAGNodeType.READ,
                label="Read",
                stage=1,
                what_spark_does="Scans input data from storage (parquet, CSV, etc.)",
                why_required="Data must be loaded before any processing can occur",
            ),
            ScenarioDAGNode(
                node_type=DAGNodeType.NARROW_OP,
                label="Filter",
                stage=1,
                what_spark_does="Evaluates filter predicate on each row independently",
                why_required="Invalid records must be removed before downstream processing",
            ),
            ScenarioDAGNode(
                node_type=DAGNodeType.WRITE,
                label="Write",
                stage=1,
                what_spark_does="Writes filtered rows to output location",
                why_required="Results must be persisted for downstream consumption",
            ),
        ],
        stage_count=1,
        shuffle_count=0,
    )


def _build_groupby_aggregation_dag() -> ScenarioDAG:
    """DAG for Scenario 2: GroupBy Aggregation."""
    return ScenarioDAG(
        nodes=[
            ScenarioDAGNode(
                node_type=DAGNodeType.READ,
                label="Read",
                stage=1,
                what_spark_does="Scans order data from storage",
                why_required="Raw data must be loaded for aggregation",
            ),
            ScenarioDAGNode(
                node_type=DAGNodeType.SHUFFLE,
                label="Shuffle",
                stage=2,
                what_spark_does="Redistributes all rows with the same key to the same executor",
                why_required="GroupBy requires all rows with identical keys to be colocated for aggregation",
                is_stage_boundary=True,
            ),
            ScenarioDAGNode(
                node_type=DAGNodeType.AGGREGATE,
                label="Aggregate",
                stage=2,
                what_spark_does="Computes aggregate function (sum, count, avg) per group",
                why_required="Business logic requires totals per customer",
            ),
            ScenarioDAGNode(
                node_type=DAGNodeType.WRITE,
                label="Write",
                stage=2,
                what_spark_does="Writes aggregated results to output",
                why_required="Results must be persisted",
            ),
        ],
        stage_count=2,
        shuffle_count=1,
    )


def _build_join_without_broadcast_dag() -> ScenarioDAG:
    """DAG for Scenario 3: Join Without Broadcast (Sort-Merge Join)."""
    return ScenarioDAG(
        nodes=[
            ScenarioDAGNode(
                node_type=DAGNodeType.READ,
                label="Read Orders",
                stage=1,
                what_spark_does="Scans large orders table from storage",
                why_required="Left side of join must be loaded",
            ),
            ScenarioDAGNode(
                node_type=DAGNodeType.SHUFFLE,
                label="Shuffle Orders",
                stage=2,
                what_spark_does="Redistributes orders by join key (customer_id)",
                why_required="Sort-merge join requires both sides partitioned by join key",
                is_stage_boundary=True,
            ),
            ScenarioDAGNode(
                node_type=DAGNodeType.READ,
                label="Read Customers",
                stage=1,
                what_spark_does="Scans customers table from storage",
                why_required="Right side of join must be loaded",
            ),
            ScenarioDAGNode(
                node_type=DAGNodeType.SHUFFLE,
                label="Shuffle Customers",
                stage=2,
                what_spark_does="Redistributes customers by join key (customer_id)",
                why_required="Both sides must be partitioned identically for merge",
                is_stage_boundary=True,
            ),
            ScenarioDAGNode(
                node_type=DAGNodeType.JOIN,
                label="Sort-Merge Join",
                stage=3,
                what_spark_does="Merges sorted partitions from both sides by matching keys",
                why_required="Combining order and customer data per business requirement",
            ),
            ScenarioDAGNode(
                node_type=DAGNodeType.WRITE,
                label="Write",
                stage=3,
                what_spark_does="Writes enriched order data to output",
                why_required="Results must be persisted",
            ),
        ],
        stage_count=3,
        shuffle_count=2,
    )


def _build_skewed_join_key_dag() -> ScenarioDAG:
    """DAG for Scenario 4: Skewed Join Key."""
    return ScenarioDAG(
        nodes=[
            ScenarioDAGNode(
                node_type=DAGNodeType.READ,
                label="Read Activity",
                stage=1,
                what_spark_does="Scans user activity data (skewed by country)",
                why_required="Activity data must be loaded for enrichment",
            ),
            ScenarioDAGNode(
                node_type=DAGNodeType.SHUFFLE,
                label="Shuffle Activity",
                stage=2,
                what_spark_does="Redistributes activity by country key (80% goes to one partition)",
                why_required="Join requires matching keys on same executor",
                is_stage_boundary=True,
            ),
            ScenarioDAGNode(
                node_type=DAGNodeType.READ,
                label="Read Countries",
                stage=1,
                what_spark_does="Scans country dimension table",
                why_required="Country metadata must be loaded",
            ),
            ScenarioDAGNode(
                node_type=DAGNodeType.SHUFFLE,
                label="Shuffle Countries",
                stage=2,
                what_spark_does="Redistributes countries by key",
                why_required="Both sides must use same partitioning",
                is_stage_boundary=True,
            ),
            ScenarioDAGNode(
                node_type=DAGNodeType.JOIN,
                label="Skewed Join",
                stage=3,
                what_spark_does="Joins activity with country (one task processes 80% of data)",
                why_required="Enriching activity with country metadata",
            ),
            ScenarioDAGNode(
                node_type=DAGNodeType.WRITE,
                label="Write",
                stage=3,
                what_spark_does="Writes results (overall time dominated by straggler task)",
                why_required="Results must be persisted",
            ),
        ],
        stage_count=3,
        shuffle_count=2,
    )


def _build_too_many_output_files_dag() -> ScenarioDAG:
    """DAG for Scenario 5: Too Many Output Files."""
    return ScenarioDAG(
        nodes=[
            ScenarioDAGNode(
                node_type=DAGNodeType.READ,
                label="Read",
                stage=1,
                what_spark_does="Scans input data for aggregation",
                why_required="Raw data must be loaded",
            ),
            ScenarioDAGNode(
                node_type=DAGNodeType.SHUFFLE,
                label="Shuffle",
                stage=2,
                what_spark_does="Redistributes data for aggregation",
                why_required="GroupBy requires shuffle",
                is_stage_boundary=True,
            ),
            ScenarioDAGNode(
                node_type=DAGNodeType.AGGREGATE,
                label="Aggregate",
                stage=2,
                what_spark_does="Computes aggregations per group",
                why_required="Business logic requires aggregation",
            ),
            ScenarioDAGNode(
                node_type=DAGNodeType.WRITE,
                label="Write (Many Files)",
                stage=2,
                what_spark_does="Each of 200 tasks writes to each partition = many small files",
                why_required="Results must be persisted, but no coalesce was applied",
            ),
        ],
        stage_count=2,
        shuffle_count=1,
    )


def _build_multi_step_etl_dag() -> ScenarioDAG:
    """DAG for Scenario 6: Multi-Step ETL with Early Filter."""
    return ScenarioDAG(
        nodes=[
            ScenarioDAGNode(
                node_type=DAGNodeType.READ,
                label="Read",
                stage=1,
                what_spark_does="Scans raw ingestion data from storage",
                why_required="Daily data must be loaded for processing",
            ),
            ScenarioDAGNode(
                node_type=DAGNodeType.NARROW_OP,
                label="Filter",
                stage=1,
                what_spark_does="Removes invalid records early (nulls, bad timestamps, test users)",
                why_required="Early filtering reduces data volume before expensive shuffle",
            ),
            ScenarioDAGNode(
                node_type=DAGNodeType.SHUFFLE,
                label="Shuffle",
                stage=2,
                what_spark_does="Redistributes filtered data by grouping key",
                why_required="Aggregation requires same keys on same executor",
                is_stage_boundary=True,
            ),
            ScenarioDAGNode(
                node_type=DAGNodeType.AGGREGATE,
                label="Aggregate",
                stage=2,
                what_spark_does="Computes aggregations on filtered data",
                why_required="Business metrics require aggregation",
            ),
            ScenarioDAGNode(
                node_type=DAGNodeType.WRITE,
                label="Write",
                stage=2,
                what_spark_does="Writes aggregated results",
                why_required="Results must be persisted",
            ),
        ],
        stage_count=2,
        shuffle_count=1,
    )


def _build_pre_aggregation_join_dag() -> ScenarioDAG:
    """DAG for Scenario 7: Join After Aggregation (Pre-Aggregation Pattern)."""
    return ScenarioDAG(
        nodes=[
            ScenarioDAGNode(
                node_type=DAGNodeType.READ,
                label="Read Orders",
                stage=1,
                what_spark_does="Scans large orders table",
                why_required="Order data must be loaded for aggregation",
            ),
            ScenarioDAGNode(
                node_type=DAGNodeType.SHUFFLE,
                label="Shuffle for GroupBy",
                stage=2,
                what_spark_does="Redistributes orders by customer_id for aggregation",
                why_required="Must group all orders per customer before aggregation",
                is_stage_boundary=True,
            ),
            ScenarioDAGNode(
                node_type=DAGNodeType.AGGREGATE,
                label="Aggregate Orders",
                stage=2,
                what_spark_does="Computes total per customer (reduces 100M rows to 1M)",
                why_required="Pre-aggregation dramatically reduces join input size",
            ),
            ScenarioDAGNode(
                node_type=DAGNodeType.READ,
                label="Read Customers",
                stage=1,
                what_spark_does="Scans customer dimension table",
                why_required="Customer details needed for enrichment",
            ),
            ScenarioDAGNode(
                node_type=DAGNodeType.JOIN,
                label="Join (Small Left)",
                stage=3,
                what_spark_does="Joins aggregated orders (1M) with customers (small enough for broadcast)",
                why_required="Enriching aggregated orders with customer details",
            ),
            ScenarioDAGNode(
                node_type=DAGNodeType.WRITE,
                label="Write",
                stage=3,
                what_spark_does="Writes final enriched aggregates",
                why_required="Results must be persisted",
            ),
        ],
        stage_count=3,
        shuffle_count=1,  # Only 1 shuffle because pre-agg enables broadcast join
    )


def _build_window_function_dag() -> ScenarioDAG:
    """DAG for Scenario 8: Window Function for Ranking."""
    return ScenarioDAG(
        nodes=[
            ScenarioDAGNode(
                node_type=DAGNodeType.READ,
                label="Read",
                stage=1,
                what_spark_does="Scans transaction data",
                why_required="Transaction data must be loaded for ranking",
            ),
            ScenarioDAGNode(
                node_type=DAGNodeType.SHUFFLE,
                label="Shuffle (partitionBy)",
                stage=2,
                what_spark_does="Redistributes data by window partition key (customer_id)",
                why_required="Window function requires all rows for same customer on same executor",
                is_stage_boundary=True,
            ),
            ScenarioDAGNode(
                node_type=DAGNodeType.SORT,
                label="Sort",
                stage=2,
                what_spark_does="Sorts rows within each partition by amount (descending)",
                why_required="Ranking requires sorted order within partition",
            ),
            ScenarioDAGNode(
                node_type=DAGNodeType.NARROW_OP,
                label="Window Computation",
                stage=2,
                what_spark_does="Computes row_number() over sorted partition",
                why_required="Assigns rank to each transaction per customer",
            ),
            ScenarioDAGNode(
                node_type=DAGNodeType.WRITE,
                label="Write",
                stage=2,
                what_spark_does="Writes ranked transactions",
                why_required="Results must be persisted",
            ),
        ],
        stage_count=2,
        shuffle_count=1,
    )


def _build_skewed_aggregation_dag() -> ScenarioDAG:
    """DAG for Scenario 9: Skewed Aggregation."""
    return ScenarioDAG(
        nodes=[
            ScenarioDAGNode(
                node_type=DAGNodeType.READ,
                label="Read Clickstream",
                stage=1,
                what_spark_does="Scans clickstream data (heavily skewed by page)",
                why_required="Raw click data must be loaded",
            ),
            ScenarioDAGNode(
                node_type=DAGNodeType.SHUFFLE,
                label="Shuffle (Skewed)",
                stage=2,
                what_spark_does="Redistributes clicks by page_id (homepage gets 80% of data)",
                why_required="GroupBy requires same keys colocated",
                is_stage_boundary=True,
            ),
            ScenarioDAGNode(
                node_type=DAGNodeType.AGGREGATE,
                label="Aggregate (Uneven)",
                stage=2,
                what_spark_does="Counts clicks per page (one task processes 80% of all clicks)",
                why_required="Business requires click counts per page",
            ),
            ScenarioDAGNode(
                node_type=DAGNodeType.WRITE,
                label="Write",
                stage=2,
                what_spark_does="Writes aggregated counts (overall time dominated by straggler)",
                why_required="Results must be persisted",
            ),
        ],
        stage_count=2,
        shuffle_count=1,
    )


def _build_star_schema_join_dag() -> ScenarioDAG:
    """DAG for Scenario 10: Fact-Dimension Join (Star Schema)."""
    return ScenarioDAG(
        nodes=[
            ScenarioDAGNode(
                node_type=DAGNodeType.READ,
                label="Read Fact Table",
                stage=1,
                what_spark_does="Scans large fact table (billions of rows)",
                why_required="Fact data must be loaded for analysis",
            ),
            ScenarioDAGNode(
                node_type=DAGNodeType.READ,
                label="Read Dimension",
                stage=1,
                what_spark_does="Scans small dimension table (thousands of rows)",
                why_required="Dimension data needed for enrichment",
            ),
            ScenarioDAGNode(
                node_type=DAGNodeType.JOIN,
                label="Broadcast Join",
                stage=1,
                what_spark_does="Broadcasts small dimension to all executors, joins locally",
                why_required="Small dimension enables broadcast, avoiding shuffle of large fact",
            ),
            ScenarioDAGNode(
                node_type=DAGNodeType.WRITE,
                label="Write",
                stage=1,
                what_spark_does="Writes enriched fact data",
                why_required="Results must be persisted",
            ),
        ],
        stage_count=1,
        shuffle_count=0,  # Broadcast join avoids shuffle
    )


def _build_write_amplification_dag() -> ScenarioDAG:
    """DAG for Scenario 11: Write Amplification After Shuffle."""
    return ScenarioDAG(
        nodes=[
            ScenarioDAGNode(
                node_type=DAGNodeType.READ,
                label="Read",
                stage=1,
                what_spark_does="Scans input data",
                why_required="Data must be loaded",
            ),
            ScenarioDAGNode(
                node_type=DAGNodeType.SHUFFLE,
                label="Shuffle",
                stage=2,
                what_spark_does="Redistributes data for aggregation",
                why_required="Aggregation requires shuffle",
                is_stage_boundary=True,
            ),
            ScenarioDAGNode(
                node_type=DAGNodeType.AGGREGATE,
                label="Aggregate",
                stage=2,
                what_spark_does="Computes aggregations across 200 partitions",
                why_required="Business logic requires aggregation",
            ),
            ScenarioDAGNode(
                node_type=DAGNodeType.WRITE,
                label="Write (No Coalesce)",
                stage=2,
                what_spark_does="200 tasks each write to output, creating 200+ small files",
                why_required="Results persisted but partition count not reduced",
            ),
        ],
        stage_count=2,
        shuffle_count=1,
    )


def _build_union_aggregation_dag() -> ScenarioDAG:
    """DAG for Scenario 12: Union + Aggregation."""
    return ScenarioDAG(
        nodes=[
            ScenarioDAGNode(
                node_type=DAGNodeType.READ,
                label="Read Source A",
                stage=1,
                what_spark_does="Scans first data source",
                why_required="First dataset must be loaded",
            ),
            ScenarioDAGNode(
                node_type=DAGNodeType.READ,
                label="Read Source B",
                stage=1,
                what_spark_does="Scans second data source",
                why_required="Second dataset must be loaded",
            ),
            ScenarioDAGNode(
                node_type=DAGNodeType.NARROW_OP,
                label="Union",
                stage=1,
                what_spark_does="Concatenates both sources (no data movement)",
                why_required="Combining data before aggregation",
            ),
            ScenarioDAGNode(
                node_type=DAGNodeType.SHUFFLE,
                label="Shuffle",
                stage=2,
                what_spark_does="Redistributes combined data by grouping key",
                why_required="Aggregation requires same keys colocated",
                is_stage_boundary=True,
            ),
            ScenarioDAGNode(
                node_type=DAGNodeType.AGGREGATE,
                label="Aggregate",
                stage=2,
                what_spark_does="Aggregates over union of both sources",
                why_required="Business requires combined metrics",
            ),
            ScenarioDAGNode(
                node_type=DAGNodeType.WRITE,
                label="Write",
                stage=2,
                what_spark_does="Writes aggregated results",
                why_required="Results must be persisted",
            ),
        ],
        stage_count=2,
        shuffle_count=1,
    )


# Registry of DAG builders
_DAG_BUILDERS: dict[str, callable] = {
    "simple_filter": _build_simple_filter_dag,
    "groupby_aggregation": _build_groupby_aggregation_dag,
    "join_without_broadcast": _build_join_without_broadcast_dag,
    "skewed_join_key": _build_skewed_join_key_dag,
    "too_many_output_files": _build_too_many_output_files_dag,
    "multi_step_etl": _build_multi_step_etl_dag,
    "pre_aggregation_join": _build_pre_aggregation_join_dag,
    "window_function": _build_window_function_dag,
    "skewed_aggregation": _build_skewed_aggregation_dag,
    "star_schema_join": _build_star_schema_join_dag,
    "write_amplification": _build_write_amplification_dag,
    "union_aggregation": _build_union_aggregation_dag,
}


def build_scenario_dag(scenario_id: str) -> Optional[ScenarioDAG]:
    """Build DAG for a given scenario.
    
    Args:
        scenario_id: The scenario ID to build DAG for.
        
    Returns:
        ScenarioDAG if scenario exists, None otherwise.
    """
    builder = _DAG_BUILDERS.get(scenario_id)
    if builder:
        return builder()
    return None
