"""
Fix-It Wizard: Interactive optimization suggestions.

Takes detected failure patterns and generates:
- Specific config changes
- Code modifications
- Estimated impact on metrics
- Copy-pasteable solutions
"""
from typing import List, Dict, Any, Optional
from enum import Enum
from pydantic import BaseModel

from app.analyzers.failure_detector import FailurePattern, FailureSeverity


class FixStrategy(str, Enum):
    """Types of fixes the wizard can suggest."""
    CONFIG_CHANGE = "config"  # Spark config modification
    CODE_CHANGE = "code"  # Code refactoring
    REPARTITION = "repartition"  # Add repartitioning
    ENABLE_AQE = "aqe"  # Enable Adaptive Query Execution
    MEMORY_TUNING = "memory"  # Memory allocation changes
    CLUSTER_SCALING = "scaling"  # Add more executors/cores


class ConfigChange(BaseModel):
    """A specific Spark configuration change."""
    key: str
    old_value: Optional[str] = None
    new_value: str
    reason: str


class CodeModification(BaseModel):
    """A suggested code change."""
    location: str  # Where in the code
    original: str  # Current code pattern
    modified: str  # Suggested replacement
    explanation: str


class ImpactEstimate(BaseModel):
    """Estimated impact of applying a fix."""
    metric: str  # What metric will improve
    current_value: str
    estimated_value: str
    confidence: str  # "high", "medium", "low"
    reasoning: str


class Fix(BaseModel):
    """A complete fix suggestion."""
    fix_id: str
    title: str
    strategy: FixStrategy
    description: str
    
    # What to change
    config_changes: List[ConfigChange] = []
    code_modifications: List[CodeModification] = []
    
    # Expected impact
    impact_estimates: List[ImpactEstimate] = []
    
    # Implementation details
    difficulty: str  # "easy", "medium", "hard"
    risk_level: str  # "low", "medium", "high"
    estimated_time: str  # "< 5 min", "15-30 min", etc.
    
    # Copy-paste helpers
    spark_submit_args: Optional[str] = None
    pyspark_code: Optional[str] = None


