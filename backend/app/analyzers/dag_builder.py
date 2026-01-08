"""DAG Builder for Spark execution graph reconstruction.

This module reconstructs the Directed Acyclic Graph (DAG) of Spark jobs and stages
from parsed event log data. It provides:

- Job → Stage relationships
- Stage → Stage dependencies (parent/child)
- Shuffle boundary detection
- Graph export for visualization

All relationships are based on actual Spark event data - no inference or guessing.
"""

from dataclasses import dataclass, field
from typing import Any

from app.models.spark_events import JobInfo, ParsedEventLog, StageInfo


@dataclass
class DAGNode:
    """A node in the execution DAG."""

    id: str
    node_type: str  # "job" or "stage"
    label: str
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class DAGEdge:
    """An edge in the execution DAG."""

    source: str
    target: str
    edge_type: str  # "contains" (job->stage) or "depends" (stage->stage)
    label: str = ""


@dataclass
class ExecutionDAG:
    """Complete execution DAG with nodes and edges."""

    nodes: list[DAGNode] = field(default_factory=list)
    edges: list[DAGEdge] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        """Export DAG to dictionary format for JSON serialization.
        
        Format matches frontend DAGNodeWrapper interface:
        { id, type, data: { id, type, label, metadata } }
        """
        return {
            "nodes": [
                {
                    "id": n.id,
                    "type": n.node_type,
                    "data": {
                        "id": n.id,
                        "type": n.node_type,
                        "label": n.label,
                        "metadata": n.metadata,
                    },
                }
                for n in self.nodes
            ],
            "edges": [
                {
                    "source": e.source,
                    "target": e.target,
                    "type": e.edge_type,
                    "label": e.label,
                }
                for e in self.edges
            ],
        }


class DAGBuilder:
    """Builds execution DAG from parsed Spark event logs.

    The DAG builder reconstructs the execution graph by:
    1. Creating nodes for each job and stage
    2. Creating edges for job-stage containment
    3. Creating edges for stage dependencies (parent_ids)
    4. Detecting shuffle boundaries from metrics

    It NEVER infers relationships that aren't explicit in the event data.
    """

    def __init__(self) -> None:
        """Initialize the DAG builder."""
        self._nodes: list[DAGNode] = []
        self._edges: list[DAGEdge] = []

    def build(self, parsed_log: ParsedEventLog) -> ExecutionDAG:
        """Build the execution DAG from a parsed event log.

        Args:
            parsed_log: The parsed Spark event log.

        Returns:
            ExecutionDAG containing all nodes and edges.
        """
        self._reset()

        # Build job nodes
        for job in parsed_log.jobs:
            self._add_job_node(job)

        # Build stage nodes and edges
        stage_map = {s.stage_id: s for s in parsed_log.stages}
        for stage in parsed_log.stages:
            self._add_stage_node(stage)
            self._add_stage_dependencies(stage, stage_map)

        # Build job-stage containment edges
        for job in parsed_log.jobs:
            self._add_job_stage_edges(job)

        return ExecutionDAG(nodes=self._nodes, edges=self._edges)

    def _reset(self) -> None:
        """Reset builder state."""
        self._nodes = []
        self._edges = []

    def _add_job_node(self, job: JobInfo) -> None:
        """Add a job node to the DAG."""
        node = DAGNode(
            id=f"job_{job.job_id}",
            node_type="job",
            label=f"Job {job.job_id}",
            metadata={
                "job_id": job.job_id,
                "status": job.status,
                "stage_count": len(job.stage_ids),
                "submission_time": job.submission_time,
                "completion_time": job.completion_time,
            },
        )
        self._nodes.append(node)

    def _add_stage_node(self, stage: StageInfo) -> None:
        """Add a stage node to the DAG."""
        # Detect if this is a shuffle boundary
        has_shuffle_read = stage.shuffle_read_bytes > 0
        has_shuffle_write = stage.shuffle_write_bytes > 0

        node = DAGNode(
            id=f"stage_{stage.stage_id}",
            node_type="stage",
            label=stage.name or f"Stage {stage.stage_id}",
            metadata={
                "stage_id": stage.stage_id,
                "attempt_id": stage.attempt_id,
                "status": stage.status,
                "num_tasks": stage.num_tasks,
                "has_shuffle_read": has_shuffle_read,
                "has_shuffle_write": has_shuffle_write,
                "is_shuffle_boundary": has_shuffle_read,
                "input_bytes": stage.input_bytes,
                "output_bytes": stage.output_bytes,
                "shuffle_read_bytes": stage.shuffle_read_bytes,
                "shuffle_write_bytes": stage.shuffle_write_bytes,
                "spill_bytes": stage.spill_bytes,
            },
        )
        self._nodes.append(node)

    def _add_stage_dependencies(
        self, stage: StageInfo, stage_map: dict[int, StageInfo]
    ) -> None:
        """Add edges for stage dependencies based on parent_ids.

        Only creates edges for explicitly declared parent relationships.
        Never infers dependencies.
        """
        for parent_id in stage.parent_ids:
            if parent_id in stage_map:
                # Determine if this is a shuffle dependency
                parent = stage_map[parent_id]
                is_shuffle = parent.shuffle_write_bytes > 0

                edge = DAGEdge(
                    source=f"stage_{parent_id}",
                    target=f"stage_{stage.stage_id}",
                    edge_type="shuffle" if is_shuffle else "narrow",
                    label="shuffle" if is_shuffle else "",
                )
                self._edges.append(edge)

    def _add_job_stage_edges(self, job: JobInfo) -> None:
        """Add containment edges from job to its stages."""
        for stage_id in job.stage_ids:
            edge = DAGEdge(
                source=f"job_{job.job_id}",
                target=f"stage_{stage_id}",
                edge_type="contains",
            )
            self._edges.append(edge)

    def get_shuffle_boundaries(self, parsed_log: ParsedEventLog) -> list[int]:
        """Identify stages that are shuffle boundaries.

        A shuffle boundary is a stage that reads shuffle data,
        indicating a wide transformation in the preceding stage.

        Returns:
            List of stage IDs that are shuffle boundaries.
        """
        return [
            stage.stage_id
            for stage in parsed_log.stages
            if stage.shuffle_read_bytes > 0
        ]

    def get_stage_lineage(
        self, stage_id: int, parsed_log: ParsedEventLog
    ) -> list[int]:
        """Get the lineage (ancestors) of a stage.

        Returns all stages that this stage depends on, directly or transitively.

        Args:
            stage_id: The stage to trace lineage for.
            parsed_log: The parsed event log.

        Returns:
            List of ancestor stage IDs in dependency order.
        """
        stage_map = {s.stage_id: s for s in parsed_log.stages}
        lineage: list[int] = []
        visited: set[int] = set()

        def trace(sid: int) -> None:
            if sid in visited or sid not in stage_map:
                return
            visited.add(sid)
            stage = stage_map[sid]
            for parent_id in stage.parent_ids:
                trace(parent_id)
                if parent_id not in lineage:
                    lineage.append(parent_id)

        trace(stage_id)
        return lineage
