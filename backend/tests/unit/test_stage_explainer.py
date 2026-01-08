"""Tests for Stage Explanation Engine.

The Stage Explainer generates structured explanations for each stage with:
1. Observation - What happened
2. Spark Rule Involved - Wide transformation, sort-merge join, etc.
3. Cost Driver - Shuffle, skew, serialization, spill

Tests verify:
- Explanations are generated for all stages
- Observations describe actual metrics
- Spark rules are correctly identified
- Cost drivers are only reported when significant
- Language is descriptive, not prescriptive
"""

import pytest
from app.analyzers.stage_explainer import StageExplainer, StageExplanation
from app.models.spark_events import ParsedEventLog, StageInfo


@pytest.fixture
def sample_stages():
    """Create sample stages with different characteristics."""
    return [
        # Narrow stage - no shuffle
        StageInfo(
            stage_id=0,
            name="scan parquet",
            num_tasks=100,
            parent_ids=[],
            status="completed",
            input_bytes=1_000_000_000,  # 1GB
            output_bytes=500_000_000,
            shuffle_read_bytes=0,
            shuffle_write_bytes=0,
            spill_bytes=0,
            submission_time=0,
            completion_time=10_000,  # 10s duration
        ),
        # Wide stage - shuffle write
        StageInfo(
            stage_id=1,
            name="groupBy",
            num_tasks=200,
            parent_ids=[0],
            status="completed",
            input_bytes=500_000_000,
            output_bytes=100_000_000,
            shuffle_read_bytes=0,
            shuffle_write_bytes=2_000_000_000,  # 2GB shuffle
            spill_bytes=0,
            submission_time=10_000,
            completion_time=55_000,  # 45s duration
        ),
        # Expensive stage - spill
        StageInfo(
            stage_id=2,
            name="join",
            num_tasks=200,
            parent_ids=[1],
            status="completed",
            input_bytes=2_000_000_000,
            output_bytes=1_000_000_000,
            shuffle_read_bytes=2_000_000_000,
            shuffle_write_bytes=0,
            spill_bytes=500_000_000,  # 500MB spill
            submission_time=55_000,
            completion_time=175_000,  # 2 minutes duration
        ),
    ]


@pytest.fixture
def parsed_log(sample_stages):
    """Create a parsed event log with sample stages."""
    return ParsedEventLog(
        application_id="app-123",
        application_name="Test App",
        stages=sample_stages,
        jobs=[],
        tasks=[],
    )


class TestStageExplainerObservation:
    """Tests for the Observation section."""
    
    def test_observation_includes_task_count(self, parsed_log):
        """Observation reports task count."""
        explainer = StageExplainer()
        explanation = explainer.explain_stage(parsed_log.stages[0], parsed_log)
        
        assert "100 tasks" in explanation.observation
    
    def test_observation_includes_duration(self, parsed_log):
        """Observation reports duration in human-readable format."""
        explainer = StageExplainer()
        explanation = explainer.explain_stage(parsed_log.stages[0], parsed_log)
        
        # Should say "10" or "10.0 seconds"
        assert "10" in explanation.observation and "second" in explanation.observation
    
    def test_observation_reports_shuffle_write(self, parsed_log):
        """Observation mentions shuffle write bytes."""
        explainer = StageExplainer()
        explanation = explainer.explain_stage(parsed_log.stages[1], parsed_log)
        
        # Should mention shuffle data written
        assert "shuffle" in explanation.observation.lower()
        assert "written" in explanation.observation.lower() or "write" in explanation.observation.lower()
    
    def test_observation_reports_spill(self, parsed_log):
        """Observation mentions disk spill."""
        explainer = StageExplainer()
        explanation = explainer.explain_stage(parsed_log.stages[2], parsed_log)
        
        assert "spill" in explanation.observation.lower()


class TestStageExplainerSparkRule:
    """Tests for the Spark Rule Involved section."""
    
    def test_narrow_transformation_rule(self, parsed_log):
        """Narrow transformations are identified correctly."""
        explainer = StageExplainer()
        explanation = explainer.explain_stage(parsed_log.stages[0], parsed_log)
        
        assert "narrow" in explanation.spark_rule.lower()
        assert "no shuffle" in explanation.spark_rule.lower()
    
    def test_wide_transformation_rule(self, parsed_log):
        """Wide transformations are identified correctly."""
        explainer = StageExplainer()
        explanation = explainer.explain_stage(parsed_log.stages[1], parsed_log)
        
        assert "wide" in explanation.spark_rule.lower()
        # Should mention common wide ops
        assert any(word in explanation.spark_rule.lower() 
                  for word in ["groupby", "join", "repartition", "redistribution"])
    
    def test_shuffle_read_rule(self, parsed_log):
        """Shuffle read stages are explained."""
        explainer = StageExplainer()
        explanation = explainer.explain_stage(parsed_log.stages[2], parsed_log)
        
        assert "shuffle" in explanation.spark_rule.lower()
        assert "read" in explanation.spark_rule.lower()


