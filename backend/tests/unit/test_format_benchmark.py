"""Tests for File Format Benchmark Simulator."""

from app.simulators.format_benchmark import (
    FormatBenchmark,
    FormatBenchmarkResult,
)


def test_format_benchmark_includes_all_formats():
    benchmark = FormatBenchmark()
    result = benchmark.simulate(
        raw_size_bytes=100_000_000,
        query_selectivity=0.1,
    )
    
    assert isinstance(result, FormatBenchmarkResult)
    assert "csv" in result.formats
    assert "parquet" in result.formats
    assert "delta" in result.formats


def test_parquet_smaller_than_csv():
    benchmark = FormatBenchmark()
    result = benchmark.simulate(
        raw_size_bytes=100_000_000,
        query_selectivity=0.5,
    )
    
    assert result.formats["parquet"].estimated_size_bytes < result.formats["csv"].estimated_size_bytes


def test_delta_includes_transaction_overhead():
    benchmark = FormatBenchmark()
    result = benchmark.simulate(
        raw_size_bytes=100_000_000,
        query_selectivity=0.5,
    )
    
    assert result.formats["delta"].estimated_size_bytes > result.formats["parquet"].estimated_size_bytes


def test_selective_queries_benefit_columnar_formats():
    benchmark = FormatBenchmark()
    result = benchmark.simulate(
        raw_size_bytes=100_000_000,
        query_selectivity=0.1,
    )
    
    parquet_scan = result.formats["parquet"].estimated_scan_mb_s
    csv_scan = result.formats["csv"].estimated_scan_mb_s
    
    assert parquet_scan > csv_scan


def test_format_explanations_reference_evidence():
    benchmark = FormatBenchmark()
    result = benchmark.simulate(
        raw_size_bytes=100_000_000,
        query_selectivity=0.2,
    )
    
    for fmt in result.formats.values():
        assert "compression" in fmt.explanation.lower() or "column" in fmt.explanation.lower()
        assert fmt.confidence in ["high", "medium", "low"]


def test_format_benchmark_never_guarantees_improvement():
    benchmark = FormatBenchmark()
    result = benchmark.simulate(
        raw_size_bytes=100_000_000,
        query_selectivity=0.3,
    )
    
    all_text = " ".join(f.explanation for f in result.formats.values()).lower()
    assert "guarantee" not in all_text
    assert "always" not in all_text
    assert any(word in all_text for word in ["may", "can", "typically", "depends", "potential"])


def test_format_benchmark_handles_zero_size():
    benchmark = FormatBenchmark()
    result = benchmark.simulate(
        raw_size_bytes=0,
        query_selectivity=0.5,
    )
    
    assert result.summary
    assert "empty" in result.summary.lower() or "no data" in result.summary.lower()
