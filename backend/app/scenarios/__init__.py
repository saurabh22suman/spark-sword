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
    
    # Learning goals (displayed in UI)
    learning_goals: list[str] = field(default_factory=list)
    
    # Key takeaways (memorable summary points)
    key_takeaways: list[str] = field(default_factory=list)
    
    # Common mistakes to avoid
    common_mistakes: list[str] = field(default_factory=list)
    
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
            "learning_goals": self.learning_goals,
            "key_takeaways": self.key_takeaways,
            "common_mistakes": self.common_mistakes,
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
    learning_goals=[
        "Understand what a narrow transformation is",
        "See why filters don't cause shuffles",
        "Recognize single-stage DAGs",
    ],
    key_takeaways=[
        "Filter is a narrow transformation — no data movement between partitions",
        "Single-stage jobs mean zero shuffles — this is the fastest pattern in Spark",
        "Predicate pushdown lets Spark skip entire files when reading from columnar formats",
    ],
    common_mistakes=[
        "Filtering after a shuffle instead of before — move filters as early as possible",
        "Not leveraging partition pruning — filter on partition columns to skip entire directories",
    ],
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
    learning_goals=[
        "Understand why groupBy triggers a shuffle",
        "See the 2-stage DAG pattern for aggregations",
        "Learn how Spark's partial aggregation reduces shuffle volume",
    ],
    key_takeaways=[
        "GroupBy ALWAYS causes a shuffle — all matching keys must land on the same executor",
        "Spark uses partial aggregation (combiner) to reduce data before the shuffle",
        "More unique keys = more shuffle data; fewer groups = more efficient aggregation",
    ],
    common_mistakes=[
        "Running groupBy on high-cardinality keys without pre-filtering — shuffles entire dataset",
        "Not checking shuffle write size — if it's close to total data size, aggregation isn't reducing much",
    ],
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
    learning_goals=[
        "Understand sort-merge join mechanics",
        "See why both tables must be shuffled",
        "Learn the broadcast join threshold (10MB default)",
    ],
    key_takeaways=[
        "Sort-merge join shuffles BOTH tables by the join key — double the network cost",
        "Broadcast threshold default is 10MB — tables larger than this trigger sort-merge join",
        "3-stage DAG: read+shuffle left, read+shuffle right, join — watch for the 2x shuffle",
    ],
    common_mistakes=[
        "Not checking if the smaller table could be broadcast — missing the 10MB threshold optimization",
        "Joining on columns with different types — causes implicit cast and disables optimizations",
    ],
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
    learning_goals=[
        "Identify data skew by comparing task durations",
        "Understand why one straggler task delays the entire stage",
        "Learn skew mitigation techniques (salting, AQE)",
    ],
    key_takeaways=[
        "Skew = one partition gets 10-100× more data than others = one straggler kills parallelism",
        "Check max vs median task duration — a 10× gap signals skew",
        "Solutions: key salting, AQE skew join optimization, or pre-filtering the dominant key",
    ],
    common_mistakes=[
        "Adding more executors to fix skew — doesn't help because the bottleneck is one partition",
        "Not profiling join key distribution before running the job",
    ],
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
    learning_goals=[
        "Understand how Spark partition count maps to output file count",
        "Learn when to use coalesce() vs repartition() before write",
        "See the downstream impact of small files on read performance",
    ],
    key_takeaways=[
        "Each Spark task writes 1 file — 200 partitions = 200 files minimum",
        "partitionBy() multiplies files: partitions × unique partition values = total files",
        "Use coalesce() before write to reduce file count without triggering a shuffle",
    ],
    common_mistakes=[
        "Writing with default 200 shuffle partitions to a partitioned table — file explosion",
        "Using repartition(1) to create a single file — forces all data through one task, kills parallelism",
    ],
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
    learning_goals=[
        "Understand filter pushdown and its impact on shuffle volume",
        "Learn to place filters before shuffles in the pipeline",
        "See the difference in shuffle bytes with early vs late filtering",
    ],
    key_takeaways=[
        "Filter early, shuffle less — removing 70% of rows before groupBy saves 70% shuffle volume",
        "Catalyst may push filters down automatically, but explicit early filters are clearer",
        "Check shuffle write bytes to verify if your filter is reducing data before the shuffle",
    ],
    common_mistakes=[
        "Filtering after the aggregation instead of before — shuffles data you'll throw away",
        "Assuming Catalyst always pushes filters optimally — complex pipelines may prevent pushdown",
    ],
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
    learning_goals=[
        "Learn the pre-aggregation join pattern",
        "See how reducing rows enables broadcast join",
        "Understand join cost as a function of input size",
    ],
    key_takeaways=[
        "Aggregate first, join second — reduces row count and may enable broadcast join",
        "100M rows grouped to 1M rows = 99% less data to shuffle through the join",
        "This is the most impactful optimization pattern for fact-dimension pipelines",
    ],
    common_mistakes=[
        "Joining first then aggregating — shuffles 100× more data than necessary",
        "Not checking if post-aggregation table fits in broadcast threshold",
    ],
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
    learning_goals=[
        "Understand skew in aggregation contexts (not just joins)",
        "Learn to detect skew from task duration variance",
        "See how two-phase aggregation mitigates skew",
    ],
    key_takeaways=[
        "GroupBy skew is as dangerous as join skew — one key = one overloaded task",
        "Spark's partial aggregation (combiner) helps but doesn't eliminate skew",
        "Two-phase aggregation: groupBy(key, salt) then groupBy(key) spreads the load",
    ],
    common_mistakes=[
        "Ignoring the 'Max' task duration column in Spark UI — it reveals skew",
        "Assuming all groupBy operations have uniform key distribution",
    ],
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
    learning_goals=[
        "Understand broadcast join mechanics and when it applies",
        "See the massive performance benefit of avoiding shuffle",
        "Learn the auto-broadcast threshold and how to tune it",
    ],
    key_takeaways=[
        "Broadcast join copies small table to all executors — no shuffle, single-stage execution",
        "Auto-broadcast threshold: 10MB by default — increase it if your dimension tables are larger",
        "Broadcast joins convert O(n·m) shuffle to O(m) broadcast — massive win for star schemas",
    ],
    common_mistakes=[
        "Not realizing the dimension table exceeds the broadcast threshold — falls back to sort-merge",
        "Broadcasting a table that grows over time — what fits today may OOM tomorrow",
    ],
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
    learning_goals=[
        "Understand write amplification from high partition counts",
        "Learn the downstream cost of small files",
        "See the coalesce vs repartition trade-off for write optimization",
    ],
    key_takeaways=[
        "200 partitions writing 1MB each = 200 small files = slow downstream reads",
        "Target output file size: 128–256MB for optimal cloud storage performance",
        "Check your output file sizes AFTER the job — small files are a silent performance killer",
    ],
    common_mistakes=[
        "Focusing only on compute performance and ignoring output file layout",
        "Not adding coalesce() before write when data volume is small after aggregation",
    ],
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
    learning_goals=[
        "Understand that union is narrow but downstream operations shuffle the combined data",
        "See total data volume impact on shuffle after union",
        "Learn to plan for combined data size in union pipelines",
    ],
    key_takeaways=[
        "Union itself is free (no shuffle) — but the next groupBy shuffles ALL combined data",
        "Plan your shuffle partitions for the TOTAL data size after union, not per-source",
        "Consider aggregating each source separately, then merging results if possible",
    ],
    common_mistakes=[
        "Assuming union is the expensive part — it's the subsequent shuffle that costs",
        "Not adjusting shuffle partitions after unioning multiple large datasets",
    ],
    playground_defaults={
        "rows": 50_000_000,
        "partitions": 200,
        "operation": "groupby",
        "num_groups": 100_000,
    },
)


