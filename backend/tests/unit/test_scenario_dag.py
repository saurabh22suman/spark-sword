"""Tests for Scenario DAG Component.

Per scenario-dag-spec.md Part A, the Scenario DAG is a teaching DAG that shows:
- "How does Spark execute this scenario?"
- Stage boundaries and shuffles at a glance

Testing Requirements (from spec A6):
- Snapshot test per scenario
- Assert correct node order
- Assert shuffle presence/absence
- Assert stage count
"""

import pytest
from app.scenarios import get_scenario_by_id, list_scenarios
from app.scenarios.dag import (
    DAGNodeType,
    ScenarioDAGNode,
    ScenarioDAG,
    build_scenario_dag,
)


class TestDAGNodeTypes:
    """Tests for DAG node type enumeration."""

    def test_all_allowed_node_types_exist(self) -> None:
        """Per spec A3.2, only these node types are allowed."""
        assert DAGNodeType.READ.value == "read"
        assert DAGNodeType.NARROW_OP.value == "narrow_op"
        assert DAGNodeType.SHUFFLE.value == "shuffle"
        assert DAGNodeType.JOIN.value == "join"
        assert DAGNodeType.AGGREGATE.value == "aggregate"
        assert DAGNodeType.SORT.value == "sort"
        assert DAGNodeType.WRITE.value == "write"

    def test_no_custom_node_types(self) -> None:
        """Per spec: No custom nodes allowed."""
        # Should have exactly 7 node types
        assert len(DAGNodeType) == 7


class TestScenarioDAGNode:
    """Tests for individual DAG nodes."""

    def test_node_has_required_fields(self) -> None:
        """Each node must have type, label, stage, and explanation."""
        node = ScenarioDAGNode(
            node_type=DAGNodeType.READ,
            label="Read Orders",
            stage=1,
            what_spark_does="Scans parquet files from S3",
            why_required="Input data must be loaded before processing",
        )
        
        assert node.node_type == DAGNodeType.READ
        assert node.label == "Read Orders"
        assert node.stage == 1
        assert len(node.what_spark_does) > 0
        assert len(node.why_required) > 0

    def test_node_has_is_stage_boundary_flag(self) -> None:
        """Shuffle nodes indicate stage boundaries."""
        shuffle_node = ScenarioDAGNode(
            node_type=DAGNodeType.SHUFFLE,
            label="Shuffle",
            stage=2,
            what_spark_does="Redistributes data by key",
            why_required="GroupBy requires all same keys on same executor",
            is_stage_boundary=True,
        )
        
        assert shuffle_node.is_stage_boundary is True

    def test_node_serialization(self) -> None:
        """Nodes can be serialized to dict for API."""
        node = ScenarioDAGNode(
            node_type=DAGNodeType.AGGREGATE,
            label="Aggregate",
            stage=2,
            what_spark_does="Computes sum per group",
            why_required="Business requirement to total orders",
        )
        
        d = node.to_dict()
        assert d["node_type"] == "aggregate"
        assert d["label"] == "Aggregate"
        assert d["stage"] == 2


class TestScenarioDAG:
    """Tests for complete Scenario DAGs."""

    def test_dag_has_nodes_in_order(self) -> None:
        """DAG preserves node order (top to bottom per spec A3.1)."""
        dag = ScenarioDAG(
            nodes=[
                ScenarioDAGNode(DAGNodeType.READ, "Read", 1, "Load", "Input"),
                ScenarioDAGNode(DAGNodeType.SHUFFLE, "Shuffle", 2, "Move", "GroupBy", is_stage_boundary=True),
                ScenarioDAGNode(DAGNodeType.WRITE, "Write", 2, "Save", "Output"),
            ],
            stage_count=2,
            shuffle_count=1,
        )
        
        assert len(dag.nodes) == 3
        assert dag.nodes[0].node_type == DAGNodeType.READ
        assert dag.nodes[1].node_type == DAGNodeType.SHUFFLE
        assert dag.nodes[2].node_type == DAGNodeType.WRITE

    def test_dag_tracks_stage_count(self) -> None:
        """DAG knows total stage count."""
        dag = ScenarioDAG(
            nodes=[
                ScenarioDAGNode(DAGNodeType.READ, "Read", 1, "Load", "Input"),
                ScenarioDAGNode(DAGNodeType.WRITE, "Write", 1, "Save", "Output"),
            ],
            stage_count=1,
            shuffle_count=0,
        )
        
        assert dag.stage_count == 1

    def test_dag_tracks_shuffle_count(self) -> None:
        """DAG knows total shuffle count."""
        dag = ScenarioDAG(
            nodes=[
                ScenarioDAGNode(DAGNodeType.READ, "Read", 1, "Load", "Input"),
                ScenarioDAGNode(DAGNodeType.SHUFFLE, "Shuffle", 2, "Move", "Redistribute", is_stage_boundary=True),
                ScenarioDAGNode(DAGNodeType.AGGREGATE, "Agg", 2, "Sum", "Compute"),
            ],
            stage_count=2,
            shuffle_count=1,
        )
        
        assert dag.shuffle_count == 1

    def test_dag_serialization(self) -> None:
        """DAG can be serialized to dict for API."""
        dag = ScenarioDAG(
            nodes=[
                ScenarioDAGNode(DAGNodeType.READ, "Read", 1, "Load", "Input"),
            ],
            stage_count=1,
            shuffle_count=0,
        )
        
        d = dag.to_dict()
        assert "nodes" in d
        assert "stage_count" in d
        assert "shuffle_count" in d
        assert len(d["nodes"]) == 1


