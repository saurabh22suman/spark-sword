"""Unit tests for skew detector.

These tests validate that the skew detector:
- Correctly identifies task duration imbalance
- Provides quantitative evidence
- Labels confidence appropriately

Reference: test.md Section 8.3 Optimization Detectors
"""

import pytest

from app.analyzers.skew_detector import SkewDetector
from app.models.spark_events import ParsedEventLog, TaskInfo


class TestSkewDetectorDuration:
    """Tests for data skew detection based on task duration."""

    def test_task_duration_imbalance_detected(self) -> None:
        """Significant task duration imbalance indicates skew.
        
        When some tasks take much longer than others in the same stage,
        this indicates data skew on the partition key.
        
        Evidence: max_duration / median_duration > threshold
        """
        parsed_log = ParsedEventLog(
            tasks=[
                TaskInfo(task_id=0, stage_id=0, duration_ms=1000),
                TaskInfo(task_id=1, stage_id=0, duration_ms=1100),
                TaskInfo(task_id=2, stage_id=0, duration_ms=1050),
                TaskInfo(task_id=3, stage_id=0, duration_ms=10000),  # Skewed task
            ]
        )

        detector = SkewDetector()
        insights = detector.detect(parsed_log)

        duration_skew = [i for i in insights if i.insight_type == "duration_skew"]
        assert len(duration_skew) == 1
        assert duration_skew[0].metrics["skew_ratio"] > 5

    def test_balanced_tasks_no_skew(self) -> None:
        """Balanced task durations should not trigger skew detection.
        
        If tasks complete in similar time, data is evenly distributed.
        """
        parsed_log = ParsedEventLog(
            tasks=[
                TaskInfo(task_id=0, stage_id=0, duration_ms=1000),
                TaskInfo(task_id=1, stage_id=0, duration_ms=1100),
                TaskInfo(task_id=2, stage_id=0, duration_ms=1050),
                TaskInfo(task_id=3, stage_id=0, duration_ms=950),
            ]
        )

        detector = SkewDetector()
        insights = detector.detect(parsed_log)

        duration_skew = [i for i in insights if i.insight_type == "duration_skew"]
        assert len(duration_skew) == 0


class TestSkewDetectorShuffle:
    """Tests for skew detection based on shuffle metrics."""

    def test_shuffle_bytes_skew_detected(self) -> None:
        """Imbalanced shuffle read bytes also indicates skew.
        
        When one partition reads much more data than others,
        it indicates key skew in the shuffled data.
        """
        parsed_log = ParsedEventLog(
            tasks=[
                TaskInfo(task_id=0, stage_id=1, shuffle_read_bytes=10 * 1024),
                TaskInfo(task_id=1, stage_id=1, shuffle_read_bytes=12 * 1024),
                TaskInfo(task_id=2, stage_id=1, shuffle_read_bytes=11 * 1024),
                TaskInfo(task_id=3, stage_id=1, shuffle_read_bytes=500 * 1024),  # Skewed
            ]
        )

        detector = SkewDetector()
        insights = detector.detect(parsed_log)

        shuffle_skew = [i for i in insights if i.insight_type == "shuffle_skew"]
        assert len(shuffle_skew) == 1
        assert shuffle_skew[0].confidence.value == "high"


class TestSkewDetectorSpill:
    """Tests for skew detection based on spill patterns."""

    def test_spill_indicates_potential_skew(self) -> None:
        """High spill on specific tasks may indicate skew.
        
        If only some tasks spill to disk, it suggests those partitions
        have more data than others.
        """
        parsed_log = ParsedEventLog(
            tasks=[
                TaskInfo(task_id=0, stage_id=2, duration_ms=1000, spill_bytes=0),
                TaskInfo(task_id=1, stage_id=2, duration_ms=1000, spill_bytes=0),
                TaskInfo(task_id=2, stage_id=2, duration_ms=1000, spill_bytes=0),
                TaskInfo(task_id=3, stage_id=2, duration_ms=1000, spill_bytes=0),
                TaskInfo(task_id=4, stage_id=2, duration_ms=1000, spill_bytes=0),
                TaskInfo(task_id=5, stage_id=2, duration_ms=1000, spill_bytes=0),
                TaskInfo(task_id=6, stage_id=2, duration_ms=1000, spill_bytes=0),
                TaskInfo(task_id=7, stage_id=2, duration_ms=5000, spill_bytes=100 * 1024 * 1024),  # 100MB spill
            ]
        )

        detector = SkewDetector()
        insights = detector.detect(parsed_log)

        spill_skew = [i for i in insights if i.insight_type == "spill_skew"]
        assert len(spill_skew) == 1
        assert spill_skew[0].metrics["spill_ratio"] < 0.25


class TestSkewDetectorConfidence:
    """Tests for confidence level assignment."""

    def test_high_skew_ratio_high_confidence(self) -> None:
        """Very high skew ratio should have high confidence."""
        parsed_log = ParsedEventLog(
            tasks=[
                TaskInfo(task_id=0, stage_id=0, duration_ms=1000),
                TaskInfo(task_id=1, stage_id=0, duration_ms=1000),
                TaskInfo(task_id=2, stage_id=0, duration_ms=1000),
                TaskInfo(task_id=3, stage_id=0, duration_ms=15000),  # 15x skew
            ]
        )

        detector = SkewDetector()
        insights = detector.detect(parsed_log)

        duration_skew = [i for i in insights if i.insight_type == "duration_skew"]
        assert len(duration_skew) == 1
        assert duration_skew[0].confidence.value == "high"

    def test_moderate_skew_ratio_medium_confidence(self) -> None:
        """Moderate skew ratio should have medium confidence."""
        parsed_log = ParsedEventLog(
            tasks=[
                TaskInfo(task_id=0, stage_id=0, duration_ms=1000),
                TaskInfo(task_id=1, stage_id=0, duration_ms=1000),
                TaskInfo(task_id=2, stage_id=0, duration_ms=1000),
                TaskInfo(task_id=3, stage_id=0, duration_ms=6000),  # 6x skew
            ]
        )

        detector = SkewDetector()
        insights = detector.detect(parsed_log)

        duration_skew = [i for i in insights if i.insight_type == "duration_skew"]
        assert len(duration_skew) == 1
        assert duration_skew[0].confidence.value == "medium"

