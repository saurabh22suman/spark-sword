"""Join strategy detector for analyzing join operations.

Detects:
- Broadcast join eligibility
- Sort-merge join necessity
- Join strategy recommendations (with conditions, not guarantees)
"""

from app.analyzers.base import BaseDetector, Confidence, Insight
from app.models.spark_events import ParsedEventLog, StageInfo


class JoinStrategyDetector(BaseDetector):
    """Detects join operations and suggests strategies."""

    # Default broadcast threshold (matches Spark default)
    DEFAULT_BROADCAST_THRESHOLD = 10 * 1024 * 1024  # 10 MB

    @property
    def name(self) -> str:
        return "join_strategy_detector"

    def detect(self, parsed_log: ParsedEventLog) -> list[Insight]:
        """Detect join-related insights."""
        insights: list[Insight] = []

        for stage in parsed_log.stages:
            # Detect join operations from stage name
            if not self._is_join_stage(stage):
                continue

            # Analyze join characteristics
            insight = self._analyze_join(stage)
            if insight:
                insights.append(insight)

        return insights

    def _is_join_stage(self, stage: StageInfo) -> bool:
        """Check if stage represents a join operation."""
        name_lower = stage.name.lower()
        join_indicators = [
            "join",
            "broadcasthashjoin",
            "sortmergejoin",
            "shufflehashjoin",
            "broadcastnestedloopjoin",
        ]
        return any(indicator in name_lower for indicator in join_indicators)

    def _analyze_join(self, stage: StageInfo) -> Insight | None:
        """Analyze a join stage and provide insights."""
        name_lower = stage.name.lower()

        # Detect join type from stage name
        if "broadcasthashjoin" in name_lower or "broadcast" in name_lower:
            return self._create_broadcast_join_insight(stage)
        elif "sortmergejoin" in name_lower or "sortmerge" in name_lower:
            return self._create_sort_merge_join_insight(stage)
        elif "shufflehashjoin" in name_lower:
            return self._create_shuffle_hash_join_insight(stage)
        elif "join" in name_lower:
            # Generic join - analyze based on shuffle presence
            if stage.shuffle_read_bytes > 0:
                return self._create_shuffle_join_insight(stage)
            else:
                return self._create_possible_broadcast_insight(stage)

        return None

    def _create_broadcast_join_insight(self, stage: StageInfo) -> Insight:
        """Create insight for detected broadcast join."""
        return Insight(
            insight_type="broadcast_join_used",
            title=f"Broadcast Join in Stage {stage.stage_id}",
            description=(
                f"Stage {stage.stage_id} uses broadcast join, which avoids shuffle "
                "by sending the smaller table to all executors."
            ),
            evidence=[
                f"Stage name indicates broadcast: {stage.name}",
                f"shuffle_read_bytes = {stage.shuffle_read_bytes} (low/zero for broadcast)",
            ],
            confidence=Confidence.HIGH,
            affected_stages=[stage.stage_id],
            suggestions=[
                "Broadcast join is typically efficient for small tables",
                "Monitor driver memory if broadcasting large tables",
            ],
            conditions=[
                "Efficiency depends on the size of the broadcast table",
                "Very large broadcasts can cause driver OOM",
            ],
            metrics={
                "join_type": "broadcast_hash_join",
                "shuffle_read_bytes": stage.shuffle_read_bytes,
            },
        )

    def _create_sort_merge_join_insight(self, stage: StageInfo) -> Insight:
        """Create insight for detected sort-merge join."""
        shuffle_mb = stage.shuffle_read_bytes / (1024 * 1024)
        return Insight(
            insight_type="sort_merge_join_used",
            title=f"Sort-Merge Join in Stage {stage.stage_id}",
            description=(
                f"Stage {stage.stage_id} uses sort-merge join, which shuffles and sorts "
                f"both tables. Shuffle read: {shuffle_mb:.1f} MB."
            ),
            evidence=[
                f"Stage name indicates SMJ: {stage.name}",
                f"shuffle_read_bytes = {stage.shuffle_read_bytes:,}",
            ],
            confidence=Confidence.HIGH,
            affected_stages=[stage.stage_id],
            suggestions=[
                "Sort-merge join is efficient for large-large table joins",
                "Check if either table is small enough for broadcast",
                "Ensure join keys are properly partitioned",
            ],
            conditions=[
                "SMJ is often the best choice for large tables",
                "Performance depends on data distribution",
            ],
            metrics={
                "join_type": "sort_merge_join",
                "shuffle_read_bytes": stage.shuffle_read_bytes,
                "shuffle_read_mb": shuffle_mb,
            },
        )

    def _create_shuffle_hash_join_insight(self, stage: StageInfo) -> Insight:
        """Create insight for detected shuffle hash join."""
        return Insight(
            insight_type="shuffle_hash_join_used",
            title=f"Shuffle Hash Join in Stage {stage.stage_id}",
            description=(
                f"Stage {stage.stage_id} uses shuffle hash join. "
                "This builds a hash table from one side after shuffling."
            ),
            evidence=[
                f"Stage name indicates SHJ: {stage.name}",
            ],
            confidence=Confidence.MEDIUM,
            affected_stages=[stage.stage_id],
            suggestions=[
                "Shuffle hash join works well when one side fits in memory",
                "Consider broadcast if build side is small enough",
            ],
            conditions=[
                "Requires one side to fit in memory per partition",
            ],
            metrics={
                "join_type": "shuffle_hash_join",
            },
        )

    def _create_shuffle_join_insight(self, stage: StageInfo) -> Insight:
        """Create insight for generic shuffle join."""
        shuffle_mb = stage.shuffle_read_bytes / (1024 * 1024)
        return Insight(
            insight_type="shuffle_join_detected",
            title=f"Shuffle Join in Stage {stage.stage_id}",
            description=(
                f"Stage {stage.stage_id} performs a join with shuffle. "
                f"Total shuffle read: {shuffle_mb:.1f} MB."
            ),
            evidence=[
                f"Join operation detected: {stage.name}",
                f"shuffle_read_bytes = {stage.shuffle_read_bytes:,}",
            ],
            confidence=Confidence.MEDIUM,
            affected_stages=[stage.stage_id],
            suggestions=[
                "Check if smaller table can be broadcast (< 10MB default)",
                "Adjust spark.sql.autoBroadcastJoinThreshold if appropriate",
                "Verify join keys have good selectivity",
            ],
            conditions=[
                "Broadcast eligibility depends on table size",
                "Memory constraints may prevent broadcast",
            ],
            metrics={
                "shuffle_read_bytes": stage.shuffle_read_bytes,
                "shuffle_read_mb": shuffle_mb,
            },
        )

    def _create_possible_broadcast_insight(self, stage: StageInfo) -> Insight:
        """Create insight when broadcast might be in use."""
        return Insight(
            insight_type="possible_broadcast_join",
            title=f"Possible Broadcast Join in Stage {stage.stage_id}",
            description=(
                f"Stage {stage.stage_id} performs a join with minimal shuffle, "
                "suggesting broadcast join may be in use."
            ),
            evidence=[
                f"Join detected: {stage.name}",
                f"Low shuffle_read_bytes = {stage.shuffle_read_bytes}",
            ],
            confidence=Confidence.LOW,
            affected_stages=[stage.stage_id],
            suggestions=[
                "Verify broadcast join is being used via Spark UI",
                "This is typically the optimal strategy for small tables",
            ],
            conditions=[
                "Exact join type cannot be determined from available metrics",
            ],
            metrics={
                "shuffle_read_bytes": stage.shuffle_read_bytes,
            },
        )
