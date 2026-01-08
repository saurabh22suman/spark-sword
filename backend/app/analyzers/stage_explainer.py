"""Stage Explanation Engine.

Provides structured explanations for why each stage exists and why it incurred cost.
Follows the must-have spec format:

1. Observation - What happened
2. Spark Rule Involved - Wide transformation, sort-merge join, etc.
3. Cost Driver - Shuffle, skew, serialization, spill

LANGUAGE RULES:
- Use descriptive, not prescriptive language
- Never say "should have" or "fix this by"
- Focus on explaining behavior, not giving advice
"""

from dataclasses import dataclass
from typing import Literal, Optional

from app.models.spark_events import ParsedEventLog, StageInfo


@dataclass
class StageExplanation:
    """Structured explanation for a stage.
    
    Contains three required sections per spec:
    - observation: What happened in this stage
    - spark_rule: Which Spark rule/mechanism applies
    - cost_driver: What drove the cost (if any)
    """
    
    stage_id: int
    observation: str
    spark_rule: str
    cost_driver: Optional[str]
    
    # Additional context
    is_shuffle_boundary: bool = False
    is_expensive: bool = False
    expense_reason: Optional[str] = None
    confidence: Literal["high", "medium", "low"] = "high"
    
    def to_dict(self) -> dict:
        """Convert to dictionary for API response."""
        return {
            "stage_id": self.stage_id,
            "observation": self.observation,
            "spark_rule": self.spark_rule,
            "cost_driver": self.cost_driver,
            "is_shuffle_boundary": self.is_shuffle_boundary,
            "is_expensive": self.is_expensive,
            "expense_reason": self.expense_reason,
            "confidence": self.confidence,
        }


