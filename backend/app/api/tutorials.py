"""
Tutorials API

Provides endpoints for the interactive Spark mentorship tutorials.
Based on tutorials-spec.md - Senior Engineer Mentorship approach.

Philosophy: Cause → Effect → Trade-off → Failure mode
"""

from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/api/tutorials", tags=["tutorials"])


class PredictionChallenge(BaseModel):
    """Brilliant-style prediction challenge before tutorial content."""
    question: str
    options: list[str]
    correct_index: int
    explanation: str
    misconception: Optional[str] = None  # Common wrong assumption
    hints: list[str] = []  # Progressive hints (3 max)


class InteractiveTutorial(BaseModel):
    """An interactive tutorial component within a topic."""
    id: str
    title: str
    description: str
    component_type: str  # e.g., "partition-playground", "shuffle-map", "join-simulator"
    learning_outcome: str
    prediction_challenge: Optional[PredictionChallenge] = None  # DEPRECATED: Use prediction_challenges instead
    prediction_challenges: list[PredictionChallenge] = []  # Question bank - frontend picks one randomly
    docs_url: Optional[str] = None  # Official Spark documentation URL for deep dive


class TutorialTopic(BaseModel):
    """A topic within a tutorial group."""
    id: str
    title: str
    description: str
    tutorials: list[InteractiveTutorial]


class TutorialGroup(BaseModel):
    """A group of related tutorials representing a layer of Spark understanding."""
    id: str
    number: int
    title: str
    subtitle: str
    description: str
    icon: str  # Lucide icon name
    color: str  # Tailwind color class
    topics: list[str]
    learning_outcome: str
    tutorial_topics: list[TutorialTopic]
    key_takeaways: list[str] = []
    common_mistakes: list[str] = []


class TutorialGroupSummary(BaseModel):
    """Summary of a tutorial group for listing."""
    id: str
    number: int
    title: str
    subtitle: str
    icon: str
    color: str
    topic_count: int
    tutorial_count: int


