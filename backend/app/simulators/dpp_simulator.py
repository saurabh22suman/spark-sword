"""Dynamic Partition Pruning (DPP) Simulator.

Simulates how Spark can prune partitions at runtime using join filters.
This is estimation-only and evidence-based.
"""

from dataclasses import dataclass, field
from typing import Literal


@dataclass
class DPPResult:
    """Result of a DPP simulation."""
    
    total_partitions: int
    partitions_pruned: int
    partitions_scanned: int
    scan_reduction_pct: float
    explanation: str
    evidence: dict[str, float] = field(default_factory=dict)
    confidence: Literal["high", "medium", "low"] = "medium"


class DPPSimulator:
    """Simulator for Dynamic Partition Pruning behavior."""
    
    def simulate(
        self,
        total_partitions: int,
        filter_selectivity: float,
        dynamic_pruning_enabled: bool,
        broadcast_join: bool,
    ) -> DPPResult:
        """Simulate partition pruning.
        
        Args:
            total_partitions: Total number of partitions in the fact table
            filter_selectivity: Fraction of keys that pass the build-side filter (0-1)
            dynamic_pruning_enabled: Whether DPP is enabled
            broadcast_join: Whether build side is broadcast (required for DPP)
        """
        if total_partitions <= 0:
            return DPPResult(
                total_partitions=0,
                partitions_pruned=0,
                partitions_scanned=0,
                scan_reduction_pct=0.0,
                explanation="Empty dataset — no partitions to prune.",
                evidence={},
                confidence="high",
            )
        
        # Clamp selectivity
        selectivity = max(0.0, min(1.0, filter_selectivity))
        
        evidence = {
            "total_partitions": float(total_partitions),
            "filter_selectivity": selectivity,
        }
        
        if not dynamic_pruning_enabled:
            return DPPResult(
                total_partitions=total_partitions,
                partitions_pruned=0,
                partitions_scanned=total_partitions,
                scan_reduction_pct=0.0,
                explanation=(
                    "Dynamic partition pruning is disabled, so Spark scans all partitions. "
                    "Enable DPP to allow runtime pruning based on join filters."
                ),
                evidence=evidence,
                confidence="high",
            )
        
        if not broadcast_join:
            return DPPResult(
                total_partitions=total_partitions,
                partitions_pruned=0,
                partitions_scanned=total_partitions,
                scan_reduction_pct=0.0,
                explanation=(
                    "DPP requires a broadcast build side to push join filters at runtime. "
                    "Without broadcast (or reuse of runtime filters), Spark scans all partitions."
                ),
                evidence=evidence,
                confidence="medium",
            )
        
        # Estimate partitions pruned based on selectivity
        # Lower selectivity => more pruning
        estimated_pruned = int(total_partitions * (1 - selectivity))
        estimated_pruned = max(0, min(total_partitions - 1, estimated_pruned))
        partitions_scanned = total_partitions - estimated_pruned
        scan_reduction_pct = (estimated_pruned / total_partitions) * 100
        
        evidence["estimated_pruned_partitions"] = float(estimated_pruned)
        
        explanation = (
            "Dynamic partition pruning used runtime join filters to skip partitions. "
            f"With {selectivity:.0%} key selectivity, Spark can potentially skip "
            f"~{estimated_pruned} of {total_partitions} partitions, reducing scan work."
        )
        
        return DPPResult(
            total_partitions=total_partitions,
            partitions_pruned=estimated_pruned,
            partitions_scanned=partitions_scanned,
            scan_reduction_pct=scan_reduction_pct,
            explanation=explanation,
            evidence=evidence,
            confidence="medium" if selectivity > 0.3 else "high",
        )
