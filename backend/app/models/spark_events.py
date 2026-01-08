"""Pydantic models for Spark event log structures."""

from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class SparkEventType(str, Enum):
    """Known Spark event types."""

    SPARK_LISTENER_APPLICATION_START = "SparkListenerApplicationStart"
    SPARK_LISTENER_APPLICATION_END = "SparkListenerApplicationEnd"
    SPARK_LISTENER_JOB_START = "SparkListenerJobStart"
    SPARK_LISTENER_JOB_END = "SparkListenerJobEnd"
    SPARK_LISTENER_STAGE_SUBMITTED = "SparkListenerStageSubmitted"
    SPARK_LISTENER_STAGE_COMPLETED = "SparkListenerStageCompleted"
    SPARK_LISTENER_TASK_START = "SparkListenerTaskStart"
    SPARK_LISTENER_TASK_END = "SparkListenerTaskEnd"
    SPARK_LISTENER_EXECUTOR_ADDED = "SparkListenerExecutorAdded"
    SPARK_LISTENER_EXECUTOR_REMOVED = "SparkListenerExecutorRemoved"
    SPARK_LISTENER_BLOCK_MANAGER_ADDED = "SparkListenerBlockManagerAdded"
    SPARK_LISTENER_ENVIRONMENT_UPDATE = "SparkListenerEnvironmentUpdate"
    SPARK_LISTENER_SQL_EXECUTION_START = "SparkListenerSQLExecutionStart"
    SPARK_LISTENER_SQL_EXECUTION_END = "SparkListenerSQLExecutionEnd"


class SparkEvent(BaseModel):
    """Base model for a Spark event."""

    model_config = ConfigDict(populate_by_name=True, extra="allow")

    event: str = Field(..., alias="Event")
    timestamp: int | None = Field(default=None, alias="Timestamp")


class JobInfo(BaseModel):
    """Parsed job information."""

    job_id: int
    submission_time: int | None = None
    completion_time: int | None = None
    stage_ids: list[int] = Field(default_factory=list)
    status: str = "UNKNOWN"
    num_tasks: int = 0


class StageInfo(BaseModel):
    """Parsed stage information."""

    stage_id: int
    attempt_id: int = 0
    name: str = ""
    num_tasks: int = 0
    parent_ids: list[int] = Field(default_factory=list)
    submission_time: int | None = None
    completion_time: int | None = None
    status: str = "UNKNOWN"

    # Metrics
    input_bytes: int = 0
    output_bytes: int = 0
    shuffle_read_bytes: int = 0
    shuffle_write_bytes: int = 0
    spill_bytes: int = 0


class TaskInfo(BaseModel):
    """Parsed task information."""

    task_id: int
    stage_id: int
    attempt: int = 0
    executor_id: str = ""
    host: str = ""
    launch_time: int | None = None
    finish_time: int | None = None
    duration_ms: int | None = None
    status: str = "UNKNOWN"

    # Metrics
    input_bytes: int = 0
    output_bytes: int = 0
    shuffle_read_bytes: int = 0
    shuffle_write_bytes: int = 0
    spill_bytes: int = 0


class ParsedEventLog(BaseModel):
    """Complete parsed event log structure."""

    application_id: str | None = None
    application_name: str | None = None
    spark_version: str | None = None
    start_time: int | None = None
    end_time: int | None = None

    jobs: list[JobInfo] = Field(default_factory=list)
    stages: list[StageInfo] = Field(default_factory=list)
    tasks: list[TaskInfo] = Field(default_factory=list)

    # Raw event count for validation
    total_events: int = 0
    unknown_events: int = 0