# Tutorial data based on tutorials-spec.md
TUTORIAL_GROUPS: list[TutorialGroup] = [
    TutorialGroup(
        id="spark-mental-model",
        number=1,
        title="Spark Mental Model",
        subtitle="Foundation",
        description="What developers must understand before touching optimization. Learn what Spark is, how it executes, and why lazy evaluation matters.",
        icon="Brain",
        color="blue",
        topics=["What Spark is (and is not)", "Driver vs Executor", "Jobs, Stages, Tasks", "Lazy evaluation"],
        learning_outcome="Developers can explain why nothing happens until an action.",
        key_takeaways=[
            "Spark is a distributed compute engine — it doesn't store data, it processes it",
            "Nothing executes until you call an action (collect, count, write) — transformations are lazy",
            "Jobs split into stages at shuffle boundaries; stages split into tasks per partition",
            "The Driver plans; Executors execute — understanding this split prevents 90% of confusion",
            "Lazy evaluation lets Spark optimize the entire plan before running anything",
        ],
        common_mistakes=[
            "Calling .collect() on large datasets — pulls all data to the Driver and causes OOM",
            "Thinking transformations execute immediately — they don't until an action triggers them",
            "Confusing jobs, stages, and tasks — each has a specific meaning in Spark's execution model",
        ],
        tutorial_topics=[
            TutorialTopic(
                id="job-stage-task",
                title="Jobs, Stages & Tasks",
                description="Understand how Spark breaks down your code into executable units.",
                tutorials=[
                    InteractiveTutorial(
                        id="dag-visualizer",
                        title="Job → Stage → Task Visualizer",
                        description="Animated pipeline showing how DAG splits into stages when you trigger an action.",
                        component_type="dag-visualizer",
                        learning_outcome="Understand how actions trigger job execution and stage boundaries.",
                        docs_url="https://spark.apache.org/docs/latest/cluster-overview.html",
                        prediction_challenges=[
                            PredictionChallenge(
                                question="You write: df.filter(...).groupBy(...).count(). When does Spark actually start executing?",
                                options=[
                                    "After .filter() — it needs to load data",
                                    "After .groupBy() — it needs to shuffle",
                                    "After .count() — that's the action",
                                    "Immediately — Spark is eager"
                                ],
                                correct_index=2,
                                explanation="Spark is lazy. filter() and groupBy() are transformations that build a plan. Nothing executes until count() (the action) is called. This laziness lets Spark optimize the entire pipeline.",
                                misconception="Many expect Spark to execute transformations immediately like pandas."
                            ),
                            PredictionChallenge(
                                question="How many jobs appear in Spark UI if you run: df.select(...).filter(...).write.parquet('out')?",
                                options=[
                                    "0 jobs — nothing happened",
                                    "1 job triggered by write()",
                                    "3 jobs (one per operation)",
                                    "2 jobs (select+filter, then write)"
                                ],
                                correct_index=1,
                                explanation="write() is an action that triggers ONE job. Spark combines all transformations (select, filter) into stages within that single job.",
                                misconception="Some expect each transformation to create a separate job.",
                                hints=[
                                    "Actions create jobs, not transformations",
                                    "Spark fuses compatible transformations into stages",
                                    "One action = one job (with multiple stages)"
                                ]
                            ),
                            PredictionChallenge(
                                question="You call df.cache() then df.filter(...). Has any data been cached yet?",
                                options=[
                                    "Yes, cache() immediately loads data into memory",
                                    "No, cache() is lazy until an action runs",
                                    "Partially — only the schema is cached",
                                    "Yes, but only the first partition"
                                ],
                                correct_index=1,
                                explanation="cache() is a transformation, not an action. It marks the DataFrame for caching but doesn't materialize it until the first action. The next action will cache the data for subsequent reuse.",
                                misconception="Many think cache() eagerly loads data. It's lazy like all transformations.",
                                hints=[
                                    "cache() returns a DataFrame — it's a transformation",
                                    "Data materializes on the first action after cache()",
                                    "Check Spark UI Storage tab — nothing appears until action runs"
                                ]
                            )
                        ]
                    ),
                ]
            ),
            TutorialTopic(
                id="lazy-evaluation",
                title="Lazy Evaluation",
                description="Why Spark waits until the last moment to execute.",
                tutorials=[
                    InteractiveTutorial(
                        id="lazy-eval-simulator",
                        title="Lazy Evaluation Simulator",
                        description="Chain transformations and watch nothing happen until you trigger an action.",
                        component_type="lazy-eval-simulator",
                        learning_outcome="Understand why transformations are lazy and actions are eager.",
                        docs_url="https://spark.apache.org/docs/latest/rdd-programming-guide.html#rdd-operations",
                        prediction_challenges=[
                            PredictionChallenge(
                                question="You chain 10 transformations (filter, select, join, etc.) but never call an action. What happens?",
                                options=[
                                    "All 10 execute immediately",
                                    "Only the first 5 execute",
                                    "Nothing executes — no job is created",
                                    "Spark throws an error"
                                ],
                                correct_index=2,
                                explanation="Without an action, Spark builds the execution plan but never runs it. No job appears in the UI, no tasks execute, no data moves. The DAG stays in memory.",
                                misconception="Many think Spark processes data as you chain transformations."
                            ),
                            PredictionChallenge(
                                question="True or False: df.select('col1').filter(col('col1') > 10) reads data from disk.",
                                options=[
                                    "True — select() triggers a read",
                                    "False — these are transformations, no read yet",
                                    "True — filter() triggers execution",
                                    "Depends on data size"
                                ],
                                correct_index=1,
                                explanation="Both select() and filter() are transformations. They build a logical plan but don't read data until an action like count() or collect() is called.",
                                misconception="The intuition is that we need data to filter it, but Spark delays until forced.",
                                hints=[
                                    "Transformations return DataFrames instantly",
                                    "No job appears in Spark UI yet",
                                    "Actions force execution: count(), collect(), write()"
                                ]
                            ),
                            PredictionChallenge(
                                question="Why is lazy evaluation beneficial in Spark?",
                                options=[
                                    "It saves memory by not storing intermediate results",
                                    "It allows Spark to optimize the entire query before execution",
                                    "It makes debugging easier",
                                    "It reduces network traffic"
                                ],
                                correct_index=1,
                                explanation="Lazy evaluation lets Spark see the entire query plan before running anything. This enables optimizations like predicate pushdown, partition pruning, and combining operations. Without it, Spark would optimize each step in isolation.",
                                misconception="Some think it's just about saving memory, but optimization is the key benefit.",
                                hints=[
                                    "Imagine if Spark ran each filter separately vs combining them",
                                    "Catalyst optimizer needs the full plan to work its magic",
                                    "Example: push filters down before expensive joins"
                                ]
                            ),
                            PredictionChallenge(
                                question="Which operation will force Spark to execute the lazy pipeline?",
                                options=[
                                    "df = df.withColumn('new', col('old') * 2)",
                                    "df.printSchema()",
                                    "df.count()",
                                    "df = df.repartition(100)"
                                ],
                                correct_index=2,
                                explanation="count() is an action that requires aggregating the entire dataset, forcing execution. withColumn() and repartition() are transformations. printSchema() only reads metadata, not data.",
                                misconception="repartition feels like it should execute since it's expensive, but it's still  lazy.",
                                hints=[
                                    "Actions return non-DataFrame results",
                                    "printSchema() only needs column info, not rows",
                                    "count() needs to scan all data to return a number"
                                ]
                            )
                        ]
                    ),
                ]
            ),
        ]
    ),
    TutorialGroup(
        id="data-partitioning",
        number=2,
        title="Data & Partitioning",
        subtitle="Most Common Failure Source",
        description="Where 70% of Spark performance issues begin. Master partitions, parallelism, and the subtle difference between repartition and coalesce.",
        icon="LayoutGrid",
        color="green",
        topics=["Partitions", "Parallelism", "Repartition vs Coalesce", "Default partition pitfalls"],
        learning_outcome="Developers understand why 'more partitions' is not always better.",
        key_takeaways=[
            "Partition count = maximum parallelism — too few means idle cores, too many means scheduling overhead",
            "Target partition size: 100–200MB for best performance; calculate: total_data / 150MB",
            "repartition() triggers a full shuffle; coalesce() merges partitions locally without shuffle",
            "Default spark.sql.shuffle.partitions is 200 — often wrong for your data size",
            "Skewed partitions cause stragglers — one overloaded partition delays the entire stage",
        ],
        common_mistakes=[
            "Using repartition(1) to write a single file — causes all data to flow through one task",
            "Blindly increasing partitions thinking 'more parallelism = faster' — overhead kills gains",
            "Not checking partition sizes after joins/groupBys — they inherit upstream partition counts",
        ],
        tutorial_topics=[
            TutorialTopic(
                id="partition-basics",
                title="Partition Fundamentals",
                description="How data is distributed across executors.",
                tutorials=[
                    InteractiveTutorial(
                        id="partition-playground",
                        title="Partition Playground",
                        description="Bars represent partitions. Increase data size and watch partitions overflow.",
                        component_type="partition-playground",
                        learning_outcome="Visualize how data distributes and when partitions become unbalanced.",
                        docs_url="https://spark.apache.org/docs/latest/rdd-programming-guide.html#parallelized-collections",
                        prediction_challenges=[
                            PredictionChallenge(
                                question="You have a 10GB dataset with 10 partitions. Each partition is 1GB. Is this good partitioning?",
                                options=[
                                    "Yes — each partition is evenly sized",
                                    "No — partitions are too large (should be 100-200MB)",
                                    "No — you need more data per partition",
                                    "It depends on the number of executors"
                                ],
                                correct_index=1,
                                explanation="Target partition size is 100-200MB for optimal performance. 1GB partitions cause memory pressure and spills. Ideal partition count would be 10GB / 150MB ≈ 66-100 partitions.",
                                misconception="Many think balanced partitions = good partitioning, but absolute size matters more than balance.",
                                hints=[
                                    "Think about how much memory each task needs to process one partition",
                                    "The target range is 100-200MB per partition for best performance",
                                    "Calculate: total_data_size / target_partition_size = ideal_partition_count"
                                ]
                            ),
                            PredictionChallenge(
                                question="You have 8 executor cores but only 3 partitions. What happens?",
                                options=[
                                    "All 8 cores are fully utilized",
                                    "Only 3 cores will be active, 5 cores are idle",
                                    "Spark auto-repartitions to 8",
                                    "The job will fail"
                                ],
                                correct_index=1,
                                explanation="Partition count = maximum parallelism. With only 3 partitions, only 3 tasks can run simultaneously, leaving 5 cores idle. You're paying for hardware you're not using.",
                                misconception="Some think Spark will auto-distribute work to all cores regardless of partition count.",
                                hints=[
                                    "One task processes one partition",
                                    "You can only have as many parallel tasks as you have partitions",
                                    "More cores than partitions = idle cores"
                                ]
                            ),
                            PredictionChallenge(
                                question="How do you determine the ideal partition count?",
                                options=[
                                    "Always use default 200",
                                    "Set to number of executor cores",
                                    "total_data_size / 150MB",
                                    "Set to 2x number of executors"
                                ],
                                correct_index=2,
                                explanation="Target 100-200MB per partition (150MB is a good middle ground). Formula: total_data_size / 150MB = ideal partition count. This balances parallelism with scheduling overhead.",
                                misconception="Many use a fixed number (like 200) or multiply by core count, ignoring actual data size.",
                                hints=[
                                    "Think about the data size, not the cluster size",
                                    "The magic range is 100-200MB per partition",
                                    "Too many partitions = scheduling overhead; too few = idle cores"
                                ]
                            ),
                            PredictionChallenge(
                                question="What happens if one partition has 5GB while the others have 100MB each?",
                                options=[
                                    "The stage completes when the average task finishes",
                                    "The stage can't complete until the 5GB partition finishes",
                                    "Spark automatically splits the large partition",
                                    "The large partition is skipped"
                                ],
                                correct_index=1,
                                explanation="Stages complete when ALL tasks finish. One massive partition creates a straggler task that delays the entire stage. This is data skew — a common performance killer.",
                                misconception="Some assume Spark completes when most tasks finish. Actually, the slowest task determines stage duration.",
                                hints=[
                                    "Think about the slowest child in a group activity",
                                    "The stage finishes when the last task finishes",
                                    "This scenario is called data skew or straggler tasks"
                                ]
                            )
                        ]
                    ),
                ]
            ),
            TutorialTopic(
                id="repartition-coalesce",
                title="Repartition vs Coalesce",
                description="Two ways to change partition count with very different costs.",
                tutorials=[
                    InteractiveTutorial(
                        id="repartition-demo",
                        title="Repartition vs Coalesce Demo",
                        description="Toggle between both and see shuffle vs no shuffle in action.",
                        component_type="repartition-demo",
                        learning_outcome="Know when to use repartition (shuffle) vs coalesce (no shuffle).",
                        docs_url="https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.DataFrame.repartition.html",
                        prediction_challenges=[
                            PredictionChallenge(
                                question="You have 200 partitions and want to reduce to 10 for writing output. Which is better?",
                                options=[
                                    "repartition(10) — it's more explicit",
                                    "coalesce(10) — it avoids a full shuffle",
                                    "Both are the same — just pick one",
                                    "Neither — keep 200 partitions"
                                ],
                                correct_index=1,
                                explanation="coalesce() merges partitions locally without a full shuffle, making it much faster for reducing partition counts. repartition() would shuffle all data unnecessarily. Use coalesce() when reducing partitions, repartition() when increasing or redistributing.",
                                misconception="Many use repartition() for all partition count changes, not realizing coalesce() is a shuffle-free optimization for reductions.",
                                hints=[
                                    "One of these operations triggers a full shuffle, the other doesn't",
                                    "Think about what happens when you reduce partitions: do you need to redistribute all data?",
                                    "coalesce merges partitions locally without moving data across the network"
                                ]
                            ),
                            PredictionChallenge(
                                question="You want to increase from 10 partitions to 100. Which should you use?",
                                options=[
                                    "coalesce(100) — it's faster",
                                    "repartition(100) — you need a shuffle to distribute data",
                                    "Either one works the same",
                                    "Impossible — you can't increase partitions"
                                ],
                                correct_index=1,
                                explanation="Increasing partition count requires redistributing data across more partitions, which needs a shuffle. coalesce() only reduces partitions; you must use repartition() to increase.",
                                misconception="Some think coalesce can increase partitions. It can't — it only merges.",
                                hints=[
                                    "Increasing partitions means splitting existing data",
                                    "coalesce merges partitions but never splits them",
                                    "You need a shuffle to redistribute data evenly across more partitions"
                                ]
                            ),
                            PredictionChallenge(
                                question="What's the main downside of repartition()?",
                                options=[
                                    "It uses more memory",
                                    "It triggers a full shuffle (expensive data movement)",
                                    "It can only reduce partitions, not increase",
                                    "It loses data"
                                ],
                                correct_index=1,
                                explanation="repartition() triggers a full shuffle, writing all data to disk and redistributing across the network. This is expensive. Use it only when needed (increasing partitions or fixing skew).",
                                misconception="Many use repartition() casually without understanding the shuffle cost.",
                                hints=[
                                    "Shuffles write to disk and move data over the network",
                                    "This is one of the most expensive operations in Spark",
                                    "Avoid unless you truly need data redistributed"
                                ]
                            ),
                            PredictionChallenge(
                                question="When should you use coalesce(1) to write a single output file?",
                                options=[
                                    "Always — single files are easier to manage",
                                    "Only for small results (< 1GB) — bottlenecks on one task otherwise",
                                    "Never — always write multiple files",
                                    "Only when using Parquet format"
                                ],
                                correct_index=1,
                                explanation="coalesce(1) funnels all data through a single task. For large datasets, this task becomes a bottleneck (slow write, possible OOM). Only acceptable for small results.",
                                misconception="Many coalesce(1) large datasets for convenience, creating a massive bottleneck.",
                                hints=[
                                    "One partition = one task = one core doing all the work",
                                    "All data flows through this single task",
                                    "Think about what happens when 100GB goes through one task"
                                ]
                            )
                        ]
                    ),
                ]
            ),
        ]
    ),
    TutorialGroup(
        id="transformations-shuffles",
        number=3,
        title="Transformations & Shuffles",
        subtitle="The Pain Layer",
        description="Why Spark jobs suddenly slow down. Learn to identify narrow vs wide transformations and predict shuffle costs.",
        icon="Shuffle",
        color="orange",
        topics=["Narrow vs Wide transformations", "groupBy, distinct, join", "Why shuffles are expensive"],
        learning_outcome="Developers can predict shuffles before running code.",
        key_takeaways=[
            "Narrow transformations (map, filter, flatMap) keep data on the same partition — no shuffle",
            "Wide transformations (groupBy, join, distinct, repartition) require a shuffle — data crosses the network",
            "Shuffles are the #1 cost driver in Spark — they involve disk I/O, serialization, and network transfer",
            "Every shuffle creates a new stage boundary in the DAG",
            "If your job is slow, check shuffle read/write metrics first — they reveal the bottleneck",
        ],
        common_mistakes=[
            "Using .distinct() casually — it triggers a full shuffle of all data",
            "Chaining multiple groupBy operations — each one causes a separate shuffle",
            "Not realizing orderBy/sort is a wide transformation that requires a shuffle",
        ],
        tutorial_topics=[
            TutorialTopic(
                id="shuffle-basics",
                title="Understanding Shuffles",
                description="What happens when data must move between executors.",
                tutorials=[
                    InteractiveTutorial(
                        id="shuffle-trigger-map",
                        title="Shuffle Trigger Map",
                        description="Click any transformation and see whether it triggers a shuffle.",
                        component_type="shuffle-trigger-map",
                        learning_outcome="Instantly identify which operations cause shuffles.",
                        docs_url="https://spark.apache.org/docs/latest/rdd-programming-guide.html#shuffle-operations",
                        prediction_challenges=[
                            PredictionChallenge(
                                question="Which of these operations does NOT trigger a shuffle?",
                                options=[
                                    "df.groupBy('key').count()",
                                    "df.filter(col('value') > 100)",
                                    "df.distinct()",
                                    "df.join(other_df, 'key')"
                                ],
                                correct_index=1,
                                explanation="filter() is a narrow transformation — it processes data locally on each partition without moving data across the network. groupBy, distinct, and join are wide transformations that require shuffles to redistribute data by key.",
                                misconception="Some think all DataFrame operations trigger shuffles since Spark is distributed.",
                                hints=[
                                    "Narrow transformations keep data on the same partition",
                                    "Think about whether the operation needs to see all related records together",
                                    "Filtering can be done independently on each partition without coordination"
                                ]
                            ),
                            PredictionChallenge(
                                question="You call df.distinct(). Why is this expensive?",
                                options=[
                                    "It only affects metadata, not data",
                                    "It triggers a full shuffle to identify duplicates across all partitions",
                                    "It requires sorting the entire dataset",
                                    "It's actually very cheap in Spark"
                                ],
                                correct_index=1,
                                explanation="distinct() must compare records across all partitions to find duplicates, requiring a full shuffle. All data is hashed and redistributed so duplicates land on the same partition.",
                                misconception="Many use distinct() casually without realizing it's one of the most shuffle-heavy operations.",
                                hints=[
                                    "To find duplicates, Spark needs to see all copies of each value together",
                                    "Records with the same value must be compared, even if they're on different partitions",
                                    "This requires moving data across the network"
                                ]
                            ),
                            PredictionChallenge(
                                question="Which transformation is a narrow operation (no shuffle)?",
                                options=[
                                    "df.repartition(100)",
                                    "df.groupBy('user_id').agg(sum('amount'))",
                                    "df.map(lambda x: x * 2)",
                                    "df.orderBy('timestamp')"
                                ],
                                correct_index=2,
                                explanation="map() applies a function to each record independently on its current partition — pure narrow transformation. repartition, groupBy, and orderBy all require shuffling data across partitions.",
                                misconception="Some think any aggregation or sorting is narrow since it feels like local work.",
                                hints=[
                                    "Can this operation be done looking only at the current partition's data?",
                                    "map/filter/flatMap don't need to see other partitions",
                                    "groupBy needs all records with the same key together = shuffle"
                                ]
                            ),
                            PredictionChallenge(
                                question="How can you tell if an operation will shuffle in Spark UI?",
                                options=[
                                    "Check if it creates a new DataFrame",
                                    "Look for a new stage boundary in the DAG visualization",
                                    "Count the number of transformations",
                                    "Check executor memory usage"
                                ],
                                correct_index=1,
                                explanation="Shuffles create stage boundaries in the DAG. If you see the DAG split into separate stages, there's a shuffle between them. Wide transformations create these boundaries.",
                                misconception="Many don't realize the DAG visualization directly shows shuffle points as stage boundaries.",
                                hints=[
                                    "The DAG view shows stages separated by shuffle boundaries",
                                    "Each stage represents a set of transformations without shuffles",
                                    "Look for lines crossing between stage boxes in the visualization"
                                ]
                            )
                        ]
                    ),
                    InteractiveTutorial(
                        id="shuffle-cost-simulator",
                        title="Shuffle Cost Simulator",
                        description="Increase data size and watch network + disk activity explode.",
                        component_type="shuffle-cost-simulator",
                        learning_outcome="Understand why shuffles dominate job runtime at scale.",
                        docs_url="https://spark.apache.org/docs/latest/rdd-programming-guide.html#shuffle-operations",
                        prediction_challenges=[
                            PredictionChallenge(
                                question="A shuffle operation processes 100GB of data. What are the primary costs?",
                                options=[
                                    "Only network transfer between executors",
                                    "Only disk I/O for writing shuffle files",
                                    "Serialization + disk write + network transfer + deserialization",
                                    "Only CPU for hash partitioning"
                                ],
                                correct_index=2,
                                explanation="Shuffles are expensive because they involve the full cycle: serialize data, write to local disk, transfer over network, read from disk, deserialize. Each step adds latency. This is why reducing shuffle size is the #1 optimization priority.",
                                misconception="Many think shuffles are just network transfers, missing the expensive serialization and disk I/O steps.",
                                hints=[
                                    "Think about all the steps data takes when moving from one partition to another",
                                    "Data must be transformed and stored temporarily before being sent",
                                    "Each executor writes shuffle blocks to disk, then other executors read them over the network"
                                ]
                            ),
                            PredictionChallenge(
                                question="Why do shuffles write to disk instead of keeping data in memory?",
                                options=[
                                    "Disk is faster than memory",
                                    "For fault tolerance — if an executor fails, shuffle data can be recomputed or reread",
                                    "To save memory for other operations",
                                    "Spark's memory management doesn't allow shuffle data in memory"
                                ],
                                correct_index=1,
                                explanation="Shuffle files on disk provide fault tolerance. If a downstream task fails and needs to retry, it can reread the shuffle data instead of recomputing everything. This prevents cascading recomputation.",
                                misconception="Some think it's just a memory limitation, missing the fault tolerance benefit.",
                                hints=[
                                    "What happens if a task crashes and needs to be retried?",
                                    "If shuffle data was only in memory, what would happen if that executor dies?",
                                    "Disk persistence allows recovery without full recomputation"
                                ]
                            ),
                            PredictionChallenge(
                                question="You have a 50GB shuffle. How can you reduce its cost?",
                                options=[
                                    "Add more executors",
                                    "Increase executor memory",
                                    "Filter or aggregate data before the shuffle to reduce size",
                                    "Use faster network hardware"
                                ],
                                correct_index=2,
                                explanation="The best way to optimize a shuffle is to reduce the amount of data being shuffled. Filter out unnecessary records or pre-aggregate before the wide transformation. Hardware upgrades help but data reduction is far more impactful.",
                                misconception="Many throw more resources at shuffle problems when data-level optimizations are more effective.",
                                hints=[
                                    "Less data to shuffle = faster shuffle",
                                    "Can you filter out rows that won't matter in the final result?",
                                    "Pre-aggregation reduces the shuffle payload dramatically"
                                ]
                            )
                        ]
                    ),
                ]
            ),
        ]
    ),
    TutorialGroup(
        id="joins",
        number=4,
        title="Joins",
        subtitle="Where Production Jobs Die",
        description="Senior engineers spend most time here. Master join strategies, broadcast hints, and the dreaded skewed join.",
        icon="GitMerge",
        color="red",
        topics=["Join types", "Broadcast vs Shuffle joins", "Skewed joins", "Pre-aggregation patterns"],
        learning_outcome="Developers understand why joins dominate runtime.",
        key_takeaways=[
            "Broadcast join: small table is copied to every executor — no shuffle, O(n) speed",
            "Sort-merge join: both tables shuffled + sorted by key — expensive but handles any size",
            "Spark auto-broadcasts tables under 10MB (spark.sql.autoBroadcastJoinThreshold)",
            "Skewed join keys create straggler tasks — one partition gets 100× the data",
            "Pre-aggregate before joining to reduce shuffle size — filter and reduce early",
        ],
        common_mistakes=[
            "Force-broadcasting a table that's too large — causes OOM on executors",
            "Joining on high-cardinality keys without checking skew distribution",
            "Not filtering before joins — shuffling data you'll discard wastes resources",
            "Joining two large tables when one could be pre-aggregated first",
        ],
        tutorial_topics=[
            TutorialTopic(
                id="join-strategies",
                title="Join Strategies",
                description="How Spark decides to execute your joins.",
                tutorials=[
                    InteractiveTutorial(
                        id="join-strategy-simulator",
                        title="Join Strategy Simulator",
                        description="Two tables collide visually. Watch Spark pick a strategy based on sizes.",
                        component_type="join-strategy-simulator",
                        learning_outcome="Predict which join strategy Spark will choose.",
                        docs_url="https://spark.apache.org/docs/latest/sql-performance-tuning.html#join-strategy-hints-for-sql-queries",
                        prediction_challenges=[
                            PredictionChallenge(
                                question="You join a 5MB table with a 50GB table. What strategy does Spark use?",
                                options=[
                                    "Sort-merge join — both tables are shuffled",
                                    "Broadcast join — 5MB table copied to all executors",
                                    "Nested loop join",
                                    "Hash join with partitioning"
                                ],
                                correct_index=1,
                                explanation="Since the small table (5MB) is under the default broadcast threshold (10MB), Spark broadcasts it to every executor. This avoids shuffling the 50GB table, making the join O(n) instead of O(n log n). Broadcast joins are the fastest join strategy when applicable.",
                                misconception="Many expect Spark to always shuffle both sides of a join, missing the broadcast optimization.",
                                hints=[
                                    "The default broadcast threshold is 10MB (spark.sql.autoBroadcastJoinThreshold)",
                                    "Think about which approach avoids shuffling the large table",
                                    "Copying a small table to every executor is cheaper than shuffling a huge table"
                                ]
                            ),
                            PredictionChallenge(
                                question="You join two 100GB tables. What happens?",
                                options=[
                                    "Spark broadcasts the smaller one",
                                    "Sort-merge join: both are shuffled and sorted by join key",
                                    "The job fails — tables too large",
                                    "Spark automatically optimizes to a hash join"
                                ],
                                correct_index=1,
                                explanation="Both tables exceed the broadcast threshold, so Spark uses sort-merge join: shuffle both tables by join key, sort them, then merge. This is expensive but handles arbitrarily large joins.",
                                misconception="Some think large joins won't work.  They do, but they're expensive.",
                                hints=[
                                    "Neither table is small enough to broadcast",
                                    "Spark needs data with matching keys to be co-located on the same partition",
                                    "This requires shuffling both tables by the join key"
                                ]
                            ),
                            PredictionChallenge(
                                question="How can you force a broadcast join even if the table is over 10MB?",
                                options=[
                                    "Use df.broadcast(smaller_df)",
                                    "Increase spark.sql.autoBroadcastJoinThreshold",
                                    "Both A and B work",
                                    "Impossible — broadcast limit is hard-coded"
                                ],
                                correct_index=2,
                                explanation="You can explicitly mark a DataFrame for broadcast with broadcast(df) or increase the threshold config. But beware: broadcasting too-large tables causes executor OOM.",
                                misconception="Some don't know you can override the automatic broadcast decision.",
                                hints=[
                                    "Spark provides both a hint and a config setting",
                                    "The hint is broadcast(df), the config is spark.sql.autoBroadcastJoinThreshold",
                                    "Be careful: too-large broadcasts cause out-of-memory errors"
                                ]
                            )
                        ]
                    ),
                ]
            ),
            TutorialTopic(
                id="skewed-joins",
                title="Skewed Joins",
                description="When one key dominates and kills your job.",
                tutorials=[
                    InteractiveTutorial(
                        id="skew-explosion-demo",
                        title="Skew Explosion Demo",
                        description="One key dominates the join. Watch one task become a straggler.",
                        component_type="skew-explosion-demo",
                        learning_outcome="Recognize and diagnose skewed join patterns.",
                        prediction_challenges=[
                            PredictionChallenge(
                                question="A join has 100 partitions. 99 finish in 1 minute, but 1 takes 60 minutes. What's happening?",
                                options=[
                                    "Network congestion on one executor",
                                    "One partition has 100× more data (skewed join key)",
                                    "GC pressure on one executor",
                                    "Disk failure causing retries"
                                ],
                                correct_index=1,
                                explanation="This is a classic skewed join: one join key has massively more records than others, causing one partition to explode. The entire stage waits for the slowest task (straggler). Solutions: use salting, AQE skew optimization, or filter dominant keys separately.",
                                misconception="Many blame hardware/network issues when the root cause is data distribution skew.",
                                hints=[
                                    "Look at the data, not the infrastructure",
                                    "If 99 tasks are fast and 1 is slow, what does that tell you about the data in that partition?",
                                    "Check the join key distribution — is one value dramatically more common than others?"
                                ]
                            ),
                            PredictionChallenge(
                                question="What is 'salting' in the context of skewed joins?",
                                options=[
                                    "Adding random data to increase dataset size",
                                    "Adding a random suffix to skewed keys to distribute them across partitions",
                                    "Encrypting join keys for security",
                                    "Using a hash function on join keys"
                                ],
                                correct_index=1,
                                explanation="Salting appends random values (0-9) to skewed keys, spreading one hot key across multiple partitions. Then you explode the smaller side to match. This turns one massive partition into 10 manageable ones.",
                                misconception="Many haven't heard of salting, the primary manual fix for data skew.",
                                hints=[
                                    "The goal is to split one massive partition into multiple smaller ones",
                                    "You add randomness to distribute skewed records",
                                    "Both sides of the join must be adjusted to ensure matching keys still match"
                                ]
                            ),
                            PredictionChallenge(
                                question="How can Adaptive Query Execution (AQE) help with skewed joins?",
                                options=[
                                    "It prevents skew from happening",
                                    "It automatically splits large partitions and replicates  the small side",
                                    "It increases executor memory to handle large partitions",
                                    "It skips processing skewed partitions"
                                ],
                                correct_index=1,
                                explanation="AQE's skew join optimization detects large partitions at runtime, splits them into smaller chunks, and replicates the corresponding small-side data to join with each chunk. This happens automatically in Spark 3.0+ with AQE enabled.",
                                misconception="Some think you must manually handle all skew. AQE automates much of this in modern Spark.",
                                hints=[
                                    "AQE makes runtime decisions based on actual data statistics",
                                    "It can detect when one partition is abnormally large",
                                    "The fix is similar to manual salting but automated"
                                ]
                            )
                        ]
                    ),
                ]
            ),
        ]
    ),
    TutorialGroup(
        id="execution-engine",
        number=5,
        title="Execution Engine Internals",
        subtitle="Under the Hood",
        description="What Spark actually does when it runs your code. Catalyst, Tungsten, and whole-stage codegen.",
        icon="Cpu",
        color="purple",
        topics=["Catalyst Optimizer", "Logical vs Physical Plan", "Tungsten engine", "Whole-stage codegen"],
        learning_outcome="Developers know what Spark can optimize and what it cannot.",
        key_takeaways=[
            "Catalyst optimizer rewrites your logical plan into an optimized physical plan automatically",
            "Predicate pushdown: Spark pushes filters to the data source — reads less data from disk",
            "Column pruning: Spark only reads columns you actually use — critical for wide tables",
            "Whole-stage codegen fuses operations into a single JVM function — reduces virtual calls",
            "Catalyst can reorder joins and optimize expressions, but it can't fix skewed data or bad partitioning",
        ],
        common_mistakes=[
            "Relying on Catalyst to fix fundamentally bad query patterns — it optimizes, not redesigns",
            "Using UDFs (User Defined Functions) that block Catalyst from optimizing through them",
            "Not checking .explain() to see what Spark actually plans to do vs. what you expect",
        ],
        tutorial_topics=[
            TutorialTopic(
                id="catalyst",
                title="Catalyst Optimizer",
                description="How Spark rewrites your query for better performance.",
                tutorials=[
                    InteractiveTutorial(
                        id="plan-transformation-viewer",
                        title="Plan Transformation Viewer",
                        description="Step-by-step visualization of how Catalyst rewrites your query.",
                        component_type="plan-transformation-viewer",
                        learning_outcome="Understand the optimization phases Spark applies.",
                        docs_url="https://spark.apache.org/docs/latest/sql-performance-tuning.html",
                        prediction_challenges=[
                            PredictionChallenge(
                                question="You write: df.select('name', 'age').filter(col('age') > 25).select('name'). What does Catalyst do?",
                                options=[
                                    "Executes as-is: select, filter, select",
                                    "Optimizes to: filter first, then select('name') only",
                                    "Throws an error (redundant select)",
                                    "Converts to SQL internally"
                                ],
                                correct_index=1,
                                explanation="Catalyst applies column pruning and predicate pushdown. It realizes only 'name' is needed, so it optimizes to: filter(age > 25) then select('name'). This reads only 2 columns instead of all, and pushes the filter early to reduce data processed.",
                                misconception="Many think Spark executes transformations in the order written, missing the optimizer's rewriting.",
                                hints=[
                                    "Catalyst can reorder and combine operations for efficiency",
                                    "Which columns are actually needed in the final output?",
                                    "Filters are cheap — Catalyst pushes them as early as possible to reduce data flow"
                                ]
                            ),
                            PredictionChallenge(
                                question="What is predicate pushdown?",
                                options=[
                                    "Moving filters closer to the data source to read less data",
                                    "Pushing aggregations to the executors",
                                    "Moving joins before filters",
                                    "Caching filtered results"
                                ],
                                correct_index=0,
                                explanation="Predicate pushdown moves filter conditions (predicates) down to the data source (Parquet, ORC, JDBC, etc.). This means the data source only reads rows that match the filter, dramatically reducing I/O.",
                                misconception="Some don't realize filters can be applied at the storage layer, not just in Spark.",
                                hints=[
                                    "Reading less data from disk is always better",
                                    "Parquet and ORC store min/max statistics that enable filter pushdown",
                                    "If the source can filter, why send unneeded data to Spark?"
                                ]
                            ),
                            PredictionChallenge(
                                question="You use a custom UDF (User Defined Function). How does this affect Catalyst?",
                                options=[
                                    "No impact — Catalyst optimizes everything",
                                    "Catalyst can't optimize through UDFs — treats them as black boxes",
                                    "UDFs are automatically faster than built-in functions",
                                    "UDFs are converted to SQL"
                                ],
                                correct_index=1,
                                explanation="UDFs are opaque to Catalyst — it doesn't know what they do, so it can't optimize them, reorder them, or push them down. Use built-in Spark functions when possible for better optimization.",
                                misconception="Many write UDFs for convenience, not realizing the optimization penalty.",
                                hints=[
                                    "Catalyst needs to understand what an operation does to optimize it",
                                    "Built-in functions have optimization rules; UDFs don't",
                                    "Always prefer built-in functions over UDFs when possible"
                                ]
                            )
                        ]
                    ),
                ]
            ),
            TutorialTopic(
                id="codegen",
                title="Whole-Stage Codegen",
                description="How Spark generates optimized Java bytecode.",
                tutorials=[
                    InteractiveTutorial(
                        id="codegen-toggle-demo",
                        title="Codegen Toggle Demo",
                        description="Toggle codegen on/off and see CPU vs memory impact.",
                        component_type="codegen-toggle-demo",
                        learning_outcome="Understand when codegen helps and when it doesn't.",
                        docs_url="https://spark.apache.org/docs/latest/sql-performance-tuning.html",
                        prediction_challenges=[
                            PredictionChallenge(
                                question="Whole-stage codegen fuses multiple operations into a single function. When does this help most?",
                                options=[
                                    "When processing small datasets",
                                    "When chaining many CPU-bound operations (filter, map, select)",
                                    "When doing complex shuffles",
                                    "When writing to disk"
                                ],
                                correct_index=1,
                                explanation="Codegen eliminates virtual function calls and optimizes CPU-intensive operations like filters, projections, and expressions. It's most beneficial when chaining many narrow transformations. Shuffles and I/O operations don't benefit as much since they're dominated by network/disk, not CPU.",
                                misconception="Many think codegen speeds up all operations equally, but it mainly optimizes CPU-bound tasks.",
                                hints=[
                                    "Think about where CPU time is spent vs network/disk time",
                                    "Codegen reduces overhead from function calls — which operations have many function calls?",
                                    "Narrow transformations executed in sequence benefit most from being fused together"
                                ]
                            ),
                            PredictionChallenge(
                                question="What's the main benefit of whole-stage codegen?",
                                options=[
                                    "Reduces memory usage",
                                    "Eliminates virtual function call overhead by generating custom bytecode",
                                    "Automatically parallelizes operations",
                                    "Compresses data more efficiently"
                                ],
                                correct_index=1,
                                explanation="Codegen generates optimized Java bytecode for an entire stage of operations, eliminating the overhead of virtual function calls between operators. This can speed up CPU-intensive pipelines by 2-10×.",
                                misconception="Some think the performance gain comes from parallelism, but it's about eliminating JVM overhead."
                            ),
                            PredictionChallenge(
                                question="How can you check if codegen is being used for your query?",
                                options=[
                                    "Check the Spark UI metrics",
                                    "Look for 'WholeStageCodegen' in df.explain() output",
                                    "Both A and B",
                                    "Codegen is always on, no need to check"
                                ],
                                correct_index=2,
                                explanation="df.explain() shows 'WholeStageCodegen' nodes in the physical plan. The Spark UI also shows codegen usage in query plans. Codegen is enabled by default but doesn't apply to all operations (e.g., UDFs block it).",
                                misconception="Some don't realize you can verify codegen usage — it's not always applied."
                            )
                        ]
                    ),
                ]
            ),
        ]
    ),
    TutorialGroup(
        id="memory-spills",
        number=6,
        title="Memory Model & Spills",
        subtitle="Silent Killers",
        description="Why jobs fail or slow without obvious reasons. Executor memory, spills, and GC pressure.",
        icon="HardDrive",
        color="yellow",
        topics=["Executor memory layout", "Execution vs Storage memory", "Spill to disk", "GC pressure"],
        learning_outcome="Developers understand why spills happen.",
        key_takeaways=[
            "Executor memory splits into: Execution (shuffles, joins, sorts) and Storage (cached data)",
            "When execution memory runs out, Spark spills to disk — 10–100× slower than memory",
            "Spills often hide in the Spark UI — check 'Spill (Memory)' and 'Spill (Disk)' columns",
            "GC pressure increases when memory is tight — watch for long GC pauses in task metrics",
            "Caching doesn't always help — it competes with execution memory and can cause more spills",
        ],
        common_mistakes=[
            "Caching DataFrames that are only used once — wastes storage memory with no benefit",
            "Setting executor memory too high — causes long GC pauses from large heaps",
            "Not monitoring spill metrics — your job is 'working' but 10× slower than it should be",
        ],
        tutorial_topics=[
            TutorialTopic(
                id="memory-layout",
                title="Executor Memory",
                description="How memory is divided inside an executor.",
                tutorials=[
                    InteractiveTutorial(
                        id="executor-memory-simulator",
                        title="Executor Memory Simulator",
                        description="Watch heap blocks fill visually. See spill trigger disk writes.",
                        component_type="executor-memory-simulator",
                        learning_outcome="Visualize memory pressure and understand spill triggers.",
                        docs_url="https://spark.apache.org/docs/latest/tuning.html#memory-management-overview",
                        prediction_challenges=[
                            PredictionChallenge(
                                question="A task runs out of execution memory during a shuffle. What happens?",
                                options=[
                                    "Task fails with OOM error",
                                    "Spark spills data to disk and continues",
                                    "Spark requests more memory from the OS",
                                    "Task is killed and retried with more memory"
                                ],
                                correct_index=1,
                                explanation="Spark spills to disk when execution memory is full. Data is serialized and written to local disk, then read back when needed. This prevents OOM errors but makes the job 10-100× slower. Check 'Spill (Memory)' and 'Spill (Disk)' metrics in the UI to diagnose.",
                                misconception="Many think Spark crashes on memory pressure, not realizing it gracefully spills to disk at a huge performance cost.",
                                hints=[
                                    "Spark is designed to handle memory pressure gracefully",
                                    "Think about what the 'Spill (Memory)' and 'Spill (Disk)' columns in the UI represent",
                                    "Disk I/O is 10-100× slower than memory, but prevents crashes"
                                ]
                            ),
                            PredictionChallenge(
                                question="Executor memory is divided into Execution and Storage regions. What's the difference?",
                                options=[
                                    "Execution: for shuffles/joins/sorts; Storage: for cached DataFrames",
                                    "Execution: for driver operations; Storage: for executor operations",
                                    "Execution: for reading data; Storage: for writing data",
                                    "They are the same thing"
                                ],
                                correct_index=0,
                                explanation="Execution memory handles shuffles, joins, aggregations, and sorts. Storage memory holds cached/persisted DataFrames. Both can borrow from each other when needed, but they compete for the same heap.",
                                misconception="Some think they're completely separate. They share the same heap and can cause conflicts.",
                                hints=[
                                    "Think about temporary data vs long-lived cached data",
                                    "Shuffles need temporary space; cache() needs persistent space",
                                    "Both live in the same executor JVM heap"
                                ]
                            ),
                            PredictionChallenge(
                                question="You see 'Spill (Disk): 50GB' in the Spark UI. What does this mean?",
                                options=[
                                    "50GB was written to permanent storage",
                                    "50GB couldn't fit in memory and was temporarily written to local disk",
                                    "50GB of data was cached",
                                    "The job failed due to disk space"
                                ],
                                correct_index=1,
                                explanation="Spill (Disk) shows how much data was written to temporary local disk because execution memory was full. This is a performance red flag — your job is doing extra disk I/O that slows it down significantly.",
                                misconception="Many miss spill metrics entirely, wondering why their job is slow.",
                                hints=[
                                    "This is temporary scratch space, not final output",
                                    "Spills happen when memory is insufficient for the operation",
                                    "High spill = memory pressure = slow job"
                                ]
                            )
                        ]
                    ),
                ]
            ),
            TutorialTopic(
                id="cache-problems",
                title="Caching Gone Wrong",
                description="When caching hurts instead of helps.",
                tutorials=[
                    InteractiveTutorial(
                        id="cache-gone-wrong-demo",
                        title="Cache Gone Wrong Demo",
                        description="Cache too early and watch memory starvation unfold.",
                        component_type="cache-gone-wrong-demo",
                        learning_outcome="Know when caching helps and when it causes problems.",
                        docs_url="https://spark.apache.org/docs/latest/rdd-programming-guide.html#rdd-persistence",
                        prediction_challenges=[
                            PredictionChallenge(
                                question="You cache a DataFrame that's only used once. What happens?",
                                options=[
                                    "Spark warns you but caches it anyway",
                                    "Caching wastes storage memory with no benefit",
                                    "Spark automatically uncaches after first use",
                                    "Caching always improves performance"
                                ],
                                correct_index=1,
                                explanation="Caching consumes storage memory. If a DataFrame is only used once, caching adds overhead (materialization + memory usage) without benefit. Cache only when reusing a DataFrame multiple times. Storage memory competes with execution memory, potentially causing more spills.",
                                misconception="Many cache aggressively thinking it always helps, not realizing it competes with execution memory.",
                                hints=[
                                    "Think about when caching provides value: single-use or reuse?",
                                    "Cached data takes up memory that could be used for shuffles and joins",
                                    "There's a cost to caching: materialization time + storage memory consumption"
                                ]
                            ),
                            PredictionChallenge(
                                question="When should you cache a DataFrame?",
                                options=[
                                    "Always cache for better performance",
                                    "Only when the DataFrame is reused multiple times in the same job",
                                    "Only for small DataFrames",
                                    "Never cache — Spark handles it automatically"
                                ],
                                correct_index=1,
                                explanation="Cache when a DataFrame is reused 2+ times and recomputing it would be expensive. The cached data is stored in memory across tasks, avoiding recomputation. Single-use caching wastes memory.",
                                misconception="Some cache everything thinking it's free. It competes with execution memory.",
                                hints=[
                                    "Ask: will I use this DataFrame again?",
                                    "Is the recomputation cost higher than the memory cost?",
                                    "Caching a DataFrame that feeds multiple actions makes sense"
                                ]
                            ),
                            PredictionChallenge(
                                question="You cache a 10GB DataFrame but executor memory is 8GB. What happens?",
                                options=[
                                    "Job fails with OOM",
                                    "Spark partially caches what fits, stores the rest as uncached",
                                    "Spark automatically increases memory",
                                    "All data is compressed to fit"
                                ],
                                correct_index=1,
                                explanation="Spark uses memory fractions for storage. If the DataFrame doesn't fit, it partially caches what fits and marks the rest as uncached. Subsequent actions recompute uncached partitions. This can cause even worse performance than not caching.",
                                misconception="Some think caching forces all data into memory. Partial caching can make things worse.",
                                hints=[
                                    "Caching doesn't magically create more memory",
                                    "Check the Storage tab in Spark UI to see cache coverage %",
                                    "Partial caching = some partitions cached, others recomputed"
                                ]
                            )
                        ]
                    ),
                ]
            ),
        ]
    ),
    TutorialGroup(
        id="skew-stragglers",
        number=7,
        title="Skew, Stragglers & Stability",
        subtitle="Long Tail Problems",
        description="Why one task ruins the whole job. Identify and fix task imbalance.",
        icon="AlertTriangle",
        color="pink",
        topics=["Skew", "Task imbalance", "Long tails"],
        learning_outcome="Developers recognize skew patterns instantly.",
        key_takeaways=[
            "Skew means one or few partitions have disproportionately more data than others",
            "A stage can't complete until ALL tasks finish — one straggler delays everything",
            "Check task duration distribution: if max >> median, you have skew",
            "Salting keys (adding random suffix) spreads skewed data across more partitions",
            "AQE (Adaptive Query Execution) can auto-split skewed partitions in Spark 3.0+",
        ],
        common_mistakes=[
            "Ignoring task duration variance — average looks fine but max is 100× the median",
            "Throwing more executors at the problem — skew is a data distribution issue, not a resource issue",
            "Not profiling key distributions before joins — discover skew after the 3-hour job fails",
        ],
        tutorial_topics=[
            TutorialTopic(
                id="straggler-detection",
                title="Straggler Detection",
                description="How to spot the task that's holding everything back.",
                tutorials=[
                    InteractiveTutorial(
                        id="straggler-timeline",
                        title="Straggler Timeline",
                        description="Tasks finish unevenly. Watch one task delay the entire stage.",
                        component_type="straggler-timeline",
                        learning_outcome="Instantly spot straggler tasks in timeline view.",
                        docs_url="https://spark.apache.org/docs/latest/web-ui.html#stages-tab",
                        prediction_challenges=[
                            PredictionChallenge(
                                question="In the Spark UI, 199 tasks finish in 30s, 1 task takes 15 minutes. Where do you look first?",
                                options=[
                                    "Check executor hardware specs",
                                    "Check input data size for that task's partition",
                                    "Increase executor memory",
                                    "Add more executors"
                                ],
                                correct_index=1,
                                explanation="This is textbook data skew. One task's partition has far more data than others. Check 'Input Size / Records' in the task details. Solutions: salting, AQE skew optimization, or filtering dominant keys separately. Hardware/resources won't fix data distribution issues.",
                                misconception="Many reach for resource tuning when the problem is data distribution.",
                                hints=[
                                    "If most tasks are fast and one is slow, it's about the data",
                                    "Look at the input size column in the task details table",
                                    "Skewed data requires data-level solutions, not infrastructure changes"
                                ]
                            ),
                            PredictionChallenge(
                                question="How do you identify a straggler task in Spark UI?",
                                options=[
                                    "Check the average task duration",
                                    "Compare median vs max task duration — large gap indicates straggler",
                                    "Look at total job time",
                                    "Count the number of tasks"
                                ],
                                correct_index=1,
                                explanation="The task metrics table shows median, min, max, and 75th percentile durations. If max >> median (e.g., max is 100× median), you have a straggler. This points to data skew.",
                                misconception="Average can be misleading when there's significant skew."
                            ),
                            PredictionChallenge(
                                question="A stage has 100 tasks. 99 finish in 1 minute total, but the stage takes 60 minutes. Why?",
                                options=[
                                    "The stage iterates 60 times",
                                    "One straggler task takes 59 minutes, blocking stage completion",
                                    "Spark has a bug",
                                    "The cluster is overloaded"
                                ],
                                correct_index=1,
                                explanation="Stages wait for ALL tasks to complete. One slow task (straggler) delays the entire stage. This is why identifying and fixing stragglers is critical — they bottleneck your entire job.",
                                misconception="Some think stages complete when most tasks are done. Actually, the slowest task determines stage duration."
                            )
                        ]
                    ),
                ]
            ),
        ]
    ),
    TutorialGroup(
        id="writes-file-layout",
        number=8,
        title="Writes & File Layout",
        subtitle="Downstream Pain",
        description="Problems that show up later, not now. Output partitions and the small files nightmare.",
        icon="FileOutput",
        color="cyan",
        topics=["Output partitions", "Small files problem", "PartitionBy during write"],
        learning_outcome="Developers understand why writes matter.",
        key_takeaways=[
            "Each task writes one file — 200 partitions × 365 days = 73,000 files per table",
            "Small files (<1MB) create massive overhead for downstream reads — file listing alone can take minutes",
            "Use coalesce() before write to reduce output file count — it avoids a shuffle",
            "partitionBy() multiplies output files: partitions × unique partition values",
            "Target output file size: 128MB–256MB for optimal read performance on cloud storage",
        ],
        common_mistakes=[
            "Writing with default partitions (200) to date-partitioned tables — file explosion",
            "Using repartition() before write when coalesce() would suffice — unnecessary shuffle",
            "Not setting maxRecordsPerFile to cap per-partition output size",
        ],
        tutorial_topics=[
            TutorialTopic(
                id="small-files",
                title="Small Files Problem",
                description="Why writing too many files kills downstream performance.",
                tutorials=[
                    InteractiveTutorial(
                        id="file-explosion-visualizer",
                        title="File Explosion Visualizer",
                        description="Write data and watch thousands of files appear.",
                        component_type="file-explosion-visualizer",
                        learning_outcome="Understand the small files anti-pattern and how to avoid it.",
                        docs_url="https://spark.apache.org/docs/latest/sql-data-sources-parquet.html",
                        prediction_challenges=[
                            PredictionChallenge(
                                question="You write a partitioned table with 200 Spark partitions to 365 date partitions. How many files?",
                                options=[
                                    "200 files (one per Spark partition)",
                                    "365 files (one per date partition)",
                                    "73,000 files (200 × 365)",
                                    "Spark automatically merges to 1 file per  date"
                                ],
                                correct_index=2,
                                explanation="Each Spark partition writes one file per partitionBy value. 200 partitions × 365 dates = 73,000 files. Small files kill downstream read performance. Solution: coalesce before write, or use maxRecordsPerFile to control output size.",
                                misconception="Many think partitionBy() reduces file count, not realizing it multiplies it.",
                                hints=[
                                    "Each task writes one file",
                                    "partitionBy creates subdirectories, but each Spark partition still writes to each directory",
                                    "The formula is: num_spark_partitions × num_unique_partition_values = total_files"
                                ]
                            ),
                            PredictionChallenge(
                                question="How can you reduce file count when writing partitioned data?",
                                options=[
                                    "Don't use partitionBy()",
                                    "Use coalesce() before write to reduce Spark partitions",
                                    "Increase spark.sql.shuffle.partitions",
                                    "Use repartition() before write"
                                ],
                                correct_index=1,
                                explanation="coalesce() reduces the number of Spark partitions (tasks) before writing, reducing file count. Formula becomes: fewer_spark_partitions × num_partition_values = fewer_total_files.",
                                misconception="Some use repartition() which triggers unnecessary shuffle. coalesce() is more efficient."
                            ),
                            PredictionChallenge(
                                question="Why are small files (< 1MB) bad for performance?",
                                options=[
                                    "They use more disk space",
                                    "File listing and metadata operations become expensive at scale",
                                    "They can't be compressed",
                                    "Spark can't read them"
                                ],
                                correct_index=1,
                                explanation="On cloud storage (S3, GCS, ADLS), listing 100,000 small files can take minutes. Each file has metadata overhead. Reading many small files also wastes time on connection setup.",
                                misconception="Some think it's just storage overhead, missing the operational cost."
                            )
                        ]
                    ),
                ]
            ),
        ]
    ),
    TutorialGroup(
        id="configs",
        number=9,
        title="Configs",
        subtitle="Only After Understanding",
        description="Configs are levers, not solutions. Learn the trade-offs behind each setting.",
        icon="Settings",
        color="slate",
        topics=["shuffle partitions", "broadcast threshold", "AQE configs"],
        learning_outcome="Developers stop blindly copying configs.",
        key_takeaways=[
            "spark.sql.shuffle.partitions (default 200) — set to data_size / 150MB, not a random large number",
            "spark.sql.autoBroadcastJoinThreshold (default 10MB) — increase cautiously, too high causes OOM",
            "AQE (spark.sql.adaptive.enabled) dynamically adjusts partitions — enable it in Spark 3.0+",
            "Every config is a trade-off: more memory → longer GC; more partitions → more scheduling overhead",
            "Test config changes with metrics, not feelings — measure shuffle bytes, task times, spill before/after",
        ],
        common_mistakes=[
            "Copy-pasting configs from Stack Overflow without understanding the trade-offs",
            "Setting spark.executor.memory to the maximum available — causes GC thrashing",
            "Changing configs without measuring baseline first — no way to know if it helped",
        ],
        tutorial_topics=[
            TutorialTopic(
                id="config-tradeoffs",
                title="Config Trade-offs",
                description="Every config has a benefit AND a downside.",
                tutorials=[
                    InteractiveTutorial(
                        id="config-tradeoff-simulator",
                        title="Config Trade-off Simulator",
                        description="Change a config and see both the benefit AND the downside.",
                        component_type="config-tradeoff-simulator",
                        learning_outcome="Understand that configs are trade-offs, not magic fixes.",
                        docs_url="https://spark.apache.org/docs/latest/configuration.html",
                        prediction_challenges=[
                            PredictionChallenge(
                                question="You increase spark.executor.memory from 4GB to 16GB. What's the likely downside?",
                                options=[
                                    "Higher cost only — no downside",
                                    "Longer GC pauses due to larger heap",
                                    "Slower task execution",
                                    "More network traffic"
                                ],
                                correct_index=1,
                                explanation="Larger heaps mean more objects for the garbage collector to scan, leading to longer GC pauses. This can make tasks slower despite having more memory. The optimal executor memory balances available memory with acceptable GC overhead — usually 8-16GB per executor.",
                                misconception="Many think more memory is always better, missing the GC trade-off.",
                                hints=[
                                    "Think about what the JVM garbage collector has to do with a larger heap",
                                    "More memory = more objects to track and clean up",
                                    "There's a sweet spot where memory is sufficient but GC pauses are tolerable"
                                ]
                            ),
                            PredictionChallenge(
                                question="What's the downside of setting spark.sql.shuffle.partitions very high (e.g., 10,000)?",
                                options=[
                                    "No downside — more parallelism is always better",
                                    "Task scheduling overhead dominates — tiny tasks are inefficient",
                                    "More memory usage",
                                    "Network congestion"
                                ],
                                correct_index=1,
                                explanation="Too many partitions creates tiny tasks. The overhead of scheduling and launching 10,000 small tasks can exceed the actual work time. Ideal is data_size / 150MB.",
                                misconception="Some think more partitions always means faster execution."
                            ),
                            PredictionChallenge(
                                question="How should you decide on spark.sql.shuffle.partitions?",
                                options=[
                                    "Always use default 200",
                                    "total_shuffle_data_size / 100-200MB",
                                    "number_of_cores × 2",
                                    "Guess and check"
                                ],
                                correct_index=1,
                                explanation="Target 100-200MB per partition. Calculate: total shuffle data size / 150MB = ideal partition count. This balances parallelism with per-task overhead.",
                                misconception="Many use a fixed multiplier of cores, ignoring actual data size."
                            )
                        ]
                    ),
                ]
            ),
        ]
    ),
    TutorialGroup(
        id="spark-ui",
        number=10,
        title="Reading Spark UI Like a Pro",
        subtitle="Turning UI into Story",
        description="Transform the Spark UI from confusing to informative. Read DAGs, spot bottlenecks, identify skew.",
        icon="Monitor",
        color="indigo",
        topics=["Reading DAG", "Identifying bottlenecks", "Spotting skew & spills"],
        learning_outcome="Developers can debug jobs independently.",
        key_takeaways=[
            "Read the DAG top-down: identify stage boundaries (shuffles) and the critical path",
            "Check the Stages tab: sort by duration to find the bottleneck stage",
            "In task metrics: compare median vs max duration — large gap = skew or straggler",
            "Shuffle Read/Write columns reveal data movement — the biggest numbers show the bottleneck",
            "Spill columns (Memory/Disk) reveal memory pressure — non-zero means something doesn't fit",
        ],
        common_mistakes=[
            "Only looking at total job time — the bottleneck is in one specific stage",
            "Ignoring the SQL/DataFrame tab — it shows the physical plan Spark actually used",
            "Not checking the Environment tab — your configs might not be what you think they are",
        ],
        tutorial_topics=[
            TutorialTopic(
                id="spark-ui-reading",
                title="Spark UI Walkthrough",
                description="A guided tour of the Spark UI with explanations.",
                tutorials=[
                    InteractiveTutorial(
                        id="spark-ui-walkthrough",
                        title="Spark UI Walkthrough (Simulated)",
                        description="Click through stages with explanations overlayed.",
                        component_type="spark-ui-walkthrough",
                        learning_outcome="Navigate Spark UI confidently and extract insights.",
                        docs_url="https://spark.apache.org/docs/latest/web-ui.html",
                        prediction_challenges=[
                            PredictionChallenge(
                                question="You see a job with 200 tasks. Task 0-199 took 2 seconds each, but Task 150 took 45 seconds. What's the most likely cause?",
                                options=[
                                    "The cluster is slow",
                                    "Network latency",
                                    "Data skew (Task 150 processed way more data)",
                                    "Spark bug"
                                ],
                                correct_index=2,
                                explanation="When one task takes 20x longer than others, it's almost always data skew. That task got way more data than its peers, likely due to uneven key distribution.",
                                misconception="Many assume slow tasks mean slow cluster, but skew is partition-level, not cluster-level."
                            ),
                            PredictionChallenge(
                                question="Which Spark UI tab shows the physical execution plan?",
                                options=[
                                    "Jobs tab",
                                    "SQL tab",
                                    "Executors tab",
                                    "Environment tab"
                                ],
                                correct_index=1,
                                explanation="The SQL tab shows the query physical plan with all optimization details (predicate pushdown, codegen, broadcast hints, etc.). This is critical for understanding what Spark actually does vs what you wrote.",
                                misconception="Many only look at the Jobs tab, missing query-level insights in SQL tab."
                            ),
                            PredictionChallenge(
                                question="What does high 'Spill (Disk)' indicate in task metrics?",
                                options=[
                                    "The job wrote a lot of output",
                                    "Memory pressure — data didn't fit, spilled to temp disk",
                                    "Network transfer",
                                    "Cached data"
                                ],
                                correct_index=1,
                                explanation="Spill (Disk) means execution memory was full, so data was temporarily written to local disk. This is 10-100× slower than in-memory. High spill = consider increasing memory or reducing partition sizes.",
                                misconception="Many ignore spill metrics, wondering why jobs are slow."
                            )
                        ]
                    ),
                ]
            ),
        ]
    ),
    # EXPERT LEVEL GROUPS (11-15) - Based on Reddit/StackOverflow pain points
    TutorialGroup(
        id="adaptive-query-execution",
        number=11,
        title="Adaptive Query Execution (AQE)",
        subtitle="Expert: Dynamic Optimization",
        description="Master Spark 3.0+ AQE: how Spark re-optimizes queries at runtime based on actual data statistics.",
        icon="Zap",
        color="purple",
        topics=["Dynamic coalescing", "Dynamic join strategy", "Skew join optimization"],
        learning_outcome="Expert understands when AQE helps and when it doesn't.",
        key_takeaways=[
            "AQE re-plans queries after each stage using actual statistics, not estimates",
            "Coalesce partitions reduces shuffle partitions post-shuffle when data is smaller than expected",
            "Dynamic join strategy converts sort-merge to broadcast mid-execution if table is small",
            "Skew join optimization splits large partitions and replicates small-side data",
            "Enable with spark.sql.adaptive.enabled=true (default in Spark 3.2+)",
        ],
        common_mistakes=[
            "Expecting AQE to fix all skew — it only helps with joins, not aggregations",
            "Disabling AQE because 'it makes plans unpredictable' — predictability < performance",
            "Not monitoring AQE decisions in Spark UI — check the 'AdaptiveSparkPlan' in SQL tab",
        ],
        tutorial_topics=[
            TutorialTopic(
                id="aqe-mechanics",
                title="AQE in Action",
                description="See how AQE dynamically re-optimizes queries.",
                tutorials=[
                    InteractiveTutorial(
                        id="aqe-simulator",
                        title="AQE Decision Simulator",
                        description="Watch Spark's plan change as it learns actual data sizes.",
                        component_type="aqe-simulator",
                        learning_outcome="Visualize AQE's runtime re-planning.",
                        docs_url="https://spark.apache.org/docs/latest/sql-performance-tuning.html#adaptive-query-execution",
                        prediction_challenges=[
                            PredictionChallenge(
                                question="You join two tables. At planning time, both seem 50GB. After the left filter runs, it's actually 2MB. What will AQE do?",
                                options=[
                                    "Nothing, plan is already made",
                                    "Convert to broadcast join mid-execution",
                                    "Add more partitions",
                                    "Fail the job"
                                ],
                                correct_index=1,
                                explanation="AQE sees the post-filter size is tiny and switches from sort-merge to broadcast join, avoiding the shuffle entirely. This is dynamic join strategy in action.",
                                misconception="Many think the query plan is static once execution starts. AQE breaks this assumption."
                            ),
                            PredictionChallenge(
                                question="What is coalesce partitions in AQE?",
                                options=[
                                    "Increases partitions for better parallelism",
                                    "Reduces shuffle partitions after a stage if data is smaller than expected",
                                    "Combines executors",
                                    "Merges small files"
                                ],
                                correct_index=1,
                                explanation="After a shuffle, AQE checks actual data size. If it's smaller than expected (e.g., heavy filtering), it reduces shuffle partitions to avoid tiny tasks. This happens dynamically at runtime.",
                                misconception="Some think partition count is static. AQE adjusts it based on real data."
                            ),
                            PredictionChallenge(
                                question="AQE is enabled by default in which Spark version?",
                                options=[
                                    "Spark 2.4",
                                    "Spark 3.0",
                                    "Spark 3.2+",
                                    "It's never enabled by default"
                                ],
                                correct_index=2,
                                explanation="AQE was introduced in Spark 3.0 but wasn't default-enabled until Spark 3.2. If you're on 3.0-3.1, manually enable with spark.sql.adaptive.enabled=true.",
                                misconception="Some think it's been default forever or that manual enabling isn't needed."
                            )
                        ]
                    ),
                ]
            ),
        ]
    ),
    TutorialGroup(
        id="dynamic-partition-pruning",
        number=12,
        title="Dynamic Partition Pruning (DPP)",
        subtitle="Expert: Read Less Data",
        description="Skip reading partitions that won't match the join. One of Spark 3.0's most impactful optimizations.",
        icon="Filter",
        color="green",
        topics=["Star schema optimization", "Broadcast DPP", "Runtime filter pushdown"],
        learning_outcome="Expert knows when DPP triggers and how to design schemas for it.",
        key_takeaways=[
            "DPP skips reading partitions in the large table using filter values from the small table",
            "Works best with star schema: fact table partitioned, dimension table filtered",
            "Requires broadcast join on the dimension side (or AQE to convert to broadcast)",
            "Enable with spark.sql.optimizer.dynamicPartitionPruning.enabled=true",
            "Visible in Spark UI as 'DynamicPruning' in the SQL plan",
        ],
        common_mistakes=[
            "Expecting DPP on tables with no partitioning — it only prunes partitions",
            "Partitioning on high-cardinality columns — creates too many small files",
            "Not checking SQL tab — DPP only shows in the physical plan, not metrics",
        ],
        tutorial_topics=[
            TutorialTopic(
                id="dpp-mechanics",
                title="How DPP Skips Scans",
                description="See partition pruning in action with star schema.",
                tutorials=[
                    InteractiveTutorial(
                        id="dpp-visualizer",
                        title="DPP Scan Skipper",
                        description="Watch Spark skip reading 90% of partitions using dimension filters.",
                        component_type="dpp-visualizer",
                        learning_outcome="Understand DPP's impact on scan efficiency.",
                        docs_url="https://spark.apache.org/docs/latest/sql-performance-tuning.html#dynamic-partition-pruning",
                        prediction_challenges=[
                            PredictionChallenge(
                                question="Fact table: 1000 date partitions. Dimension filter: WHERE date IN (5 dates). With DPP, how many partitions does Spark read?",
                                options=[
                                    "1000 — has to check all",
                                    "~5 — only matching partitions",
                                    "0 — uses index",
                                    "500 — reads half"
                                ],
                                correct_index=1,
                                explanation="DPP builds a runtime filter from the dimension table's dates and only reads those 5 matching partitions in the fact table. Massive scan savings.",
                                misconception="Without DPP, Spark would scan all 1000 partitions and filter after reading."
                            ),
                            PredictionChallenge(
                                question="What's required for Dynamic Partition Pruning to work?",
                                options=[
                                    "Both tables must be partitioned",
                                    "Large table partitioned + small table broadcast join",
                                    "Tables must have same number of partitions",
                                    "Only works with Delta Lake"
                                ],
                                correct_index=1,
                                explanation="DPP needs a partitioned fact table and a broadcast join on the dimension side. The broadcast allows building a runtime filter cheaply on the driver, which is then pushed to the scan.",
                                misconception="Some expect it to work on any join. It's specifically star schema: partitioned fact + broadcast dimension."
                            ),
                            PredictionChallenge(
                                question="How can you verify DPP is working?",
                                options=[
                                    "Check the Jobs tab",
                                    "Look for 'DynamicPruning' in the SQL tab's physical plan",
                                    "Monitor executor CPU",
                                    "It's automatic, no verification needed"
                                ],
                                correct_index=1,
                                explanation="The SQL tab shows 'DynamicPruningExpression' in the physical plan when DPP is applied. Task metrics also show reduced input size compared to full table scan.",
                                misconception="Many assume it's working without checking. Always verify in the SQL plan."
                            )
                        ]
                    ),
                ]
            ),
        ]
    ),
    TutorialGroup(
        id="bucketing-deep-dive",
        number=13,
        title="Bucketing: Shuffle-Free Joins",
        subtitle="Expert: Pre-Shuffle Storage",
        description="Co-locate data at write time to avoid shuffle at read time. High upfront cost, massive query speedup.",
        icon="Package",
        color="orange",
        topics=["Bucket join", "Write amplification", "When to bucket"],
        learning_outcome="Expert knows the trade-offs and when bucketing is worth it.",
        key_takeaways=[
            "Bucketing pre-partitions data by key at write time, enabling shuffle-free joins",
            "Both tables must be bucketed on the join key with the same number of buckets",
            "Bucket join requires spark.sql.sources.bucketing.enabled=true",
            "Write cost: data is hash-partitioned and sorted, creating exact bucket files",
            "Read benefit: joins skip shuffle if both sides are bucketed identically",
        ],
        common_mistakes=[
            "Bucketing on high-cardinality keys — creates millions of tiny files",
            "Mis-matched bucket counts between tables — Spark falls back to shuffle join",
            "Bucketing data that's only joined once — the write cost isn't worth it",
            "Not sorting within buckets — loses the sort-merge join optimization",
        ],
        tutorial_topics=[
            TutorialTopic(
                id="bucketing-tradeoffs",
                title="Bucket vs Shuffle Economics",
                description="Compare write cost vs read benefit.",
                tutorials=[
                    InteractiveTutorial(
                        id="bucketing-cost-calculator",
                        title="Bucketing ROI Calculator",
                        description="See when bucketing pays off based on write:read ratio.",
                        component_type="bucketing-calculator",
                        learning_outcome="Decide if bucketing is worth the write amplification.",
                        docs_url="https://spark.apache.org/docs/latest/sql-data-sources-hive-tables.html",
                        prediction_challenges=[
                            PredictionChallenge(
                                question="You write a table once, then join it 100 times. Should you bucket it?",
                                options=[
                                    "No, bucketing is always slower",
                                    "Yes, 100 shuffle-free joins > 1 slow write",
                                    "No, bucketing only works for small tables",
                                    "Maybe, depends on cluster size"
                                ],
                                correct_index=1,
                                explanation="Classic bucketing use case: write once, read many. The upfront bucketing cost amortizes across 100 joins, each avoiding a shuffle.",
                                misconception="Many avoid bucketing because the write is slower, ignoring the cumulative read savings."
                            ),
                            PredictionChallenge(
                                question="What's required for a shuffle-free bucket join?",
                                options=[
                                    "Both tables bucketed on same key, same number of buckets",
                                    "Just bucket one table",
                                    "Tables must be the same size",
                                    "Only works with broadcast joins"
                                ],
                                correct_index=0,
                                explanation="Bucket joins require identical bucketing: same join key, same bucket count, both tables bucketed. Mismatched configurations fall back to shuffle join.",
                                misconception="Some bucket only one side, wondering why it still shuffles."
                            ),
                            PredictionChallenge(
                                question="When should you NOT use bucketing?",
                                options=[
                                    "When tables are small (< 1GB)",
                                    "When the table is joined only once or rarely",
                                    "When using high-cardinality keys",
                                    "All of the above"
                                ],
                                correct_index=3,
                                explanation="Bucketing has write overhead. Avoid it for small tables (broadcast is cheaper), rarely-joined tables (cost doesn't amortize), and high-cardinality keys (creates too many tiny files).",
                                misconception="Some bucket everything thinking it's always better."
                            )
                        ]
                    ),
                ]
            ),
        ]
    ),
    TutorialGroup(
        id="columnar-formats",
        number=14,
        title="Columnar Formats: Parquet vs ORC vs Delta",
        subtitle="Expert: Storage Optimization",
        description="Master columnar storage: compression, predicate pushdown, schema evolution. Delta Lake's time travel and ACID.",
        icon="Database",
        color="cyan",
        topics=["Parquet internals", "Predicate pushdown", "Delta Lake ACID", "Z-ordering"],
        learning_outcome="Expert chooses the right format and optimizes for query patterns.",
        key_takeaways=[
            "Columnar formats (Parquet/ORC) store by column, enabling column pruning and better compression",
            "Predicate pushdown: Spark skips reading row groups where min/max stats rule out matches",
            "Delta Lake adds ACID transactions, time travel, schema evolution on top of Parquet",
            "Z-ordering co-locates related data in files, improving predicate pushdown effectiveness",
            "Small files are the enemy: use coalesce/repartition before writes to avoid thousands of tiny files",
        ],
        common_mistakes=[
            "Writing compressed CSV instead of Parquet — loses column pruning and predicate pushdown",
            "Not leveraging partition pruning + predicate pushdown together",
            "Delta without OPTIMIZE/VACUUM — accumulates small files and old versions",
            "Z-ordering on too many columns — dilutes the clustering effect",
        ],
        tutorial_topics=[
            TutorialTopic(
                id="format-comparison",
                title="Format Performance Comparison",
                description="Compare scan speed across formats and query patterns.",
                tutorials=[
                    InteractiveTutorial(
                        id="format-benchmark",
                        title="Parquet vs CSV vs Delta Benchmark",
                        description="See how each format handles column pruning and filtering.",
                        component_type="format-benchmark",
                        learning_outcome="Understand when each format shines.",
                        docs_url="https://spark.apache.org/docs/latest/sql-data-sources-parquet.html",
                        prediction_challenges=[
                            PredictionChallenge(
                                question="Query: SELECT count(*) WHERE date = '2024-01-01' from 10TB table. Which is fastest?",
                                options=[
                                    "CSV — simplest format",
                                    "Parquet with partition pruning on date",
                                    "Delta Lake with Z-order on date",
                                    "ORC with indexes"
                                ],
                                correct_index=1,
                                explanation="Partition pruning on date means Spark only reads the 2024-01-01 partition, skipping 99.9% of data. Parquet's column pruning makes the count even faster since it only reads metadata.",
                                misconception="Many think Delta or ORC are always faster, but simple partition pruning on Parquet often wins."
                            ),
                            PredictionChallenge(
                                question="What's the main advantage of columnar formats (Parquet/ORC) over row formats (CSV/JSON)?",
                                options=[
                                    "Faster writes",
                                    "Column pruning — read only needed columns",
                                    "Easier to edit",
                                    "Better for updates"
                                ],
                                correct_index=1,
                                explanation="Columnar formats store data by column, enabling column pruning: SELECT name FROM table only reads the 'name' column, not all columns. Also allows better compression (same-type data compresses well).",
                                misconception="Some think it's about compression only, missing the I/O savings from column pruning."
                            ),
                            PredictionChallenge(
                                question="What does Z-ordering in Delta Lake do?",
                                options=[
                                    "Sorts data alphabetically",
                                    "Co-locates related data in files to improve predicate pushdown",
                                    "Compresses data",
                                    "Partitions the table"
                                ],
                                correct_index=1,
                                explanation="Z-ordering clusters data by specified columns within files, improving min/max statistics for predicate pushdown. Queries filtering on Z-ordered columns skip more files.",
                                misconception="Some confuse it with partitioning. Z-order is intra-file clustering, not directory-level partitioning."
                            )
                        ]
                    ),
                ]
            ),
        ]
    ),
    TutorialGroup(
        id="production-debugging",
        number=15,
        title="Production Debugging War Stories",
        subtitle="Expert: Real-World Failures",
        description="Learn from production incidents: OOMs, data corruption, silent failures. Based on Reddit/StackOverflow war stories.",
        icon="AlertCircle",
        color="red",
        topics=["OOM troubleshooting", "Silent data loss", "Corrupted state", "Resource starvation"],
        learning_outcome="Expert debugs production failures systematically.",
        key_takeaways=[
            "Driver OOM: Usually from .collect(), .toPandas(), or broadcast variables > spark.driver.memory",
            "Executor OOM: Check for skew, large shuffles, or insufficient spark.executor.memory",
            "Silent data loss: Schema mismatches, dropped nulls, type coercion gone wrong",
            "Corrupted checkpoints: Delete checkpoint dir and restart from source truth",
            "Event log is your black box — always enable spark.eventLog.enabled in production",
        ],
        common_mistakes=[
            "Not enabling event logs — no way to debug after the job fails",
            "Ignoring warnings about deprecated APIs — they often indicate upcoming breaking changes",
            "Assuming Spark is deterministic — order matters when there are ties",
            "Not testing with production data volumes — works on 1GB, fails on 1TB",
        ],
        tutorial_topics=[
            TutorialTopic(
                id="oom-detective",
                title="OOM Detective Game",
                description="Given logs and metrics, find the OOM root cause.",
                tutorials=[
                    InteractiveTutorial(
                        id="oom-debugger",
                        title="OOM Root Cause Analyzer",
                        description="Analyze heap dumps, GC logs, and Spark UI to find the leak.",
                        component_type="oom-debugger",
                        learning_outcome="Systematically diagnose OOM failures.",
                        docs_url="https://spark.apache.org/docs/latest/tuning.html#memory-management-overview",
                        prediction_challenges=[
                            PredictionChallenge(
                                question="Executor logs show 'GC overhead limit exceeded'. Driver memory is fine. Most likely cause?",
                                options=[
                                    "Driver running out of memory",
                                    "Too many small files",
                                    "Executor heap too small for shuffle data",
                                    "Network bandwidth issue"
                                ],
                                correct_index=2,
                                explanation="'GC overhead limit exceeded' on executors means they're spending >98% of time in GC trying to free memory. Usually shuffle spill that doesn't fit in spark.executor.memory.",
                                misconception="Many increase executor memory randomly. Check shuffle bytes first — you might need fewer, larger executors."
                            ),
                            PredictionChallenge(
                                question="Driver throws OOM during .collect(). What's the likely cause?",
                                options=[
                                    "Executor memory is too small",
                                    "You're collecting too much data to the driver",
                                    "Shuffle partitions are wrong",
                                    "Network latency"
                                ],
                                correct_index=1,
                                explanation="collect() pulls all data to the driver. If the result is larger than spark.driver.memory, OOM occurs. Use .limit(), .take(), or write to distributed storage instead.",
                                misconception="Some think driver OOM is an executor problem. It's about data flowing TO the driver."
                            ),
                            PredictionChallenge(
                                question="How can you debug a failed Spark job after it crashes?",
                                options=[
                                    "Check executor logs only",
                                    "Read event logs (if spark.eventLog.enabled=true)",
                                    "Reproduce it immediately",
                                    "Contact Databricks support"
                                ],
                                correct_index=1,
                                explanation="Event logs preserve the entire job history: DAG, metrics, task failures, exceptions. Enable spark.eventLog.enabled in production—it's your black box after crashes.",
                                misconception="Many don't enable event logs, losing all forensic data after failures."
                            )
                        ]
                    ),
                ]
            ),
            TutorialTopic(
                id="silent-failures",
                title="Silent Data Corruption Scenarios",
                description="Cases where Spark succeeds but data is wrong.",
                tutorials=[
                    InteractiveTutorial(
                        id="corruption-detective",
                        title="Data Corruption Detective",
                        description="Spot schema evolution bugs, type coercion issues, null handling errors.",
                        component_type="corruption-detective",
                        learning_outcome="Catch silent data quality issues.",
                        docs_url="https://spark.apache.org/docs/latest/sql-data-sources-parquet.html#schema-merging",
                        prediction_challenges=[
                            PredictionChallenge(
                                question="You add a new STRING column to Parquet. Old files lack this column. What does Spark return for old rows?",
                                options=[
                                    "Error — schema mismatch",
                                    "null for the missing column",
                                    "Empty string",
                                    "Fails silently"
                                ],
                                correct_index=1,
                                explanation="Parquet schema evolution fills missing columns with null. This is correct behavior, but many expect an error or default value.",
                                misconception="Some assume Spark will fail on schema mismatch. It's permissive with schema evolution."
                            ),
                            PredictionChallenge(
                                question="You join two DataFrames with different column orders but matching names. What happens?",
                                options=[
                                    "Join fails—column order must match",
                                    "Spark matches by name, not position",
                                    "Data gets misaligned",
                                    "Spark auto-reorders columns"
                                ],
                                correct_index=1,
                                explanation="Spark joins by column NAME, not position. Column order doesn't matter as long as names match. This is different from SQL which uses position in SELECT *.",
                                misconception="Some expect position-based joins like traditional SQL."
                            ),
                            PredictionChallenge(
                                question="How can NULL values cause silent data loss?",
                                options=[
                                    "NULLs are never lost",
                                    "Inner joins drop rows where join keys are NULL",
                                    "Aggregations ignore NULLs",
                                    "Both B and C"
                                ],
                                correct_index=3,
                                explanation="Inner joins silently drop NULL keys (no match). Aggregations like SUM ignore NULLs (NULL + 5 = NULL, but SUM skips NULLs). Use LEFT joins and COALESCE to preserve NULLs when needed.",
                                misconception="Many forget about NULL behavior in joins and aggregations, losing data silently."
                            )
                        ]
                    ),
                ]
            ),
        ]
    ),
]