class FixItWizard:
    """Generates actionable fixes from detected failure patterns."""
    
    def generate_fixes(
        self,
        patterns: List[FailurePattern],
        job_context: Optional[Dict[str, Any]] = None
    ) -> List[Fix]:
        """
        Generate fix suggestions for detected patterns.
        
        Args:
            patterns: List of detected failure patterns
            job_context: Optional context about the job (executor count, memory, etc.)
            
        Returns:
            List of actionable fixes sorted by priority
        """
        fixes: List[Fix] = []
        
        for pattern in patterns:
            if pattern.type == "STUCK_TASK":
                fixes.extend(self._fix_stuck_tasks(pattern, job_context))
            elif pattern.type == "HIGH_GC_PRESSURE":
                fixes.extend(self._fix_gc_pressure(pattern, job_context))
            elif pattern.type == "EXCESSIVE_SPILL":
                fixes.extend(self._fix_excessive_spill(pattern, job_context))
            elif pattern.type == "EXECUTOR_LOSS":
                fixes.extend(self._fix_executor_loss(pattern, job_context))
        
        # Sort by priority (CRITICAL patterns first, easier fixes first)
        fixes.sort(key=lambda f: (
            0 if f.risk_level == "low" else 1,
            0 if f.difficulty == "easy" else 1 if f.difficulty == "medium" else 2
        ))
        
        return fixes
    
    def _fix_stuck_tasks(
        self,
        pattern: FailurePattern,
        context: Optional[Dict[str, Any]]
    ) -> List[Fix]:
        """Generate fixes for data skew causing stuck tasks."""
        fixes = []
        
        # Fix 1: Enable AQE with skew join optimization
        fixes.append(Fix(
            fix_id=f"stuck_task_{pattern.stage_id}_aqe",
            title="Enable Adaptive Query Execution (AQE) Skew Join",
            strategy=FixStrategy.ENABLE_AQE,
            description="AQE automatically detects and handles skewed joins at runtime by splitting large partitions.",
            config_changes=[
                ConfigChange(
                    key="spark.sql.adaptive.enabled",
                    new_value="true",
                    reason="Enables adaptive query execution"
                ),
                ConfigChange(
                    key="spark.sql.adaptive.skewJoin.enabled",
                    new_value="true",
                    reason="Automatically splits skewed partitions in joins"
                ),
                ConfigChange(
                    key="spark.sql.adaptive.skewJoin.skewedPartitionFactor",
                    new_value="5",
                    reason="Partition is skewed if 5x larger than median"
                ),
            ],
            impact_estimates=[
                ImpactEstimate(
                    metric="Stage Duration",
                    current_value=f"{pattern.metrics.get('max_duration_ms', 0) / 1000:.1f}s",
                    estimated_value=f"{pattern.metrics.get('median_duration_ms', 0) / 1000:.1f}s",
                    confidence="high",
                    reasoning="Skewed tasks will be split and processed in parallel"
                )
            ],
            difficulty="easy",
            risk_level="low",
            estimated_time="< 5 min",
            spark_submit_args="--conf spark.sql.adaptive.enabled=true --conf spark.sql.adaptive.skewJoin.enabled=true"
        ))
        
        # Fix 2: Manual repartitioning
        median_tasks = pattern.metrics.get('total_tasks', 200)
        suggested_partitions = median_tasks * 2  # Double current parallelism
        
        fixes.append(Fix(
            fix_id=f"stuck_task_{pattern.stage_id}_repartition",
            title="Add .repartition() Before Join/GroupBy",
            strategy=FixStrategy.REPARTITION,
            description="Manually repartition data before the skewed operation to distribute keys more evenly.",
            code_modifications=[
                CodeModification(
                    location=f"Before stage {pattern.stage_id} operation",
                    original="df.groupBy('key').agg(...)",
                    modified=f"df.repartition({suggested_partitions}, 'key').groupBy('key').agg(...)",
                    explanation="Repartitioning by the same key ensures even distribution"
                )
            ],
            impact_estimates=[
                ImpactEstimate(
                    metric="Task Duration Variance",
                    current_value=f"{pattern.metrics.get('ratio', 1):.0f}x",
                    estimated_value="< 3x",
                    confidence="medium",
                    reasoning="Explicit partitioning reduces skew if keys are evenly distributed"
                )
            ],
            difficulty="medium",
            risk_level="medium",
            estimated_time="15-30 min",
            pyspark_code=f"df = df.repartition({suggested_partitions}, 'key_column')"
        ))
        
        return fixes
    
    def _fix_gc_pressure(
        self,
        pattern: FailurePattern,
        context: Optional[Dict[str, Any]]
    ) -> List[Fix]:
        """Generate fixes for high GC pressure."""
        fixes = []
        
        gc_pct = pattern.metrics.get('gc_percentage', 0)
        current_memory = context.get('executor_memory', '4g') if context else '4g'
        
        # Parse current memory (simple heuristic)
        mem_gb = int(current_memory.rstrip('gG')) if current_memory.endswith(('g', 'G')) else 4
        suggested_memory = f"{mem_gb * 2}g"
        
        fixes.append(Fix(
            fix_id=f"gc_{pattern.executor_id}_memory",
            title="Increase Executor Memory",
            strategy=FixStrategy.MEMORY_TUNING,
            description=f"Executor is spending {gc_pct:.0f}% of time in GC. Doubling memory will reduce GC overhead.",
            config_changes=[
                ConfigChange(
                    key="spark.executor.memory",
                    old_value=current_memory,
                    new_value=suggested_memory,
                    reason=f"Reduce GC pressure from {gc_pct:.0f}% to < 10%"
                ),
                ConfigChange(
                    key="spark.executor.memoryOverhead",
                    new_value=f"{mem_gb // 2}g",
                    reason="Overhead for off-heap structures (10-20% of executor memory)"
                ),
            ],
            impact_estimates=[
                ImpactEstimate(
                    metric="GC Time",
                    current_value=f"{gc_pct:.0f}%",
                    estimated_value="< 10%",
                    confidence="high",
                    reasoning="More memory means fewer GC cycles"
                )
            ],
            difficulty="easy",
            risk_level="low",
            estimated_time="< 5 min",
            spark_submit_args=f"--executor-memory {suggested_memory} --conf spark.executor.memoryOverhead={mem_gb // 2}g"
        ))
        
        return fixes
    
    def _fix_excessive_spill(
        self,
        pattern: FailurePattern,
        context: Optional[Dict[str, Any]]
    ) -> List[Fix]:
        """Generate fixes for excessive memory/disk spill."""
        fixes = []
        
        spill_ratio = pattern.metrics.get('spill_ratio', 1.0)
        has_disk_spill = pattern.metrics.get('disk_spilled_bytes', 0) > 0
        
        # Fix 1: Increase partitions to reduce per-partition size
        current_partitions = pattern.metrics.get('num_partitions', 200)
        suggested_partitions = int(current_partitions * spill_ratio)
        
        fixes.append(Fix(
            fix_id=f"spill_{pattern.stage_id}_partitions",
            title="Increase Shuffle Partitions",
            strategy=FixStrategy.CONFIG_CHANGE,
            description=f"Data is expanding {spill_ratio:.1f}x during processing. More partitions = smaller chunks = less spilling.",
            config_changes=[
                ConfigChange(
                    key="spark.sql.shuffle.partitions",
                    old_value=str(current_partitions),
                    new_value=str(suggested_partitions),
                    reason="Reduce per-partition processing load"
                ),
            ],
            impact_estimates=[
                ImpactEstimate(
                    metric="Disk Spill",
                    current_value=f"{pattern.metrics.get('disk_spilled_bytes', 0) / 1e9:.1f} GB",
                    estimated_value="< 1 GB" if has_disk_spill else "0 GB",
                    confidence="medium",
                    reasoning="Smaller partitions fit in executor memory"
                )
            ],
            difficulty="easy",
            risk_level="low",
            estimated_time="< 5 min",
            spark_submit_args=f"--conf spark.sql.shuffle.partitions={suggested_partitions}"
        ))
        
        return fixes
    
    def _fix_executor_loss(
        self,
        pattern: FailurePattern,
        context: Optional[Dict[str, Any]]
    ) -> List[Fix]:
        """Generate fixes for executor failures."""
        fixes = []
        
        fixes.append(Fix(
            fix_id="executor_loss_dynamic",
            title="Enable Dynamic Allocation",
            strategy=FixStrategy.CLUSTER_SCALING,
            description="Automatically replace failed executors and scale based on workload.",
            config_changes=[
                ConfigChange(
                    key="spark.dynamicAllocation.enabled",
                    new_value="true",
                    reason="Automatically request new executors when some fail"
                ),
                ConfigChange(
                    key="spark.shuffle.service.enabled",
                    new_value="true",
                    reason="Required for dynamic allocation - preserves shuffle files"
                ),
            ],
            impact_estimates=[
                ImpactEstimate(
                    metric="Job Reliability",
                    current_value="Fails on executor loss",
                    estimated_value="Recovers automatically",
                    confidence="high",
                    reasoning="Dynamic allocation replaces failed executors"
                )
            ],
            difficulty="medium",
            risk_level="low",
            estimated_time="10-15 min",
            spark_submit_args="--conf spark.dynamicAllocation.enabled=true --conf spark.shuffle.service.enabled=true"
        ))
        
        return fixes
