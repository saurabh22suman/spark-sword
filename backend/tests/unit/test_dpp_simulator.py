"""Tests for Dynamic Partition Pruning (DPP) Simulator."""

from app.simulators.dpp_simulator import (
    DPPSimulator,
    DPPResult,
)


def test_dpp_prunes_partitions_when_enabled():
    simulator = DPPSimulator()
    result = simulator.simulate(
        total_partitions=200,
        filter_selectivity=0.1,
        dynamic_pruning_enabled=True,
        broadcast_join=True,
    )
    
    assert isinstance(result, DPPResult)
    assert result.partitions_pruned > 0
    assert result.partitions_scanned < 200
    assert result.scan_reduction_pct > 0
    assert "runtime" in result.explanation.lower() or "dynamic" in result.explanation.lower()


def test_dpp_no_pruning_when_disabled():
    simulator = DPPSimulator()
    result = simulator.simulate(
        total_partitions=200,
        filter_selectivity=0.1,
        dynamic_pruning_enabled=False,
        broadcast_join=True,
    )
    
    assert result.partitions_pruned == 0
    assert result.partitions_scanned == 200
    assert "disabled" in result.explanation.lower()


def test_dpp_requires_broadcast_or_reused_filter():
    simulator = DPPSimulator()
    result = simulator.simulate(
        total_partitions=200,
        filter_selectivity=0.1,
        dynamic_pruning_enabled=True,
        broadcast_join=False,
    )
    
    assert result.partitions_pruned == 0
    assert "broadcast" in result.explanation.lower() or "build side" in result.explanation.lower()


def test_dpp_respects_selectivity_bounds():
    simulator = DPPSimulator()
    result = simulator.simulate(
        total_partitions=100,
        filter_selectivity=0.9,
        dynamic_pruning_enabled=True,
        broadcast_join=True,
    )
    
    # High selectivity = most data kept, so minimal pruning
    assert result.partitions_pruned < 20


def test_dpp_evidence_includes_selectivity_and_partitions():
    simulator = DPPSimulator()
    result = simulator.simulate(
        total_partitions=120,
        filter_selectivity=0.25,
        dynamic_pruning_enabled=True,
        broadcast_join=True,
    )
    
    assert "filter_selectivity" in result.evidence
    assert "total_partitions" in result.evidence
    assert "estimated_pruned_partitions" in result.evidence


def test_dpp_never_guarantees_improvement():
    simulator = DPPSimulator()
    result = simulator.simulate(
        total_partitions=100,
        filter_selectivity=0.2,
        dynamic_pruning_enabled=True,
        broadcast_join=True,
    )
    
    explanation = result.explanation.lower()
    assert "guarantee" not in explanation
    assert "always" not in explanation
    assert any(word in explanation for word in ["may", "can", "typically", "potential"])


def test_dpp_handles_zero_partitions_gracefully():
    simulator = DPPSimulator()
    result = simulator.simulate(
        total_partitions=0,
        filter_selectivity=0.5,
        dynamic_pruning_enabled=True,
        broadcast_join=True,
    )
    
    assert result.partitions_scanned == 0
    assert "empty" in result.explanation.lower() or "no partitions" in result.explanation.lower()
