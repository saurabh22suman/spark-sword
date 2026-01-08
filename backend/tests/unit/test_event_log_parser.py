"""Unit tests for Spark event log parser.

These tests validate that the event log parser:
- Correctly parses standard Spark JSON event logs
- Handles missing/partial events gracefully
- Ignores unknown events for forward compatibility
- Produces deterministic output for the same input

Reference: test.md Section 8.1 Event Log Parsing
"""

import json

import pytest

from app.parsers.event_log_parser import EventLogParser
from app.models.spark_events import ParsedEventLog


class TestEventLogParserValidLogs:
    """Tests for parsing valid Spark event logs."""

    def test_valid_event_log_parses(self, sample_event_log: str) -> None:
        """Standard Spark JSON event log should parse successfully.
        
        This test proves that the parser can correctly extract:
        - Application metadata (ID, name, version)
        - Job information with stage IDs
        - Stage details with task counts
        - Task execution data with metrics
        """
        parser = EventLogParser()
        result = parser.parse(sample_event_log)

        # Application metadata extracted
        assert result.application_id == "app-20240101120000-0001"
        assert result.application_name == "TestApp"
        assert result.spark_version == "3.5.0"
        assert result.start_time == 1704110400000
        assert result.end_time == 1704110410000

        # Jobs parsed
        assert len(result.jobs) == 1
        job = result.jobs[0]
        assert job.job_id == 0
        assert job.stage_ids == [0, 1]
        assert job.status == "JobSucceeded"

        # Stages parsed
        assert len(result.stages) == 1
        stage = result.stages[0]
        assert stage.stage_id == 0
        assert stage.num_tasks == 4
        assert stage.status == "SUCCEEDED"

        # Tasks parsed with metrics
        assert len(result.tasks) == 1
        task = result.tasks[0]
        assert task.task_id == 0
        assert task.stage_id == 0
        assert task.input_bytes == 1024
        assert task.shuffle_write_bytes == 256
        assert task.duration_ms == 1000  # 1704110402200 - 1704110401200

    def test_deterministic_parse_output(self, sample_event_log: str) -> None:
        """Same event log should always produce the same parsed output.
        
        This is critical for reproducibility - users must be able to trust
        that the same Spark artifacts produce identical analysis results.
        """
        parser1 = EventLogParser()
        parser2 = EventLogParser()

        result1 = parser1.parse(sample_event_log)
        result2 = parser2.parse(sample_event_log)

        # Compare all key fields
        assert result1.application_id == result2.application_id
        assert result1.application_name == result2.application_name
        assert result1.total_events == result2.total_events
        assert len(result1.jobs) == len(result2.jobs)
        assert len(result1.stages) == len(result2.stages)
        assert len(result1.tasks) == len(result2.tasks)

        # Deep comparison of jobs
        for j1, j2 in zip(result1.jobs, result2.jobs):
            assert j1.job_id == j2.job_id
            assert j1.stage_ids == j2.stage_ids
            assert j1.status == j2.status


class TestEventLogParserPartialLogs:
    """Tests for handling incomplete/partial event logs."""

    def test_partial_log_graceful(self, partial_event_log: str) -> None:
        """Missing events should be handled safely without errors.
        
        Real-world Spark logs may be incomplete due to:
        - Application crashes
        - Log truncation
        - Network issues during logging
        
        The parser must still extract whatever data is available.
        """
        parser = EventLogParser()
        result = parser.parse(partial_event_log)

        # Should still parse what's available
        assert result.application_id == "app-partial"
        assert result.application_name == "PartialApp"

        # Job was started but never ended
        assert len(result.jobs) == 1
        assert result.jobs[0].status == "RUNNING"
        assert result.jobs[0].completion_time is None

        # No app end event
        assert result.end_time is None


class TestEventLogParserUnknownEvents:
    """Tests for forward compatibility with unknown events."""

    def test_unknown_event_ignored(self, event_log_with_unknown_events: str) -> None:
        """Unknown event types should be ignored, not cause failures.
        
        Spark versions may add new event types. The parser must:
        1. Continue processing without crashing
        2. Track unknown events for transparency
        3. Still extract known event data correctly
        """
        parser = EventLogParser()
        result = parser.parse(event_log_with_unknown_events)

        # Known events still parsed
        assert result.application_id == "app-custom"
        assert result.application_name == "CustomApp"
        assert result.end_time == 1704110410000

        # Unknown events tracked (CustomEventType + SparkListenerFutureEvent)
        assert result.unknown_events == 2
        assert result.total_events == 4


class TestEventLogParserMalformedInput:
    """Tests for handling malformed input."""

    def test_malformed_json_lines_skipped(self, malformed_event_log: str) -> None:
        """Malformed JSON lines should be skipped gracefully.
        
        Log files may contain corruption or non-JSON debug output.
        The parser should skip bad lines and continue processing.
        """
        parser = EventLogParser()
        result = parser.parse(malformed_event_log)

        # Valid events still parsed
        assert result.application_id == "app-malformed"
        
        # Malformed line counted as unknown
        assert result.unknown_events >= 1
        
        # Total events only counts valid JSON events (not malformed lines)
        assert result.total_events == 2

    def test_empty_input_returns_empty_result(self) -> None:
        """Empty input should return an empty but valid result."""
        parser = EventLogParser()
        result = parser.parse("")

        assert result.application_id is None
        assert result.total_events == 0
        assert len(result.jobs) == 0
        assert len(result.stages) == 0
        assert len(result.tasks) == 0


class TestEventLogParserMetrics:
    """Tests for correct extraction of Spark metrics."""

    def test_task_metrics_extracted(self, sample_event_log: str) -> None:
        """Task metrics must be extracted for performance analysis.
        
        These metrics are the foundation for optimization insights.
        """
        parser = EventLogParser()
        result = parser.parse(sample_event_log)

        task = result.tasks[0]
        assert task.input_bytes == 1024
        assert task.output_bytes == 512
        assert task.shuffle_write_bytes == 256
        assert task.spill_bytes == 0

    def test_task_duration_calculated(self, sample_event_log: str) -> None:
        """Task duration should be calculated from start/end times.
        
        Duration is critical for identifying slow tasks and skew.
        """
        parser = EventLogParser()
        result = parser.parse(sample_event_log)

        task = result.tasks[0]
        # Launch: 1704110401200, Finish: 1704110402200
        assert task.duration_ms == 1000