@router.get("/groups", response_model=list[TutorialGroupSummary])
async def list_tutorial_groups():
    """List all tutorial groups with summary info."""
    return [
        TutorialGroupSummary(
            id=g.id,
            number=g.number,
            title=g.title,
            subtitle=g.subtitle,
            icon=g.icon,
            color=g.color,
            topic_count=len(g.topics),
            tutorial_count=sum(len(t.tutorials) for t in g.tutorial_topics),
        )
        for g in TUTORIAL_GROUPS
    ]


@router.get("/groups/{group_id}", response_model=Optional[TutorialGroup])
async def get_tutorial_group(group_id: str):
    """Get a specific tutorial group with all its content."""
    for group in TUTORIAL_GROUPS:
        if group.id == group_id:
            return group
    return None


@router.get("/tutorials/{tutorial_id}", response_model=Optional[InteractiveTutorial])
async def get_tutorial(tutorial_id: str):
    """Get a specific tutorial by ID."""
    for group in TUTORIAL_GROUPS:
        for topic in group.tutorial_topics:
            for tutorial in topic.tutorials:
                if tutorial.id == tutorial_id:
                    return tutorial
    return None


# Learning Path Functions

def calculate_group_progress(group_number: int, completed_tutorials: list[str]) -> dict:
    """Calculate progress for a specific tutorial group.
    
    Args:
        group_number: Group number (1-8)
        completed_tutorials: List of completed tutorial IDs
        
    Returns:
        Dict with completed_count, total_count, and percentage
    """
    if group_number < 1 or group_number > len(TUTORIAL_GROUPS):
        return {"completed_count": 0, "total_count": 0, "percentage": 0.0}
    
    group = TUTORIAL_GROUPS[group_number - 1]
    
    # Get all tutorial IDs in this group
    all_tutorial_ids = []
    for topic in group.tutorial_topics:
        for tutorial in topic.tutorials:
            all_tutorial_ids.append(tutorial.id)
    
    # Count how many are completed
    completed_in_group = [tid for tid in completed_tutorials if tid in all_tutorial_ids]
    
    total = len(all_tutorial_ids)
    completed = len(completed_in_group)
    percentage = (completed / total * 100.0) if total > 0 else 0.0
    
    return {
        "completed_count": completed,
        "total_count": total,
        "percentage": percentage
    }