class StageExplainer:
    """Generates structured explanations for Spark stages.
    
    Based solely on event log data - no speculation or inference.
    """
    
    # Thresholds for identifying expensive stages
    LARGE_SHUFFLE_BYTES = 1_000_000_000  # 1GB
    HIGH_TASK_COUNT = 1000
    LONG_DURATION_MS = 60_000  # 1 minute
    
    def __init__(self) -> None:
        """Initialize the stage explainer."""
        self._stage_map: dict[int, StageInfo] = {}
    
    def explain_stage(
        self, 
        stage: StageInfo, 
        parsed_log: ParsedEventLog
    ) -> StageExplanation:
        """Generate a structured explanation for a single stage.
        
        Args:
            stage: The stage to explain.
            parsed_log: The complete parsed event log for context.
            
        Returns:
            StageExplanation with observation, rule, and cost driver.
        """
        self._stage_map = {s.stage_id: s for s in parsed_log.stages}
        
        observation = self._generate_observation(stage)
        spark_rule = self._identify_spark_rule(stage)
        cost_driver = self._identify_cost_driver(stage)
        
        is_shuffle = stage.shuffle_write_bytes > 0 or stage.shuffle_read_bytes > 0
        is_expensive, expense_reason = self._assess_expense(stage)
        
        return StageExplanation(
            stage_id=stage.stage_id,
            observation=observation,
            spark_rule=spark_rule,
            cost_driver=cost_driver,
            is_shuffle_boundary=is_shuffle,
            is_expensive=is_expensive,
            expense_reason=expense_reason,
        )
    
    def explain_all(self, parsed_log: ParsedEventLog) -> list[StageExplanation]:
        """Generate explanations for all stages in the event log.
        
        Args:
            parsed_log: The parsed event log.
            
        Returns:
            List of StageExplanation for each stage.
        """
        return [
            self.explain_stage(stage, parsed_log)
            for stage in parsed_log.stages
        ]
    
    def _generate_observation(self, stage: StageInfo) -> str:
        """Generate the 'What happened' observation.
        
        Based purely on metrics from the event log.
        """
        parts = []
        
        # Task execution
        parts.append(f"Stage {stage.stage_id} executed {stage.num_tasks} tasks")
        
        # Duration (calculated from submission and completion times)
        duration_ms = None
        if stage.completion_time is not None and stage.submission_time is not None:
            duration_ms = stage.completion_time - stage.submission_time
        
        if duration_ms:
            if duration_ms >= 60_000:
                duration_str = f"{duration_ms / 60_000:.1f} minutes"
            elif duration_ms >= 1_000:
                duration_str = f"{duration_ms / 1_000:.1f} seconds"
            else:
                duration_str = f"{duration_ms}ms"
            parts.append(f"in {duration_str}")
        
        observation = " ".join(parts) + "."
        
        # Shuffle details
        if stage.shuffle_write_bytes > 0:
            shuffle_mb = stage.shuffle_write_bytes / (1024 * 1024)
            observation += f" {shuffle_mb:.1f} MB of shuffle data was written."
        
        if stage.shuffle_read_bytes > 0:
            shuffle_mb = stage.shuffle_read_bytes / (1024 * 1024)
            observation += f" {shuffle_mb:.1f} MB of shuffle data was read."
        
        # Spill
        if stage.spill_bytes and stage.spill_bytes > 0:
            spill_mb = stage.spill_bytes / (1024 * 1024)
            observation += f" {spill_mb:.1f} MB was spilled to disk."
        
        return observation
    
    def _identify_spark_rule(self, stage: StageInfo) -> str:
        """Identify which Spark rule/mechanism applies to this stage.
        
        Returns the relevant Spark execution rule.
        """
        # Check for shuffle (wide transformation)
        if stage.shuffle_write_bytes > 0 and stage.shuffle_read_bytes > 0:
            return (
                "Shuffle Exchange: This stage both reads and writes shuffle data, "
                "indicating an intermediate shuffle operation."
            )
        
        if stage.shuffle_write_bytes > 0:
            return (
                "Wide Transformation: This stage writes shuffle data, typically caused by "
                "operations like groupBy, join, or repartition that require data redistribution."
            )
        
        if stage.shuffle_read_bytes > 0:
            return (
                "Shuffle Read: This stage reads shuffle data from a previous wide transformation. "
                "Tasks process data based on their assigned partition keys."
            )
        
        # Check for many tasks (partitioned read)
        if stage.num_tasks > self.HIGH_TASK_COUNT:
            return (
                f"Partitioned Execution: {stage.num_tasks} tasks ran in parallel, "
                "each processing a partition of the data."
            )
        
        # Default: narrow transformation
        return (
            "Narrow Transformation: No shuffle required. Each partition is processed "
            "independently, allowing for efficient pipelining."
        )
    
    def _identify_cost_driver(self, stage: StageInfo) -> Optional[str]:
        """Identify what drove the cost of this stage.
        
        Returns None if the stage was not expensive.
        """
        cost_drivers = []
        
        # Large shuffle
        if stage.shuffle_write_bytes >= self.LARGE_SHUFFLE_BYTES:
            gb = stage.shuffle_write_bytes / (1024 * 1024 * 1024)
            cost_drivers.append(
                f"Shuffle volume: {gb:.1f} GB of data was shuffled across the network"
            )
        
        # Spill to disk
        if stage.spill_bytes and stage.spill_bytes > 0:
            mb = stage.spill_bytes / (1024 * 1024)
            cost_drivers.append(
                f"Disk spill: {mb:.1f} MB was spilled, indicating memory pressure"
            )
        
        # Long duration (calculated from times)
        duration_ms = None
        if stage.completion_time is not None and stage.submission_time is not None:
            duration_ms = stage.completion_time - stage.submission_time
        
        if duration_ms and duration_ms >= self.LONG_DURATION_MS:
            mins = duration_ms / 60_000
            cost_drivers.append(
                f"Duration: Stage took {mins:.1f} minutes to complete"
            )
        
        if not cost_drivers:
            return None
        
        return ". ".join(cost_drivers) + "."
    
    def _assess_expense(self, stage: StageInfo) -> tuple[bool, Optional[str]]:
        """Determine if a stage is expensive and why.
        
        Returns:
            Tuple of (is_expensive, reason).
        """
        reasons = []
        
        if stage.shuffle_write_bytes >= self.LARGE_SHUFFLE_BYTES:
            reasons.append("large shuffle write")
        
        if stage.spill_bytes and stage.spill_bytes > 0:
            reasons.append("disk spill detected")
        
        # Calculate duration
        duration_ms = None
        if stage.completion_time is not None and stage.submission_time is not None:
            duration_ms = stage.completion_time - stage.submission_time
        
        if duration_ms and duration_ms >= self.LONG_DURATION_MS:
            reasons.append("long duration")
        
        if not reasons:
            return False, None
        
        return True, ", ".join(reasons)
