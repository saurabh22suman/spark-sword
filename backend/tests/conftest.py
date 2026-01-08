"""Pytest configuration and shared fixtures."""

import json
from pathlib import Path

import pytest


@pytest.fixture
def fixtures_path() -> Path:
    """Return the path to test fixtures directory."""
    return Path(__file__).parent / "fixtures"


@pytest.fixture
def sample_event_log() -> str:
    """Return a minimal valid Spark event log."""
    events = [
        {
            "Event": "SparkListenerApplicationStart",
            "App ID": "app-20240101120000-0001",
            "App Name": "TestApp",
            "Spark Version": "3.5.0",
            "Timestamp": 1704110400000,
        },
        {
            "Event": "SparkListenerJobStart",
            "Job ID": 0,
            "Submission Time": 1704110401000,
            "Stage IDs": [0, 1],
        },
        {
            "Event": "SparkListenerStageSubmitted",
            "Stage Info": {
                "Stage ID": 0,
                "Stage Attempt ID": 0,
                "Stage Name": "count at NativeMethodAccessorImpl.java:0",
                "Number of Tasks": 4,
                "Parent IDs": [],
                "Submission Time": 1704110401100,
            },
        },
        {
            "Event": "SparkListenerTaskStart",
            "Stage ID": 0,
            "Task Info": {
                "Task ID": 0,
                "Attempt": 0,
                "Executor ID": "1",
                "Host": "worker-1",
                "Launch Time": 1704110401200,
            },
        },
        {
            "Event": "SparkListenerTaskEnd",
            "Stage ID": 0,
            "Task Info": {
                "Task ID": 0,
                "Attempt": 0,
                "Executor ID": "1",
                "Host": "worker-1",
                "Launch Time": 1704110401200,
                "Finish Time": 1704110402200,
            },
            "Task End Reason": {"Reason": "Success"},
            "Task Metrics": {
                "Input Metrics": {"Bytes Read": 1024},
                "Output Metrics": {"Bytes Written": 512},
                "Shuffle Read Metrics": {"Remote Bytes Read": 0, "Local Bytes Read": 0},
                "Shuffle Write Metrics": {"Shuffle Bytes Written": 256},
                "Disk Bytes Spilled": 0,
            },
        },
        {
            "Event": "SparkListenerStageCompleted",
            "Stage Info": {
                "Stage ID": 0,
                "Stage Attempt ID": 0,
                "Completion Time": 1704110403000,
                "Stage Status": "SUCCEEDED",
            },
        },
        {
            "Event": "SparkListenerJobEnd",
            "Job ID": 0,
            "Completion Time": 1704110405000,
            "Job Result": {"Result": "JobSucceeded"},
        },
        {
            "Event": "SparkListenerApplicationEnd",
            "Timestamp": 1704110410000,
        },
    ]
    return "\n".join(json.dumps(e) for e in events)


@pytest.fixture
def partial_event_log() -> str:
    """Return an event log with missing events (e.g., no app end)."""
    events = [
        {
            "Event": "SparkListenerApplicationStart",
            "App ID": "app-partial",
            "App Name": "PartialApp",
            "Timestamp": 1704110400000,
        },
        {
            "Event": "SparkListenerJobStart",
            "Job ID": 0,
            "Submission Time": 1704110401000,
            "Stage IDs": [0],
        },
        # Missing job end, stage events, app end
    ]
    return "\n".join(json.dumps(e) for e in events)


@pytest.fixture
def event_log_with_unknown_events() -> str:
    """Return an event log with unknown/custom events."""
    events = [
        {
            "Event": "SparkListenerApplicationStart",
            "App ID": "app-custom",
            "App Name": "CustomApp",
            "Timestamp": 1704110400000,
        },
        {
            "Event": "CustomEventType",
            "CustomData": {"key": "value"},
        },
        {
            "Event": "SparkListenerFutureEvent",
            "NewField": 12345,
        },
        {
            "Event": "SparkListenerApplicationEnd",
            "Timestamp": 1704110410000,
        },
    ]
    return "\n".join(json.dumps(e) for e in events)


@pytest.fixture
def malformed_event_log() -> str:
    """Return an event log with some malformed JSON lines."""
    valid_event = json.dumps({
        "Event": "SparkListenerApplicationStart",
        "App ID": "app-malformed",
        "App Name": "MalformedApp",
        "Timestamp": 1704110400000,
    })
    return f"{valid_event}\n{{not valid json\n{valid_event}"