# ============================================================
# PRODUCTION SCENARIOS (12 new scenarios)
# Based on common production issues in the Spark community
# ============================================================

# Scenario 13: Small Files Explosion
SMALL_FILES_EXPLOSION = Scenario(
    id="small-files-explosion",
    title="Small Files Explosion",
    level=ScenarioLevel.INTERMEDIATE,
    spark_concepts=["small files", "file listing overhead", "partition sizing"],
    real_world_context="Reading 100,000+ tiny parquet files from S3/HDFS",
    story=(
        "Your upstream job writes hourly incremental data, creating one file per hour per customer. "
        "After a year, you have 150,000 tiny parquet files (each 2-5MB). "
        "Your Spark job now takes 10 minutes just to list files before processing even starts. "
        "Driver is overwhelmed during file discovery phase."
    ),
    logical_operations=["list_files", "read", "process", "write"],
    expected_stages=2,
    expected_shuffles=0,
    evidence_signals=["file_listing_time", "task_count", "scheduler_delay"],
    explanation_goal=(
        "File listing overhead dominates when reading thousands of small files. "
        "Driver must collect metadata for each file, and each task processes minimal data. "
        "Trade-off: Fewer larger files reduce overhead but decrease parallelism opportunities."
    ),
    learning_goals=[
        "Understand file listing overhead on cloud storage",
        "See driver bottleneck during file discovery",
        "Learn compaction strategies for small files",
    ],
    key_takeaways=[
        "File listing overhead grows linearly with file count — 100K files = minutes of metadata scanning",
        "Driver does all file listing — it becomes the bottleneck, not executors",
        "Compact small files regularly: merge 100× 2MB files into 1× 200MB file",
    ],
    common_mistakes=[
        "Ignoring file count until downstream reads become unbearably slow",
        "Writing hourly micro-batches without periodic compaction jobs",
    ],
    playground_defaults={
        "num_files": 100_000,
        "file_size_mb": 3,
        "partitions": 200,
    },
)

