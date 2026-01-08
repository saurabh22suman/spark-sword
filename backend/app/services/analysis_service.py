"""Analysis service for running all detectors on parsed event logs."""

from app.analyzers import (
    DAGBuilder,
    ExecutionDAG,
    Insight,
    JoinStrategyDetector,
    ShuffleDetector,
    SkewDetector,
    StageExplainer,
    StageExplanation,
)
from app.analyzers.code_mapper import CodeMapper, TransformationMapping
from app.models.spark_events import ParsedEventLog


class AnalysisResult:
    """Complete analysis result with DAG and insights."""

    def __init__(
        self,
        dag: ExecutionDAG,
        insights: list[Insight],
        parsed_log: ParsedEventLog,
        code_mappings: list[TransformationMapping],
        stage_explanations: list[StageExplanation],
    ) -> None:
        self.dag = dag
        self.insights = insights
        self.parsed_log = parsed_log
        self.code_mappings = code_mappings
        self.stage_explanations = stage_explanations

    def to_dict(self) -> dict:
        """Convert to dictionary for API response."""
        # Calculate metrics from stages and tasks
        total_duration_ms = 0
        if self.parsed_log.end_time and self.parsed_log.start_time:
            total_duration_ms = self.parsed_log.end_time - self.parsed_log.start_time
        
        total_shuffle_bytes = 0
        total_spill_bytes = 0
        # stages can be either a dict or list depending on the context
        stages = self.parsed_log.stages
        if isinstance(stages, dict):
            stages = stages.values()
        for stage in stages:
            if isinstance(stage, dict):
                shuffle_write = stage.get("shuffle_write_bytes", 0) or 0
                spill = stage.get("spill_bytes", 0) or 0
            else:
                # stage is a StageInfo object
                shuffle_write = getattr(stage, 'shuffle_write_bytes', 0) or 0
                spill = getattr(stage, 'spill_bytes', 0) or 0
            total_shuffle_bytes += shuffle_write
            total_spill_bytes += spill
        
        return {
            "application": {
                "id": self.parsed_log.application_id,
                "name": self.parsed_log.application_name,
                "spark_version": self.parsed_log.spark_version,
                "start_time": self.parsed_log.start_time,
                "end_time": self.parsed_log.end_time,
            },
            "summary": {
                "total_jobs": len(self.parsed_log.jobs),
                "total_stages": len(self.parsed_log.stages),
                "total_tasks": len(self.parsed_log.tasks),
                "total_duration_ms": total_duration_ms,
                "total_shuffle_bytes": total_shuffle_bytes,
                "total_spill_bytes": total_spill_bytes,
                "total_events": self.parsed_log.total_events,
                "unknown_events": self.parsed_log.unknown_events,
                "total_insights": len(self.insights),
            },
            "dag": self.dag.to_dict(),
            "insights": [i.to_dict() for i in self.insights],
            "code_mappings": [
                {
                    "stage_id": m.stage_id,
                    "stage_name": m.stage_name,
                    "transformation_type": m.transformation_type.value,
                    "causes_shuffle": m.causes_shuffle,
                    "is_action": m.is_action,
                    "is_narrow": m.is_narrow,
                    "is_wide": m.is_wide,
                    "num_tasks": m.num_tasks,
                    "parent_stage_ids": m.parent_stage_ids,
                    "location": {
                        "file_name": m.location.file_name,
                        "line_number": m.location.line_number,
                        "full_path": m.location.full_path,
                    } if m.location else None,
                }
                for m in self.code_mappings
            ],
            "jobs": [
                {
                    "job_id": j.job_id,
                    "stage_ids": j.stage_ids,
                    "status": j.status,
                    "submission_time": j.submission_time,
                    "completion_time": j.completion_time,
                }
                for j in self.parsed_log.jobs
            ],
            "stages": [
                {
                    "stage_id": s.stage_id,
                    "name": s.name,
                    "num_tasks": s.num_tasks,
                    "parent_ids": s.parent_ids,
                    "status": s.status,
                    "metrics": {
                        "input_bytes": s.input_bytes,
                        "output_bytes": s.output_bytes,
                        "shuffle_read_bytes": s.shuffle_read_bytes,
                        "shuffle_write_bytes": s.shuffle_write_bytes,
                        "spill_bytes": s.spill_bytes,
                    },
                }
                for s in self.parsed_log.stages
            ],
            "stage_explanations": [e.to_dict() for e in self.stage_explanations],
        }


class AnalysisService:
    """Service for analyzing Spark event logs."""

    def __init__(self) -> None:
        self.dag_builder = DAGBuilder()
        self.code_mapper = CodeMapper()
        self.stage_explainer = StageExplainer()
        self.detectors = [
            ShuffleDetector(),
            SkewDetector(),
            JoinStrategyDetector(),
        ]

    def analyze(self, parsed_log: ParsedEventLog) -> AnalysisResult:
        """Run full analysis on a parsed event log.

        Args:
            parsed_log: The parsed Spark event log.

        Returns:
            AnalysisResult with DAG and all insights.
        """
        # Build execution DAG
        dag = self.dag_builder.build(parsed_log)

        # Map code to execution
        code_mappings = [
            self.code_mapper.map_stage(stage)
            for stage in parsed_log.stages
        ]

        # Generate stage explanations
        stage_explanations = self.stage_explainer.explain_all(parsed_log)

        # Run all detectors
        all_insights: list[Insight] = []
        for detector in self.detectors:
            insights = detector.detect(parsed_log)
            all_insights.extend(insights)

        # Sort insights by confidence (high first) then by affected stage
        all_insights.sort(
            key=lambda i: (
                {"high": 0, "medium": 1, "low": 2}.get(i.confidence.value, 3),
                min(i.affected_stages) if i.affected_stages else 999,
            )
        )

        return AnalysisResult(
            dag=dag,
            insights=all_insights,
            parsed_log=parsed_log,
            code_mappings=code_mappings,
            stage_explanations=stage_explanations,
        )
