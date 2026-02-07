"""File Format Benchmark Simulator.

Compares CSV, Parquet, and Delta formats for size and scan characteristics.
All outputs are estimates with confidence labels and evidence.
"""

from dataclasses import dataclass, field
from typing import Literal


@dataclass
class FormatMetrics:
    """Metrics for a single file format."""
    
    estimated_size_bytes: float
    estimated_scan_mb_s: float
    compression_ratio: float
    explanation: str
    confidence: Literal["high", "medium", "low"] = "medium"


@dataclass
class FormatBenchmarkResult:
    """Benchmark results for all formats."""
    
    formats: dict[str, FormatMetrics]
    summary: str
    confidence: Literal["high", "medium", "low"] = "medium"


class FormatBenchmark:
    """Simulator for file format comparisons."""
    
    def simulate(self, raw_size_bytes: int, query_selectivity: float) -> FormatBenchmarkResult:
        """Simulate format benchmark.
        
        Args:
            raw_size_bytes: Uncompressed raw size
            query_selectivity: Fraction of columns/rows accessed (0-1)
        """
        if raw_size_bytes <= 0:
            return FormatBenchmarkResult(
                formats={},
                summary="Empty dataset — no format differences to measure.",
                confidence="high",
            )
        
        selectivity = max(0.0, min(1.0, query_selectivity))
        
        formats = {
            "csv": self._simulate_csv(raw_size_bytes, selectivity),
            "parquet": self._simulate_parquet(raw_size_bytes, selectivity),
            "delta": self._simulate_delta(raw_size_bytes, selectivity),
        }
        
        summary = (
            "Columnar formats (Parquet/Delta) typically compress better and "
            "scan faster for selective queries, while CSV favors simplicity. "
            "Actual results depend on data types, encodings, and storage layout."
        )
        
        return FormatBenchmarkResult(
            formats=formats,
            summary=summary,
            confidence="medium",
        )
    
    def _simulate_csv(self, raw_size_bytes: int, selectivity: float) -> FormatMetrics:
        compression_ratio = 1.0
        estimated_size = raw_size_bytes * compression_ratio
        # CSV scans all columns, so selectivity helps less
        scan_mb_s = 80 * (0.7 + 0.3 * (1 - selectivity))
        
        explanation = (
            "CSV is row-based and lacks column pruning. Compression is limited, "
            "so scans often read more data than needed."
        )
        
        return FormatMetrics(
            estimated_size_bytes=estimated_size,
            estimated_scan_mb_s=scan_mb_s,
            compression_ratio=compression_ratio,
            explanation=explanation,
            confidence="high",
        )
    
    def _simulate_parquet(self, raw_size_bytes: int, selectivity: float) -> FormatMetrics:
        compression_ratio = 0.35
        estimated_size = raw_size_bytes * compression_ratio
        # Columnar scans benefit from selectivity
        scan_mb_s = 200 * (0.6 + 0.4 * (1 - selectivity))
        
        explanation = (
            "Parquet is columnar with strong compression and predicate pushdown. "
            "Selective queries can skip irrelevant columns and row groups."
        )
        
        return FormatMetrics(
            estimated_size_bytes=estimated_size,
            estimated_scan_mb_s=scan_mb_s,
            compression_ratio=compression_ratio,
            explanation=explanation,
            confidence="medium",
        )
    
    def _simulate_delta(self, raw_size_bytes: int, selectivity: float) -> FormatMetrics:
        compression_ratio = 0.4
        estimated_size = raw_size_bytes * compression_ratio * 1.05  # log overhead
        scan_mb_s = 180 * (0.6 + 0.4 * (1 - selectivity))
        
        explanation = (
            "Delta builds on Parquet's columnar compression and predicate pushdown, "
            "with transaction logs and metadata adding small overhead."
        )
        
        return FormatMetrics(
            estimated_size_bytes=estimated_size,
            estimated_scan_mb_s=scan_mb_s,
            compression_ratio=compression_ratio,
            explanation=explanation,
            confidence="medium",
        )
