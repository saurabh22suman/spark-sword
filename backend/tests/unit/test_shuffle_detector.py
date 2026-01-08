"""Unit tests for shuffle detector.

These tests validate that the shuffle detector:
- Correctly identifies shuffle-inducing operations
- Provides evidence-based detection
- Includes confidence levels

Reference: test.md Section 8.3 Optimization Detectors
"""

import pytest

from app.analyzers.shuffle_detector import ShuffleDetector
from app.models.spark_events import ParsedEventLog, StageInfo, TaskInfo


class TestShuffleDetectorOperations:
    """Tests for shuffle detection based on stage metrics."""

    def test_groupby_triggers_shuffle(self) -> None:
        """groupBy operation should trigger shuffle detection.
        
        groupBy is a wide transformation that requires data redistribution.
        Evidence: shuffle write bytes > 0 in preceding stage
        """
        parsed_log = ParsedEventLog(
            stages=[
                StageInfo(
                    stage_id=0,
                    name="groupBy at DataFrame.scala:123",
                    shuffle_write_bytes=10 * 1024 * 1024,  # 10 MB
                )
            ]
        )

        detector = ShuffleDetector()
        insights = detector.detect(parsed_log)

        # Should detect the groupBy operation
        operation_insights = [i for i in insights if i.insight_type == "shuffle_operation"]
        assert len(operation_insights) == 1
        assert "groupBy" in operation_insights[0].title

    def test_distinct_triggers_shuffle(self) -> None:
        """distinct operation should trigger shuffle detection.
        
        distinct requires global deduplication = shuffle
        """
        parsed_log = ParsedEventLog(
            stages=[
                StageInfo(
                    stage_id=1,
                    name="distinct at NativeMethodAccessorImpl.java:0",
                    shuffle_write_bytes=5 * 1024 * 1024,
                )
            ]
        )

        detector = ShuffleDetector()
        insights = detector.detect(parsed_log)

        operation_insights = [i for i in insights if i.insight_type == "shuffle_operation"]
        assert len(operation_insights) == 1
        assert "distinct" in operation_insights[0].title

    def test_orderby_triggers_shuffle(self) -> None:
        """orderBy/sort operation should trigger shuffle detection.
        
        Global ordering requires range partitioning = shuffle
        """
        parsed_log = ParsedEventLog(
            stages=[
                StageInfo(
                    stage_id=2,
                    name="sort at DataFrame.scala:456",
                    shuffle_write_bytes=8 * 1024 * 1024,
                )
            ]
        )

        detector = ShuffleDetector()
        insights = detector.detect(parsed_log)

        operation_insights = [i for i in insights if i.insight_type == "shuffle_operation"]
        assert len(operation_insights) == 1
        assert "sort" in operation_insights[0].title.lower()

    def test_narrow_transformation_no_shuffle(self) -> None:
        """map/filter operations should NOT trigger shuffle.
        
        Narrow transformations process data partition-locally.
        """
        parsed_log = ParsedEventLog(
            stages=[
                StageInfo(
                    stage_id=3,
                    name="map at DataFrame.scala:789",
                    shuffle_write_bytes=0,
                    shuffle_read_bytes=0,
                )
            ]
        )

        detector = ShuffleDetector()
        insights = detector.detect(parsed_log)

        # No shuffle-related insights for narrow transformations
        assert len(insights) == 0


class TestShuffleDetectorSize:
    """Tests for shuffle size detection."""

    def test_large_shuffle_detected(self) -> None:
        """Large shuffle (>100MB) should be flagged."""
        parsed_log = ParsedEventLog(
            stages=[
                StageInfo(
                    stage_id=0,
                    name="aggregate",
                    shuffle_write_bytes=500 * 1024 * 1024,  # 500 MB
                )
            ]
        )

        detector = ShuffleDetector()
        insights = detector.detect(parsed_log)

        large_shuffle = [i for i in insights if i.insight_type == "large_shuffle"]
        assert len(large_shuffle) == 1
        assert large_shuffle[0].confidence.value == "high"

    def test_very_large_shuffle_detected(self) -> None:
        """Very large shuffle (>1GB) should be flagged with higher severity."""
        parsed_log = ParsedEventLog(
            stages=[
                StageInfo(
                    stage_id=0,
                    name="aggregate",
                    shuffle_write_bytes=2 * 1024 * 1024 * 1024,  # 2 GB
                )
            ]
        )

        detector = ShuffleDetector()
        insights = detector.detect(parsed_log)

        very_large = [i for i in insights if i.insight_type == "very_large_shuffle"]
        assert len(very_large) == 1

    def test_small_shuffle_not_flagged(self) -> None:
        """Small shuffle (<100MB) should not trigger large shuffle insight."""
        parsed_log = ParsedEventLog(
            stages=[
                StageInfo(
                    stage_id=0,
                    name="aggregate",
                    shuffle_write_bytes=50 * 1024 * 1024,  # 50 MB
                )
            ]
        )

        detector = ShuffleDetector()
        insights = detector.detect(parsed_log)

        large_shuffle = [i for i in insights if "large_shuffle" in i.insight_type]
        assert len(large_shuffle) == 0


class TestShuffleDetectorEvidence:
    """Tests for evidence-based detection."""

    def test_insights_include_evidence(self) -> None:
        """All shuffle insights must include evidence."""
        parsed_log = ParsedEventLog(
            stages=[
                StageInfo(
                    stage_id=0,
                    name="groupBy at test.py:10",
                    shuffle_write_bytes=200 * 1024 * 1024,
                )
            ]
        )

        detector = ShuffleDetector()
        insights = detector.detect(parsed_log)

        for insight in insights:
            assert len(insight.evidence) > 0, f"Insight {insight.insight_type} missing evidence"
            assert len(insight.suggestions) > 0, f"Insight {insight.insight_type} missing suggestions"
            assert len(insight.conditions) > 0, f"Insight {insight.insight_type} missing conditions"

