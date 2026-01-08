"""Skew detector for identifying data skew issues.

Detects:
- Task duration imbalance within stages
- Shuffle read imbalance
- Spill-based skew indicators
"""

import statistics
from app.analyzers.base import BaseDetector, Confidence, Insight
from app.models.spark_events import ParsedEventLog, TaskInfo


class SkewDetector(BaseDetector):
    """Detects data skew based on task metrics."""

    # Thresholds
    DURATION_SKEW_RATIO_THRESHOLD = 5.0  # max/median > 5x indicates skew
    SHUFFLE_SKEW_RATIO_THRESHOLD = 5.0
    MIN_TASKS_FOR_DETECTION = 4  # Need enough tasks to detect skew

    @property
    def name(self) -> str:
        return "skew_detector"

    def detect(self, parsed_log: ParsedEventLog) -> list[Insight]:
        """Detect skew-related insights."""
        insights: list[Insight] = []

        # Group tasks by stage
        tasks_by_stage: dict[int, list[TaskInfo]] = {}
        for task in parsed_log.tasks:
            if task.stage_id not in tasks_by_stage:
                tasks_by_stage[task.stage_id] = []
            tasks_by_stage[task.stage_id].append(task)

        for stage_id, tasks in tasks_by_stage.items():
            if len(tasks) < self.MIN_TASKS_FOR_DETECTION:
                continue

            # Check duration skew
            duration_insight = self._detect_duration_skew(stage_id, tasks)
            if duration_insight:
                insights.append(duration_insight)

            # Check shuffle read skew
            shuffle_insight = self._detect_shuffle_skew(stage_id, tasks)
            if shuffle_insight:
                insights.append(shuffle_insight)

            # Check spill-based skew
            spill_insight = self._detect_spill_skew(stage_id, tasks)
            if spill_insight:
                insights.append(spill_insight)

        return insights

    def _detect_duration_skew(
        self, stage_id: int, tasks: list[TaskInfo]
    ) -> Insight | None:
        """Detect skew based on task duration imbalance."""
        durations = [t.duration_ms for t in tasks if t.duration_ms is not None]
        if len(durations) < self.MIN_TASKS_FOR_DETECTION:
            return None

        max_duration = max(durations)
        median_duration = statistics.median(durations)
        
        if median_duration == 0:
            return None

        skew_ratio = max_duration / median_duration
        if skew_ratio < self.DURATION_SKEW_RATIO_THRESHOLD:
            return None

        # Find the slow task(s)
        slow_tasks = [
            t for t in tasks
            if t.duration_ms and t.duration_ms >= max_duration * 0.9
        ]

        return Insight(
            insight_type="duration_skew",
            title=f"Task Duration Skew in Stage {stage_id}",
            description=(
                f"Stage {stage_id} has significant task duration imbalance. "
                f"Slowest task took {max_duration}ms while median was {median_duration:.0f}ms "
                f"(ratio: {skew_ratio:.1f}x)."
            ),
            evidence=[
                f"max_duration = {max_duration}ms",
                f"median_duration = {median_duration:.0f}ms",
                f"skew_ratio = {skew_ratio:.1f}x",
                f"slow_task_count = {len(slow_tasks)}",
            ],
            confidence=Confidence.HIGH if skew_ratio > 10 else Confidence.MEDIUM,
            affected_stages=[stage_id],
            suggestions=[
                "Check for skewed join keys - consider salting",
                "Investigate if groupBy keys have uneven distribution",
                "Consider using Adaptive Query Execution (AQE) for automatic skew handling",
                "Pre-aggregate or filter data to reduce skew impact",
            ],
            conditions=[
                "Skew detection is based on task timing, not data inspection",
                "Some skew is normal - only significant imbalance is flagged",
            ],
            metrics={
                "max_duration_ms": max_duration,
                "median_duration_ms": median_duration,
                "skew_ratio": skew_ratio,
                "task_count": len(tasks),
                "slow_task_ids": [t.task_id for t in slow_tasks],
            },
        )

    def _detect_shuffle_skew(
        self, stage_id: int, tasks: list[TaskInfo]
    ) -> Insight | None:
        """Detect skew based on shuffle read imbalance."""
        shuffle_reads = [t.shuffle_read_bytes for t in tasks]
        
        # Only check stages with shuffle reads
        if sum(shuffle_reads) == 0:
            return None
        
        # Filter out zero-read tasks for ratio calculation
        nonzero_reads = [r for r in shuffle_reads if r > 0]
        if len(nonzero_reads) < self.MIN_TASKS_FOR_DETECTION:
            return None

        max_read = max(nonzero_reads)
        median_read = statistics.median(nonzero_reads)

        if median_read == 0:
            return None

        skew_ratio = max_read / median_read
        if skew_ratio < self.SHUFFLE_SKEW_RATIO_THRESHOLD:
            return None

        return Insight(
            insight_type="shuffle_skew",
            title=f"Shuffle Read Skew in Stage {stage_id}",
            description=(
                f"Stage {stage_id} has uneven shuffle data distribution. "
                f"One task reads {max_read / (1024*1024):.1f}MB while median is "
                f"{median_read / (1024*1024):.1f}MB (ratio: {skew_ratio:.1f}x)."
            ),
            evidence=[
                f"max_shuffle_read = {max_read:,} bytes",
                f"median_shuffle_read = {median_read:,} bytes",
                f"skew_ratio = {skew_ratio:.1f}x",
            ],
            confidence=Confidence.HIGH,
            affected_stages=[stage_id],
            suggestions=[
                "Identify and handle skewed keys with salting technique",
                "Enable AQE skew join optimization (spark.sql.adaptive.skewJoin.enabled)",
                "Consider pre-aggregating on skewed keys",
            ],
            conditions=[
                "Skew is detected from shuffle metrics, not actual key distribution",
            ],
            metrics={
                "max_shuffle_read_bytes": max_read,
                "median_shuffle_read_bytes": median_read,
                "skew_ratio": skew_ratio,
            },
        )

    def _detect_spill_skew(
        self, stage_id: int, tasks: list[TaskInfo]
    ) -> Insight | None:
        """Detect skew based on uneven spilling."""
        spill_counts = [(t.task_id, t.spill_bytes) for t in tasks]
        spilling_tasks = [(tid, sb) for tid, sb in spill_counts if sb > 0]
        non_spilling = [tid for tid, sb in spill_counts if sb == 0]

        # Skew indicator: only some tasks spill while others don't
        if not spilling_tasks or not non_spilling:
            return None

        spill_ratio = len(spilling_tasks) / len(tasks)
        
        # If less than 25% of tasks spill, it suggests skew
        if spill_ratio >= 0.25:
            return None

        total_spill = sum(sb for _, sb in spilling_tasks)

        return Insight(
            insight_type="spill_skew",
            title=f"Uneven Spilling Indicates Skew in Stage {stage_id}",
            description=(
                f"Only {len(spilling_tasks)} of {len(tasks)} tasks "
                f"({spill_ratio*100:.0f}%) spilled to disk in stage {stage_id}, "
                f"suggesting data skew on hot partitions."
            ),
            evidence=[
                f"spilling_task_count = {len(spilling_tasks)}",
                f"total_task_count = {len(tasks)}",
                f"total_spill_bytes = {total_spill:,}",
            ],
            confidence=Confidence.MEDIUM,
            affected_stages=[stage_id],
            suggestions=[
                "Increase executor memory if possible",
                "Investigate skewed keys causing uneven partition sizes",
                "Consider repartitioning data more evenly",
            ],
            conditions=[
                "Spill patterns are an indirect indicator of skew",
            ],
            metrics={
                "spilling_task_count": len(spilling_tasks),
                "non_spilling_task_count": len(non_spilling),
                "total_spill_bytes": total_spill,
                "spill_ratio": spill_ratio,
            },
        )
