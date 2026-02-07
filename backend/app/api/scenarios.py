"""Scenario API endpoints.

Provides endpoints for:
- Listing all available scenarios
- Getting a specific scenario by ID
- Loading scenario with its simulated execution data
- Getting scenario DAG for visualization

Per spec Section 5, each scenario must:
- Appear in a "Scenarios" panel or dropdown
- Auto-load event log (or simulated equivalent) and playground parameters

Per scenario-dag-spec.md:
- Scenario DAG embedded in scenario detail view
- DAG represents logical Spark execution shape
"""

from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.scenarios import get_scenario_by_id, list_scenarios, Scenario
from app.scenarios.dag import build_scenario_dag, ScenarioDAG
from app.simulators.shape_playground import DataFrameShape, ShapePlayground


router = APIRouter(prefix="/api/scenarios", tags=["scenarios"])


class ScenarioSummary(BaseModel):
    """Summary of a scenario for listing."""
    id: str
    title: str
    level: str
    spark_concepts: list[str]
    real_world_context: str


class ScenarioDetail(BaseModel):
    """Full scenario details."""
    id: str
    title: str
    level: str
    spark_concepts: list[str]
    real_world_context: str
    story: str
    logical_operations: list[str]
    expected_stages: int
    expected_shuffles: int
    expected_skew: bool
    evidence_signals: list[str]
    explanation_goal: str
    playground_defaults: dict
    learning_goals: list[str] = []
    key_takeaways: list[str] = []
    common_mistakes: list[str] = []


class DAGNodeResponse(BaseModel):
    """A node in the scenario DAG."""
    node_type: str
    label: str
    stage: int
    what_spark_does: str
    why_required: str
    is_stage_boundary: bool


class ScenarioDAGResponse(BaseModel):
    """Complete scenario DAG for visualization."""
    nodes: list[DAGNodeResponse]
    stage_count: int
    shuffle_count: int


class SimulationPreview(BaseModel):
    """Preview of simulation results for a scenario."""
    shuffle_bytes: int
    estimated_min_task_ms: int
    estimated_max_task_ms: int
    confidence: str
    spark_path_explanation: str
    dominant_factor: str
    notes: list[str]


class ScenarioWithSimulation(BaseModel):
    """Scenario with its simulation preview and DAG."""
    scenario: ScenarioDetail
    simulation: SimulationPreview
    dag: Optional[ScenarioDAGResponse] = None


@router.get("/", response_model=list[ScenarioSummary])
@router.get("/list", response_model=list[ScenarioSummary])
async def get_scenarios():
    """List all available scenarios.
    
    Returns a summary of each scenario for display in the UI.
    """
    scenarios = list_scenarios()
    return [
        ScenarioSummary(
            id=s.id,
            title=s.title,
            level=s.level.value,
            spark_concepts=s.spark_concepts,
            real_world_context=s.real_world_context,
        )
        for s in scenarios
    ]


@router.get("/{scenario_id}", response_model=ScenarioWithSimulation)
async def get_scenario(scenario_id: str):
    """Get a specific scenario with simulation preview.
    
    Returns the full scenario details plus a simulation preview
    using the scenario's default playground parameters.
    """
    scenario = get_scenario_by_id(scenario_id)
    
    if not scenario:
        raise HTTPException(status_code=404, detail=f"Scenario '{scenario_id}' not found")
    
    # Generate simulation preview using scenario defaults
    playground = ShapePlayground()
    defaults = scenario.playground_defaults
    
    # Create input shape from defaults
    input_shape = DataFrameShape(
        rows=defaults.get("rows", 1_000_000),
        avg_row_size_bytes=defaults.get("avg_row_size_bytes", 100),
        partitions=defaults.get("partitions", 200),
        skew_factor=defaults.get("skew_factor", 1.0),
    )
    
    # Run appropriate simulation based on operation
    operation = defaults.get("operation", "filter")
    
    if operation == "filter":
        result = playground.simulate_filter(
            input_shape,
            selectivity=defaults.get("selectivity", 0.1),
        )
    elif operation == "groupby":
        result = playground.simulate_groupby(
            input_shape,
            num_groups=defaults.get("num_groups", 1000),
        )
    elif operation == "join":
        right_rows = defaults.get("right_rows", 100_000)
        right_shape = DataFrameShape(
            rows=right_rows,
            avg_row_size_bytes=defaults.get("avg_row_size_bytes", 100),
            partitions=defaults.get("partitions", 200),
            skew_factor=defaults.get("skew_factor", 1.0),
        )
        result = playground.simulate_join(input_shape, right_shape)
    elif operation == "repartition":
        result = playground.simulate_repartition(
            input_shape,
            new_partitions=defaults.get("new_partitions", 100),
        )
    else:
        # Default to filter
        result = playground.simulate_filter(input_shape, selectivity=0.5)
    
    # Build response
    scenario_detail = ScenarioDetail(
        id=scenario.id,
        title=scenario.title,
        level=scenario.level.value,
        spark_concepts=scenario.spark_concepts,
        real_world_context=scenario.real_world_context,
        story=scenario.story,
        logical_operations=scenario.logical_operations,
        expected_stages=scenario.expected_stages,
        expected_shuffles=scenario.expected_shuffles,
        expected_skew=scenario.expected_skew,
        evidence_signals=scenario.evidence_signals,
        explanation_goal=scenario.explanation_goal,
        playground_defaults=scenario.playground_defaults,
        learning_goals=scenario.learning_goals,
        key_takeaways=scenario.key_takeaways,
        common_mistakes=scenario.common_mistakes,
    )
    
    simulation_preview = SimulationPreview(
        shuffle_bytes=result.shuffle_bytes,
        estimated_min_task_ms=result.estimated_min_task_ms,
        estimated_max_task_ms=result.estimated_max_task_ms,
        confidence=result.confidence,
        spark_path_explanation=result.spark_path_explanation,
        dominant_factor=result.dominant_factor,
        notes=result.notes,
    )
    
    # Build scenario DAG per scenario-dag-spec.md
    dag_response = None
    scenario_dag = build_scenario_dag(scenario_id)
    if scenario_dag:
        dag_response = ScenarioDAGResponse(
            nodes=[
                DAGNodeResponse(
                    node_type=n.node_type.value,
                    label=n.label,
                    stage=n.stage,
                    what_spark_does=n.what_spark_does,
                    why_required=n.why_required,
                    is_stage_boundary=n.is_stage_boundary,
                )
                for n in scenario_dag.nodes
            ],
            stage_count=scenario_dag.stage_count,
            shuffle_count=scenario_dag.shuffle_count,
        )
    
    return ScenarioWithSimulation(
        scenario=scenario_detail,
        simulation=simulation_preview,
        dag=dag_response,
    )
