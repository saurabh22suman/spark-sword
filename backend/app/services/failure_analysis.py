"""
Failure Analysis Service.

Integrates event log parsing with failure pattern detection.
"""
from typing import List, Dict, Any
from app.parsers.event_log_parser import EventLogParser
from app.analyzers.failure_detector import FailureDetector, FailurePattern
from app.models.spark_events import ParsedEventLog


class FailureAnalysisService:
    """Service for analyzing Spark event logs for failure patterns."""
    
    def __init__(self):
        self.parser = EventLogParser()
        self.detector = FailureDetector()
    
    def analyze_event_log_content(self, content: str) -> List[FailurePattern]:
        """
        Analyze event log content and return detected failure patterns.
        
        Args:
            content: Raw event log content (newline-delimited JSON)
            
        Returns:
            List of detected failure patterns sorted by severity
        """
        # Parse event log
        parsed_log = self.parser.parse(content)
        
        # Convert to failure detector format
        detector_input = self._convert_to_detector_format(parsed_log)
        
        # Detect patterns
        patterns = self.detector.analyze_event_log(detector_input)
        
        return patterns
    
    def _convert_to_detector_format(self, parsed_log: ParsedEventLog) -> Dict[str, Any]:
        """
        Convert ParsedEventLog to format expected by FailureDetector.
        
        Extracts:
        - Stage metrics (task durations, spill)
        - Executor metrics (GC time)
        - Job metrics (executor loss)
        """
        detector_format = {
            "stages": [],
            "executors": [],
            "job": {},
        }
        
        # Process stages
        for stage in parsed_log.stages:
            # Get all tasks for this stage
            stage_tasks = [t for t in parsed_log.tasks if t.stage_id == stage.stage_id]
            
            if not stage_tasks:
                continue
            
            # Collect task durations
            task_durations = [
                t.duration_ms 
                for t in stage_tasks 
                if t.duration_ms is not None and t.duration_ms > 0
            ]
            
            # Sum up spill bytes at stage level
            total_spill = sum(t.spill_bytes or 0 for t in stage_tasks)
            
            # Get input/output bytes from stage accumulables (preferred) or aggregate from tasks
            input_bytes = stage.input_bytes or sum(t.input_bytes or 0 for t in stage_tasks)
            
            stage_metrics = {
                "stage_id": stage.stage_id,
                "num_tasks": stage.num_tasks,
                "task_durations": task_durations,
                "input_bytes": input_bytes,
                "memory_bytes_spilled": total_spill,  # Spark doesn't separate memory vs disk in task metrics
                "disk_bytes_spilled": 0,  # Would need detailed executor metrics for this
            }
            
            detector_format["stages"].append(stage_metrics)
        
        # Process executors for GC metrics
        # Note: Event logs don't always contain detailed executor metrics
        # This would require SparkListenerExecutorMetricsUpdate events
        executor_metrics = self._extract_executor_metrics(parsed_log)
        detector_format["executors"] = executor_metrics
        
        # Process job-level metrics
        job_metrics = self._extract_job_metrics(parsed_log)
        if job_metrics:
            detector_format["job"] = job_metrics
        
        return detector_format
    
    def _extract_executor_metrics(self, parsed_log: ParsedEventLog) -> List[Dict[str, Any]]:
        """
        Extract executor-level metrics from parsed log.
        
        Currently limited by what's available in basic event logs.
        SparkListenerExecutorMetricsUpdate would give us GC time, but
        it's not always present in all event logs.
        """
        # Group tasks by executor
        executor_tasks: Dict[str, List] = {}
        
        for task in parsed_log.tasks:
            if task.executor_id and task.duration_ms:
                if task.executor_id not in executor_tasks:
                    executor_tasks[task.executor_id] = []
                executor_tasks[task.executor_id].append(task)
        
        # For now, return empty list since basic task metrics don't include GC time
        # This would need to be populated from:
        # - SparkListenerExecutorMetricsUpdate events
        # - or Spark UI API calls
        # TODO: Add GC metrics extraction when available
        executor_metrics = []
        
        return executor_metrics
    
    def _extract_job_metrics(self, parsed_log: ParsedEventLog) -> Dict[str, Any]:
        """Extract job-level metrics like executor loss."""
        if not parsed_log.jobs:
            return {}
        
        # Take the first/main job for now
        # TODO: Handle multiple jobs in event log
        job = parsed_log.jobs[0] if parsed_log.jobs else None
        if not job:
            return {}
        
        job_metrics = {
            "job_id": job.job_id,
            "executors_lost": 0,  # Would need SparkListenerExecutorRemoved events
            "total_executors": 0,  # Would need SparkListenerExecutorAdded events
            "duration": (job.completion_time or 0) - (job.submission_time or 0),
        }
        
        # TODO: Track executor add/remove events for accurate executor loss detection
        
        return job_metrics
