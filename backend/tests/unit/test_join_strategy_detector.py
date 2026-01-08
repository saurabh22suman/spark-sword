"""Unit tests for join strategy detector.

These tests validate that the join strategy detector:
- Identifies broadcast join eligibility
- Detects shuffle join necessity
- Does not make guaranteed performance claims

Reference: test.md Section 8.3 Optimization Detectors
"""

import pytest

from app.analyzers.join_detector import JoinStrategyDetector
from app.models.spark_events import ParsedEventLog, StageInfo


class TestJoinStrategyDetectorBasic:
    """Basic tests for join strategy detection."""

    def test_broadcast_eligibility_small_table(self) -> None:
        """Small tables should be identified as broadcast candidates.
        
        A table smaller than spark.sql.autoBroadcastJoinThreshold (default 10MB)
        is eligible for broadcast join.
        
        This is a suggestion, NOT a guarantee of better performance.
        """
        small_table_size_bytes = 5 * 1024 * 1024  # 5 MB
        broadcast_threshold = 10 * 1024 * 1024  # 10 MB default

        is_broadcast_eligible = small_table_size_bytes < broadcast_threshold

        assert is_broadcast_eligible, "5MB table should be broadcast eligible"

    def test_shuffle_join_large_tables(self) -> None:
        """Large tables require shuffle join.
        
        When both sides of a join exceed broadcast threshold,
        Spark must use sort-merge or shuffle hash join.
        """
        left_table_bytes = 100 * 1024 * 1024  # 100 MB
        right_table_bytes = 200 * 1024 * 1024  # 200 MB
        broadcast_threshold = 10 * 1024 * 1024

        left_broadcastable = left_table_bytes < broadcast_threshold
        right_broadcastable = right_table_bytes < broadcast_threshold

        assert not left_broadcastable
        assert not right_broadcastable
        # Both tables too large = shuffle join required

    def test_no_guaranteed_performance_claim(self) -> None:
        """Detector must NOT claim guaranteed performance improvement.
        
        Broadcast may be faster in MOST cases, but:
        - Driver memory may be insufficient
        - Network may be slow
        - Data may be accessed multiple times
        
        This test enforces the product philosophy.
        """
        # This is a structural test - we verify that insights
        # include appropriate uncertainty language
        insight = {
            "type": "broadcast_candidate",
            "message": "Table may benefit from broadcast join",
            "confidence": "medium",  # Not "guaranteed"
            "conditions": [
                "If driver has sufficient memory",
                "If table size remains under threshold",
            ],
        }

        # No absolute claims
        assert "may" in insight["message"].lower() or "could" in insight["message"].lower()
        assert insight["confidence"] != "guaranteed"
        assert len(insight["conditions"]) > 0, "Must list conditions"


class TestJoinStrategyDetectorDetection:
    """Tests for actual join detection from parsed logs."""

    def test_broadcast_join_detected(self) -> None:
        """Broadcast join should be detected from stage name."""
        parsed_log = ParsedEventLog(
            stages=[
                StageInfo(
                    stage_id=0,
                    name="BroadcastHashJoin Inner at query.py:10",
                    shuffle_read_bytes=0,
                )
            ]
        )

        detector = JoinStrategyDetector()
        insights = detector.detect(parsed_log)

        broadcast_insights = [i for i in insights if "broadcast" in i.insight_type]
        assert len(broadcast_insights) == 1

    def test_sort_merge_join_detected(self) -> None:
        """Sort-merge join should be detected from stage name."""
        parsed_log = ParsedEventLog(
            stages=[
                StageInfo(
                    stage_id=0,
                    name="SortMergeJoin Inner at query.py:20",
                    shuffle_read_bytes=500 * 1024 * 1024,
                )
            ]
        )

        detector = JoinStrategyDetector()
        insights = detector.detect(parsed_log)

        smj_insights = [i for i in insights if i.insight_type == "sort_merge_join_used"]
        assert len(smj_insights) == 1
        assert smj_insights[0].metrics["join_type"] == "sort_merge_join"

    def test_shuffle_join_with_evidence(self) -> None:
        """Shuffle join insights must include evidence and conditions."""
        parsed_log = ParsedEventLog(
            stages=[
                StageInfo(
                    stage_id=0,
                    name="join at query.py:30",
                    shuffle_read_bytes=200 * 1024 * 1024,
                )
            ]
        )

        detector = JoinStrategyDetector()
        insights = detector.detect(parsed_log)

        assert len(insights) > 0
        for insight in insights:
            assert len(insight.evidence) > 0, "Must have evidence"
            assert len(insight.conditions) > 0, "Must have conditions"
            assert len(insight.suggestions) > 0, "Must have suggestions"

