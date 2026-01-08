"""Unit tests for DAG builder.

These tests validate that the DAG builder:
- Correctly reconstructs job/stage relationships
- Detects shuffle boundaries (wide transformations)
- Does not infer fake dependencies

Reference: test.md Section 8.2 DAG Builder
"""

import pytest

from app.analyzers.dag_builder import DAGBuilder, ExecutionDAG
from app.models.spark_events import JobInfo, ParsedEventLog, StageInfo


class TestDAGBuilderJobStageRelationships:
    """Tests for job-stage relationship reconstruction."""

    def test_job_stage_relationships(self) -> None:
        """Jobs should correctly reference their stages.
        
        The DAG builder must reconstruct the relationship between
        jobs and their constituent stages based on event log data.
        """
        # Given a parsed event log with job-stage relationships
        parsed_log = ParsedEventLog(
            application_id="test-app",
            jobs=[
                JobInfo(job_id=0, stage_ids=[0, 1, 2]),
                JobInfo(job_id=1, stage_ids=[3, 4]),
            ],
            stages=[
                StageInfo(stage_id=0, parent_ids=[]),
                StageInfo(stage_id=1, parent_ids=[0]),
                StageInfo(stage_id=2, parent_ids=[1]),
                StageInfo(stage_id=3, parent_ids=[]),
                StageInfo(stage_id=4, parent_ids=[3]),
            ],
        )

        # When we build the DAG
        builder = DAGBuilder()
        dag = builder.build(parsed_log)

        # Then job nodes exist
        job_nodes = [n for n in dag.nodes if n.node_type == "job"]
        assert len(job_nodes) == 2

        # And stage nodes exist
        stage_nodes = [n for n in dag.nodes if n.node_type == "stage"]
        assert len(stage_nodes) == 5

        # And job-stage containment edges exist
        contains_edges = [e for e in dag.edges if e.edge_type == "contains"]
        assert len(contains_edges) == 5  # 3 for job 0, 2 for job 1

    def test_shuffle_boundary_detection(self) -> None:
        """Stages with shuffle reads indicate wide transformation boundaries.
        
        When a stage reads shuffle data, it indicates a shuffle boundary
        caused by a wide transformation (groupBy, join, repartition, etc.)
        """
        # Given stages with shuffle metrics
        parsed_log = ParsedEventLog(
            stages=[
                StageInfo(stage_id=0, shuffle_write_bytes=1024 * 1024),
                StageInfo(stage_id=1, shuffle_read_bytes=1024 * 1024, parent_ids=[0]),
            ],
        )

        # When we check for shuffle boundaries
        builder = DAGBuilder()
        boundaries = builder.get_shuffle_boundaries(parsed_log)

        # Then stage 1 is identified as a shuffle boundary
        assert 1 in boundaries
        assert 0 not in boundaries  # Stage 0 writes shuffle but doesn't read

    def test_no_fake_dependencies(self) -> None:
        """DAG should not contain inferred/fake edges.
        
        The DAG builder must only include dependencies that are
        explicitly present in the Spark event log, never inferred.
        """
        # Given stages with explicit parent relationships only
        parsed_log = ParsedEventLog(
            stages=[
                StageInfo(stage_id=0, parent_ids=[]),
                StageInfo(stage_id=1, parent_ids=[0]),
                StageInfo(stage_id=2, parent_ids=[]),  # Independent stage
            ],
        )

        # When we build the DAG
        builder = DAGBuilder()
        dag = builder.build(parsed_log)

        # Then only explicitly declared dependencies exist
        depend_edges = [e for e in dag.edges if e.edge_type in ("shuffle", "narrow")]
        
        # Only 1 dependency: stage 1 depends on stage 0
        assert len(depend_edges) == 1
        assert depend_edges[0].source == "stage_0"
        assert depend_edges[0].target == "stage_1"


class TestDAGBuilderAdvanced:
    """Advanced tests for DAG builder functionality."""

    def test_dag_export_to_dict(self) -> None:
        """DAG should be exportable to dictionary for JSON serialization."""
        parsed_log = ParsedEventLog(
            jobs=[JobInfo(job_id=0, stage_ids=[0])],
            stages=[StageInfo(stage_id=0, name="Test Stage")],
        )

        builder = DAGBuilder()
        dag = builder.build(parsed_log)
        exported = dag.to_dict()

        assert "nodes" in exported
        assert "edges" in exported
        assert len(exported["nodes"]) == 2  # 1 job + 1 stage
        # New format wraps label in data
        assert exported["nodes"][1]["data"]["label"] == "Test Stage"

    def test_stage_lineage_tracking(self) -> None:
        """Stage lineage should trace all ancestor stages."""
        parsed_log = ParsedEventLog(
            stages=[
                StageInfo(stage_id=0, parent_ids=[]),
                StageInfo(stage_id=1, parent_ids=[0]),
                StageInfo(stage_id=2, parent_ids=[1]),
                StageInfo(stage_id=3, parent_ids=[0, 2]),  # Multiple parents
            ],
        )

        builder = DAGBuilder()
        lineage = builder.get_stage_lineage(3, parsed_log)

        # Stage 3 depends on 0, 1, 2 (transitively)
        assert 0 in lineage
        assert 1 in lineage
        assert 2 in lineage
        assert 3 not in lineage  # Stage itself not in lineage

    def test_shuffle_edge_labeling(self) -> None:
        """Edges after shuffle-writing stages should be labeled as shuffle."""
        parsed_log = ParsedEventLog(
            stages=[
                StageInfo(stage_id=0, shuffle_write_bytes=1000000),
                StageInfo(stage_id=1, shuffle_read_bytes=1000000, parent_ids=[0]),
            ],
        )

        builder = DAGBuilder()
        dag = builder.build(parsed_log)

        # Find the dependency edge
        depend_edges = [e for e in dag.edges if e.source == "stage_0"]
        assert len(depend_edges) == 1
        assert depend_edges[0].edge_type == "shuffle"

    def test_stage_metadata_includes_metrics(self) -> None:
        """Stage nodes should include key metrics in metadata."""
        parsed_log = ParsedEventLog(
            stages=[
                StageInfo(
                    stage_id=0,
                    num_tasks=100,
                    input_bytes=1000000,
                    shuffle_write_bytes=500000,
                    spill_bytes=50000,
                ),
            ],
        )

        builder = DAGBuilder()
        dag = builder.build(parsed_log)

        stage_node = dag.nodes[0]
        assert stage_node.metadata["num_tasks"] == 100
        assert stage_node.metadata["input_bytes"] == 1000000
        assert stage_node.metadata["shuffle_write_bytes"] == 500000
        assert stage_node.metadata["spill_bytes"] == 50000