# Scenario 14: Broadcast Hint Backfire
BROADCAST_HINT_BACKFIRE = Scenario(
    id="broadcast-hint-backfire",
    title="Broadcast Hint Backfire",
    level=ScenarioLevel.INTERMEDIATE,
    spark_concepts=["broadcast join", "OOM", "memory limits"],
    real_world_context="Force broadcasting a 5GB lookup table causing executor crashes",
    story=(
        "You read that broadcast joins are faster, so you add .hint('broadcast') to your lookup table join. "
        "The table is 5GB. Spark dutifully broadcasts it to all 50 executors. "
        "Each executor tries to load 5GB into memory. Executors start dying with OutOfMemoryError. "
        "Job fails after 2 hours of retries."
    ),
    logical_operations=["read_large_table", "broadcast_hint", "join", "executor_oom"],
    expected_stages=1,
    expected_shuffles=0,
    evidence_signals=["broadcast_size", "executor_memory_usage", "task_failures"],
    explanation_goal=(
        "Broadcast joins avoid shuffle but replicate data to every executor. "
        "If broadcasted data exceeds spark.driver.maxResultSize or executor memory, the job fails. "
        "Default threshold (10MB) exists for a reason—overriding it has consequences."
    ),
    learning_goals=[
        "Understand broadcast join memory requirements",
        "See what happens when broadcast exceeds executor memory",
        "Learn the 10MB default threshold and why it exists",
    ],
    key_takeaways=[
        "Broadcast replicates data to EVERY executor — 5GB table × 50 executors = 250GB network transfer",
        "The 10MB default threshold exists to prevent OOM — override it only when you've done the math",
        "Always check: broadcast_table_size < executor_memory × 0.3 before hinting",
    ],
    common_mistakes=[
        "Adding .hint('broadcast') because someone said 'broadcast is faster' without checking table size",
        "Not monitoring executor memory after adding broadcast hints",
    ],
    playground_defaults={
        "broadcast_size_mb": 5000,
        "executor_memory_mb": 4096,
        "num_executors": 50,
    },
)

