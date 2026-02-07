"""Tests for Bucketing ROI Calculator."""

from app.simulators.bucketing_calculator import (
    BucketingCalculator,
    BucketingResult,
)


def test_bucketing_reduces_shuffle_when_buckets_aligned():
    calculator = BucketingCalculator()
    result = calculator.simulate(
        left_rows=50_000_000,
        right_rows=5_000_000,
        avg_row_size_bytes=100,
        bucket_count=64,
        buckets_aligned=True,
    )
    
    assert isinstance(result, BucketingResult)
    assert result.shuffle_reduction_pct > 0
    assert result.shuffle_reduction_pct <= 100
    assert "shuffle" in result.explanation.lower()


def test_bucketing_no_shuffle_reduction_when_not_aligned():
    calculator = BucketingCalculator()
    result = calculator.simulate(
        left_rows=50_000_000,
        right_rows=5_000_000,
        avg_row_size_bytes=100,
        bucket_count=64,
        buckets_aligned=False,
    )
    
    assert result.shuffle_reduction_pct == 0
    assert "not aligned" in result.explanation.lower() or "alignment" in result.explanation.lower()


def test_bucketing_storage_overhead_increases_with_buckets():
    calculator = BucketingCalculator()
    result_low = calculator.simulate(
        left_rows=10_000_000,
        right_rows=10_000_000,
        avg_row_size_bytes=100,
        bucket_count=16,
        buckets_aligned=True,
    )
    
    result_high = calculator.simulate(
        left_rows=10_000_000,
        right_rows=10_000_000,
        avg_row_size_bytes=100,
        bucket_count=256,
        buckets_aligned=True,
    )
    
    assert result_high.storage_overhead_pct > result_low.storage_overhead_pct


def test_bucketing_evidence_includes_bucket_count_and_sizes():
    calculator = BucketingCalculator()
    result = calculator.simulate(
        left_rows=20_000_000,
        right_rows=2_000_000,
        avg_row_size_bytes=100,
        bucket_count=32,
        buckets_aligned=True,
    )
    
    assert "bucket_count" in result.evidence
    assert "left_size_bytes" in result.evidence
    assert "right_size_bytes" in result.evidence


def test_bucketing_never_guarantees_improvement():
    calculator = BucketingCalculator()
    result = calculator.simulate(
        left_rows=20_000_000,
        right_rows=2_000_000,
        avg_row_size_bytes=100,
        bucket_count=32,
        buckets_aligned=True,
    )
    
    explanation = result.explanation.lower()
    assert "guarantee" not in explanation
    assert "always" not in explanation
    assert any(word in explanation for word in ["may", "can", "potential", "depends"])


def test_bucketing_handles_zero_rows():
    calculator = BucketingCalculator()
    result = calculator.simulate(
        left_rows=0,
        right_rows=0,
        avg_row_size_bytes=100,
        bucket_count=32,
        buckets_aligned=True,
    )
    
    assert result.shuffle_reduction_pct == 0
    assert "empty" in result.explanation.lower() or "no data" in result.explanation.lower()
