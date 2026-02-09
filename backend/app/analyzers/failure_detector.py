"""
Failure Pattern Detector for Spark Event Logs.

Detects common failure patterns that indicate performance issues or job failures:
- Stuck tasks (data skew)
- High GC pressure (memory issues)
- Excessive spill (partition explosion)
- Executor loss (cluster instability)
"""
from enum import Enum
from typing import List, Dict, Any
from pydantic import BaseModel


class FailureSeverity(str, Enum):
    """Severity levels for detected failure patterns."""
    CRITICAL = "critical"  # Job-breaking or severe performance degradation
    HIGH = "high"  # Significant performance impact
    MEDIUM = "medium"  # Noticeable but manageable
    LOW = "low"  # Minor inefficiency


class FailurePattern(BaseModel):
    """Represents a detected failure pattern in the event log."""
    type: str  # Pattern type (STUCK_TASK, HIGH_GC_PRESSURE, etc.)
    severity: FailureSeverity
    description: str  # User-friendly summary
    explanation: str  # Why this is a problem
    suggested_fix: str  # How to fix it
    metrics: Dict[str, Any]  # Supporting evidence
    stage_id: int | None = None
    executor_id: str | None = None
    
    class Config:
        use_enum_values = True


class FailureDetector:
    """Analyzes Spark event logs to detect common failure patterns."""
    
    # Thresholds for detection
    STUCK_TASK_RATIO = 10.0  # Task taking 10x median is "stuck"
    SEVERE_SKEW_THRESHOLD = 0.1  # 10% of tasks being slow is severe
    GC_HIGH_THRESHOLD = 0.30  # 30% GC time is problematic
    GC_CRITICAL_THRESHOLD = 0.60  # 60% GC time is critical
    SPILL_RATIO_THRESHOLD = 2.0  # Spill > 2x input is excessive
    DISK_SPILL_THRESHOLD = 0.5  # Disk spill > 50% of input is critical
    EXECUTOR_LOSS_THRESHOLD = 0.15  # Losing >15% of executors is concerning
    
    def detect_stuck_tasks(self, stage_metrics: Dict[str, Any]) -> List[FailurePattern]:
        """Detect tasks that are significantly slower than others (data skew indicator)."""
        patterns = []
        
        task_durations = stage_metrics.get("task_durations", [])
        if not task_durations or len(task_durations) < 2:
            return patterns
        
        # Calculate median and max
        sorted_durations = sorted(task_durations)
        median_duration = sorted_durations[len(sorted_durations) // 2]
        max_duration = sorted_durations[-1]
        
        if median_duration == 0:
            return patterns
        
        # Check if max is significantly higher than median
        ratio = max_duration / median_duration
        
        if ratio >= self.STUCK_TASK_RATIO:
            # Count how many tasks are "slow"
            slow_threshold = median_duration * self.STUCK_TASK_RATIO
            slow_tasks = sum(1 for d in task_durations if d >= slow_threshold)
            total_tasks = len(task_durations)
            slow_percentage = slow_tasks / total_tasks
            
            # Determine severity
            if slow_percentage >= self.SEVERE_SKEW_THRESHOLD:
                severity = FailureSeverity.CRITICAL
            else:
                severity = FailureSeverity.HIGH
            
            # Calculate time wasted
            time_wasted = max_duration - median_duration
            
            patterns.append(FailurePattern(
                type="STUCK_TASK",
                severity=severity,
                description=f"{slow_tasks} task{'s' if slow_tasks > 1 else ''} taking {int(ratio)}x longer than median in stage {stage_metrics['stage_id']}",
                explanation=(
                    "Data skew detected: some tasks are processing significantly more data than others. "
                    "This causes the entire stage to wait for the slowest task to complete, wasting resources."
                ),
                suggested_fix=(
                    "1. Add salting/repartition before the skewed operation\n"
                    "2. Enable Adaptive Query Execution (AQE) with skew join optimization\n"
                    "3. Investigate the skewed keys and consider filtering or special handling"
                ),
                metrics={
                    "median_duration_ms": median_duration,
                    "max_duration_ms": max_duration,
                    "ratio": round(ratio, 2),
                    "slow_tasks": slow_tasks,
                    "total_tasks": total_tasks,
                    "time_wasted_ms": time_wasted,
                },
                stage_id=stage_metrics["stage_id"],
            ))
        
        return patterns
    
    def detect_gc_pressure(self, executor_metrics: Dict[str, Any]) -> List[FailurePattern]:
        """Detect high garbage collection time indicating memory pressure."""
        patterns = []
        
        total_task_time = executor_metrics.get("total_task_time", 0)
        gc_time = executor_metrics.get("gc_time", 0)
        
        if total_task_time == 0:
            return patterns
        
        gc_percentage = gc_time / total_task_time
        
        if gc_percentage >= self.GC_HIGH_THRESHOLD:
            # Determine severity
            if gc_percentage >= self.GC_CRITICAL_THRESHOLD:
                severity = FailureSeverity.CRITICAL
                impact = "Executors spending most of their time in garbage collection instead of processing data"
            else:
                severity = FailureSeverity.HIGH
                impact = "Significant time spent in garbage collection, reducing effective processing capacity"
            
            patterns.append(FailurePattern(
                type="HIGH_GC_PRESSURE",
                severity=severity,
                description=f"{int(gc_percentage * 100)}% of executor time spent in GC on executor {executor_metrics['executor_id']}",
                explanation=(
                    f"{impact}. This indicates memory pressure and typically means:\n"
                    "- Executor memory is too small for the working set\n"
                    "- Too many small objects being created\n"
                    "- Inefficient data structures or caching"
                ),
                suggested_fix=(
                    "1. Increase spark.executor.memory (try 1.5-2x current value)\n"
                    "2. Reduce spark.memory.fraction if caching is not critical\n"
                    "3. Increase number of partitions to reduce per-task memory\n"
                    "4. Review code for unnecessary object creation"
                ),
                metrics={
                    "total_task_time_ms": total_task_time,
                    "gc_time_ms": gc_time,
                    "gc_percentage": round(gc_percentage * 100, 1),
                },
                executor_id=executor_metrics["executor_id"],
            ))
        
        return patterns
    
    def detect_excessive_spill(self, stage_metrics: Dict[str, Any]) -> List[FailurePattern]:
        """Detect excessive memory/disk spill indicating partition explosion."""
        patterns = []
        
        input_bytes = stage_metrics.get("input_bytes", 0)
        memory_spilled = stage_metrics.get("memory_bytes_spilled", 0)
        disk_spilled = stage_metrics.get("disk_bytes_spilled", 0)
        
        if input_bytes == 0:
            return patterns
        
        total_spilled = memory_spilled + disk_spilled
        spill_ratio = total_spilled / input_bytes
        disk_ratio = disk_spilled / input_bytes if disk_spilled > 0 else 0
        
        # Disk spill is more severe than memory spill - check first
        if disk_ratio >= self.DISK_SPILL_THRESHOLD:
                severity = FailureSeverity.CRITICAL
                
                patterns.append(FailurePattern(
                    type="EXCESSIVE_SPILL",
                    severity=severity,
                    description=f"Stage {stage_metrics['stage_id']} spilled {round(spill_ratio, 1)}x input size to disk",
                    explanation=(
                        "Partition explosion detected: data is expanding during processing and spilling to disk. "
                        "Disk I/O is 10-100x slower than memory, severely impacting performance. "
                        "This often happens with explode(), cartesian joins, or inefficient aggregations."
                    ),
                    suggested_fix=(
                        "1. Increase spark.executor.memory and spark.executor.memoryOverhead\n"
                        "2. Increase number of partitions to reduce per-partition size\n"
                        "3. Review transformations for unintended data expansion (explode, crossJoin)\n"
                        "4. Enable compression: spark.shuffle.compress=true"
                    ),
                    metrics={
                        "input_bytes": input_bytes,
                        "memory_spilled_bytes": memory_spilled,
                        "disk_spilled_bytes": disk_spilled,
                        "total_spilled_bytes": total_spilled,
                        "spill_ratio": round(spill_ratio, 2),
                    },
                    stage_id=stage_metrics["stage_id"],
                ))
        
        elif spill_ratio >= self.SPILL_RATIO_THRESHOLD:
            patterns.append(FailurePattern(
                type="EXCESSIVE_SPILL",
                severity=FailureSeverity.HIGH,
                description=f"Stage {stage_metrics['stage_id']} spilled {round(spill_ratio, 1)}x input size to memory",
                explanation=(
                    "Data is expanding during processing, causing memory spill. "
                    "While not as severe as disk spill, this still indicates inefficient memory usage."
                ),
                suggested_fix=(
                    "1. Increase spark.executor.memory\n"
                    "2. Increase spark.sql.shuffle.partitions to reduce per-partition processing\n"
                    "3. Review transformations for data expansion patterns"
                ),
                metrics={
                    "input_bytes": input_bytes,
                    "memory_spilled_bytes": memory_spilled,
                    "disk_spilled_bytes": disk_spilled,
                    "spill_ratio": round(spill_ratio, 2),
                },
                stage_id=stage_metrics["stage_id"],
            ))
        
        return patterns
    
    def detect_executor_loss(self, job_metrics: Dict[str, Any]) -> List[FailurePattern]:
        """Detect executor failures indicating cluster instability."""
        patterns = []
        
        executors_lost = job_metrics.get("executors_lost", 0)
        total_executors = job_metrics.get("total_executors", 0)
        
        if total_executors == 0 or executors_lost == 0:
            return patterns
        
        loss_percentage = executors_lost / total_executors
        
        if loss_percentage >= self.EXECUTOR_LOSS_THRESHOLD:
            patterns.append(FailurePattern(
                type="EXECUTOR_LOSS",
                severity=FailureSeverity.CRITICAL,
                description=f"{executors_lost} executors lost ({int(loss_percentage * 100)}% of cluster) during job {job_metrics['job_id']}",
                explanation=(
                    "Cluster instability detected: executors are failing during job execution. "
                    "This causes task retries, data recomputation, and wasted resources. Common causes:\n"
                    "- Executor OOM (out of memory)\n"
                    "- Network issues\n"
                    "- Spot instance preemption\n"
                    "- Node failures"
                ),
                suggested_fix=(
                    "1. Check executor logs for OOM errors or exceptions\n"
                    "2. Increase executor memory if OOM is the cause\n"
                    "3. Enable dynamic allocation to handle executor loss gracefully\n"
                    "4. Review cluster health and network stability\n"
                    "5. Avoid spot instances for critical workloads"
                ),
                metrics={
                    "executors_lost": executors_lost,
                    "total_executors": total_executors,
                    "loss_percentage": round(loss_percentage * 100, 1),
                    "job_duration_ms": job_metrics.get("duration", 0),
                },
            ))
        
        return patterns
    
    def analyze_event_log(self, event_log_summary: Dict[str, Any]) -> List[FailurePattern]:
        """
        Analyze complete event log and return all detected failure patterns.
        
        Returns patterns sorted by severity (CRITICAL > HIGH > MEDIUM > LOW).
        """
        all_patterns = []
        
        # Analyze stages for stuck tasks and spill
        for stage in event_log_summary.get("stages", []):
            all_patterns.extend(self.detect_stuck_tasks(stage))
            all_patterns.extend(self.detect_excessive_spill(stage))
        
        # Analyze executors for GC pressure
        for executor in event_log_summary.get("executors", []):
            all_patterns.extend(self.detect_gc_pressure(executor))
        
        # Analyze job-level metrics for executor loss
        if "job" in event_log_summary:
            all_patterns.extend(self.detect_executor_loss(event_log_summary["job"]))
        
        # Sort by severity
        severity_order = {
            FailureSeverity.CRITICAL: 0,
            FailureSeverity.HIGH: 1,
            FailureSeverity.MEDIUM: 2,
            FailureSeverity.LOW: 3,
        }
        all_patterns.sort(key=lambda p: severity_order[p.severity])
        
        return all_patterns
