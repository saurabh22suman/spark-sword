"""Real-Life Scenario System.

Per real-life-scenario-spec.md, scenarios are teaching artifacts that help users understand:
- "Why did Spark create this stage?"
- "Why did this shuffle happen?"
- "Why is this job slow even though the code looks simple?"

Scenarios exist to teach how Spark behaves in practice, not tricks or shortcuts.

Non-Negotiable Rules (from spec Section 1):
- Scenarios must be realistic
- Scenarios must be explainable via Spark internals
- Scenarios must map cleanly to DAG → Metrics → Explanation
- Scenarios must NEVER promise optimizations or hide trade-offs
"""

from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Optional


class ScenarioLevel(str, Enum):
    """Difficulty level for scenarios.
    
    Per spec Section 6:
    - Basic: 1 Spark concept, predictable outcome
    - Intermediate: 2 interacting concepts, clear trade-offs
    
    Note: No ADVANCED level per spec - do NOT introduce:
    - AQE internals
    - Cost-based optimizer details
    - Executor sizing
    """
    BASIC = "basic"
    INTERMEDIATE = "intermediate"


@dataclass
class Scenario:
    """A real-life Spark scenario for teaching.
    
    Per spec Section 3, every scenario must have:
    - Metadata (title, level, concepts)
    - Story (human-readable)
    - Logical operations (intent)
    - Expected Spark behavior
    - Evidence signals
    - Explanation goals
    """
    
    # Metadata
    id: str
    title: str
    level: ScenarioLevel
    spark_concepts: list[str]
    real_world_context: str
    
    # Story (appears in UI)
    story: str
    
    # Logical operations (intent, not execution)
    logical_operations: list[str]
    
    # Expected Spark behavior
    expected_stages: int
    expected_shuffles: int
    expected_skew: bool = False
    
    # Evidence signals to highlight
    evidence_signals: list[str] = field(default_factory=list)
    
    # What user should learn
    explanation_goal: str = ""
    
    # Playground defaults (optional)
    playground_defaults: dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary for API response."""
        return {
            "id": self.id,
            "title": self.title,
            "level": self.level.value,
            "spark_concepts": self.spark_concepts,
            "real_world_context": self.real_world_context,
            "story": self.story,
            "logical_operations": self.logical_operations,
            "expected_stages": self.expected_stages,
            "expected_shuffles": self.expected_shuffles,
            "expected_skew": self.expected_skew,
            "evidence_signals": self.evidence_signals,
            "explanation_goal": self.explanation_goal,
            "playground_defaults": self.playground_defaults,
        }


class ScenarioRegistry:
    """Registry of all available scenarios.
    
    Contains the 5 required scenarios from spec Section 4:
    1. Simple Filter (Baseline)
    2. GroupBy Aggregation
    3. Join Without Broadcast
    4. Skewed Join Key
    5. Too Many Output Files
    """
    
    _scenarios: dict[str, Scenario] = {}
    
    @classmethod
    def register(cls, scenario: Scenario) -> None:
        """Register a scenario."""
        cls._scenarios[scenario.id] = scenario
    
    @classmethod
    def get(cls, scenario_id: str) -> Optional[Scenario]:
        """Get scenario by ID."""
        return cls._scenarios.get(scenario_id)
    
    @classmethod
    def list_all(cls) -> list[Scenario]:
        """List all registered scenarios."""
        return list(cls._scenarios.values())
    
    @classmethod
    def clear(cls) -> None:
        """Clear all scenarios (for testing)."""
        cls._scenarios = {}


# ============================================================
# SCENARIO 1: Simple Filter (Baseline)
# ============================================================
SIMPLE_FILTER = Scenario(
    id="simple_filter",
    title="Simple Filter",
    level=ScenarioLevel.BASIC,
    spark_concepts=["narrow_transformation"],
    real_world_context="Filtering valid records from a large dataset",
    story=(
        "You have a large dataset of user events. Before processing, you need to "
        "filter out invalid records (null values, invalid timestamps, test users). "
        "This is a common first step in any data pipeline."
    ),
    logical_operations=["read", "filter", "write"],
    expected_stages=1,
    expected_shuffles=0,
    evidence_signals=["task_duration"],
    explanation_goal=(
        "Filters do not require data movement. Each partition is processed "
        "independently, making filter a narrow transformation with no shuffle."
    ),
    playground_defaults={
        "rows": 10_000_000,
        "partitions": 200,
        "operation": "filter",
        "selectivity": 0.1,
    },
)

# ============================================================
# SCENARIO 2: GroupBy Aggregation
# ============================================================
GROUPBY_AGGREGATION = Scenario(
    id="groupby_aggregation",
    title="GroupBy Aggregation",
    level=ScenarioLevel.BASIC,
    spark_concepts=["shuffle", "wide_transformation"],
    real_world_context="Calculate total orders per customer",
    story=(
        "You're building a customer analytics dashboard. You need to calculate "
        "the total order amount per customer. This requires grouping all orders "
        "by customer_id and summing the amounts."
    ),
    logical_operations=["read", "groupby", "aggregate", "write"],
    expected_stages=2,
    expected_shuffles=1,
    evidence_signals=["shuffle_bytes", "task_duration"],
    explanation_goal=(
        "GroupBy always causes a shuffle because Spark must move all rows with "
        "the same key to the same executor for aggregation."
    ),
    playground_defaults={
        "rows": 10_000_000,
        "partitions": 200,
        "operation": "groupby",
        "num_groups": 100_000,
    },
)

# ============================================================
# SCENARIO 3: Join Without Broadcast
# ============================================================
JOIN_WITHOUT_BROADCAST = Scenario(
    id="join_without_broadcast",
    title="Join Without Broadcast",
    level=ScenarioLevel.INTERMEDIATE,
    spark_concepts=["sort_merge_join", "shuffle"],
    real_world_context="Join large orders table with medium-sized customers table",
    story=(
        "You need to enrich order data with customer details. The orders table has "
        "100 million rows, and the customers table has 5 million rows. Both tables "
        "are too large for broadcast, so Spark uses sort-merge join."
    ),
    logical_operations=["read_orders", "read_customers", "join", "write"],
    expected_stages=3,
    expected_shuffles=2,
    evidence_signals=["shuffle_bytes", "task_duration", "stage_duration"],
    explanation_goal=(
        "When both tables are too large for broadcast, Spark must shuffle both "
        "tables to colocate matching keys. This doubles the shuffle cost compared "
        "to a broadcast join."
    ),
    playground_defaults={
        "rows": 100_000_000,
        "partitions": 200,
        "operation": "join",
        "right_rows": 5_000_000,
    },
)

# ============================================================
# SCENARIO 4: Skewed Join Key
# ============================================================
SKEWED_JOIN_KEY = Scenario(
    id="skewed_join_key",
    title="Skewed Join Key",
    level=ScenarioLevel.INTERMEDIATE,
    spark_concepts=["data_skew", "straggler_tasks"],
    real_world_context="Join on country where one country dominates data",
    story=(
        "You're joining user activity with country metadata. However, 80% of your "
        "users are from a single country (e.g., USA). This creates a skewed join "
        "where one partition has far more data than others."
    ),
    logical_operations=["read_activity", "read_countries", "join_on_country", "write"],
    expected_stages=3,
    expected_shuffles=2,
    expected_skew=True,
    evidence_signals=["task_duration_variance", "shuffle_bytes", "spill"],
    explanation_goal=(
        "Data skew causes one or few tasks to process much more data than others. "
        "These 'straggler' tasks delay the entire job because a stage cannot "
        "complete until all tasks finish."
    ),
    playground_defaults={
        "rows": 50_000_000,
        "partitions": 200,
        "operation": "join",
        "skew_factor": 10.0,
    },
)

# ============================================================
# SCENARIO 5: Too Many Output Files
# ============================================================
TOO_MANY_OUTPUT_FILES = Scenario(
    id="too_many_output_files",
    title="Too Many Output Files",
    level=ScenarioLevel.INTERMEDIATE,
    spark_concepts=["partitioning", "write_amplification"],
    real_world_context="Writing aggregated data creates thousands of small files",
    story=(
        "You're writing daily aggregated data partitioned by date and region. "
        "With 365 days × 50 regions × 200 Spark partitions, you end up with "
        "millions of tiny files. The compute was fast, but downstream reads are slow."
    ),
    logical_operations=["read", "aggregate", "write_partitioned"],
    expected_stages=2,
    expected_shuffles=1,
    evidence_signals=["output_file_count", "partition_size"],
    explanation_goal=(
        "Each Spark task writes to one file per output partition. Without coalesce "
        "or repartition before write, high parallelism creates many small files "
        "that hurt downstream read performance."
    ),
    playground_defaults={
        "rows": 10_000_000,
        "partitions": 200,
        "operation": "repartition",
        "new_partitions": 10,
    },
)


# ============================================================
# SCENARIO 6: Multi-Step ETL with Early Filter
# Per spec Section B: Intermediate level, teaches filter pushdown
# ============================================================
MULTI_STEP_ETL = Scenario(
    id="multi_step_etl",
    title="Multi-Step ETL with Early Filter",
    level=ScenarioLevel.INTERMEDIATE,
    spark_concepts=["filter_pushdown", "shuffle_reduction"],
    real_world_context="Daily ingestion pipeline filters invalid records before aggregation",
    story=(
        "You're building a daily ETL pipeline that ingests raw event data. "
        "Before aggregating metrics, you need to filter out invalid records "
        "(nulls, test users, invalid timestamps). Filtering early reduces the "
        "amount of data that goes through the expensive shuffle stage."
    ),
    logical_operations=["read", "filter", "groupby", "aggregate", "write"],
    expected_stages=2,
    expected_shuffles=1,
    evidence_signals=["shuffle_bytes_reduction", "task_duration"],
    explanation_goal=(
        "Filtering early reduces shuffle volume. Since shuffle is expensive, "
        "applying filters before groupBy can dramatically improve performance."
    ),
    playground_defaults={
        "rows": 50_000_000,
        "partitions": 200,
        "operation": "filter",
        "selectivity": 0.3,
    },
)


# ============================================================
# SCENARIO 7: Join After Aggregation (Pre-Aggregation Pattern)
# Per spec Section B: Intermediate level, teaches join cost reduction
# ============================================================
PRE_AGGREGATION_JOIN = Scenario(
    id="pre_aggregation_join",
    title="Join After Aggregation",
    level=ScenarioLevel.INTERMEDIATE,
    spark_concepts=["aggregation_order", "join_cost_reduction"],
    real_world_context="Aggregate orders before joining with customer dimension",
    story=(
        "You need to build a customer summary report. Instead of joining "
        "100 million order rows with the customer table first, you aggregate "
        "orders per customer (reducing to 1 million rows), then join. "
        "The aggregated table is small enough for a broadcast join."
    ),
    logical_operations=["read_orders", "groupby_customer", "aggregate", "read_customers", "join", "write"],
    expected_stages=3,
    expected_shuffles=1,  # Only 1 shuffle because post-agg enables broadcast
    evidence_signals=["shuffle_bytes", "join_strategy"],
    explanation_goal=(
        "Reducing data before a join is a key optimization pattern. "
        "Pre-aggregation can turn an expensive sort-merge join into a cheap broadcast join."
    ),
    playground_defaults={
        "rows": 100_000_000,
        "partitions": 200,
        "operation": "groupby",
        "num_groups": 1_000_000,
    },
)


# ============================================================
# SCENARIO 8: Window Function for Ranking
# Per spec Section B: Intermediate level, teaches window + sort cost
# ============================================================
WINDOW_FUNCTION = Scenario(
    id="window_function",
    title="Window Function for Ranking",
    level=ScenarioLevel.INTERMEDIATE,
    spark_concepts=["window", "shuffle", "sort"],
    real_world_context="Rank transactions per customer by amount",
    story=(
        "You need to rank each customer's transactions by amount to find their "
        "top purchases. Window functions require partitioning (shuffle) and "
        "sorting within each partition, making them expensive operations."
    ),
    logical_operations=["read", "partition_by_customer", "sort_by_amount", "row_number", "write"],
    expected_stages=2,
    expected_shuffles=1,
    evidence_signals=["shuffle_bytes", "sort_time", "task_duration"],
    explanation_goal=(
        "Window functions are expensive because they require both shuffle "
        "(to partition by key) and sort (for ordering). The shuffle + sort "
        "combination is one of the most costly patterns in Spark."
    ),
    playground_defaults={
        "rows": 20_000_000,
        "partitions": 200,
        "operation": "groupby",  # Window uses similar partitioning
        "num_groups": 500_000,
    },
)


# ============================================================
# SCENARIO 9: Skewed Aggregation
# Per spec Section B: Intermediate level, teaches skew impact on groupBy
# ============================================================
SKEWED_AGGREGATION = Scenario(
    id="skewed_aggregation",
    title="Skewed Aggregation",
    level=ScenarioLevel.INTERMEDIATE,
    spark_concepts=["data_skew", "straggler_tasks"],
    real_world_context="Aggregate clickstream data where one page dominates traffic",
    story=(
        "You're aggregating clickstream data by page_id. However, the homepage "
        "receives 80% of all traffic. When you groupBy(page_id), one partition "
        "gets 80% of the data while others are nearly empty. This creates a "
        "'straggler task' that delays the entire job."
    ),
    logical_operations=["read", "groupby_page", "count", "write"],
    expected_stages=2,
    expected_shuffles=1,
    expected_skew=True,
    evidence_signals=["task_duration_variance", "shuffle_bytes", "straggler_ratio"],
    explanation_goal=(
        "Data skew breaks parallelism. Even with 200 tasks, if one task has 80% "
        "of the work, you effectively have single-threaded execution for most of the job."
    ),
    playground_defaults={
        "rows": 100_000_000,
        "partitions": 200,
        "operation": "groupby",
        "skew_factor": 10.0,
    },
)


# ============================================================
# SCENARIO 10: Fact-Dimension Join (Star Schema)
# Per spec Section B: Intermediate level, teaches broadcast decision
# ============================================================
STAR_SCHEMA_JOIN = Scenario(
    id="star_schema_join",
    title="Fact-Dimension Join",
    level=ScenarioLevel.INTERMEDIATE,
    spark_concepts=["broadcast_join", "star_schema"],
    real_world_context="Join large fact table with small dimension table",
    story=(
        "You're analyzing sales data in a star schema. The fact table has "
        "billions of rows, while the product dimension has only 50,000 products. "
        "Spark can broadcast the small dimension to all executors, avoiding "
        "the need to shuffle the massive fact table."
    ),
    logical_operations=["read_fact", "read_dimension", "broadcast_join", "write"],
    expected_stages=1,  # No shuffle with broadcast join
    expected_shuffles=0,
    evidence_signals=["join_strategy", "task_duration"],
    explanation_goal=(
        "Broadcast joins avoid shuffle by sending the smaller table to all executors. "
        "When one table is small enough (typically <10MB by default), this strategy "
        "is dramatically faster than sort-merge join."
    ),
    playground_defaults={
        "rows": 500_000_000,
        "partitions": 200,
        "operation": "join",
        "right_rows": 50_000,
    },
)


# ============================================================
# SCENARIO 11: Write Amplification After Shuffle
# Per spec Section B: Intermediate level, teaches output partitioning
# ============================================================
WRITE_AMPLIFICATION = Scenario(
    id="write_amplification",
    title="Write Amplification",
    level=ScenarioLevel.INTERMEDIATE,
    spark_concepts=["partitioning", "small_files"],
    real_world_context="Aggregated data written without coalescing creates many small files",
    story=(
        "After aggregating data with 200 Spark partitions, each task writes its "
        "output. If the aggregated data is small but spread across 200 partitions, "
        "you end up with 200+ small files. This slows down downstream reads and "
        "creates metadata pressure on the file system."
    ),
    logical_operations=["read", "groupby", "aggregate", "write_many_files"],
    expected_stages=2,
    expected_shuffles=1,
    evidence_signals=["output_file_count", "file_size_distribution"],
    explanation_goal=(
        "Write-time partitioning matters. Without coalesce() or repartition() before "
        "write, high parallelism creates many small files that hurt downstream performance."
    ),
    playground_defaults={
        "rows": 1_000_000,
        "partitions": 200,
        "operation": "repartition",
        "new_partitions": 200,
    },
)


# ============================================================
# SCENARIO 12: Union + Aggregation
# Per spec Section B: Intermediate level, teaches union + downstream shuffle
# ============================================================
UNION_AGGREGATION = Scenario(
    id="union_aggregation",
    title="Union + Aggregation",
    level=ScenarioLevel.INTERMEDIATE,
    spark_concepts=["union", "downstream_shuffle"],
    real_world_context="Combine data from multiple sources and aggregate results",
    story=(
        "You're combining clickstream from mobile and web sources using union(). "
        "Union itself is cheap (no data movement), but the subsequent groupBy "
        "requires shuffling the combined dataset. The shuffle volume is the sum "
        "of both sources."
    ),
    logical_operations=["read_source_a", "read_source_b", "union", "groupby", "aggregate", "write"],
    expected_stages=2,
    expected_shuffles=1,
    evidence_signals=["shuffle_bytes", "task_duration"],
    explanation_goal=(
        "Union is a narrow transformation (no shuffle), but downstream operations "
        "like groupBy will shuffle the combined data. Plan for the total data volume "
        "when designing union-based pipelines."
    ),
    playground_defaults={
        "rows": 50_000_000,
        "partitions": 200,
        "operation": "groupby",
        "num_groups": 100_000,
    },
)


def _register_all_scenarios() -> None:
    """Register all built-in scenarios."""
    # Original 5 scenarios (basic mental model builders)
    ScenarioRegistry.register(SIMPLE_FILTER)
    ScenarioRegistry.register(GROUPBY_AGGREGATION)
    ScenarioRegistry.register(JOIN_WITHOUT_BROADCAST)
    ScenarioRegistry.register(SKEWED_JOIN_KEY)
    ScenarioRegistry.register(TOO_MANY_OUTPUT_FILES)
    # New 7 scenarios (production realism per spec Part B)
    ScenarioRegistry.register(MULTI_STEP_ETL)
    ScenarioRegistry.register(PRE_AGGREGATION_JOIN)
    ScenarioRegistry.register(WINDOW_FUNCTION)
    ScenarioRegistry.register(SKEWED_AGGREGATION)
    ScenarioRegistry.register(STAR_SCHEMA_JOIN)
    ScenarioRegistry.register(WRITE_AMPLIFICATION)
    ScenarioRegistry.register(UNION_AGGREGATION)


# Register scenarios on module load
_register_all_scenarios()


# Convenience functions
def list_scenarios() -> list[Scenario]:
    """List all available scenarios."""
    return ScenarioRegistry.list_all()


def get_scenario_by_id(scenario_id: str) -> Optional[Scenario]:
    """Get a scenario by its ID."""
    return ScenarioRegistry.get(scenario_id)
