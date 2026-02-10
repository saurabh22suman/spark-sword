/**
 * Worked Examples for DataFrame Playground
 * 
 * Step-by-step solutions showing expert problem-solving process
 * (Khan Academy pattern)
 * 
 * Structure:
 * - Each example shows complete problem-solving flow
 * - Steps include: action, visual change, Spark reasoning, trade-offs
 * - "Your Turn" variant follows each example for practice
 */

import type { DataShape } from '@/components/playground/DataShapePanel';
import type { Operation } from '@/components/playground/OperationsBuilder';

export interface WorkedExampleStep {
  stepNumber: number;
  title: string;
  action: string;
  whatChanged: string;
  sparkReasoning: string;
  tradeOff?: string;
  operations: Omit<Operation, 'id'>[];
  shape?: Partial<DataShape>;
  highlightMetric?: string; // e.g., "shuffle_size", "partition_count"
}

export interface WorkedExample {
  id: string;
  title: string;
  category: 'basics' | 'joins' | 'shuffle' | 'skew' | 'performance';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  problemStatement: string;
  initialShape: Partial<DataShape>;
  initialOperations: Omit<Operation, 'id'>[];
  steps: WorkedExampleStep[];
  keyTakeaways: string[];
  yourTurnVariant?: {
    title: string;
    problemStatement: string;
    initialShape: Partial<DataShape>;
    hint: string;
    successCriteria: string;
  };
}

