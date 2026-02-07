"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Search, AlertTriangle, Info, Zap } from "lucide-react"
import Link from "next/link"
import { Card, CardContent, Badge, Button, PageContainer, PageHeader } from "@/components/ui"

/**
 * Myth Busters Page - Debunk common Spark misconceptions
 * 
 * Following PrepRabbit philosophy:
 * - Every myth links to interactive proof
 * - Evidence-based debunking
 * - No prescriptive "always do X" advice
 */

interface SparkMyth {
  id: string
  myth: string
  truth: string
  why: string
  evidence_type: string
  demo_component?: string
  category: string
  severity: string
  tags: string[]
}

// Tutorial component links
const componentLinks: Record<string, string> = {
  PartitionPlayground: "/tutorials?component=partition-playground",
  CacheGoneWrongDemo: "/tutorials?component=cache-gone-wrong",
  JoinStrategySimulator: "/tutorials?component=join-strategy",
  RepartitionDemo: "/tutorials?component=repartition-demo",
  ShuffleCostSimulator: "/tutorials?component=shuffle-cost",
  ExecutorMemorySimulator: "/tutorials?component=executor-memory",
  LazyEvalSimulator: "/tutorials?component=lazy-eval",
  FileExplosionVisualizer: "/tutorials?component=file-explosion",
  BroadcastThresholdDemo: "/tutorials?component=broadcast-threshold",
  SkewExplosionDemo: "/tutorials?component=skew-explosion",
}