class TestStageExplainerCostDriver:
    """Tests for the Cost Driver section."""
    
    def test_no_cost_driver_for_cheap_stage(self, parsed_log):
        """Cheap stages have no cost driver."""
        explainer = StageExplainer()
        explanation = explainer.explain_stage(parsed_log.stages[0], parsed_log)
        
        # Stage 0 has no shuffle or spill, short duration
        assert explanation.cost_driver is None
    
    def test_large_shuffle_is_cost_driver(self):
        """Large shuffle is identified as cost driver."""
        stage = StageInfo(
            stage_id=0,
            name="large_shuffle",
            num_tasks=200,
            parent_ids=[],
            status="completed",
            shuffle_write_bytes=5_000_000_000,  # 5GB - above threshold
        )
        parsed_log = ParsedEventLog(
            application_id="test",
            application_name="test",
            stages=[stage],
            jobs=[],
            tasks=[],
        )
        
        explainer = StageExplainer()
        explanation = explainer.explain_stage(stage, parsed_log)
        
        assert explanation.cost_driver is not None
        assert "shuffle" in explanation.cost_driver.lower()
    
    def test_spill_is_cost_driver(self, parsed_log):
        """Disk spill is identified as cost driver."""
        explainer = StageExplainer()
        explanation = explainer.explain_stage(parsed_log.stages[2], parsed_log)
        
        assert explanation.cost_driver is not None
        assert "spill" in explanation.cost_driver.lower()
    
    def test_long_duration_is_cost_driver(self):
        """Long duration is identified as cost driver."""
        stage = StageInfo(
            stage_id=0,
            name="long_stage",
            num_tasks=100,
            parent_ids=[],
            status="completed",
            submission_time=0,
            completion_time=180_000,  # 3 minutes - above threshold
        )
        parsed_log = ParsedEventLog(
            application_id="test",
            application_name="test",
            stages=[stage],
            jobs=[],
            tasks=[],
        )
        
        explainer = StageExplainer()
        explanation = explainer.explain_stage(stage, parsed_log)
        
        assert explanation.cost_driver is not None
        assert "duration" in explanation.cost_driver.lower() or "minute" in explanation.cost_driver.lower()


class TestStageExplainerFlags:
    """Tests for shuffle boundary and expense flags."""
    
    def test_shuffle_boundary_flag(self, parsed_log):
        """Shuffle boundaries are flagged."""
        explainer = StageExplainer()
        
        # Stage 0 - no shuffle
        exp0 = explainer.explain_stage(parsed_log.stages[0], parsed_log)
        assert exp0.is_shuffle_boundary is False
        
        # Stage 1 - shuffle write
        exp1 = explainer.explain_stage(parsed_log.stages[1], parsed_log)
        assert exp1.is_shuffle_boundary is True
    
    def test_is_expensive_flag(self, parsed_log):
        """Expensive stages are flagged."""
        explainer = StageExplainer()
        
        # Stage 2 has spill and long duration
        exp2 = explainer.explain_stage(parsed_log.stages[2], parsed_log)
        assert exp2.is_expensive is True
        assert exp2.expense_reason is not None


class TestStageExplainerLanguage:
    """Tests for language quality (descriptive, not prescriptive)."""
    
    def test_no_prescriptive_language(self, parsed_log):
        """Explanations don't use prescriptive language."""
        explainer = StageExplainer()
        
        for stage in parsed_log.stages:
            explanation = explainer.explain_stage(stage, parsed_log)
            
            # Check observation
            assert "should" not in explanation.observation.lower()
            assert "fix" not in explanation.observation.lower()
            assert "must" not in explanation.observation.lower()
            
            # Check spark_rule
            assert "should" not in explanation.spark_rule.lower()
            assert "fix" not in explanation.spark_rule.lower()
    
    def test_all_stages_get_explanations(self, parsed_log):
        """All stages receive complete explanations."""
        explainer = StageExplainer()
        explanations = explainer.explain_all(parsed_log)
        
        assert len(explanations) == len(parsed_log.stages)
        
        for exp in explanations:
            assert exp.observation
            assert exp.spark_rule
            # cost_driver can be None for cheap stages


class TestStageExplanationSerialization:
    """Tests for JSON serialization."""
    
    def test_to_dict_includes_all_fields(self, parsed_log):
        """to_dict includes all required fields."""
        explainer = StageExplainer()
        explanation = explainer.explain_stage(parsed_log.stages[1], parsed_log)
        
        data = explanation.to_dict()
        
        assert "stage_id" in data
        assert "observation" in data
        assert "spark_rule" in data
        assert "cost_driver" in data
        assert "is_shuffle_boundary" in data
        assert "is_expensive" in data
        assert "confidence" in data