# Scenario 15: AQE Mystery
AQE_MYSTERY = Scenario(
    id="aqe-mystery",
    title="AQE Mystery",
    level=ScenarioLevel.INTERMEDIATE,
    spark_concepts=["adaptive query execution", "AQE", "dynamic optimization"],
    real_world_context="Job behavior changes between runs with same code",
    story=(
        "Your join job takes 5 minutes on Monday, 15 minutes on Tuesday with identical code and data size. "
        "DAG looks different each time. Sometimes you see 200 shuffle partitions, sometimes 50. "
        "Colleague says 'probably AQE,' but you don't know what that means or why it changes."
    ),
    logical_operations=["read", "join", "aqe_reoptimize", "write"],
    expected_stages=2,
    expected_shuffles=1,
    evidence_signals=["shuffle_partition_count", "stage_recomputation", "coalesce_partitions"],
    explanation_goal=(
        "AQE (Adaptive Query Execution) reoptimizes the query at runtime based on actual data statistics. "
        "It can coalesce shuffle partitions, convert joins, and skip stages dynamically. "
        "Behavior varies because it adapts to runtime conditions, not static configuration."
    ),
    learning_goals=[
        "Understand AQE's three key optimizations",
        "Learn why DAGs change between runs with same code",
        "See when AQE helps vs when it masks underlying issues",
    ],
    key_takeaways=[
        "AQE does 3 things: coalesces shuffle partitions, converts join strategies, handles skew",
        "AQE reads runtime statistics AFTER the shuffle — that's why it can adapt dynamically",
        "AQE is not magic — it optimizes AFTER shuffles happen, it doesn't prevent them",
    ],
    common_mistakes=[
        "Relying on AQE instead of fixing the root cause (bad partitioning, skew, wrong join type)",
        "Being confused by changing DAGs — AQE makes DAGs non-deterministic by design",
    ],
    playground_defaults={
        "rows": 50_000_000,
        "partitions": 200,
        "aqe_enabled": True,
    },
)

# Scenario 16: Cache OOM
CACHE_OOM = Scenario(
    id="cache-oom",
    title="Cache OOM",
    level=ScenarioLevel.INTERMEDIATE,
    spark_concepts=["cache", "memory", "eviction"],
    real_world_context="Caching too many DataFrames causes executor memory pressure",
    story=(
        "You cache 3 large DataFrames (df1.cache(), df2.cache(), df3.cache()) thinking it will speed up the job. "
        "Total cached data is 50GB across 10 executors (each has 6GB memory). "
        "Executors start spilling to disk, then crash with 'Unable to acquire memory' errors. "
        "Job is slower than without caching."
    ),
    logical_operations=["read", "cache", "process", "memory_pressure", "eviction"],
    expected_stages=3,
    expected_shuffles=1,
    evidence_signals=["storage_memory_used", "spill_bytes", "evicted_blocks"],
    explanation_goal=(
        "Cache uses storage memory (default 60% of executor memory). "
        "Caching more data than available memory triggers eviction and spilling. "
        "Not all DataFrames benefit from caching—only those reused multiple times in the same job."
    ),
    learning_goals=[
        "Understand executor memory split between storage and execution",
        "See how caching competes with shuffle/join memory",
        "Learn the cache-worthy criteria: reused 2+ times in the same job",
    ],
    key_takeaways=[
        "Cache uses storage memory (default 60% of heap) — it directly competes with execution memory",
        "Only cache DataFrames reused multiple times in the same job — single-use cache is waste",
        "When storage memory is full, Spark evicts cached data OR spills execution to disk — both are slow",
    ],
    common_mistakes=[
        "Caching everything 'just in case' — wastes memory and causes more spills",
        "Not calling .unpersist() when cached DataFrames are no longer needed",
    ],
    playground_defaults={
        "cached_data_gb": 50,
        "executor_memory_gb": 6,
        "num_executors": 10,
    },
)