class TestBuildScenarioDAG:
    """Tests for DAG building from scenarios."""

    def test_simple_filter_dag(self) -> None:
        """Simple filter scenario has single stage, no shuffle."""
        dag = build_scenario_dag("simple_filter")
        
        assert dag is not None
        assert dag.stage_count == 1
        assert dag.shuffle_count == 0
        # Should have: Read → Filter → Write
        assert len(dag.nodes) >= 2
        assert dag.nodes[0].node_type == DAGNodeType.READ

    def test_groupby_dag(self) -> None:
        """GroupBy scenario has 2 stages, 1 shuffle."""
        dag = build_scenario_dag("groupby_aggregation")
        
        assert dag is not None
        assert dag.stage_count == 2
        assert dag.shuffle_count == 1
        # Should have shuffle node
        shuffle_nodes = [n for n in dag.nodes if n.node_type == DAGNodeType.SHUFFLE]
        assert len(shuffle_nodes) == 1
        assert shuffle_nodes[0].is_stage_boundary is True

    def test_join_without_broadcast_dag(self) -> None:
        """Join scenario has 3 stages, 2 shuffles."""
        dag = build_scenario_dag("join_without_broadcast")
        
        assert dag is not None
        assert dag.stage_count == 3
        assert dag.shuffle_count == 2

    def test_dag_matches_scenario_expected_values(self) -> None:
        """DAG stage/shuffle counts match scenario expected values."""
        # Original 12 scenarios have DAG implementations
        # New Reddit pain point scenarios (13-24) don't have DAGs yet - skip them
        scenarios_with_dags = [
            "simple_filter", "groupby_aggregation", "join_without_broadcast",
            "skewed_join_key", "too_many_output_files", "multi_step_etl",
            "pre_aggregation_join", "window_function", "skewed_aggregation",
            "star_schema_join", "write_amplification", "union_aggregation"
        ]
        
        for scenario in list_scenarios():
            if scenario.id not in scenarios_with_dags:
                continue  # Skip scenarios without DAG implementations
                
            dag = build_scenario_dag(scenario.id)
            assert dag is not None, f"No DAG for {scenario.id}"
            assert dag.stage_count == scenario.expected_stages, \
                f"Stage mismatch for {scenario.id}: {dag.stage_count} != {scenario.expected_stages}"
            assert dag.shuffle_count == scenario.expected_shuffles, \
                f"Shuffle mismatch for {scenario.id}: {dag.shuffle_count} != {scenario.expected_shuffles}"

    def test_nonexistent_scenario_returns_none(self) -> None:
        """Building DAG for nonexistent scenario returns None."""
        dag = build_scenario_dag("nonexistent_scenario")
        assert dag is None


class TestDAGNodeExplanations:
    """Tests that every node has proper explanations per spec A4."""

    def test_every_node_has_what_explanation(self) -> None:
        """Every DAG node must explain what Spark is doing."""
        for scenario in list_scenarios():
            dag = build_scenario_dag(scenario.id)
            if dag:
                for node in dag.nodes:
                    assert len(node.what_spark_does) > 0, \
                        f"Node {node.label} in {scenario.id} missing 'what' explanation"

    def test_every_node_has_why_explanation(self) -> None:
        """Every DAG node must explain why it is required."""
        for scenario in list_scenarios():
            dag = build_scenario_dag(scenario.id)
            if dag:
                for node in dag.nodes:
                    assert len(node.why_required) > 0, \
                        f"Node {node.label} in {scenario.id} missing 'why' explanation"

    def test_shuffle_explanation_mentions_key_movement(self) -> None:
        """Shuffle node explanation should mention key movement."""
        dag = build_scenario_dag("groupby_aggregation")
        shuffle_node = next(n for n in dag.nodes if n.node_type == DAGNodeType.SHUFFLE)
        
        # Should mention moving/redistributing data or keys
        explanation = shuffle_node.what_spark_does.lower()
        assert any(word in explanation for word in ["move", "redistribute", "key", "shuffle", "same executor"])


class TestStageBoundaries:
    """Tests for stage boundary visualization per spec A3.3."""

    def test_shuffle_nodes_are_stage_boundaries(self) -> None:
        """Every shuffle node must be marked as stage boundary."""
        for scenario in list_scenarios():
            dag = build_scenario_dag(scenario.id)
            if dag:
                for node in dag.nodes:
                    if node.node_type == DAGNodeType.SHUFFLE:
                        assert node.is_stage_boundary is True, \
                            f"Shuffle node in {scenario.id} not marked as boundary"

    def test_non_shuffle_nodes_not_stage_boundaries(self) -> None:
        """Non-shuffle nodes should not be stage boundaries."""
        dag = build_scenario_dag("simple_filter")
        for node in dag.nodes:
            if node.node_type != DAGNodeType.SHUFFLE:
                assert node.is_stage_boundary is False, \
                    f"Non-shuffle node {node.label} incorrectly marked as boundary"
