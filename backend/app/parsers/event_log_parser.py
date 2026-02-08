"""Spark event log parser.

This module parses Spark event logs (JSON format) into structured data
that can be analyzed and visualized.

The parser is designed to be:
- Forward-compatible: Unknown events are gracefully ignored
- Deterministic: Same input always produces same output
- Evidence-based: All parsed data maps to actual Spark events
"""

import json
from pathlib import Path
from typing import Any

from app.models.spark_events import (
    JobInfo,
    ParsedEventLog,
    SparkEvent,
    SparkEventType,
    StageInfo,
    TaskInfo,
)


class EventLogParser:
    """Parser for Spark event logs in JSON format."""

    def __init__(self) -> None:
        """Initialize the parser."""
        self._jobs: dict[int, JobInfo] = {}
        self._stages: dict[tuple[int, int], StageInfo] = {}  # (stage_id, attempt_id)
        self._tasks: dict[int, TaskInfo] = {}
        self._app_id: str | None = None
        self._app_name: str | None = None
        self._spark_version: str | None = None
        self._start_time: int | None = None
        self._end_time: int | None = None
        self._total_events: int = 0
        self._unknown_events: int = 0

    def parse(self, content: str) -> ParsedEventLog:
        """Parse event log content (newline-delimited JSON).

        Args:
            content: The raw event log content as a string.

        Returns:
            ParsedEventLog with all extracted information.
        """
        self._reset()

        for line in content.strip().split("\n"):
            if not line.strip():
                continue

            try:
                event_data = json.loads(line)
                self._total_events += 1
                self._process_event(event_data)
            except json.JSONDecodeError:
                # Skip malformed lines gracefully
                self._unknown_events += 1
                continue

        return self._build_result()

    def parse_file(self, file_path: Path | str) -> ParsedEventLog:
        """Parse event log from a file.

        Args:
            file_path: Path to the event log file.

        Returns:
            ParsedEventLog with all extracted information.
        """
        path = Path(file_path)
        content = path.read_text(encoding="utf-8")
        return self.parse(content)

    def _reset(self) -> None:
        """Reset parser state for a new parse operation."""
        self._jobs = {}
        self._stages = {}
        self._tasks = {}
        self._app_id = None
        self._app_name = None
        self._spark_version = None
        self._start_time = None
        self._end_time = None
        self._total_events = 0
        self._unknown_events = 0

    def _process_event(self, event_data: dict[str, Any]) -> None:
        """Process a single event based on its type."""
        event_type = event_data.get("Event", "")

        try:
            match event_type:
                case SparkEventType.SPARK_LISTENER_APPLICATION_START:
                    self._handle_app_start(event_data)
                case SparkEventType.SPARK_LISTENER_APPLICATION_END:
                    self._handle_app_end(event_data)
                case SparkEventType.SPARK_LISTENER_JOB_START:
                    self._handle_job_start(event_data)
                case SparkEventType.SPARK_LISTENER_JOB_END:
                    self._handle_job_end(event_data)
                case SparkEventType.SPARK_LISTENER_STAGE_SUBMITTED:
                    self._handle_stage_submitted(event_data)
                case SparkEventType.SPARK_LISTENER_STAGE_COMPLETED:
                    self._handle_stage_completed(event_data)
                case SparkEventType.SPARK_LISTENER_TASK_START:
                    self._handle_task_start(event_data)
                case SparkEventType.SPARK_LISTENER_TASK_END:
                    self._handle_task_end(event_data)
                case _:
                    # Unknown event type - track but don't fail
                    self._unknown_events += 1
        except (KeyError, TypeError, ValueError):
            # Malformed event - track but don't fail
            self._unknown_events += 1

    def _handle_app_start(self, event: dict[str, Any]) -> None:
        """Handle SparkListenerApplicationStart event."""
        self._app_id = event.get("App ID")
        self._app_name = event.get("App Name")
        self._spark_version = event.get("Spark Version")
        self._start_time = event.get("Timestamp")

    def _handle_app_end(self, event: dict[str, Any]) -> None:
        """Handle SparkListenerApplicationEnd event."""
        self._end_time = event.get("Timestamp")

    def _handle_job_start(self, event: dict[str, Any]) -> None:
        """Handle SparkListenerJobStart event."""
        job_id = event.get("Job ID")
        if job_id is None:
            return

        stage_ids = event.get("Stage IDs", [])
        self._jobs[job_id] = JobInfo(
            job_id=job_id,
            submission_time=event.get("Submission Time"),
            stage_ids=stage_ids,
            status="RUNNING",
        )

    def _handle_job_end(self, event: dict[str, Any]) -> None:
        """Handle SparkListenerJobEnd event."""
        job_id = event.get("Job ID")
        if job_id is None or job_id not in self._jobs:
            return

        job = self._jobs[job_id]
        job.completion_time = event.get("Completion Time")
        job_result = event.get("Job Result", {})
        job.status = job_result.get("Result", "UNKNOWN")

    def _handle_stage_submitted(self, event: dict[str, Any]) -> None:
        """Handle SparkListenerStageSubmitted event."""
        stage_info = event.get("Stage Info", {})
        stage_id = stage_info.get("Stage ID")
        attempt_id = stage_info.get("Stage Attempt ID", 0)

        if stage_id is None:
            return

        self._stages[(stage_id, attempt_id)] = StageInfo(
            stage_id=stage_id,
            attempt_id=attempt_id,
            name=stage_info.get("Stage Name", ""),
            num_tasks=stage_info.get("Number of Tasks", 0),
            parent_ids=stage_info.get("Parent IDs", []),
            submission_time=stage_info.get("Submission Time"),
            status="RUNNING",
        )

    def _handle_stage_completed(self, event: dict[str, Any]) -> None:
        """Handle SparkListenerStageCompleted event."""
        stage_info = event.get("Stage Info", {})
        stage_id = stage_info.get("Stage ID")
        attempt_id = stage_info.get("Stage Attempt ID", 0)

        if stage_id is None:
            return

        key = (stage_id, attempt_id)
        if key not in self._stages:
            # Stage completed without submission - create entry
            self._stages[key] = StageInfo(
                stage_id=stage_id,
                attempt_id=attempt_id,
            )

        stage = self._stages[key]
        stage.completion_time = stage_info.get("Completion Time")
        stage.status = stage_info.get("Stage Status", "UNKNOWN")

        # Extract stage metrics if available
        accumulables = stage_info.get("Accumulables", [])
        for acc in accumulables:
            name = acc.get("Name", "")
            value = acc.get("Value", 0)
            if isinstance(value, (int, float)):
                if "input" in name.lower() and "bytes" in name.lower():
                    stage.input_bytes = int(value)
                elif "output" in name.lower() and "bytes" in name.lower():
                    stage.output_bytes = int(value)
                elif "shuffle read" in name.lower() and "bytes" in name.lower():
                    stage.shuffle_read_bytes = int(value)
                elif "shuffle write" in name.lower() and "bytes" in name.lower():
                    stage.shuffle_write_bytes = int(value)

    def _handle_task_start(self, event: dict[str, Any]) -> None:
        """Handle SparkListenerTaskStart event."""
        stage_id = event.get("Stage ID")
        task_info = event.get("Task Info", {})
        task_id = task_info.get("Task ID")

        if task_id is None or stage_id is None:
            return

        self._tasks[task_id] = TaskInfo(
            task_id=task_id,
            stage_id=stage_id,
            attempt=task_info.get("Attempt", 0),
            executor_id=str(task_info.get("Executor ID", "")),
            host=task_info.get("Host", ""),
            launch_time=task_info.get("Launch Time"),
            status="RUNNING",
        )

    def _handle_task_end(self, event: dict[str, Any]) -> None:
        """Handle SparkListenerTaskEnd event."""
        task_info = event.get("Task Info", {})
        task_id = task_info.get("Task ID")

        if task_id is None:
            return

        if task_id not in self._tasks:
            # Task ended without start - create entry
            self._tasks[task_id] = TaskInfo(
                task_id=task_id,
                stage_id=event.get("Stage ID", -1),
            )

        task = self._tasks[task_id]
        task.finish_time = task_info.get("Finish Time")
        task.status = event.get("Task End Reason", {}).get("Reason", "UNKNOWN")

        # Calculate duration if we have both times
        if task.launch_time and task.finish_time:
            task.duration_ms = task.finish_time - task.launch_time

        # Extract task metrics
        metrics = event.get("Task Metrics", {})
        if metrics:
            task.input_bytes = metrics.get("Input Metrics", {}).get("Bytes Read", 0)
            task.output_bytes = metrics.get("Output Metrics", {}).get("Bytes Written", 0)

            shuffle_read = metrics.get("Shuffle Read Metrics", {})
            task.shuffle_read_bytes = shuffle_read.get("Remote Bytes Read", 0) + shuffle_read.get("Local Bytes Read", 0)

            shuffle_write = metrics.get("Shuffle Write Metrics", {})
            task.shuffle_write_bytes = shuffle_write.get("Shuffle Bytes Written", 0)

            task.spill_bytes = metrics.get("Disk Bytes Spilled", 0)

    def _build_result(self) -> ParsedEventLog:
        """Build the final ParsedEventLog from collected data.
        
        Also aggregates task-level metrics to stage level when stage metrics
        are missing (Accumulables are often empty in event logs).
        """
        stages = list(self._stages.values())
        tasks = list(self._tasks.values())

        # Aggregate task metrics to stage level for stages with zero shuffle bytes
        stage_task_metrics: dict[int, dict[str, int]] = {}
        for task in tasks:
            sid = task.stage_id
            if sid not in stage_task_metrics:
                stage_task_metrics[sid] = {
                    "shuffle_read_bytes": 0,
                    "shuffle_write_bytes": 0,
                    "input_bytes": 0,
                    "output_bytes": 0,
                    "spill_bytes": 0,
                }
            m = stage_task_metrics[sid]
            m["shuffle_read_bytes"] += task.shuffle_read_bytes or 0
            m["shuffle_write_bytes"] += task.shuffle_write_bytes or 0
            m["input_bytes"] += task.input_bytes or 0
            m["output_bytes"] += task.output_bytes or 0
            m["spill_bytes"] += task.spill_bytes or 0

        for stage in stages:
            agg = stage_task_metrics.get(stage.stage_id)
            if not agg:
                continue
            # Fill in stage-level metrics from task aggregation when missing
            if not stage.shuffle_read_bytes:
                stage.shuffle_read_bytes = agg["shuffle_read_bytes"]
            if not stage.shuffle_write_bytes:
                stage.shuffle_write_bytes = agg["shuffle_write_bytes"]
            if not stage.input_bytes:
                stage.input_bytes = agg["input_bytes"]
            if not stage.output_bytes:
                stage.output_bytes = agg["output_bytes"]

        return ParsedEventLog(
            application_id=self._app_id,
            application_name=self._app_name,
            spark_version=self._spark_version,
            start_time=self._start_time,
            end_time=self._end_time,
            jobs=list(self._jobs.values()),
            stages=stages,
            tasks=tasks,
            total_events=self._total_events,
            unknown_events=self._unknown_events,
        )