export const WORKED_EXAMPLES: WorkedExample[] = [
  {
    id: 'optimize-skewed-join',
    title: 'Optimizing a Skewed Join',
    category: 'skew',
    difficulty: 'intermediate',
    problemStatement: 'You have a join operation where 80% of data goes to a single partition, causing one executor to do most of the work while others sit idle.',
    initialShape: {
      totalSizeBytes: 10 * 1024 * 1024 * 1024, // 10 GB
      partitions: 200,
      skewFactor: 5.0, // Severe skew
    },
    initialOperations: [
      { type: 'join', params: { right_rows: 50000000, join_type: 'inner', broadcast_threshold: 10485760 } },
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'Identify the Skew',
        action: 'Look at partition size distribution in the Partition Bars view',
        whatChanged: 'Notice one partition is 5x larger than average (highlighted in red)',
        sparkReasoning: 'Spark distributes join keys using hash partitioning. If keys are unevenly distributed, some partitions get much more data.',
        highlightMetric: 'partition_skew',
        operations: [],
        shape: {},
      },
      {
        stepNumber: 2,
        title: 'Try Broadcast Join First',
        action: 'Check if the right table is small enough to broadcast',
        whatChanged: 'Right table is 1.9 GB - too large for default broadcast threshold (10 MB)',
        sparkReasoning: 'Broadcast joins avoid shuffle but require the entire right table to fit in executor memory. With 1.9 GB, this would cause OOM issues.',
        tradeOff: 'Broadcast eliminates shuffle but uses more memory. Only viable for small tables.',
        operations: [],
        shape: {},
      },
      {
        stepNumber: 3,
        title: 'Apply Salting Strategy',
        action: 'Add a salt operation before the join to distribute hot keys',
        whatChanged: 'Skew factor drops from 5.0 to 1.2. Multiple partitions now handle the hot key.',
        sparkReasoning: 'Salting adds random suffixes to keys, spreading hot keys across multiple partitions. The join becomes more balanced.',
        tradeOff: 'Salting requires extra shuffle and duplicate work, but eliminates stragglers.',
        operations: [
          { type: 'salt', params: { salt_factor: 10 } },
          { type: 'join', params: { right_rows: 50000000, join_type: 'inner', broadcast_threshold: 10485760 } },
        ],
        shape: {
          skewFactor: 1.2,
        },
        highlightMetric: 'partition_skew',
      },
      {
        stepNumber: 4,
        title: 'Verify Improvement',
        action: 'Compare execution time estimates: Before vs After',
        whatChanged: 'Estimated shuffle time reduced by 60% (no more stragglers)',
        sparkReasoning: 'With balanced partitions, all executors finish around the same time. Total execution time is determined by the slowest partition.',
        tradeOff: 'Final choice: Accept 20% more shuffle volume to eliminate 60% stragglers.',
        operations: [
          { type: 'salt', params: { salt_factor: 10 } },
          { type: 'join', params: { right_rows: 50000000, join_type: 'inner', broadcast_threshold: 10485760 } },
        ],
        shape: {
          skewFactor: 1.2,
        },
        highlightMetric: 'shuffle_time',
      },
    ],
    keyTakeaways: [
      'Skew happens when keys are unevenly distributed, not because of data size',
      'Broadcast joins only work for small tables (< memory)',
      'Salting trades shuffle volume for parallelism',
      'Stragglers (slow tasks) determine total job runtime',
    ],
    yourTurnVariant: {
      title: 'Fix Another Skewed Join',
      problemStatement: 'You have a join with skew factor 4.0. The right table is 500 MB. Which strategy should you use?',
      initialShape: {
        totalSizeBytes: 15 * 1024 * 1024 * 1024,
        partitions: 200,
        skewFactor: 4.0,
      },
      hint: 'Consider the right table size relative to broadcast threshold',
      successCriteria: 'Reduce skew factor below 2.0 with minimal shuffle overhead',
    },
  },
  {
    id: 'filter-placement',
    title: 'Strategic Filter Placement',
    category: 'performance',
    difficulty: 'beginner',
    problemStatement: 'You need to filter and aggregate data. Should you filter before or after groupBy?',
    initialShape: {
      totalSizeBytes: 20 * 1024 * 1024 * 1024, // 20 GB
      partitions: 200,
    },
    initialOperations: [],
    steps: [
      {
        stepNumber: 1,
        title: 'Baseline: GroupBy Then Filter',
        action: 'Add groupBy first, then filter',
        whatChanged: 'Shuffle processes all 20 GB of data',
        sparkReasoning: 'Spark must shuffle all 20 GB to colocate keys for groupBy, then filter the results.',
        operations: [
          { type: 'groupby', params: { num_groups: 1000, partial_aggregation: true } },
          { type: 'filter', params: { selectivity: 0.1 } },
        ],
        highlightMetric: 'shuffle_size',
      },
      {
        stepNumber: 2,
        title: 'Optimized: Filter Then GroupBy',
        action: 'Reorder: filter first, then groupBy',
        whatChanged: 'Shuffle now only processes 2 GB (10% of 20 GB)',
        sparkReasoning: 'Filter is a narrow transformation - each partition filters independently before shuffle. Only filtered data gets shuffled.',
        tradeOff: 'No trade-off here - filtering early is strictly better.',
        operations: [
          { type: 'filter', params: { selectivity: 0.1 } },
          { type: 'groupby', params: { num_groups: 1000, partial_aggregation: true } },
        ],
        shape: {
          totalSizeBytes: 2 * 1024 * 1024 * 1024,
        },
        highlightMetric: 'shuffle_size',
      },
      {
        stepNumber: 3,
        title: 'Understand Why',
        action: 'Compare DAG visualizations',
        whatChanged: 'Filter-first DAG shows smaller shuffle edge',
        sparkReasoning: 'Narrow transformations (filter) push down to partitions. Wide transformations (groupBy) require shuffle. Minimize shuffle volume by filtering first.',
        operations: [
          { type: 'filter', params: { selectivity: 0.1 } },
          { type: 'groupby', params: { num_groups: 1000, partial_aggregation: true } },
        ],
        highlightMetric: 'shuffle_size',
      },
    ],
    keyTakeaways: [
      'Narrow transformations (filter, map) process each partition independently',
      'Wide transformations (groupBy, join) trigger shuffle',
      'Filter early to reduce shuffle volume',
      'Operation order matters for performance',
    ],
    yourTurnVariant: {
      title: 'Optimize Another Pipeline',
      problemStatement: 'You have: 50 GB data → join → filter (selectivity 0.05). How can you optimize?',
      initialShape: {
        totalSizeBytes: 50 * 1024 * 1024 * 1024,
        partitions: 200,
      },
      hint: 'Can you filter before the join?',
      successCriteria: 'Reduce shuffle volume by at least 90%',
    },
  },
  {
    id: 'broadcast-threshold',
    title: 'Choosing the Right Broadcast Threshold',
    category: 'joins',
    difficulty: 'intermediate',
    problemStatement: 'Your join is using sort-merge when broadcast might be faster. How do you decide?',
    initialShape: {
      totalSizeBytes: 50 * 1024 * 1024 * 1024,
      partitions: 200,
    },
    initialOperations: [
      { type: 'join', params: { right_rows: 5000000, join_type: 'inner', broadcast_threshold: 10485760 } },
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'Check Right Table Size',
        action: 'Estimate right table size: 5M rows × ~100 bytes/row = ~500 MB',
        whatChanged: 'Right table is 500 MB, broadcast threshold is 10 MB',
        sparkReasoning: 'Spark defaults to sort-merge join because 500 MB > 10 MB threshold.',
        operations: [],
        highlightMetric: 'join_type',
      },
      {
        stepNumber: 2,
        title: 'Calculate Memory Impact',
        action: 'Consider available executor memory: 4 GB with 200 executors',
        whatChanged: 'Broadcasting 500 MB to 200 executors = 100 GB total memory',
        sparkReasoning: 'Each executor needs a copy of the broadcast table. Memory impact = table_size × num_executors.',
        tradeOff: 'Broadcast uses more memory but avoids shuffle',
        operations: [],
      },
      {
        stepNumber: 3,
        title: 'Increase Broadcast Threshold',
        action: 'Set broadcast threshold to 600 MB to enable broadcast join',
        whatChanged: 'Join type switches from sort-merge to broadcast',
        sparkReasoning: 'Spark now broadcasts the right table instead of shuffling both sides.',
        operations: [
          { type: 'join', params: { right_rows: 5000000, join_type: 'inner', broadcast_threshold: 629145600 } },
        ],
        highlightMetric: 'shuffle_size',
      },
      {
        stepNumber: 4,
        title: 'Verify Trade-offs',
        action: 'Compare: Sort-merge shuffle (50 GB × 2) vs Broadcast memory (100 GB)',
        whatChanged: 'Eliminated 100 GB of shuffle at cost of 100 GB memory',
        sparkReasoning: 'For tables < 1/3 of executor memory, broadcast is usually faster despite memory overhead.',
        tradeOff: 'Broadcast is faster but can cause OOM if table is too large',
        operations: [
          { type: 'join', params: { right_rows: 5000000, join_type: 'inner', broadcast_threshold: 629145600 } },
        ],
        highlightMetric: 'memory_usage',
      },
    ],
    keyTakeaways: [
      'Broadcast joins eliminate shuffle but replicate data to all executors',
      'Rule of thumb: broadcast if right table < 1/3 executor memory',
      'Memory impact = table_size × num_executors',
      'OOM errors indicate broadcast threshold is too high',
    ],
    yourTurnVariant: {
      title: 'Broadcast Decision',
      problemStatement: 'Right table: 2 GB, 100 executors with 8 GB memory each. Should you broadcast?',
      initialShape: {
        totalSizeBytes: 100 * 1024 * 1024 * 1024,
        partitions: 100,
      },
      hint: 'Calculate total memory impact: table_size × num_executors',
      successCriteria: 'Choose the join strategy that balances speed and memory',
    },
  },
  {
    id: 'partition-count',
    title: 'Finding Optimal Partition Count',
    category: 'shuffle',
    difficulty: 'advanced',
    problemStatement: 'Your job has 10 partitions processing 100 GB. It\'s running slowly. How many partitions should you use?',
    initialShape: {
      totalSizeBytes: 100 * 1024 * 1024 * 1024,
      partitions: 10,
    },
    initialOperations: [
      { type: 'groupby', params: { num_groups: 10000, partial_aggregation: true } },
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'Identify the Problem',
        action: 'Check partition size: 100 GB / 10 = 10 GB per partition',
        whatChanged: 'Each partition is 10 GB - way too large',
        sparkReasoning: 'Spark processes one partition per core. Large partitions mean limited parallelism and risk of OOM.',
        operations: [],
        highlightMetric: 'partition_size',
      },
      {
        stepNumber: 2,
        title: 'Apply the 128 MB Rule',
        action: 'Target partition size: 100-200 MB. Calculate: 100 GB / 128 MB ≈ 800 partitions',
        whatChanged: 'Repartition to 800 partitions',
        sparkReasoning: 'Spark performs best with partitions in the 100-200 MB range. Too small = overhead. Too large = OOM and poor parallelism.',
        operations: [
          { type: 'repartition', params: { target_partitions: 800 } },
          { type: 'groupby', params: { num_groups: 10000, partial_aggregation: true } },
        ],
        shape: {
          partitions: 800,
        },
        highlightMetric: 'partition_size',
      },
      {
        stepNumber: 3,
        title: 'Consider Core Count',
        action: 'Check available cores: 200 executors × 4 cores = 800 cores',
        whatChanged: 'Partition count (800) matches core count (800)',
        sparkReasoning: 'Ideal partition count = 2-4× core count for CPU-bound tasks. This ensures all cores stay busy.',
        operations: [
          { type: 'repartition', params: { target_partitions: 800 } },
          { type: 'groupby', params: { num_groups: 10000, partial_aggregation: true } },
        ],
        highlightMetric: 'parallelism',
      },
      {
        stepNumber: 4,
        title: 'Verify Improvement',
        action: 'Compare execution time: 10 partitions vs 800 partitions',
        whatChanged: 'Parallelism increased 80x, execution time reduced significantly',
        sparkReasoning: 'More partitions = more tasks running in parallel = better resource utilization.',
        tradeOff: 'Too many partitions adds scheduling overhead. Too few wastes resources.',
        operations: [
          { type: 'repartition', params: { target_partitions: 800 } },
          { type: 'groupby', params: { num_groups: 10000, partial_aggregation: true } },
        ],
        highlightMetric: 'execution_time',
      },
    ],
    keyTakeaways: [
      'Target partition size: 100-200 MB (Spark sweet spot)',
      'Partition count ≈ 2-4× core count for CPU-bound tasks',
      'Too few partitions = wasted resources and OOM risk',
      'Too many partitions = task scheduling overhead',
    ],
    yourTurnVariant: {
      title: 'Partition Count Challenge',
      problemStatement: '500 GB data, 100 cores available. How many partitions?',
      initialShape: {
        totalSizeBytes: 500 * 1024 * 1024 * 1024,
        partitions: 50,
      },
      hint: 'Apply both rules: 128 MB partition size AND 2-4× core count',
      successCriteria: 'Choose partition count that balances both constraints',
    },
  },
  {
    id: 'caching-strategy',
    title: 'Strategic Caching for Iterative Jobs',
    category: 'performance',
    difficulty: 'intermediate',
    problemStatement: 'You have a DataFrame used in multiple operations. Should you cache it? Where?',
    initialShape: {
      totalSizeBytes: 50 * 1024 * 1024 * 1024,
      partitions: 400,
    },
    initialOperations: [
      { type: 'filter', params: { selectivity: 0.2 } },
      { type: 'groupby', params: { num_groups: 5000, partial_aggregation: true } },
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'Identify Recomputation',
        action: 'Notice the same filter+groupby chain is used 3 times downstream',
        whatChanged: 'Each use recomputes the entire chain from source',
        sparkReasoning: 'Spark is lazy - it recomputes transformations each time an action is called unless you cache.',
        operations: [],
      },
      {
        stepNumber: 2,
        title: 'Choose Cache Point',
        action: 'Cache after the groupBy (expensive shuffle operation)',
        whatChanged: 'Subsequent operations reuse cached results',
        sparkReasoning: 'Cache after expensive operations (shuffle) and before reuse. Don\'t cache before shuffle - you\'d cache the larger pre-shuffle data.',
        tradeOff: 'Caching uses memory but saves recomputation',
        operations: [
          { type: 'filter', params: { selectivity: 0.2 } },
          { type: 'groupby', params: { num_groups: 5000, partial_aggregation: true } },
          { type: 'cache', params: {} },
        ],
        highlightMetric: 'cache_point',
      },
      {
        stepNumber: 3,
        title: 'Estimate Memory Impact',
        action: 'Calculate cached size: 50 GB × 0.2 (filter) = 10 GB post-aggregation',
        whatChanged: '10 GB stays in memory across executors',
        sparkReasoning: 'Cached data is distributed across executors. Each executor holds a subset.',
        operations: [
          { type: 'filter', params: { selectivity: 0.2 } },
          { type: 'groupby', params: { num_groups: 5000, partial_aggregation: true } },
          { type: 'cache', params: {} },
        ],
      },
      {
        stepNumber: 4,
        title: 'Verify Benefit',
        action: 'Compare: 3× full recomputation vs 1× computation + cache',
        whatChanged: 'Eliminated 2 redundant shuffle operations',
        sparkReasoning: 'Caching is beneficial when: reuse > 1 AND cached_size < available_memory.',
        tradeOff: 'Cache if reused 2+ times and fits in memory',
        operations: [
          { type: 'filter', params: { selectivity: 0.2 } },
          { type: 'groupby', params: { num_groups: 5000, partial_aggregation: true } },
          { type: 'cache', params: {} },
        ],
        highlightMetric: 'recomputation_saved',
      },
    ],
    keyTakeaways: [
      'Cache after expensive operations (shuffle) and before reuse',
      'Don\'t cache if used only once',
      'Cache size must fit in executor memory',
      'Use unpersist() to free memory when done',
    ],
    yourTurnVariant: {
      title: 'Cache Placement',
      problemStatement: 'Pipeline: filter → join → groupBy → used 4 times. Where should you cache?',
      initialShape: {
        totalSizeBytes: 80 * 1024 * 1024 * 1024,
        partitions: 400,
      },
      hint: 'Cache after the most expensive operation and before reuse',
      successCriteria: 'Maximize recomputation savings while minimizing memory usage',
    },
  },
  {
    id: 'window-function-optimization',
    title: 'Optimizing Window Functions',
    category: 'shuffle',
    difficulty: 'advanced',
    problemStatement: 'Your window function is causing massive shuffle. How can you reduce it?',
    initialShape: {
      totalSizeBytes: 100 * 1024 * 1024 * 1024,
      partitions: 200,
    },
    initialOperations: [
      { type: 'window', params: { partition_keys: 1000000, order_by: true } },
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'Understand Window Shuffle',
        action: 'Observe that window functions require shuffle to colocate partition keys',
        whatChanged: 'All 100 GB shuffles to group rows by partition key',
        sparkReasoning: 'Window functions (like RANK, LAG) need all rows for each partition key together. Spark shuffles by partition key.',
        operations: [],
        highlightMetric: 'shuffle_size',
      },
      {
        stepNumber: 2,
        title: 'Reduce Data Before Window',
        action: 'Add filter before window to reduce shuffle volume',
        whatChanged: 'Shuffle volume drops from 100 GB to 30 GB',
        sparkReasoning: 'Filter is narrow - it reduces data before the wide window transformation.',
        operations: [
          { type: 'filter', params: { selectivity: 0.3 } },
          { type: 'window', params: { partition_keys: 1000000, order_by: true } },
        ],
        shape: {
          totalSizeBytes: 30 * 1024 * 1024 * 1024,
        },
        highlightMetric: 'shuffle_size',
      },
      {
        stepNumber: 3,
        title: 'Increase Partition Count',
        action: 'Window with 1M partition keys but only 200 partitions = uneven distribution',
        whatChanged: 'Repartition to 2000 partitions for better parallelism',
        sparkReasoning: 'With more partitions than partition keys, Spark can distribute keys more evenly.',
        operations: [
          { type: 'filter', params: { selectivity: 0.3 } },
          { type: 'repartition', params: { target_partitions: 2000 } },
          { type: 'window', params: { partition_keys: 1000000, order_by: true } },
        ],
        shape: {
          partitions: 2000,
        },
        highlightMetric: 'parallelism',
      },
      {
        stepNumber: 4,
        title: 'Verify Improvement',
        action: 'Compare execution time with optimizations',
        whatChanged: 'Reduced shuffle volume (70%) + increased parallelism (10×)',
        sparkReasoning: 'Window operations are expensive. Minimize data before window and maximize parallelism.',
        tradeOff: 'More partitions = more parallelism but higher scheduling overhead',
        operations: [
          { type: 'filter', params: { selectivity: 0.3 } },
          { type: 'repartition', params: { target_partitions: 2000 } },
          { type: 'window', params: { partition_keys: 1000000, order_by: true } },
        ],
        highlightMetric: 'execution_time',
      },
    ],
    keyTakeaways: [
      'Window functions always trigger shuffle (wide transformation)',
      'Reduce data volume before window with filters',
      'Partition count should be > number of partition keys for even distribution',
      'Window + ORDER BY is more expensive than window without order',
    ],
    yourTurnVariant: {
      title: 'Window Function Challenge',
      problemStatement: '200 GB data, window function with 50K partition keys. Optimize it.',
      initialShape: {
        totalSizeBytes: 200 * 1024 * 1024 * 1024,
        partitions: 400,
      },
      hint: 'Filter early and adjust partition count',
      successCriteria: 'Reduce shuffle volume by 60%+ and improve parallelism',
    },
  },
  {
    id: 'orderby-minimization',
    title: 'Avoiding Unnecessary ORDER BY',
    category: 'shuffle',
    difficulty: 'beginner',
    problemStatement: 'Your query has ORDER BY for display purposes. Is there a better way?',
    initialShape: {
      totalSizeBytes: 100 * 1024 * 1024 * 1024,
      partitions: 400,
    },
    initialOperations: [
      { type: 'groupby', params: { num_groups: 10000, partial_aggregation: true } },
      { type: 'orderby', params: { num_sort_keys: 1 } },
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'Understand ORDER BY Cost',
        action: 'Observe that ORDER BY triggers range partitioning + sort',
        whatChanged: 'All 100 GB shuffles twice: once for range sampling, once for sorting',
        sparkReasoning: 'Global ordering requires Spark to determine partition boundaries (sample) then redistribute data (shuffle) then sort within partitions.',
        operations: [],
        highlightMetric: 'shuffle_size',
      },
      {
        stepNumber: 2,
        title: 'Question the Requirement',
        action: 'Ask: Do I need global order or just top-N results?',
        whatChanged: 'Often, only the first 100 rows are displayed, not all rows',
        sparkReasoning: 'If you only need top-N, use LIMIT + partial sort instead of global ORDER BY.',
        operations: [],
      },
      {
        stepNumber: 3,
        title: 'Use LIMIT for Top-N',
        action: 'Replace ORDER BY + full scan with ORDER BY + LIMIT',
        whatChanged: 'Spark optimizes with sorted local top-N, then merges',
        sparkReasoning: 'With LIMIT, Spark sorts each partition locally and only shuffles top-N from each partition.',
        tradeOff: 'Limited to top-N rows, but 100× faster for large datasets',
        operations: [
          { type: 'groupby', params: { num_groups: 10000, partial_aggregation: true } },
          { type: 'orderby', params: { num_sort_keys: 1, limit: 100 } },
        ],
        highlightMetric: 'shuffle_size',
      },
      {
        stepNumber: 4,
        title: 'Compare Trade-offs',
        action: 'Full ORDER BY: 200 GB shuffle. ORDER BY + LIMIT: 40 KB shuffle',
        whatChanged: 'Shuffle reduced by 99.99%',
        sparkReasoning: 'Most dashboards and reports only show top results. Global ordering is rarely necessary.',
        tradeOff: 'LIMIT restricts result set but massively reduces shuffle',
        operations: [
          { type: 'groupby', params: { num_groups: 10000, partial_aggregation: true } },
          { type: 'orderby', params: { num_sort_keys: 1, limit: 100 } },
        ],
        highlightMetric: 'shuffle_size',
      },
    ],
    keyTakeaways: [
      'ORDER BY triggers expensive range partitioning + sort shuffle',
      'Use LIMIT with ORDER BY when only top-N needed',
      'Consider if ordering is really necessary',
      'Sorting within partitions (local sort) is much cheaper than global sort',
    ],
    yourTurnVariant: {
      title: 'ORDER BY Challenge',
      problemStatement: '500 GB data, need to show top 50 records. How to optimize ORDER BY?',
      initialShape: {
        totalSizeBytes: 500 * 1024 * 1024 * 1024,
        partitions: 800,
      },
      hint: 'Do you need all rows sorted or just the top 50?',
      successCriteria: 'Reduce shuffle volume by 99%+',
    },
  },
  {
    id: 'distinct-optimization',
    title: 'Optimizing DISTINCT Operations',
    category: 'shuffle',
    difficulty: 'intermediate',
    problemStatement: 'Your DISTINCT operation is shuffling all data. Can it be optimized?',
    initialShape: {
      totalSizeBytes: 80 * 1024 * 1024 * 1024,
      partitions: 400,
    },
    initialOperations: [
      { type: 'distinct', params: { estimated_unique_ratio: 0.1 } },
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'Understand DISTINCT Shuffle',
        action: 'DISTINCT = groupBy + take first record from each group',
        whatChanged: 'All 80 GB shuffles to find unique values',
        sparkReasoning: 'Spark must hash each record and shuffle to colocate duplicates, then drop duplicates.',
        operations: [],
        highlightMetric: 'shuffle_size',
      },
      {
        stepNumber: 2,
        title: 'Apply Pre-Aggregation',
        action: 'Enable partial aggregation (enabled by default in Spark 3.0+)',
        whatChanged: 'Duplicates eliminated locally before shuffle',
        sparkReasoning: 'Pre-aggregation removes duplicates within each partition before shuffling, reducing shuffle volume.',
        operations: [
          { type: 'distinct', params: { estimated_unique_ratio: 0.1, partial_aggregation: true } },
        ],
        shape: {
          totalSizeBytes: 8 * 1024 * 1024 * 1024, // 10% unique
        },
        highlightMetric: 'shuffle_size',
      },
      {
        stepNumber: 3,
        title: 'Consider Filter First',
        action: 'If DISTINCT is on a subset, filter before DISTINCT',
        whatChanged: 'Reduce data before expensive DISTINCT operation',
        sparkReasoning: 'Filter is narrow and cheap. Apply it before wide transformations like DISTINCT.',
        operations: [
          { type: 'filter', params: { selectivity: 0.5 } },
          { type: 'distinct', params: { estimated_unique_ratio: 0.1, partial_aggregation: true } },
        ],
        shape: {
          totalSizeBytes: 4 * 1024 * 1024 * 1024,
        },
        highlightMetric: 'shuffle_size',
      },
      {
        stepNumber: 4,
        title: 'Verify Improvement',
        action: 'Compare shuffle volume: 80 GB → 4 GB (95% reduction)',
        whatChanged: 'Combination of pre-aggregation + filter = massive shuffle reduction',
        sparkReasoning: 'Pre-aggregation + filter early = minimize shuffle volume.',
        tradeOff: 'Pre-aggregation adds local computation but saves shuffle',
        operations: [
          { type: 'filter', params: { selectivity: 0.5 } },
          { type: 'distinct', params: { estimated_unique_ratio: 0.1, partial_aggregation: true } },
        ],
        highlightMetric: 'shuffle_size',
      },
    ],
    keyTakeaways: [
      'DISTINCT triggers shuffle like groupBy',
      'Pre-aggregation removes local duplicates before shuffle',
      'Filter before DISTINCT to reduce shuffle volume',
      'Low cardinality (few unique values) = high pre-aggregation benefit',
    ],
    yourTurnVariant: {
      title: 'DISTINCT Challenge',
      problemStatement: '150 GB data, 5% unique values. Optimize DISTINCT operation.',
      initialShape: {
        totalSizeBytes: 150 * 1024 * 1024 * 1024,
        partitions: 600,
      },
      hint: 'Leverage pre-aggregation for high duplicate ratio',
      successCriteria: 'Reduce shuffle volume by 90%+',
    },
  },
];

export default WORKED_EXAMPLES;
