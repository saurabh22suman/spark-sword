"""Myth Busters API - Spark misconceptions with evidence-based debunking.

Following PrepRabbit philosophy:
- Every myth must be testable through existing interactive components
- "Why" explanations must reference Spark's execution model
- Myths address real Reddit/community pain points
- No prescriptive "always do X" advice - show trade-offs

This module provides educational content to help users unlearn
common Spark anti-patterns discovered through community research.
"""

from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class MythCategory(str, Enum):
    """Categories for organizing Spark myths."""
    
    PERFORMANCE = "performance"
    MEMORY = "memory"
    SHUFFLE = "shuffle"
    JOINS = "joins"
    CONFIGS = "configs"
    GENERAL = "general"


class MythSeverity(str, Enum):
    """Severity level indicating how common/dangerous the misconception is."""
    
    COMMON = "common"        # Most learners believe this
    DANGEROUS = "dangerous"  # Can cause production issues
    SUBTLE = "subtle"        # Only noticeable in specific scenarios


class SparkMyth(BaseModel):
    """A Spark misconception with evidence-based debunking.
    
    Attributes:
        id: Unique identifier (kebab-case)
        myth: The misconception statement
        truth: The actual reality
        why: Detailed explanation referencing Spark behavior
        evidence_type: Type of evidence (interactive, explanation, metric)
        demo_component: Link to interactive tutorial component (optional)
        category: Primary category
        severity: How common/dangerous the myth is
        tags: Searchable tags
    """
    
    id: str = Field(..., description="Unique myth identifier")
    myth: str = Field(..., description="The misconception statement")
    truth: str = Field(..., description="The actual reality")
    why: str = Field(..., description="Detailed Spark-based explanation")
    evidence_type: str = Field(
        default="explanation",
        description="Type of evidence: interactive, explanation, metric"
    )
    demo_component: Optional[str] = Field(
        default=None,
        description="Name of interactive component to prove the myth"
    )
    category: MythCategory = Field(..., description="Primary category")
    severity: MythSeverity = Field(..., description="Severity level")
    tags: list[str] = Field(default_factory=list, description="Searchable tags")


