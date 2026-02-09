"""
Tests for failure pattern detection in Spark event logs.

These tests validate that we can detect common failure patterns:
- Stuck tasks indicating data skew
- High GC pressure indicating memory issues
- Excessive spill indicating partition explosion
- Executor lost indicating cluster instability
"""
import pytest
from app.analyzers.failure_detector import FailureDetector, FailurePattern, FailureSeverity


class TestStuckTaskDetection:
    """Test detection of stuck/straggler tasks indicating skew."""
    
    def test_detects_single_slow_task_in_stage(self):
        """Should detect when one task takes much longer than others."""
        stage_metrics = {
            "stage_id": 5,
            "num_tasks": 200,
            "task_durations": [100] * 199 + [45000],  # 199 tasks @ 100ms, 1 @ 45s
        }
        
        detector = FailureDetector()
        patterns = detector.detect_stuck_tasks(stage_metrics)
        
        assert len(patterns) == 1
        pattern = patterns[0]
        assert pattern.type == "STUCK_TASK"
        assert pattern.severity == FailureSeverity.HIGH
        assert "1 task taking 450x longer" in pattern.description
        assert "data skew" in pattern.explanation.lower()
        assert "repartition" in pattern.suggested_fix.lower()
    
    def test_no_detection_when_tasks_uniform(self):
        """Should not detect stuck tasks when all tasks take similar time."""
        stage_metrics = {
            "stage_id": 3,
            "num_tasks": 100,
            "task_durations": [1000] * 95 + [1100] * 5,  # Within 10% variance
        }
        
        detector = FailureDetector()
        patterns = detector.detect_stuck_tasks(stage_metrics)
        
        assert len(patterns) == 0
    
    def test_detects_multiple_slow_tasks(self):
        """Should detect when multiple tasks are slow (severe skew)."""
        stage_metrics = {
            "stage_id": 8,
            "num_tasks": 200,
            "task_durations": [500] * 180 + [30000] * 20,  # 20 slow tasks
        }
        
        detector = FailureDetector()
        patterns = detector.detect_stuck_tasks(stage_metrics)
        
        assert len(patterns) == 1
        pattern = patterns[0]
        assert pattern.severity == FailureSeverity.CRITICAL
        assert "20 tasks" in pattern.description


class TestGCPressureDetection:
    """Test detection of high GC time indicating memory pressure."""
    
    def test_detects_high_gc_time_percentage(self):
        """Should detect when GC time exceeds threshold (>30%)."""
        executor_metrics = {
            "executor_id": "1",
            "total_task_time": 100000,  # 100s
            "gc_time": 35000,  # 35s = 35%
        }
        
        detector = FailureDetector()
        patterns = detector.detect_gc_pressure(executor_metrics)
        
        assert len(patterns) == 1
        pattern = patterns[0]
        assert pattern.type == "HIGH_GC_PRESSURE"
        assert pattern.severity == FailureSeverity.HIGH
        assert "35%" in pattern.description
        assert "memory pressure" in pattern.explanation.lower()
        assert "executor.memory" in pattern.suggested_fix.lower()
    
    def test_no_detection_for_healthy_gc(self):
        """Should not detect GC pressure when percentage is healthy (<20%)."""
        executor_metrics = {
            "executor_id": "2",
            "total_task_time": 100000,
            "gc_time": 15000,  # 15% is healthy
        }
        
        detector = FailureDetector()
        patterns = detector.detect_gc_pressure(executor_metrics)
        
        assert len(patterns) == 0
    
    def test_detects_critical_gc_time(self):
        """Should mark as CRITICAL when GC time is extreme (>60%)."""
        executor_metrics = {
            "executor_id": "3",
            "total_task_time": 100000,
            "gc_time": 70000,  # 70% - almost all time in GC
        }
        
        detector = FailureDetector()
        patterns = detector.detect_gc_pressure(executor_metrics)
        
        assert len(patterns) == 1
        pattern = patterns[0]
        assert pattern.severity == FailureSeverity.CRITICAL
        assert "70%" in pattern.description


class TestSpillDetection:
    """Test detection of excessive spill indicating partition explosion."""
    
    def test_detects_spill_larger_than_input(self):
        """Should detect when memory spill exceeds input size (partition explosion)."""
        stage_metrics = {
            "stage_id": 4,
            "input_bytes": 2_000_000_000,  # 2GB input
            "memory_bytes_spilled": 5_000_000_000,  # 5GB spilled to memory
            "disk_bytes_spilled": 0,  # No disk spill
        }
        
        detector = FailureDetector()
        patterns = detector.detect_excessive_spill(stage_metrics)
        
        assert len(patterns) == 1
        pattern = patterns[0]
        assert pattern.type == "EXCESSIVE_SPILL"
        assert pattern.severity == FailureSeverity.HIGH
        assert "2.5x input size" in pattern.description or "2.5" in pattern.description
        assert "partition explosion" in pattern.explanation.lower() or "expanding" in pattern.explanation.lower()
        assert "executor" in pattern.suggested_fix.lower() or "partition" in pattern.suggested_fix.lower()
    
    def test_no_detection_for_reasonable_spill(self):
        """Should not detect spill when it's within reasonable bounds."""
        stage_metrics = {
            "stage_id": 6,
            "input_bytes": 5_000_000_000,  # 5GB
            "memory_bytes_spilled": 1_000_000_000,  # 1GB spilled (20%)
            "disk_bytes_spilled": 0,
        }
        
        detector = FailureDetector()
        patterns = detector.detect_excessive_spill(stage_metrics)
        
        assert len(patterns) == 0
    
    def test_detects_disk_spill_as_critical(self):
        """Should mark disk spill as more severe than memory spill."""
        stage_metrics = {
            "stage_id": 7,
            "input_bytes": 1_000_000_000,  # 1GB
            "memory_bytes_spilled": 500_000_000,  # 500MB
            "disk_bytes_spilled": 3_000_000_000,  # 3GB to disk
        }
        
        detector = FailureDetector()
        patterns = detector.detect_excessive_spill(stage_metrics)
        
        assert len(patterns) == 1
        pattern = patterns[0]
        assert pattern.severity == FailureSeverity.CRITICAL
        assert "disk" in pattern.description.lower()