def get_learning_path_status(completed_tutorials: list[str]) -> list[dict]:
    """Calculate learning path status with progressive unlocking.
    
    Following the 80% completion rule:
    - Group 1 is always unlocked
    - Group N+1 unlocks when Group N reaches 80% completion
    - Groups unlock sequentially (no skipping)
    
    Args:
        completed_tutorials: List of completed tutorial IDs
        
    Returns:
        List of group status dicts with unlock/completion state
    """
    status = []
    
    for i, group in enumerate(TUTORIAL_GROUPS):
        group_number = i + 1
        
        # Calculate progress for this group
        progress = calculate_group_progress(group_number, completed_tutorials)
        
        # Determine if unlocked
        if group_number == 1:
            # Group 1 always unlocked
            unlocked = True
        else:
            # Check if previous group has 80% completion
            prev_progress = calculate_group_progress(group_number - 1, completed_tutorials)
            unlocked = prev_progress["percentage"] >= 80.0
        
        # Determine if completed
        completed = progress["percentage"] == 100.0
        
        status.append({
            "id": group.id,
            "number": group.number,
            "title": group.title,
            "subtitle": group.subtitle,
            "icon": group.icon,
            "color": group.color,
            "unlocked": unlocked,
            "completed": completed,
            "progress_percentage": progress["percentage"],
            "total_tutorials": progress["total_count"],
            "completed_tutorials": progress["completed_count"],
        })
    
    return status
