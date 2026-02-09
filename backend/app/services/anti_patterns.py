"""
Anti-Pattern Gallery: Educational examples of bad Spark code.

Provides runnable examples of common mistakes with:
- Bad code example
- Why it's problematic
- Event log metrics showing the impact
- Fixed version with explanation
"""
from typing import List, Dict, Any
from pydantic import BaseModel


class AntiPatternExample(BaseModel):
    """A specific anti-pattern with bad and good examples."""
    id: str
    title: str
    category: str  # "joins", "memory", "shuffles", "actions", "caching"
    severity: str  # "critical", "high", "medium", "low"
    
    # The Problem
    bad_code: str
    why_bad: str
    common_symptoms: List[str]
    
    # Evidence
    typical_metrics: Dict[str, str]  # What you'd see in event logs
    
    # The Solution
    good_code: str
    why_good: str
    improvements: List[str]
    
    # Learning
    when_to_use: str
    docs_link: str
    

# Gallery of anti-patterns
ANTI_PATTERNS: List[AntiPatternExample] = [
    # 1. Cartesian Join
    AntiPatternExample(
        id="cartesian-join",
        title="Cartesian Join Explosion",
        category="joins",
        severity="critical",
        bad_code="""# ❌ BAD: Missing join condition
df1 = spark.range(1000)
df2 = spark.range(1000)

result = df1.crossJoin(df2)  # or df1.join(df2)
result.count()  # 1,000,000 rows!""",
        why_bad="Without a join condition, Spark computes every combination: 1000 × 1000 = 1M rows. Scales quadratically (O(n²)). With 10K rows each side → 100M output rows.",
        common_symptoms=[
            "Job runs forever on small datasets",
            "Shuffle write >> input size (100x expansion)",
            "Out of memory errors during join",
            "Tasks spilling massive amounts to disk"
        ],
        typical_metrics={
            "Input": "2K rows (1K each side)",
            "Output": "1M rows",
            "Shuffle Write": "10 GB",
            "Duration": "45 minutes",
            "Spill": "50 GB to disk"
        },
        good_code="""# ✅ GOOD: Explicit join condition
df1 = spark.range(1000).withColumn("key", col("id") % 10)
df2 = spark.range(1000).withColumn("key", col("id") % 10)

result = df1.join(df2, on="key", how="inner")
result.count()  # ~100K rows (reasonable)""",
        why_good="Join condition filters combinations. Only rows with matching keys are combined. Output size is predictable and linear.",
        improvements=[
            "Output reduced from 1M to ~100K rows (10x smaller)",
            "Shuffle reduced from 10GB to 500MB (20x smaller)",
            "Duration reduced from 45min to 2min (22x faster)",
            "No spilling to disk"
        ],
        when_to_use="Never use crossJoin() unless you explicitly need all combinations (rare). Always specify a join condition.",
        docs_link="https://spark.apache.org/docs/latest/sql-performance-tuning.html#join-strategy-hints-for-sql-queries"
    ),
    
    # 2. Collect on Large DataFrame
    AntiPatternExample(
        id="collect-driver-oom",
        title=".collect() on Large DataFrame",
        category="actions",
        severity="critical",
        bad_code="""# ❌ BAD: Pull all data to driver
df = spark.read.parquet("s3://data/10GB_dataset")

all_rows = df.collect()  # Driver OOM!
for row in all_rows:
    process(row)""",
        why_bad=".collect() pulls ALL data into driver memory. Driver typically has 1-4GB RAM. Dataset is 10GB. Driver crashes with OutOfMemoryError.",
        common_symptoms=[
            "java.lang.OutOfMemoryError: Java heap space",
            "Driver crashes midway through job",
            "Executors finish successfully but job fails",
            "GC overhead limit exceeded"
        ],
        typical_metrics={
            "Dataset Size": "10 GB",
            "Driver Memory": "2 GB",
            "Executors Completed": "100%",
            "Job Status": "FAILED (OOM)",
            "Time to Failure": "After 95% progress"
        },
        good_code="""# ✅ GOOD: Process on executors
df = spark.read.parquet("s3://data/10GB_dataset")

# Option 1: Use DataFrame operations
result = df.map(process).write.parquet("output/")

# Option 2: If you must collect, sample first
sample = df.sample(0.01).collect()  # 1% sample""",
        why_good="Processing happens on executors (distributed). Each executor handles a partition. Driver only manages coordination, not data.",
        improvements=[
            "No driver OOM - data stays distributed",
            "Parallel processing on all cores",
            "Can handle datasets larger than cluster memory",
            "Job completes successfully"
        ],
        when_to_use="Only use .collect() for small results (<100MB). For large datasets, use .write() or .foreach().",
        docs_link="https://spark.apache.org/docs/latest/rdd-programming-guide.html#actions"
    ),
    
    # 3. Too Many Small Files
    AntiPatternExample(
        id="file-explosion",
        title="Small File Problem",
        category="shuffles",
        severity="high",
        bad_code="""# ❌ BAD: Default partitioning creates 200 files
df = spark.read.parquet("input/")
df.write.parquet("output/")  # 200 tiny files

# Or worse: repartition(1000)
df.repartition(1000).write.parquet("output/")  # 1000 files!""",
        why_bad="Spark defaults to 200 shuffle partitions. Each partition → 1 output file. If data is small (1GB), you get 200 files of 5MB each. HDFS/S3 metadata overhead kills performance.",
        common_symptoms=[
            "Thousands of tiny files in output directory",
            "Slow read performance on next job",
            "S3 ListObjects takes minutes",
            "NameNode memory pressure (HDFS)"
        ],
        typical_metrics={
            "Input Size": "1 GB",
            "Default Partitions": "200",
            "Output Files": "200 × 5MB each",
            "Next Read Time": "5 minutes (vs. 10s)",
            "Filesystem Overhead": "10x"
        },
        good_code="""# ✅ GOOD: Coalesce to appropriate number
df = spark.read.parquet("input/")

# Target: 128-256MB per file
num_files = max(1, int(df_size_bytes / (128 * 1024 * 1024)))

df.coalesce(num_files).write.parquet("output/")  # 8 files × 128MB""",
        why_good="Fewer, larger files reduce filesystem overhead. 128-256MB is sweet spot for Parquet. coalesce() is cheaper than repartition() (no shuffle).",
        improvements=[
            "Files reduced from 200 to 8 (25x fewer)",
            "File size increased from 5MB to 128MB (optimal)",
            "Next read time reduced from 5min to 10s (30x faster)",
            "Metadata overhead reduced by 95%"
        ],
        when_to_use="Always check df.rdd.getNumPartitions() before writing. Use .coalesce() for final output. Target 128-256MB files.",
        docs_link="https://spark.apache.org/docs/latest/sql-data-sources-parquet.html"
    ),
    
    # 4. Unnecessary Repartition
    AntiPatternExample(
        id="double-shuffle",
        title="Double Shuffle Anti-Pattern",
        category="shuffles",
        severity="high",
        bad_code="""# ❌ BAD: Repartition then groupBy (double shuffle!)
df = spark.read.parquet("data/")

df.repartition(200, "user_id") \\
  .groupBy("user_id") \\
  .agg(sum("amount")) \\
  .write.parquet("output/")""",
        why_bad="repartition() shuffles by user_id. Then groupBy() shuffles again by user_id. Same data moved across network TWICE for no benefit.",
        common_symptoms=[
            "Two shuffle stages with same key",
            "Double shuffle bytes (e.g., 10GB shuffled twice)",
            "Job takes 2x longer than expected",
            "Network becomes bottleneck"
        ],
        typical_metrics={
            "Input": "5 GB",
            "Shuffle 1 (repartition)": "5 GB written + read",
            "Shuffle 2 (groupBy)": "5 GB written + read",
            "Total Shuffle": "20 GB (4x input!)",
            "Duration": "15 minutes"
        },
        good_code="""# ✅ GOOD: groupBy does the shuffle
df = spark.read.parquet("data/")

df.groupBy("user_id") \\
  .agg(sum("amount")) \\
  .write.parquet("output/")
  
# groupBy automatically co-locates rows by key""",
        why_good="groupBy() already does hash partitioning by key. No need to repartition first. One shuffle instead of two.",
        improvements=[
            "Shuffle reduced from 20GB to 10GB (50% less)",
            "Duration reduced from 15min to 8min",
            "Network bandwidth saved for other jobs",
            "Fewer stage failures (half as many shuffle boundaries)"
        ],
        when_to_use="Only repartition if you need a specific number of output files. Never repartition followed by groupBy/join on same key.",
        docs_link="https://spark.apache.org/docs/latest/rdd-programming-guide.html#shuffle-operations"
    ),
    
    # 5. Cache Without Unpersist
    AntiPatternExample(
        id="cache-leak",
        title="Memory Leak from Caching",
        category="caching",
        severity="medium",
        bad_code="""# ❌ BAD: Cache but never unpersist
for i in range(100):
    df = spark.read.parquet(f"data/day_{i}")
    df.cache()  # Memory leak!
    
    result = df.filter(...).count()
    # Forgot to unpersist - keeps adding to cache""",
        why_bad="Each .cache() allocates executor memory. Loop runs 100 times → 100 cached DataFrames. Executor memory fills up, causing spill/OOM.",
        common_symptoms=[
            "Executor memory usage keeps growing",
            "Later iterations slower than first",
            "Spilling to disk increases over time",
            "Executor OOM after 50-60 iterations"
        ],
        typical_metrics={
            "Iteration 1": "Memory used: 200MB",
            "Iteration 50": "Memory used: 10GB (capped)",
            "Iteration 60": "Executor OOM",
            "Storage Tab": "100 cached DataFrames shown",
            "Most are never reused": "Wasted"
        },
        good_code="""# ✅ GOOD: Unpersist when done
for i in range(100):
    df = spark.read.parquet(f"data/day_{i}")
    df.cache()
    
    result = df.filter(...).count()
    
    df.unpersist()  # Free memory for next iteration""",
        why_good="unpersist() releases executor memory. Each iteration has clean slate. Memory usage stays constant.",
        improvements=[
            "Memory usage constant at 200MB (not growing)",
            "All 100 iterations complete successfully",
            "No spilling to disk",
            "Consistent performance throughout"
        ],
        when_to_use="Always pair .cache() with .unpersist() when DataFrame is no longer needed. Use in loops and long-running apps.",
        docs_link="https://spark.apache.org/docs/latest/rdd-programming-guide.html#rdd-persistence"
    ),
    
    # 6. Silent Type Coercion
    AntiPatternExample(
        id="silent-coercion",
        title="Silent Type Coercion Data Loss",
        category="correctness",
        severity="high",
        bad_code="""# ❌ BAD: Reading numeric column as string, then to int
df = spark.read.csv("data.csv", header=True)  # All strings
df = df.withColumn("amount", col("amount").cast("int"))

# Input: $1,234.56 → Output: null (silent loss!)""",
        why_bad="CSV reader defaults to StringType. String '$1,234.56' cast to int → null (parsing fails silently). Data loss without error.",
        common_symptoms=[
            "Nulls appearing in numeric columns",
            "Aggregations return 0 or null unexpectedly",
            "Silent data corruption",
            "'WHERE amount > 0' filters out too many rows"
        ],
        typical_metrics={
            "Input Rows": "1,000,000",
            "Amount Column Nulls Before": "0",
            "Amount Column Nulls After": "500,000 (50%!)",
            "Data Loss": "Silent - no errors thrown"
        },
        good_code="""# ✅ GOOD: Define schema explicitly
from pyspark.sql.types import *

schema = StructType([
    StructField("id", IntegerType(), False),
    StructField("amount", DoubleType(), True)
])

df = spark.read.csv("data.csv", header=True, schema=schema)

# Spark will enforce schema or throw error on bad data""",
        why_good="Explicit schema tells Spark expected types. Bad records are caught early (nullBadRecords or fail job). No silent corruption.",
        improvements=[
            "Bad data caught at read time (fail fast)",
            "No silent nulls introduced",
            "Data quality guaranteed",
            "Debugging easier (errors point to source)",
        ],
        when_to_use="Always define schema for CSV/JSON. Never rely on type inference in production. Use PERMISSIVE mode + badRecordsPath for error handling.",
        docs_link="https://spark.apache.org/docs/latest/sql-data-sources-parquet.html#schema-merging"
    ),
]


def get_all_anti_patterns() -> List[AntiPatternExample]:
    """Get all anti-patterns in the gallery."""
    return ANTI_PATTERNS


def get_anti_pattern_by_id(pattern_id: str) -> AntiPatternExample | None:
    """Get a specific anti-pattern by ID."""
    for pattern in ANTI_PATTERNS:
        if pattern.id == pattern_id:
            return pattern
    return None


def get_anti_patterns_by_category(category: str) -> List[AntiPatternExample]:
    """Get anti-patterns filtered by category."""
    return [p for p in ANTI_PATTERNS if p.category == category]
