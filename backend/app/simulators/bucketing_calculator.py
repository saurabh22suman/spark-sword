"""Bucketing ROI Calculator.

Estimates shuffle reduction and storage overhead from bucketing.
All outputs are estimates with confidence labeling.
"""

from dataclasses import dataclass, field
from typing import Literal


@dataclass
class BucketingResult:
    """Result of bucketing simulation."""
    
    bucket_count: int
    shuffle_reduction_pct: float
    storage_overhead_pct: float
    explanation: str
    evidence: dict[str, float] = field(default_factory=dict)
    confidence: Literal["high", "medium", "low"] = "medium"


class BucketingCalculator:
    """Calculator for bucketing trade-offs."""
    
    def simulate(
        self,
        left_rows: int,
        right_rows: int,
        avg_row_size_bytes: int,
        bucket_count: int,
        buckets_aligned: bool,
    ) -> BucketingResult:
        """Simulate bucketing impact.
        
        Args:
            left_rows: Rows in left table
            right_rows: Rows in right table
            avg_row_size_bytes: Average row size in bytes
            bucket_count: Number of buckets used
            buckets_aligned: Whether both tables use same bucket count and keys
        """
        if left_rows <= 0 and right_rows <= 0:
            return BucketingResult(
                bucket_count=bucket_count,
                shuffle_reduction_pct=0.0,
                storage_overhead_pct=0.0,
                explanation="No data to join — bucketing impact is negligible.",
                evidence={},
                confidence="high",
            )
        
        left_size = left_rows * avg_row_size_bytes
        right_size = right_rows * avg_row_size_bytes
        total_size = left_size + right_size
        
        evidence = {
            "bucket_count": float(bucket_count),
            "left_size_bytes": float(left_size),
            "right_size_bytes": float(right_size),
            "total_size_bytes": float(total_size),
        }
        
        if not buckets_aligned:
            return BucketingResult(
                bucket_count=bucket_count,
                shuffle_reduction_pct=0.0,
                storage_overhead_pct=self._estimate_storage_overhead(bucket_count),
                explanation=(
                    "Bucket counts or keys are not aligned across tables, "
                    "so Spark cannot avoid shuffle for the join. "
                    "Bucketing still increases file counts and storage overhead."
                ),
                evidence=evidence,
                confidence="medium",
            )
        
        # Estimate shuffle reduction when buckets aligned
        # Heuristic: more buckets => better parallelism but diminishing returns
        reduction = min(80.0, 20 + (bucket_count ** 0.5))
        
        explanation = (
            "Bucketing aligns join keys across tables, so Spark can avoid a full shuffle. "
            f"With {bucket_count} buckets, shuffle reduction is estimated at ~{reduction:.0f}%. "
            "Actual savings depend on data distribution and join selectivity."
        )
        
        return BucketingResult(
            bucket_count=bucket_count,
            shuffle_reduction_pct=reduction,
            storage_overhead_pct=self._estimate_storage_overhead(bucket_count),
            explanation=explanation,
            evidence=evidence,
            confidence="medium",
        )
    
    def _estimate_storage_overhead(self, bucket_count: int) -> float:
        """Estimate storage overhead from increased file counts.
        
        More buckets => more small files => more metadata overhead.
        """
        if bucket_count <= 0:
            return 0.0
        
        # Heuristic: overhead grows with log of bucket count
        return min(50.0, 5.0 * (bucket_count ** 0.5))