# Scenario 17: Window Function Skew
WINDOW_FUNCTION_SKEW = Scenario(
    id="window-function-skew",
    title="Window Function Skew",
    level=ScenarioLevel.INTERMEDIATE,
    spark_concepts=["window function", "skew", "partition by"],
    real_world_context="Row_number over partition by user_id with power users",
    story=(
        "You use row_number() OVER (PARTITION BY user_id ORDER BY timestamp) to deduplicate events. "
        "Most users have <100 events, but 5 power users have 10 million events each. "
        "199 tasks finish in 30 seconds. 1 task runs for 2 hours processing a single user_id. "
        "Entire job waits for that one straggler."
    ),
    logical_operations=["read", "window_partition", "row_number", "skew"],
    expected_stages=2,
    expected_shuffles=1,
    expected_skew=True,
    evidence_signals=["task_duration_skew", "records_per_partition", "max_task_time"],
    explanation_goal=(
        "Window functions shuffle data by partition key (user_id). "
        "Skewed partition keys cause one task to process disproportionate data. "
        "No automatic skew handling exists for window functions—requires manual salting or different partitioning."
    ),
    learning_goals=[
        "Understand window function skew is different from join skew",
        "See that AQE does NOT help with window function skew",
        "Learn manual mitigation strategies for windowed queries",
    ],
    key_takeaways=[
        "Window functions partition by key — skewed keys create the same straggler problem as joins",
        "AQE cannot split skewed window partitions — manual salting or different partitioning required",
        "Profile your partition key: if one key has 100× more rows than median, you have window skew",
    ],
    common_mistakes=[
        "Expecting AQE to fix window skew automatically — it only handles join skew",
        "Using a low-cardinality column (country, status) as window partition key",
    ],
    playground_defaults={
        "rows": 100_000_000,
        "skew_key_count": 5,
        "skew_key_size": 10_000_000,
    },
)

# Scenario 18: Partition Sizing Tradeoffs
PARTITION_SIZING_TRADEOFFS = Scenario(
    id="partition-sizing-tradeoffs",
    title="Partition Sizing Tradeoffs",
    level=ScenarioLevel.INTERMEDIATE,
    spark_concepts=["partitions", "parallelism", "task overhead"],
    real_world_context="Comparing 1 vs 200 vs 10,000 partition performance",
    story=(
        "You have 10GB of data to process. Colleague A says 'use 1 partition for speed.' "
        "Colleague B says 'use 10,000 partitions for maximum parallelism.' "
        "Documentation says 'aim for 128MB per partition' (78 partitions). "
        "Who is right? Performance differs wildly."
    ),
    logical_operations=["read", "repartition", "process", "write"],
    expected_stages=2,
    expected_shuffles=1,
    evidence_signals=["task_count", "task_overhead", "parallelism", "throughput"],
    explanation_goal=(
        "1 partition = no parallelism, single executor bottleneck. "
        "10,000 partitions = high task scheduling overhead, minimal data per task. "
        "Sweet spot balances parallelism with overhead. Trade-off depends on cluster size and data size."
    ),
    learning_goals=[
        "Understand the partition count sweet spot",
        "See the overhead of too many small partitions",
        "Learn the formula: ideal partitions = total_data_size / 128MB",
    ],
    key_takeaways=[
        "Too few partitions = wasted parallelism; too many = scheduling overhead dominates",
        "Sweet spot formula: total_data_size / 128MB = ideal partition count",
        "10,000 partitions for 10GB data = 1MB per task = scheduler overhead kills performance",
    ],
    common_mistakes=[
        "Setting partition count once and never revisiting as data grows",
        "Using the same partition count for 1GB and 1TB datasets",
    ],
    playground_defaults={
        "data_size_gb": 10,
        "partition_options": [1, 78, 200, 10_000],
    },
)