class TestExecutorLossDetection:
    """Test detection of executor failures indicating cluster instability."""
    
    def test_detects_multiple_executor_losses(self):
        """Should detect when executors are being lost during job."""
        job_metrics = {
            "job_id": 2,
            "executors_lost": 5,
            "total_executors": 10,
            "duration": 300000,  # 5 minutes
        }
        
        detector = FailureDetector()
        patterns = detector.detect_executor_loss(job_metrics)
        
        assert len(patterns) == 1
        pattern = patterns[0]
        assert pattern.type == "EXECUTOR_LOSS"
        assert pattern.severity == FailureSeverity.CRITICAL
        assert "5 executors lost" in pattern.description
        assert "50%" in pattern.description
        assert "cluster instability" in pattern.explanation.lower()
    
    def test_no_detection_for_single_executor_loss(self):
        """Should not detect if only 1 executor lost in large cluster."""
        job_metrics = {
            "job_id": 3,
            "executors_lost": 1,
            "total_executors": 50,
            "duration": 600000,
        }
        
        detector = FailureDetector()
        patterns = detector.detect_executor_loss(job_metrics)
        
        assert len(patterns) == 0


class TestFailureDetectorIntegration:
    """Test full failure detection across event log."""
    
    def test_detects_multiple_patterns_in_job(self):
        """Should detect all applicable failure patterns in a complex job."""
        event_log_summary = {
            "stages": [
                {
                    "stage_id": 1,
                    "num_tasks": 200,
                    "task_durations": [100] * 199 + [50000],
                    "input_bytes": 1_000_000_000,
                    "memory_bytes_spilled": 5_000_000_000,
                    "disk_bytes_spilled": 2_000_000_000,
                },
                {
                    "stage_id": 2,
                    "num_tasks": 100,
                    "task_durations": [500] * 100,
                    "input_bytes": 2_000_000_000,
                    "memory_bytes_spilled": 100_000_000,
                    "disk_bytes_spilled": 0,
                },
            ],
            "executors": [
                {
                    "executor_id": "1",
                    "total_task_time": 100000,
                    "gc_time": 40000,
                },
            ],
            "job": {
                "job_id": 5,
                "executors_lost": 3,
                "total_executors": 10,
                "duration": 400000,
            },
        }
        
        detector = FailureDetector()
        all_patterns = detector.analyze_event_log(event_log_summary)
        
        # Should detect: stuck task, excessive spill, GC pressure, executor loss
        assert len(all_patterns) >= 4
        
        pattern_types = {p.type for p in all_patterns}
        assert "STUCK_TASK" in pattern_types
        assert "EXCESSIVE_SPILL" in pattern_types
        assert "HIGH_GC_PRESSURE" in pattern_types
        assert "EXECUTOR_LOSS" in pattern_types
    
    def test_returns_empty_for_healthy_job(self):
        """Should return no patterns for a perfectly healthy job."""
        healthy_log = {
            "stages": [
                {
                    "stage_id": 1,
                    "num_tasks": 100,
                    "task_durations": [1000] * 100,
                    "input_bytes": 1_000_000_000,
                    "memory_bytes_spilled": 50_000_000,
                    "disk_bytes_spilled": 0,
                },
            ],
            "executors": [
                {
                    "executor_id": "1",
                    "total_task_time": 100000,
                    "gc_time": 10000,  # 10% GC
                },
            ],
            "job": {
                "job_id": 1,
                "executors_lost": 0,
                "total_executors": 5,
                "duration": 120000,
            },
        }
        
        detector = FailureDetector()
        patterns = detector.analyze_event_log(healthy_log)
        
        assert len(patterns) == 0
    
    def test_patterns_sorted_by_severity(self):
        """Should return patterns sorted by severity (CRITICAL > HIGH > MEDIUM)."""
        mixed_log = {
            "stages": [
                {
                    "stage_id": 1,
                    "num_tasks": 100,
                    "task_durations": [100] * 99 + [10000],  # Moderate skew
                    "input_bytes": 1_000_000_000,
                    "memory_bytes_spilled": 100_000_000,
                    "disk_bytes_spilled": 8_000_000_000,  # Critical spill
                },
            ],
            "executors": [
                {
                    "executor_id": "1",
                    "total_task_time": 100000,
                    "gc_time": 35000,  # High GC
                },
            ],
            "job": {
                "job_id": 1,
                "executors_lost": 0,
                "total_executors": 5,
                "duration": 120000,
            },
        }
        
        detector = FailureDetector()
        patterns = detector.analyze_event_log(mixed_log)
        
        # First pattern should be CRITICAL severity
        assert patterns[0].severity == FailureSeverity.CRITICAL