export default function MythBustersPage() {
  const [myths, setMyths] = React.useState<SparkMyth[]>([])
  const [filteredMyths, setFilteredMyths] = React.useState<SparkMyth[]>([])
  const [selectedCategory, setSelectedCategory] = React.useState<string>("all")
  const [searchQuery, setSearchQuery] = React.useState("")
  const [expandedMyth, setExpandedMyth] = React.useState<string | null>(null)

  // Fetch myths from backend
  React.useEffect(() => {
    // For now, use inline data (replace with API call later)
    const mockMyths: SparkMyth[] = [
      {
        id: "more-partitions-faster",
        myth: "More partitions always means faster execution",
        truth: "More partitions beyond available cores adds scheduling overhead",
        why: "Spark's scheduler has per-task overhead. With 10,000 partitions on 4 cores, you spend more time scheduling tasks than processing data. The sweet spot is typically 2-4x your total cores.",
        evidence_type: "interactive",
        demo_component: "PartitionPlayground",
        category: "performance",
        severity: "common",
        tags: ["partitions", "parallelism", "performance", "scheduling"],
      },
      {
        id: "cache-everything",
        myth: "You should cache every DataFrame you use more than once",
        truth: "Caching too much causes memory pressure and evictions",
        why: "Cached data must fit in executor storage memory. Exceeding capacity triggers evictions (LRU), which defeats caching purpose. Worse, evicted blocks may need recomputation mid-job, causing slowdowns.",
        evidence_type: "interactive",
        demo_component: "CacheGoneWrongDemo",
        category: "memory",
        severity: "dangerous",
        tags: ["cache", "persist", "memory", "eviction", "storage"],
      },
      {
        id: "broadcast-join-always-wins",
        myth: "Broadcast joins are always faster than shuffle joins",
        truth: "Broadcasting huge tables (>1GB) causes driver/executor OOM",
        why: "Broadcast join sends the entire 'small' table to every executor. If that table is 5GB and you have 100 executors, you've replicated 500GB of data. Driver collects it first, risking OOM.",
        evidence_type: "interactive",
        demo_component: "JoinStrategySimulator",
        category: "joins",
        severity: "dangerous",
        tags: ["broadcast", "join", "memory", "oom"],
      },
      {
        id: "repartition-is-free",
        myth: "Repartitioning is a cheap operation",
        truth: "Repartition triggers a full shuffle of all data",
        why: "repartition() triggers a wide transformation, shuffling 100% of your data across the cluster. Use coalesce() to reduce partitions without shuffle (narrow transformation) when possible.",
        evidence_type: "interactive",
        demo_component: "RepartitionDemo",
        category: "shuffle",
        severity: "common",
        tags: ["repartition", "coalesce", "shuffle", "wide-transformation"],
      },
      {
        id: "shuffle-partitions-default-is-fine",
        myth: "The default spark.sql.shuffle.partitions=200 is optimal",
        truth: "200 partitions is arbitrary and rarely optimal for your data size",
        why: "Spark defaulted to 200 in 2014 when clusters were smaller. Modern jobs on TBs of data need more partitions; small jobs waste resources with 200. Rule of thumb: 128MB per partition post-shuffle.",
        evidence_type: "interactive",
        demo_component: "ShuffleCostSimulator",
        category: "shuffle",
        severity: "common",
        tags: ["shuffle-partitions", "configuration", "shuffle"],
      },
      {
        id: "aqe-fixes-everything",
        myth: "Enabling AQE (Adaptive Query Execution) automatically optimizes everything",
        truth: "AQE helps with skew and partition sizing, but doesn't fix bad query design",
        why: "AQE dynamically coalesces shuffle partitions and handles skew joins, but it can't fix Cartesian products, unnecessary shuffles, or poor caching strategies. It optimizes execution, not logic.",
        evidence_type: "explanation",
        category: "configs",
        severity: "common",
        tags: ["aqe", "adaptive-query-execution", "optimization"],
      },
      {
        id: "dataframe-like-pandas",
        myth: "Spark DataFrames work just like Pandas DataFrames",
        truth: "Spark DataFrames are lazy; operations don't execute until an action",
        why: "Unlike Pandas (eager evaluation), Spark builds a DAG of transformations. Nothing executes until you call show(), count(), write(), etc. This enables query optimization but confuses beginners.",
        evidence_type: "interactive",
        demo_component: "LazyEvalSimulator",
        category: "general",
        severity: "common",
        tags: ["lazy-evaluation", "dataframe", "dag", "transformations"],
      },
      {
        id: "small-files-not-a-problem",
        myth: "Reading thousands of small files isn't a performance issue",
        truth: "Small files create one task per file, overwhelming the scheduler",
        why: "Spark creates one task per file by default. Reading 10,000 tiny files = 10,000 tasks, each with scheduling overhead, serialization cost, and startup time. Coalesce or repartition after reading.",
        evidence_type: "interactive",
        demo_component: "FileExplosionVisualizer",
        category: "performance",
        severity: "dangerous",
        tags: ["small-files", "tasks", "scheduling", "performance"],
      },
      {
        id: "larger-executors-always-faster",
        myth: "Larger executors are always faster",
        truth: "Executor size depends on GC pressure, parallelism needs, and data locality",
        why: "Giant executors (32+ cores, 64GB+ RAM) suffer from long GC pauses. Too many small executors waste resources on overhead. Balance depends on your workload's memory vs CPU needs.",
        evidence_type: "interactive",
        demo_component: "ExecutorMemorySimulator",
        category: "performance",
        severity: "common",
        tags: ["executors", "memory", "gc", "configuration"],
      },
      {
        id: "persist-same-as-cache",
        myth: "persist() and cache() are the same thing",
        truth: "cache() is just persist(MEMORY_ONLY), but persist() offers storage levels",
        why: "persist() lets you choose: MEMORY_ONLY, MEMORY_AND_DISK, DISK_ONLY, etc. cache() is hardcoded to MEMORY_ONLY. For large DataFrames, MEMORY_AND_DISK prevents recomputation if evicted.",
        evidence_type: "explanation",
        category: "memory",
        severity: "subtle",
        tags: ["cache", "persist", "storage-levels"],
      },
      {
        id: "broadcast-hint-guarantees-broadcast",
        myth: "Using broadcast() hint guarantees a broadcast join",
        truth: "Spark ignores broadcast hints if the table exceeds spark.sql.autoBroadcastJoinThreshold",
        why: "The broadcast hint is a suggestion, not a command. If the broadcasted table exceeds the threshold (default 10MB), Spark falls back to sort-merge join to prevent OOM.",
        evidence_type: "interactive",
        demo_component: "BroadcastThresholdDemo",
        category: "joins",
        severity: "subtle",
        tags: ["broadcast", "join", "hint", "threshold"],
      },
      {
        id: "kryo-always-faster",
        myth: "Kryo serialization is always faster than Java serialization",
        truth: "Kryo is faster but requires class registration for best performance",
        why: "Kryo is faster and more compact, but unregistered classes fall back to reflection, losing the performance benefit. Also, some Spark operations (like collect()) still use Java serialization.",
        evidence_type: "explanation",
        category: "configs",
        severity: "subtle",
        tags: ["kryo", "serialization", "configuration"],
      },
      {
        id: "window-functions-always-slow",
        myth: "Window functions are always slow and should be avoided",
        truth: "Window functions can be efficient with proper partitioning",
        why: "Window functions require shuffling data by partition key. If your partition is the entire dataset (no PARTITION BY), yes, it's slow. Partition on a high-cardinality column to parallelize.",
        evidence_type: "explanation",
        category: "performance",
        severity: "subtle",
        tags: ["window-functions", "partitioning", "shuffle"],
      },
      {
        id: "collect-is-safe-for-testing",
        myth: "Using .collect() is fine for testing with small datasets",
        truth: ".collect() pulls all data to the driver, causing OOM with unexpected data growth",
        why: "collect() materializes the entire DataFrame on the driver node. Even 'small' test datasets can explode after joins or aggregations. Use .take(N) or .show() for safer testing.",
        evidence_type: "explanation",
        category: "memory",
        severity: "dangerous",
        tags: ["collect", "driver", "oom", "testing"],
      },
    ]
    setMyths(mockMyths)
    setFilteredMyths(mockMyths)
  }, [])

  // Filter myths
  React.useEffect(() => {
    let filtered = myths

    // Filter by category
    if (selectedCategory !== "all") {
      filtered = filtered.filter((m) => m.category === selectedCategory)
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (m) =>
          m.myth.toLowerCase().includes(query) ||
          m.truth.toLowerCase().includes(query) ||
          m.tags.some((tag) => tag.toLowerCase().includes(query))
      )
    }

    setFilteredMyths(filtered)
  }, [selectedCategory, searchQuery, myths])

  const categories = ["all", "performance", "memory", "shuffle", "joins", "configs", "general"]

  return (
    <PageContainer>
      <PageHeader
        title="Spark Myths Debunked"
        description="Common misconceptions about Apache Spark, debunked with evidence and interactive demos. Learn what doesn't work before you break production."
      />

        {/* Search and Filter */}
        <div className="mb-8 space-y-4">
          {/* Search */}
          <div className="relative max-w-md mx-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search myths by keyword or tag..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Category Filters */}
          <div className="flex flex-wrap gap-2 justify-center">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                  selectedCategory === category
                    ? "bg-blue-600 text-white shadow-lg scale-105"
                    : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600"
                }`}
              >
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Myths Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredMyths.map((myth) => (
              <motion.div
                key={myth.id}
                data-testid="myth-card"
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3 }}
                onClick={() => setExpandedMyth(expandedMyth === myth.id ? null : myth.id)}
              >
                <Card variant="default" className="cursor-pointer hover:shadow-xl transition-shadow">
                  <CardContent className="p-6">
                    {/* Category and Severity Badges */}
                    <div className="flex gap-2 mb-3">
                      <Badge
                        variant={myth.category === 'performance' || myth.category === 'configs' ? 'primary' : myth.category === 'memory' ? 'info' : myth.category === 'shuffle' || myth.category === 'joins' ? 'warning' : 'default'}
                        size="sm"
                      >
                        {myth.category.charAt(0).toUpperCase() + myth.category.slice(1)}
                      </Badge>
                      <Badge
                        data-testid="myth-severity"
                        variant={myth.severity === 'dangerous' ? 'danger' : myth.severity === 'common' ? 'warning' : 'default'}
                        size="sm"
                      >
                        {myth.severity.charAt(0).toUpperCase() + myth.severity.slice(1)}
                      </Badge>
                    </div>

                  {/* Myth Statement */}
                  <div className="mb-4" data-testid="myth-statement">
                    <div className="flex items-start gap-2 mb-2">
                      <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-1" />
                      <p className="text-lg font-bold text-slate-900 dark:text-white">
                        &quot;{myth.myth}&quot;
                      </p>
                    </div>
                  </div>

                  {/* Truth */}
                  <div data-testid="myth-truth" className="mb-4">
                    <div className="flex items-start gap-2">
                      <Info className="h-5 w-5 text-green-500 flex-shrink-0 mt-1" />
                      <p className="text-sm font-semibold text-green-700 dark:text-green-400">
                        {myth.truth}
                      </p>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  <AnimatePresence>
                    {expandedMyth === myth.id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        {/* Why Explanation */}
                        <div className="mb-4 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg" data-testid="myth-why-explanation">
                          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                            <strong className="text-slate-900 dark:text-white">Why: </strong>
                            {myth.why}
                          </p>
                        </div>

                        {/* Tags */}
                        <div className="mb-4" data-testid="myth-tags">
                          <div className="flex flex-wrap gap-2">
                            {myth.tags.map((tag) => (
                              <span
                                key={tag}
                                data-testid="myth-tag"
                                className="cursor-pointer hover:opacity-80 transition-opacity"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setSearchQuery(tag)
                                }}
                              >
                                <Badge
                                  variant="default"
                                  size="sm"
                                >
                                  #{tag}
                                </Badge>
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Interactive Demo Link */}
                        {myth.demo_component && componentLinks[myth.demo_component] && (
                          <Link
                            href={componentLinks[myth.demo_component]}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Button variant="primary" size="sm" className="gap-2">
                              <Zap className="h-4 w-4" />
                              Try It Yourself
                            </Button>
                          </Link>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* No Results */}
        {filteredMyths.length === 0 && (
          <div className="text-center py-12">
            <p className="text-slate-600 dark:text-slate-400 text-lg">
              No myths found matching your criteria.
            </p>
          </div>
        )}
    </PageContainer>
  )
}