# Scenario 19: Distinct vs GroupBy Deduplication
DISTINCT_VS_GROUPBY_DEDUP = Scenario(
    id="distinct-vs-groupby-dedup",
    title="Distinct vs GroupBy Deduplication",
    level=ScenarioLevel.BASIC,
    spark_concepts=["distinct", "groupBy", "deduplication"],
    real_world_context="Removing duplicate user IDs from dataset",
    story=(
        "You need to deduplicate user_ids. You try df.select('user_id').distinct() and "
        "df.groupBy('user_id').agg(first('timestamp')). "
        "Both work, but DAGs look different and runtime varies by 2x. Why?"
    ),
    logical_operations=["read", "distinct_or_groupby", "write"],
    expected_stages=2,
    expected_shuffles=1,
    evidence_signals=["shuffle_bytes", "task_count"],
    explanation_goal=(
        "Both distinct() and groupBy() trigger a shuffle to colocate matching keys. "
        "distinct() is simpler (just dedup), groupBy() allows additional aggregations. "
        "Performance difference comes from what you do after grouping, not the grouping itself."
    ),
    learning_goals=[
        "Compare distinct() and groupBy() execution plans",
        "Understand when each approach is more efficient",
        "See that both trigger shuffles but with different downstream flexibility",
    ],
    key_takeaways=[
        "Both distinct() and groupBy() trigger a shuffle — neither avoids data movement",
        "distinct() is simpler and may be faster for pure dedup; groupBy() allows aggregations",
        "Check the physical plan with .explain() — Spark may optimize both to the same plan",
    ],
    common_mistakes=[
        "Using groupBy().count() when you just need distinct values — unnecessary aggregation",
        "Assuming distinct() is always faster — depends on data characteristics and downstream ops",
    ],
    playground_defaults={
        "rows": 50_000_000,
        "unique_keys": 10_000_000,
    },
)

# Scenario 20: Salted Join
SALTED_JOIN = Scenario(
    id="salted-join",
    title="Salted Join",
    level=ScenarioLevel.INTERMEDIATE,
    spark_concepts=["salting", "skew", "join", "key distribution"],
    real_world_context="Joining on skewed keys using salting technique",
    story=(
        "Your join on product_id is skewed—90% of orders are for product_id=NULL. "
        "Standard join has 199 tasks finish in 1 minute, 1 task runs for 3 hours. "
        "You apply salting: explode smaller table with salt keys, add random salt to larger table. "
        "All tasks now finish in 5 minutes. What happened?"
    ),
    logical_operations=["add_salt_key", "explode_small_table", "join_on_salted_key", "remove_salt"],
    expected_stages=3,
    expected_shuffles=2,
    expected_skew=False,
    evidence_signals=["task_duration_variance", "records_per_partition"],
    explanation_goal=(
        "Salting distributes skewed keys across multiple partitions by adding random suffix. "
        "Increases data size (small table replicated N times) but eliminates single-task bottleneck. "
        "Trade-off: More shuffle bytes for better parallelism."
    ),
    learning_goals=[
        "Learn the salting technique for skew mitigation",
        "Understand the trade-off: more data movement for better parallelism",
        "See the impact on task duration distribution before and after salting",
    ],
    key_takeaways=[
        "Salting adds random suffix to skewed keys — distributes data across N more partitions",
        "Trade-off: small table is replicated N times (more shuffle) but eliminates the straggler",
        "Salt factor = how many sub-partitions per key; start with 10, tune based on skew severity",
    ],
    common_mistakes=[
        "Salting with too high a factor — creates too many small partitions with excessive overhead",
        "Forgetting to remove the salt column after the join — corrupts downstream logic",
    ],
    playground_defaults={
        "skew_key_percentage": 0.9,
        "salt_factor": 10,
    },
)

# Scenario 21: Multiple Shuffles in Sequence
MULTIPLE_SHUFFLES_SEQUENCE = Scenario(
    id="multiple-shuffles-sequence",
    title="Multiple Shuffles in Sequence",
    level=ScenarioLevel.INTERMEDIATE,
    spark_concepts=["shuffle", "pipeline", "stage boundaries"],
    real_world_context="Chain of groupBy, join, and distinct causing shuffle storm",
    story=(
        "Your pipeline does: groupBy(user_id) → join(lookup_table) → distinct() → groupBy(region). "
        "DAG shows 5 stages. Logs show 'ShuffleWrite' repeated 4 times. "
        "Job takes 40 minutes. Each shuffle writes 50GB to disk then reads it back."
    ),
    logical_operations=["read", "groupby", "join", "distinct", "groupby_again", "write"],
    expected_stages=5,
    expected_shuffles=4,
    evidence_signals=["shuffle_write_bytes", "shuffle_read_bytes", "stage_boundaries"],
    explanation_goal=(
        "Each wide transformation (groupBy, join, distinct) creates a stage boundary and shuffle. "
        "Shuffles serialize data to disk and transfer across network. "
        "Reducing shuffles requires rethinking transformation order or fusing operations."
    ),
    learning_goals=[
        "Count shuffle operations in your pipeline",
        "Understand cumulative shuffle cost",
        "Learn to restructure pipelines to minimize shuffle count",
    ],
    key_takeaways=[
        "Each shuffle = full data serialization + disk write + network transfer + disk read + deserialization",
        "4 shuffles of 50GB each = 200GB of disk I/O + 200GB of network transfer",
        "Restructure pipelines: can you combine operations? Filter earlier? Pre-aggregate before join?",
    ],
    common_mistakes=[
        "Not counting the total shuffles in your pipeline — each one compounds the cost",
        "Adding distinct() 'just to be safe' — it's another full shuffle of your data",
    ],
    playground_defaults={
        "rows": 100_000_000,
        "shuffle_count": 4,
    },
)

