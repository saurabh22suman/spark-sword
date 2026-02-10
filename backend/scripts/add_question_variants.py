#!/usr/bin/env python3
"""
Script to add 3-5 question variants to each tutorial in tutorials.py.
Replaces single prediction_challenge with prediction_challenges array.
"""

import re
from pathlib import Path

# Path to the tutorials file
TUTORIALS_FILE = Path(__file__).parent.parent / "app" / "api" / "tutorials.py"


def read_file():
    """Read the tutorials.py file."""
    with open(TUTORIALS_FILE, "r") as f:
        return f.read()


def write_file(content):
    """Write the updated content back to tutorials.py."""
    with open(TUTORIALS_FILE, "w") as f:
        f.write(content)


def generate_dag_visualizer_variants():
    """Generate question variants for DAG Visualizer tutorial."""
    return """prediction_challenges=[
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
                                misconception="Some expect each transformation to create a separate job."
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
                        ]"""


def generate_lazy_eval_variants():
    """Generate question variants for  Lazy Evaluation Simulator."""
    return """prediction_challenges=[
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
                                question="True or False: df.select('col1').filter(col('col1') > 10) reads the data from disk.",
                                options=[
                                    "True — select() triggers a read",
                                    "False — these are transformations, no read yet",
                                    "True — filter triggers execution",
                                    "Depends on data size"
                                ],
                                correct_index=1,
                                explanation="Both select() and filter() are transformations. They build a logical plan but don't read data until an action like count() or collect() is called.",
                                misconception="The intuition is that we need data to filter it, but Spark delays until forced."
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
                                misconception="repartition feels like it should execute since it's expensive, but it's still lazy.",
                                hints=[
                                    "Actions return non-DataFrame results",
                                    "printSchema() only needs column info, not rows",
                                    "count() needs to scan all data to return a number"
                                ]
                            )
                        ]"""


def main():
    """Main execution function."""
    print("Reading tutorials.py...")
    content = read_file()
    
    print("Generating question variants...")
    
    # Replace DAG Visualizer tutorial
    dag_old = r'prediction_challenge=PredictionChallenge\(\s*question="You write: df\.filter\(\.\.\.\)\.groupBy\(\.\.\.\)\.count\(\)\. When does Spark actually start executing\?",\s*options=\[[\s\S]*?\],\s*correct_index=2,\s*explanation="Spark is lazy\.[\s\S]*?misconception="Many expect Spark to execute transformations immediately like pandas\."\s*\)'
    dag_new = generate_dag_visualizer_variants()
    content = re.sub(dag_old, dag_new, content)
    
    # Replace Lazy Evaluation tutorial
    lazy_old = r'prediction_challenge=PredictionChallenge\(\s*question="You chain 10 transformations \(filter, select, join, etc\.\) but never call an action\. What happens\?",\s*options=\[[\s\S]*?\],\s*correct_index=2,\s*explanation="Without an action, Spark builds the execution plan but never runs it\.[\s\S]*?misconception="Many think Spark processes data as you chain transformations\."\s*\)'
    lazy_new = generate_lazy_eval_variants()
    content = re.sub(lazy_old, lazy_new, content)
    
    print("Writing updated file...")
    write_file(content)
    print("✅ Successfully added question variants!")


if __name__ == "__main__":
    main()
