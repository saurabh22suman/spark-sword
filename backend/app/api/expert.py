"""
API endpoints for expert-level Spark components.

This module provides advanced simulators for expert users:
- AQE (Adaptive Query Execution) simulator
- DPP (Dynamic Partition Pruning) visualizer
- Bucketing ROI calculator
- File format benchmark
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.simulators.aqe_simulator import AQESimulator
from app.simulators.bucketing_calculator import BucketingCalculator
from app.simulators.dpp_simulator import DPPSimulator
from app.simulators.format_benchmark import FormatBenchmark
from app.simulators.shape_playground import DataFrameShape


router = APIRouter(prefix="/expert", tags=["expert"])


# ============================================================================
# AQE Simulator Models
# ============================================================================


class AQESimulateRequest(BaseModel):
    """Request for AQE simulation."""
    
    rows: int = Field(ge=0, description="Number of rows")
    partitions: int = Field(ge=1, description="Number of partitions")
    skew_factor: float = Field(ge=1.0, le=1000.0, description="Skew factor (1.0 = balanced)")
    avg_row_size_bytes: int = Field(ge=1, description="Average row size in bytes")
    operation_type: str = Field(description="Operation type (join, groupby, filter, etc.)")
    aqe_enabled: bool = Field(default=True, description="Whether AQE is enabled")


class AQEOptimizationResponse(BaseModel):
    """Single AQE optimization response."""
    
    optimization_type: str
    explanation: str
    before_value: str
    after_value: str
    confidence: str


class AQESimulationResponse(BaseModel):
    """Full AQE simulation response."""
    
    aqe_enabled: bool
    optimizations_applied: list[AQEOptimizationResponse]
    before_metrics: dict[str, float]
    after_metrics: dict[str, float]
    summary: str
    confidence: str


class AQECoalesceRequest(BaseModel):
    """Request for AQE partition coalescing simulation."""
    
    rows: int = Field(ge=0)
    partitions: int = Field(ge=1)
    avg_row_size_bytes: int = Field(ge=1)
    post_shuffle_bytes: int = Field(ge=0)
    target_partition_size_bytes: int = Field(default=128*1024*1024, ge=1)


class AQESkewJoinRequest(BaseModel):
    """Request for AQE skew join simulation."""
    
    rows: int = Field(ge=0)
    partitions: int = Field(ge=1)
    skew_factor: float = Field(ge=1.0, le=1000.0)
    avg_row_size_bytes: int = Field(ge=1)
    skew_threshold_factor: float = Field(default=5.0, ge=1.0)


class AQEJoinStrategyRequest(BaseModel):
    """Request for AQE join strategy simulation."""
    
    left_rows: int = Field(ge=0)
    left_avg_row_size_bytes: int = Field(ge=1)
    right_rows: int = Field(ge=0)
    right_avg_row_size_bytes: int = Field(ge=1)
    broadcast_threshold_bytes: int = Field(default=10*1024*1024, ge=1)


# ============================================================================
# DPP Simulator Models
# ============================================================================


class DPPSimulateRequest(BaseModel):
    """Request for Dynamic Partition Pruning simulation."""
    
    total_partitions: int = Field(ge=0)
    filter_selectivity: float = Field(ge=0.0, le=1.0)
    dynamic_pruning_enabled: bool = Field(default=True)
    broadcast_join: bool = Field(default=True)


# ============================================================================
# Bucketing Calculator Models
# ============================================================================


class BucketingSimulateRequest(BaseModel):
    """Request for bucketing ROI simulation."""
    
    left_rows: int = Field(ge=0)
    right_rows: int = Field(ge=0)
    avg_row_size_bytes: int = Field(ge=1)
    bucket_count: int = Field(ge=1)
    buckets_aligned: bool = Field(default=True)


# ============================================================================
# Format Benchmark Models
# ============================================================================


class FormatBenchmarkRequest(BaseModel):
    """Request for format benchmark simulation."""
    
    raw_size_bytes: int = Field(ge=0)
    query_selectivity: float = Field(ge=0.0, le=1.0)


# ============================================================================
# AQE Simulator Endpoints
# ============================================================================


@router.post("/aqe/simulate", response_model=AQESimulationResponse)
async def simulate_aqe(request: AQESimulateRequest) -> AQESimulationResponse:
    """Simulate Adaptive Query Execution (AQE) optimizations.
    
    This endpoint simulates how AQE would optimize a query at runtime based on
    actual data statistics. AQE makes three main optimizations:
    
    1. Coalesce shuffle partitions (reduce small partitions)
    2. Handle skewed joins (split large partitions)
    3. Dynamically switch join strategies (e.g., SortMerge → Broadcast)
    
    All simulations are shape-based and evidence-driven. They show what AQE
    *would do*, not guaranteed performance improvements.
    
    Args:
        request: AQE simulation request with DataFrame shape and operation type
        
    Returns:
        AQE simulation result with all applicable optimizations
        
    Example:
        ```
        POST /expert/aqe/simulate
        {
          "rows": 10000000,
          "partitions": 200,
          "skew_factor": 5.0,
          "avg_row_size_bytes": 100,
          "operation_type": "join",
          "aqe_enabled": true
        }
        ```
    """
    try:
        # Create DataFrame shape
        shape = DataFrameShape(
            rows=request.rows,
            partitions=request.partitions,
            skew_factor=request.skew_factor,
            avg_row_size_bytes=request.avg_row_size_bytes,
        )
        
        # Run AQE simulation
        simulator = AQESimulator()
        result = simulator.simulate_full_aqe(
            shape=shape,
            operation_type=request.operation_type,
            aqe_enabled=request.aqe_enabled,
        )
        
        # Convert to response format
        return AQESimulationResponse(
            aqe_enabled=result.aqe_enabled,
            optimizations_applied=[
                AQEOptimizationResponse(
                    optimization_type=opt.optimization_type.value,
                    explanation=opt.explanation,
                    before_value=opt.before_value,
                    after_value=opt.after_value,
                    confidence=opt.confidence,
                )
                for opt in result.optimizations_applied
            ],
            before_metrics=result.before_metrics,
            after_metrics=result.after_metrics,
            summary=result.summary,
            confidence=result.confidence,
        )
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"AQE simulation failed: {str(e)}")


@router.post("/aqe/coalesce", response_model=dict)
async def simulate_aqe_coalesce(request: AQECoalesceRequest) -> dict:
    """Simulate AQE partition coalescing.
    
    This endpoint simulates how AQE would coalesce small partitions after a
    shuffle operation based on runtime statistics.
    
    Args:
        request: AQE coalescing request with DataFrame shape and shuffle size
        
    Returns:
        Partition coalescing simulation result
    """
    try:
        shape = DataFrameShape(
            rows=request.rows,
            partitions=request.partitions,
            avg_row_size_bytes=request.avg_row_size_bytes,
        )
        
        simulator = AQESimulator()
        result = simulator.simulate_coalesce(
            shape=shape,
            post_shuffle_bytes=request.post_shuffle_bytes,
            target_partition_size_bytes=request.target_partition_size_bytes,
        )
        
        return {
            "before_partitions": result.before_partitions,
            "after_partitions": result.after_partitions,
            "optimization_triggered": result.optimization_triggered,
            "explanation": result.explanation,
            "evidence": result.evidence,
            "confidence": result.confidence,
        }
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Coalesce simulation failed: {str(e)}")


@router.post("/aqe/skew-join", response_model=dict)
async def simulate_aqe_skew_join(request: AQESkewJoinRequest) -> dict:
    """Simulate AQE skew join handling.
    
    This endpoint simulates how AQE would detect and handle skewed partitions
    in a join operation by splitting large partitions.
    
    Args:
        request: AQE skew join request with DataFrame shape and skew parameters
        
    Returns:
        Skew join handling simulation result
    """
    try:
        shape = DataFrameShape(
            rows=request.rows,
            partitions=request.partitions,
            skew_factor=request.skew_factor,
            avg_row_size_bytes=request.avg_row_size_bytes,
        )
        
        simulator = AQESimulator()
        result = simulator.simulate_skew_join(
            left_shape=shape,
            right_shape=shape,
            skew_threshold_factor=request.skew_threshold_factor,
        )
        
        return {
            "skew_detected": result.skew_detected,
            "optimization_applied": result.optimization_applied,
            "num_skewed_partitions": result.num_skewed_partitions,
            "num_splits": result.num_splits,
            "estimated_task_time_reduction_pct": result.estimated_task_time_reduction_pct,
            "explanation": result.explanation,
            "evidence": result.evidence,
            "confidence": result.confidence,
        }
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Skew join simulation failed: {str(e)}")


@router.post("/aqe/join-strategy", response_model=dict)
async def simulate_aqe_join_strategy(request: AQEJoinStrategyRequest) -> dict:
    """Simulate AQE dynamic join strategy switching.
    
    This endpoint simulates how AQE would dynamically switch join strategies
    (e.g., SortMergeJoin → BroadcastHashJoin) based on runtime table sizes.
    
    Args:
        request: AQE join strategy request with left/right table shapes
        
    Returns:
        Join strategy switching simulation result
    """
    try:
        left_shape = DataFrameShape(
            rows=request.left_rows,
            avg_row_size_bytes=request.left_avg_row_size_bytes,
        )
        
        right_shape = DataFrameShape(
            rows=request.right_rows,
            avg_row_size_bytes=request.right_avg_row_size_bytes,
        )
        
        simulator = AQESimulator()
        result = simulator.simulate_dynamic_join_strategy(
            left_shape=left_shape,
            right_shape=right_shape,
            broadcast_threshold_bytes=request.broadcast_threshold_bytes,
        )
        
        return {
            "original_strategy": result.original_strategy,
            "optimized_strategy": result.optimized_strategy,
            "strategy_changed": result.strategy_changed,
            "explanation": result.explanation,
            "evidence": result.evidence,
            "confidence": result.confidence,
        }
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Join strategy simulation failed: {str(e)}")


# ============================================================================
# DPP Simulator Endpoints
# ============================================================================


@router.post("/dpp/simulate", response_model=dict)
async def simulate_dpp(request: DPPSimulateRequest) -> dict:
    """Simulate Dynamic Partition Pruning (DPP)."""
    try:
        simulator = DPPSimulator()
        result = simulator.simulate(
            total_partitions=request.total_partitions,
            filter_selectivity=request.filter_selectivity,
            dynamic_pruning_enabled=request.dynamic_pruning_enabled,
            broadcast_join=request.broadcast_join,
        )
        
        return {
            "total_partitions": result.total_partitions,
            "partitions_pruned": result.partitions_pruned,
            "partitions_scanned": result.partitions_scanned,
            "scan_reduction_pct": result.scan_reduction_pct,
            "explanation": result.explanation,
            "evidence": result.evidence,
            "confidence": result.confidence,
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"DPP simulation failed: {str(e)}")


# ============================================================================
# Bucketing Calculator Endpoints
# ============================================================================


@router.post("/bucketing/simulate", response_model=dict)
async def simulate_bucketing(request: BucketingSimulateRequest) -> dict:
    """Simulate bucketing ROI and trade-offs."""
    try:
        calculator = BucketingCalculator()
        result = calculator.simulate(
            left_rows=request.left_rows,
            right_rows=request.right_rows,
            avg_row_size_bytes=request.avg_row_size_bytes,
            bucket_count=request.bucket_count,
            buckets_aligned=request.buckets_aligned,
        )
        
        return {
            "bucket_count": result.bucket_count,
            "shuffle_reduction_pct": result.shuffle_reduction_pct,
            "storage_overhead_pct": result.storage_overhead_pct,
            "explanation": result.explanation,
            "evidence": result.evidence,
            "confidence": result.confidence,
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Bucketing simulation failed: {str(e)}")


# ============================================================================
# Format Benchmark Endpoints
# ============================================================================


@router.post("/format-benchmark/simulate", response_model=dict)
async def simulate_format_benchmark(request: FormatBenchmarkRequest) -> dict:
    """Simulate file format benchmark (CSV vs Parquet vs Delta)."""
    try:
        benchmark = FormatBenchmark()
        result = benchmark.simulate(
            raw_size_bytes=request.raw_size_bytes,
            query_selectivity=request.query_selectivity,
        )
        
        return {
            "formats": {
                name: {
                    "estimated_size_bytes": metrics.estimated_size_bytes,
                    "estimated_scan_mb_s": metrics.estimated_scan_mb_s,
                    "compression_ratio": metrics.compression_ratio,
                    "explanation": metrics.explanation,
                    "confidence": metrics.confidence,
                }
                for name, metrics in result.formats.items()
            },
            "summary": result.summary,
            "confidence": result.confidence,
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Format benchmark failed: {str(e)}")