# Scenario 22: Coalesce Before Write
COALESCE_BEFORE_WRITE = Scenario(
    id="coalesce-before-write",
    title="Coalesce Before Write",
    level=ScenarioLevel.BASIC,
    spark_concepts=["coalesce", "write", "output files"],
    real_world_context="Reducing output file count before writing to S3",
    story=(
        "Your job has 200 partitions. Without coalesce, it writes 200 tiny files to S3 (each 10MB). "
        "Downstream jobs struggle with file listing overhead. "
        "You add .coalesce(20) before write. Now 20 files of 100MB each. "
        "Downstream jobs are 10x faster."
    ),
    logical_operations=["read", "transform", "coalesce", "write"],
    expected_stages=2,
    expected_shuffles=0,
    evidence_signals=["output_file_count", "file_size_distribution"],
    explanation_goal=(
        "Coalesce reduces partition count without full shuffle (merges partitions on same executor). "
        "Fewer output files reduce file system overhead for downstream jobs. "
        "Trade-off: Less parallelism during write phase."
    ),
    learning_goals=[
        "Understand coalesce vs repartition for write optimization",
        "See the 10× downstream read improvement from proper file sizing",
        "Learn when coalesce is safe and when repartition is needed",
    ],
    key_takeaways=[
        "coalesce() merges partitions WITHOUT a shuffle — always prefer it for reducing file count",
        "Target: output files between 128MB–256MB for optimal cloud storage read performance",
        "Formula: output_partitions = total_output_data / 200MB",
    ],
    common_mistakes=[
        "Using repartition() when coalesce() would work — unnecessary shuffle before write",
        "Coalescing to 1 partition for small data — fine for tiny outputs, but serializes the write",
    ],
    playground_defaults={
        "input_partitions": 200,
        "output_partitions": 20,
    },
)

# Scenario 23: Dynamic Partition Overwrite
DYNAMIC_PARTITION_OVERWRITE = Scenario(
    id="dynamic-partition-overwrite",
    title="Dynamic Partition Overwrite",
    level=ScenarioLevel.INTERMEDIATE,
    spark_concepts=["partitioning", "dynamic partition", "overwrite mode"],
    real_world_context="Overwriting only specific date partitions without touching others",
    story=(
        "You have a partitioned table by date (2024-01-01, 2024-01-02, ..., 2024-12-31). "
        "You want to reprocess only 2024-06-15 data. "
        "With static overwrite, Spark deletes ALL partitions before writing. You lose 364 days of data. "
        "With dynamic overwrite, Spark only replaces 2024-06-15. Other dates untouched."
    ),
    logical_operations=["read", "filter", "write_dynamic_overwrite"],
    expected_stages=1,
    expected_shuffles=0,
    evidence_signals=["partitions_deleted", "partitions_written"],
    explanation_goal=(
        "Static overwrite mode deletes entire table before writing. "
        "Dynamic overwrite mode (spark.sql.sources.partitionOverwriteMode=dynamic) only deletes partitions "
        "present in the DataFrame being written. Critical for incremental partition updates."
    ),
    learning_goals=[
        "Understand static vs dynamic overwrite modes",
        "See the data loss risk of static overwrite",
        "Learn safe practices for partition-level updates",
    ],
    key_takeaways=[
        "Static overwrite DELETES ALL partitions before writing — data loss if you only write a subset",
        "Dynamic overwrite only replaces partitions present in your DataFrame — safe for incremental updates",
        "Set spark.sql.sources.partitionOverwriteMode=dynamic for production partition tables",
    ],
    common_mistakes=[
        "Using default static overwrite on partitioned tables — deletes partitions you didn't intend to touch",
        "Not testing overwrite behavior in a staging environment first — data loss is permanent",
    ],
    playground_defaults={
        "partition_column": "date",
        "overwrite_mode": "dynamic",
    },
)

