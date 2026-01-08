"""Shuffle detector for identifying shuffle-heavy operations.

Detects:
- Wide transformations causing shuffles
- Large shuffle sizes
- Potential shuffle reduction opportunities
"""

from app.analyzers.base import BaseDetector, Confidence, Insight
from app.models.spark_events import ParsedEventLog, StageInfo


class ShuffleDetector(BaseDetector):
    """Detects shuffle operations and their impact."""

    # Thresholds (configurable)
    LARGE_SHUFFLE_THRESHOLD = 100 * 1024 * 1024  # 100 MB
    VERY_LARGE_SHUFFLE_THRESHOLD = 1024 * 1024 * 1024  # 1 GB

    @property
    def name(self) -> str:
        return "shuffle_detector"

    def detect(self, parsed_log: ParsedEventLog) -> list[Insight]:
        """Detect shuffle-related insights."""
        insights: list[Insight] = []

        for stage in parsed_log.stages:
            # Detect large shuffle writes
            if stage.shuffle_write_bytes >= self.VERY_LARGE_SHUFFLE_THRESHOLD:
                insights.append(self._create_very_large_shuffle_insight(stage))
            elif stage.shuffle_write_bytes >= self.LARGE_SHUFFLE_THRESHOLD:
                insights.append(self._create_large_shuffle_insight(stage))

            # Detect shuffle-inducing operations from stage name
            operation = self._detect_shuffle_operation(stage)
            if operation:
                insights.append(
                    self._create_shuffle_operation_insight(stage, operation)
                )

        return insights

    def _detect_shuffle_operation(self, stage: StageInfo) -> str | None:
        """Detect the type of shuffle-inducing operation from stage name."""
        name_lower = stage.name.lower()

        if stage.shuffle_write_bytes == 0:
            return None

        operations = [
            ("groupby", "groupBy"),
            ("reducebykey", "reduceByKey"),
            ("aggregatebykey", "aggregateByKey"),
            ("distinct", "distinct"),
            ("sort", "sort/orderBy"),
            ("order", "sort/orderBy"),
            ("repartition", "repartition"),
            ("coalesce", "coalesce"),
            ("join", "join"),
        ]

        for keyword, operation in operations:
            if keyword in name_lower:
                return operation

        return None

    def _create_large_shuffle_insight(self, stage: StageInfo) -> Insight:
        """Create insight for large shuffle."""
        shuffle_mb = stage.shuffle_write_bytes / (1024 * 1024)
        return Insight(
            insight_type="large_shuffle",
            title=f"Large Shuffle in Stage {stage.stage_id}",
            description=f"Stage {stage.stage_id} writes {shuffle_mb:.1f} MB of shuffle data.",
            evidence=[
                f"shuffle_write_bytes = {stage.shuffle_write_bytes:,}",
                f"Stage name: {stage.name}",
            ],
            confidence=Confidence.HIGH,
            affected_stages=[stage.stage_id],
            suggestions=[
                "Consider if the shuffle can be avoided by restructuring the query",
                "Check if broadcast join could replace shuffle join for small tables",
                "Verify spark.sql.shuffle.partitions is appropriately sized",
            ],
            conditions=[
                "Actual impact depends on cluster resources and data distribution",
            ],
            metrics={
                "shuffle_write_bytes": stage.shuffle_write_bytes,
                "shuffle_write_mb": shuffle_mb,
            },
        )

    def _create_very_large_shuffle_insight(self, stage: StageInfo) -> Insight:
        """Create insight for very large shuffle (>1GB)."""
        shuffle_gb = stage.shuffle_write_bytes / (1024 * 1024 * 1024)
        return Insight(
            insight_type="very_large_shuffle",
            title=f"Very Large Shuffle in Stage {stage.stage_id}",
            description=(
                f"Stage {stage.stage_id} writes {shuffle_gb:.2f} GB of shuffle data. "
                "This may cause significant network I/O and potential disk spill."
            ),
            evidence=[
                f"shuffle_write_bytes = {stage.shuffle_write_bytes:,}",
                f"Stage name: {stage.name}",
            ],
            confidence=Confidence.HIGH,
            affected_stages=[stage.stage_id],
            suggestions=[
                "Investigate if a broadcast join can eliminate the shuffle",
                "Consider pre-aggregating data before the shuffle",
                "Check for data skew that might be inflating shuffle size",
                "Ensure adequate shuffle partitions (spark.sql.shuffle.partitions)",
            ],
            conditions=[
                "Network bandwidth and disk I/O capacity affect actual impact",
            ],
            metrics={
                "shuffle_write_bytes": stage.shuffle_write_bytes,
                "shuffle_write_gb": shuffle_gb,
            },
        )

    def _create_shuffle_operation_insight(
        self, stage: StageInfo, operation: str
    ) -> Insight:
        """Create insight for detected shuffle operation."""
        shuffle_mb = stage.shuffle_write_bytes / (1024 * 1024)
        return Insight(
            insight_type="shuffle_operation",
            title=f"{operation} Operation Detected",
            description=(
                f"Stage {stage.stage_id} performs a {operation} operation, "
                f"producing {shuffle_mb:.1f} MB of shuffle data."
            ),
            evidence=[
                f"Stage name contains '{operation}'",
                f"shuffle_write_bytes = {stage.shuffle_write_bytes:,}",
            ],
            confidence=Confidence.MEDIUM,
            affected_stages=[stage.stage_id],
            suggestions=self._get_operation_suggestions(operation),
            conditions=[
                "Optimization depends on data characteristics and query structure",
            ],
            metrics={
                "operation": operation,
                "shuffle_write_bytes": stage.shuffle_write_bytes,
            },
        )

    def _get_operation_suggestions(self, operation: str) -> list[str]:
        """Get operation-specific suggestions."""
        suggestions_map = {
            "groupBy": [
                "Consider using reduceByKey instead of groupByKey for aggregations",
                "Pre-filter data before grouping to reduce shuffle size",
            ],
            "reduceByKey": [
                "This is already an optimized aggregation pattern",
            ],
            "distinct": [
                "Consider if approximate distinct (approx_count_distinct) is acceptable",
                "Filter data before applying distinct",
            ],
            "sort/orderBy": [
                "Global ordering requires full shuffle - consider if partial ordering suffices",
                "Use sortWithinPartitions if global order isn't required",
            ],
            "repartition": [
                "Verify the target partition count is appropriate",
                "Consider coalesce if reducing partitions (avoids full shuffle)",
            ],
            "join": [
                "Check if smaller table can be broadcast",
                "Verify join keys have good selectivity",
                "Consider salting for skewed keys",
            ],
        }
        return suggestions_map.get(
            operation, ["Review if this operation is necessary for the use case"]
        )
