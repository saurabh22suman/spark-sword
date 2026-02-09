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
        description="What juniors must understand before touching optimization. Learn what Spark is, how it executes, and why lazy evaluation matters.",
        icon="Brain",
        color="blue",
        topics=["What Spark is (and is not)", "Driver vs Executor", "Jobs, Stages, Tasks", "Lazy evaluation"],
        learning_outcome="Junior can explain why nothing happens until an action.",
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
                        prediction_challenge=PredictionChallenge(
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
                        )
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
                        prediction_challenge=PredictionChallenge(
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
                        )
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
        learning_outcome="Junior understands why 'more partitions' is not always better.",
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
                        prediction_challenge=PredictionChallenge(
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
                        )
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
                        prediction_challenge=PredictionChallenge(
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
                        )
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
        learning_outcome="Junior can predict shuffles before running code.",
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
                        prediction_challenge=PredictionChallenge(
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
                        )
                    ),
                    InteractiveTutorial(
                        id="shuffle-cost-simulator",
                        title="Shuffle Cost Simulator",
                        description="Increase data size and watch network + disk activity explode.",
                        component_type="shuffle-cost-simulator",
                        learning_outcome="Understand why shuffles dominate job runtime at scale.",
                        docs_url="https://spark.apache.org/docs/latest/rdd-programming-guide.html#shuffle-operations",
                        prediction_challenge=PredictionChallenge(
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
                        )
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
        learning_outcome="Junior understands why joins dominate runtime.",
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
                        prediction_challenge=PredictionChallenge(
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
                        )
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
                        prediction_challenge=PredictionChallenge(
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
                        )
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
        learning_outcome="Junior knows what Spark can optimize and what it cannot.",
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
                        prediction_challenge=PredictionChallenge(
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
                        )
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
                        prediction_challenge=PredictionChallenge(
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
                        )
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
        learning_outcome="Junior understands why spills happen.",
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
                        prediction_challenge=PredictionChallenge(
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
                        )
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
                        prediction_challenge=PredictionChallenge(
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
                        )
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
        learning_outcome="Junior recognizes skew patterns instantly.",
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
                        prediction_challenge=PredictionChallenge(
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
                        )
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
        learning_outcome="Junior understands why writes matter.",
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
                        prediction_challenge=PredictionChallenge(
                            question="You write a partitioned table with 200 Spark partitions to 365 date partitions. How many files?",
                            options=[
                                "200 files (one per Spark partition)",
                                "365 files (one per date partition)",
                                "73,000 files (200 × 365)",
                                "Spark automatically merges to 1 file per date"
                            ],
                            correct_index=2,
                            explanation="Each Spark partition writes one file per partitionBy value. 200 partitions × 365 dates = 73,000 files. Small files kill downstream read performance. Solution: coalesce before write, or use maxRecordsPerFile to control output size.",
                            misconception="Many think partitionBy() reduces file count, not realizing it multiplies it.",
                            hints=[
                                "Each task writes one file",
                                "partitionBy creates subdirectories, but each Spark partition still writes to each directory",
                                "The formula is: num_spark_partitions × num_unique_partition_values = total_files"
                            ]
                        )
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
        learning_outcome="Junior stops blindly copying configs.",
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
                        prediction_challenge=PredictionChallenge(
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
                        )
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
        learning_outcome="Junior can debug jobs independently.",
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
                        prediction_challenge=PredictionChallenge(
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
                        )
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
                        prediction_challenge=PredictionChallenge(
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
                        )
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
                        prediction_challenge=PredictionChallenge(
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
                        )
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
                        prediction_challenge=PredictionChallenge(
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
                        )
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
                        prediction_challenge=PredictionChallenge(
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
                        )
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
                        prediction_challenge=PredictionChallenge(
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
                        )
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
                        prediction_challenge=PredictionChallenge(
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
                        )
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