# Scenario 24: Explode + Join Trap
EXPLODE_JOIN_TRAP = Scenario(
    id="explode-join-trap",
    title="Explode + Join Trap",
    level=ScenarioLevel.INTERMEDIATE,
    spark_concepts=["explode", "join", "data explosion", "cartesian product"],
    real_world_context="Exploding arrays before join causes unexpected data multiplication",
    story=(
        "You have users table (1M rows) with tags array column [tag1, tag2, tag3]. "
        "You explode tags, getting 5M rows (avg 5 tags per user). "
        "Then join with products table (100K rows) on exploded tags. "
        "Result is 50M rows instead of expected 5M. You accidentally created partial cartesian product. "
        "Job runs out of memory during join."
    ),
    logical_operations=["read_users", "explode_tags", "join_products", "data_explosion"],
    expected_stages=2,
    expected_shuffles=1,
    evidence_signals=["row_count_explosion", "shuffle_bytes", "memory_usage"],
    explanation_goal=(
        "Explode transforms 1 row with N array elements into N rows. "
        "Joining exploded data multiplies row counts if join keys aren't unique. "
        "Always validate cardinality after explode and consider whether join should happen before explode."
    ),
    learning_goals=[
        "Understand row multiplication from explode",
        "See the cartesian product risk when joining exploded data",
        "Learn to validate cardinality at each pipeline step",
    ],
    key_takeaways=[
        "explode() turns 1 row into N rows — 5 array elements = 5× the row count",
        "Joining after explode can create partial cartesian products — row count multiplies unexpectedly",
        "Always check: df.count() after explode and after join — catch explosions before OOM",
    ],
    common_mistakes=[
        "Exploding arrays before join without checking if join keys are unique post-explode",
        "Not validating intermediate row counts — data explosion is silent until OOM",
    ],
    playground_defaults={
        "input_rows": 1_000_000,
        "avg_array_size": 5,
        "join_table_rows": 100_000,
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
    # Production pain point scenarios (12 new)
    ScenarioRegistry.register(SMALL_FILES_EXPLOSION)
    ScenarioRegistry.register(BROADCAST_HINT_BACKFIRE)
    ScenarioRegistry.register(AQE_MYSTERY)
    ScenarioRegistry.register(CACHE_OOM)
    ScenarioRegistry.register(WINDOW_FUNCTION_SKEW)
    ScenarioRegistry.register(PARTITION_SIZING_TRADEOFFS)
    ScenarioRegistry.register(DISTINCT_VS_GROUPBY_DEDUP)
    ScenarioRegistry.register(SALTED_JOIN)
    ScenarioRegistry.register(MULTIPLE_SHUFFLES_SEQUENCE)
    ScenarioRegistry.register(COALESCE_BEFORE_WRITE)
    ScenarioRegistry.register(DYNAMIC_PARTITION_OVERWRITE)
    ScenarioRegistry.register(EXPLODE_JOIN_TRAP)


# Register scenarios on module load
_register_all_scenarios()


# Convenience functions
def list_scenarios() -> list[Scenario]:
    """List all available scenarios."""
    return ScenarioRegistry.list_all()


def get_scenario_by_id(scenario_id: str) -> Optional[Scenario]:
    """Get a scenario by its ID."""
    return ScenarioRegistry.get(scenario_id)