# Reddit-sourced Spark myths based on external research
SPARK_MYTHS: list[SparkMyth] = [
    # PERFORMANCE myths
    SparkMyth(
        id="more-partitions-faster",
        myth="More partitions always means faster execution",
        truth="More partitions beyond available cores adds scheduling overhead",
        why="Spark's scheduler has per-task overhead. With 10,000 partitions on 4 cores, you spend more time scheduling tasks than processing data. The sweet spot is typically 2-4x your total cores.",
        evidence_type="interactive",
        demo_component="PartitionPlayground",
        category=MythCategory.PERFORMANCE,
        severity=MythSeverity.COMMON,
        tags=["partitions", "parallelism", "performance", "scheduling"],
    ),
    
    SparkMyth(
        id="larger-executors-always-faster",
        myth="Larger executors are always faster",
        truth="Executor size depends on GC pressure, parallelism needs, and data locality",
        why="Giant executors (32+ cores, 64GB+ RAM) suffer from long GC pauses. Too many small executors waste resources on overhead. Balance depends on your workload's memory vs CPU needs.",
        evidence_type="interactive",
        demo_component="ExecutorMemorySimulator",
        category=MythCategory.PERFORMANCE,
        severity=MythSeverity.COMMON,
        tags=["executors", "memory", "gc", "configuration"],
    ),
    
    # MEMORY myths
    SparkMyth(
        id="cache-everything",
        myth="You should cache every DataFrame you use more than once",
        truth="Caching too much causes memory pressure and evictions",
        why="Cached data must fit in executor storage memory. Exceeding capacity triggers evictions (LRU), which defeats caching purpose. Worse, evicted blocks may need recomputation mid-job, causing slowdowns.",
        evidence_type="interactive",
        demo_component="CacheGoneWrongDemo",
        category=MythCategory.MEMORY,
        severity=MythSeverity.DANGEROUS,
        tags=["cache", "persist", "memory", "eviction", "storage"],
    ),
    
    SparkMyth(
        id="persist-same-as-cache",
        myth="persist() and cache() are the same thing",
        truth="cache() is just persist(MEMORY_ONLY), but persist() offers storage levels",
        why="persist() lets you choose: MEMORY_ONLY, MEMORY_AND_DISK, DISK_ONLY, etc. cache() is hardcoded to MEMORY_ONLY. For large DataFrames, MEMORY_AND_DISK prevents recomputation if evicted.",
        evidence_type="explanation",
        category=MythCategory.MEMORY,
        severity=MythSeverity.SUBTLE,
        tags=["cache", "persist", "storage-levels"],
    ),
    
    # SHUFFLE myths
    SparkMyth(
        id="repartition-is-free",
        myth="Repartitioning is a cheap operation",
        truth="Repartition triggers a full shuffle of all data",
        why="repartition() triggers a wide transformation, shuffling 100% of your data across the cluster. Use coalesce() to reduce partitions without shuffle (narrow transformation) when possible.",
        evidence_type="interactive",
        demo_component="RepartitionDemo",
        category=MythCategory.SHUFFLE,
        severity=MythSeverity.COMMON,
        tags=["repartition", "coalesce", "shuffle", "wide-transformation"],
    ),
    
    SparkMyth(
        id="shuffle-partitions-default-is-fine",
        myth="The default spark.sql.shuffle.partitions=200 is optimal",
        truth="200 partitions is arbitrary and rarely optimal for your data size",
        why="Spark defaulted to 200 in 2014 when clusters were smaller. Modern jobs on TBs of data need more partitions; small jobs waste resources with 200. Rule of thumb: 128MB per partition post-shuffle.",
        evidence_type="interactive",
        demo_component="ShuffleCostSimulator",
        category=MythCategory.SHUFFLE,
        severity=MythSeverity.COMMON,
        tags=["shuffle-partitions", "configuration", "shuffle"],
    ),
    
    # JOINS myths
    SparkMyth(
        id="broadcast-join-always-wins",
        myth="Broadcast joins are always faster than shuffle joins",
        truth="Broadcasting huge tables (>1GB) causes driver/executor OOM",
        why="Broadcast join sends the entire 'small' table to every executor. If that table is 5GB and you have 100 executors, you've replicated 500GB of data. Driver collects it first, risking OOM.",
        evidence_type="interactive",
        demo_component="JoinStrategySimulator",
        category=MythCategory.JOINS,
        severity=MythSeverity.DANGEROUS,
        tags=["broadcast", "join", "memory", "oom"],
    ),
    
    SparkMyth(
        id="broadcast-hint-guarantees-broadcast",
        myth="Using broadcast() hint guarantees a broadcast join",
        truth="Spark ignores broadcast hints if the table exceeds spark.sql.autoBroadcastJoinThreshold",
        why="The broadcast hint is a suggestion, not a command. If the broadcasted table exceeds the threshold (default 10MB), Spark falls back to sort-merge join to prevent OOM.",
        evidence_type="interactive",
        demo_component="BroadcastThresholdDemo",
        category=MythCategory.JOINS,
        severity=MythSeverity.SUBTLE,
        tags=["broadcast", "join", "hint", "threshold"],
    ),
    
    # CONFIGS myths
    SparkMyth(
        id="aqe-fixes-everything",
        myth="Enabling AQE (Adaptive Query Execution) automatically optimizes everything",
        truth="AQE helps with skew and partition sizing, but doesn't fix bad query design",
        why="AQE dynamically coalesces shuffle partitions and handles skew joins, but it can't fix Cartesian products, unnecessary shuffles, or poor caching strategies. It optimizes execution, not logic.",
        evidence_type="explanation",
        category=MythCategory.CONFIGS,
        severity=MythSeverity.COMMON,
        tags=["aqe", "adaptive-query-execution", "optimization"],
    ),
    
    SparkMyth(
        id="kryo-always-faster",
        myth="Kryo serialization is always faster than Java serialization",
        truth="Kryo is faster but requires class registration for best performance",
        why="Kryo is faster and more compact, but unregistered classes fall back to reflection, losing the performance benefit. Also, some Spark operations (like collect()) still use Java serialization.",
        evidence_type="explanation",
        category=MythCategory.CONFIGS,
        severity=MythSeverity.SUBTLE,
        tags=["kryo", "serialization", "configuration"],
    ),
    
    # GENERAL myths
    SparkMyth(
        id="dataframe-like-pandas",
        myth="Spark DataFrames work just like Pandas DataFrames",
        truth="Spark DataFrames are lazy; operations don't execute until an action",
        why="Unlike Pandas (eager evaluation), Spark builds a DAG of transformations. Nothing executes until you call show(), count(), write(), etc. This enables query optimization but confuses beginners.",
        evidence_type="interactive",
        demo_component="LazyEvalSimulator",
        category=MythCategory.GENERAL,
        severity=MythSeverity.COMMON,
        tags=["lazy-evaluation", "dataframe", "dag", "transformations"],
    ),
    
    SparkMyth(
        id="small-files-not-a-problem",
        myth="Reading thousands of small files isn't a performance issue",
        truth="Small files create one task per file, overwhelming the scheduler",
        why="Spark creates one task per file by default. Reading 10,000 tiny files = 10,000 tasks, each with scheduling overhead, serialization cost, and startup time. Coalesce or repartition after reading.",
        evidence_type="interactive",
        demo_component="FileExplosionVisualizer",
        category=MythCategory.PERFORMANCE,
        severity=MythSeverity.DANGEROUS,
        tags=["small-files", "tasks", "scheduling", "performance"],
    ),
    
    SparkMyth(
        id="window-functions-always-slow",
        myth="Window functions are always slow and should be avoided",
        truth="Window functions can be efficient with proper partitioning",
        why="Window functions require shuffling data by partition key. If your partition is the entire dataset (no PARTITION BY), yes, it's slow. Partition on a high-cardinality column to parallelize.",
        evidence_type="explanation",
        category=MythCategory.PERFORMANCE,
        severity=MythSeverity.SUBTLE,
        tags=["window-functions", "partitioning", "shuffle"],
    ),
    
    # Additional performance myth
    SparkMyth(
        id="collect-is-safe-for-testing",
        myth="Using .collect() is fine for testing with small datasets",
        truth=".collect() pulls all data to the driver, causing OOM with unexpected data growth",
        why="collect() materializes the entire DataFrame on the driver node. Even 'small' test datasets can explode after joins or aggregations. Use .take(N) or .show() for safer testing.",
        evidence_type="explanation",
        category=MythCategory.MEMORY,
        severity=MythSeverity.DANGEROUS,
        tags=["collect", "driver", "oom", "testing"],
    ),
]


def get_all_myths() -> list[SparkMyth]:
    """Get all available Spark myths.
    
    Returns:
        List of all SparkMyth objects
    """
    return SPARK_MYTHS


def get_myths_by_category(category: MythCategory) -> list[SparkMyth]:
    """Filter myths by category.
    
    Args:
        category: MythCategory to filter by
        
    Returns:
        List of myths in the specified category
    """
    return [myth for myth in SPARK_MYTHS if myth.category == category]


def get_myth_by_id(myth_id: str) -> Optional[SparkMyth]:
    """Get a specific myth by ID.
    
    Args:
        myth_id: Unique myth identifier
        
    Returns:
        SparkMyth if found, None otherwise
    """
    for myth in SPARK_MYTHS:
        if myth.id == myth_id:
            return myth
    return None
