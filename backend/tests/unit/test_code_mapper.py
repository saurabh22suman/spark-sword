"""Tests for Code-to-Execution Mapper.

The mapper links Spark code transformations to their execution stages,
enabling users to understand WHY each stage exists and WHAT code triggered it.

Reference: plan.md Section on Code-to-Execution Mapper
"""

import pytest

from app.analyzers.code_mapper import (
    CodeMapper,
    CodeLocation,
    TransformationMapping,
    TransformationType,
)
from app.models.spark_events import StageInfo


class TestTransformationExtraction:
    """Tests for extracting transformation info from stage names."""

    def test_extract_transformation_from_stage_name(self) -> None:
        """Stage names contain transformation and location info.
        
        Spark encodes the triggering transformation in stage names like:
        'groupBy at UserCode.py:42'
        
        The mapper must extract:
        - Transformation type (groupBy)
        - File name (UserCode.py)
        - Line number (42)
        """
        mapper = CodeMapper()
        stage = StageInfo(
            stage_id=0,
            name="groupBy at UserAnalysis.py:42",
            num_tasks=100,
        )
        
        mapping = mapper.map_stage(stage)
        
        assert mapping.transformation_type == TransformationType.GROUP_BY
        assert mapping.location.file_name == "UserAnalysis.py"
        assert mapping.location.line_number == 42

    def test_extract_join_transformation(self) -> None:
        """Join transformations should be correctly identified."""
        mapper = CodeMapper()
        stage = StageInfo(
            stage_id=1,
            name="join at DataPipeline.scala:156",
            num_tasks=200,
        )
        
        mapping = mapper.map_stage(stage)
        
        assert mapping.transformation_type == TransformationType.JOIN
        assert mapping.location.file_name == "DataPipeline.scala"
        assert mapping.location.line_number == 156

    def test_extract_repartition_transformation(self) -> None:
        """Repartition operations should be identified."""
        mapper = CodeMapper()
        stage = StageInfo(
            stage_id=2,
            name="repartition at ETL.py:78",
            num_tasks=50,
        )
        
        mapping = mapper.map_stage(stage)
        
        assert mapping.transformation_type == TransformationType.REPARTITION
        assert mapping.location.file_name == "ETL.py"
        assert mapping.location.line_number == 78

    def test_extract_sort_transformation(self) -> None:
        """Sort operations (orderBy, sortBy) should be identified."""
        mapper = CodeMapper()
        stage = StageInfo(
            stage_id=3,
            name="sortBy at Report.py:200",
            num_tasks=100,
        )
        
        mapping = mapper.map_stage(stage)
        
        # sortBy maps to SORT_BY specifically
        assert mapping.transformation_type == TransformationType.SORT_BY
        assert mapping.location.file_name == "Report.py"

    def test_extract_distinct_transformation(self) -> None:
        """Distinct operations should be identified."""
        mapper = CodeMapper()
        stage = StageInfo(
            stage_id=4,
            name="distinct at Dedup.py:30",
            num_tasks=50,
        )
        
        mapping = mapper.map_stage(stage)
        
        assert mapping.transformation_type == TransformationType.DISTINCT


class TestStageNameVariations:
    """Tests for handling various stage name formats."""

    def test_stage_name_with_action(self) -> None:
        """Actions like collect, count should be identified."""
        mapper = CodeMapper()
        stage = StageInfo(
            stage_id=0,
            name="collect at Driver.py:100",
            num_tasks=1,
        )
        
        mapping = mapper.map_stage(stage)
        
        assert mapping.transformation_type == TransformationType.ACTION
        assert mapping.is_action is True

    def test_stage_name_with_show(self) -> None:
        """show() action should be identified."""
        mapper = CodeMapper()
        stage = StageInfo(
            stage_id=0,
            name="show at Notebook.py:50",
            num_tasks=1,
        )
        
        mapping = mapper.map_stage(stage)
        
        assert mapping.transformation_type == TransformationType.ACTION
        assert mapping.is_action is True

    def test_stage_name_without_location(self) -> None:
        """Some stages may not have file location info."""
        mapper = CodeMapper()
        stage = StageInfo(
            stage_id=0,
            name="map",
            num_tasks=100,
        )
        
        mapping = mapper.map_stage(stage)
        
        assert mapping.transformation_type == TransformationType.MAP
        assert mapping.location is None

    def test_stage_name_with_complex_path(self) -> None:
        """Handle paths with directories."""
        mapper = CodeMapper()
        stage = StageInfo(
            stage_id=0,
            name="filter at /home/user/project/src/etl/pipeline.py:123",
            num_tasks=50,
        )
        
        mapping = mapper.map_stage(stage)
        
        assert mapping.transformation_type == TransformationType.FILTER
        assert "pipeline.py" in mapping.location.file_name
        assert mapping.location.line_number == 123


class TestMultiStageMappings:
    """Tests for mapping multiple stages to transformations."""

    def test_map_all_stages(self) -> None:
        """Map all stages in a job to their transformations."""
        mapper = CodeMapper()
        stages = [
            StageInfo(stage_id=0, name="filter at etl.py:10", num_tasks=100),
            StageInfo(stage_id=1, name="groupBy at etl.py:20", num_tasks=200, parent_ids=[0]),
            StageInfo(stage_id=2, name="collect at etl.py:30", num_tasks=1, parent_ids=[1]),
        ]
        
        mappings = mapper.map_stages(stages)
        
        assert len(mappings) == 3
        assert mappings[0].transformation_type == TransformationType.FILTER
        assert mappings[1].transformation_type == TransformationType.GROUP_BY
        assert mappings[2].transformation_type == TransformationType.ACTION

    def test_identify_shuffle_boundaries(self) -> None:
        """Identify which transformations cause shuffle boundaries."""
        mapper = CodeMapper()
        stages = [
            StageInfo(stage_id=0, name="map at etl.py:10", num_tasks=100),
            StageInfo(stage_id=1, name="groupBy at etl.py:20", num_tasks=200, parent_ids=[0]),
        ]
        
        mappings = mapper.map_stages(stages)
        
        # groupBy causes shuffle, map does not
        assert mappings[0].causes_shuffle is False
        assert mappings[1].causes_shuffle is True


class TestExplanationGeneration:
    """Tests for generating human-readable explanations."""

    def test_explain_groupby_stage(self) -> None:
        """Generate explanation for groupBy operation."""
        mapper = CodeMapper()
        stage = StageInfo(
            stage_id=0,
            name="groupBy at analysis.py:42",
            num_tasks=200,
        )
        
        mapping = mapper.map_stage(stage)
        explanation = mapper.explain(mapping)
        
        # Explanation should mention key concepts
        assert "groupBy" in explanation.lower() or "group" in explanation.lower()
        assert "shuffle" in explanation.lower()
        assert "analysis.py" in explanation
        assert "42" in explanation

    def test_explain_join_stage(self) -> None:
        """Generate explanation for join operation."""
        mapper = CodeMapper()
        stage = StageInfo(
            stage_id=0,
            name="join at pipeline.py:100",
            num_tasks=200,
        )
        
        mapping = mapper.map_stage(stage)
        explanation = mapper.explain(mapping)
        
        assert "join" in explanation.lower()
        assert "pipeline.py" in explanation

    def test_explain_includes_stage_id(self) -> None:
        """Explanations should reference the stage ID."""
        mapper = CodeMapper()
        stage = StageInfo(
            stage_id=5,
            name="filter at code.py:10",
            num_tasks=50,
        )
        
        mapping = mapper.map_stage(stage)
        explanation = mapper.explain(mapping)
        
        assert "5" in explanation or "Stage 5" in explanation


class TestTransformationCategories:
    """Tests for transformation categorization."""

    def test_narrow_transformations(self) -> None:
        """Narrow transformations don't cause shuffles."""
        mapper = CodeMapper()
        narrow_ops = ["map", "filter", "flatMap", "mapPartitions"]
        
        for op in narrow_ops:
            stage = StageInfo(stage_id=0, name=f"{op} at code.py:1", num_tasks=100)
            mapping = mapper.map_stage(stage)
            assert mapping.causes_shuffle is False, f"{op} should not cause shuffle"

    def test_wide_transformations(self) -> None:
        """Wide transformations cause shuffles."""
        mapper = CodeMapper()
        wide_ops = ["groupBy", "reduceByKey", "join", "repartition", "distinct", "sortBy"]
        
        for op in wide_ops:
            stage = StageInfo(stage_id=0, name=f"{op} at code.py:1", num_tasks=100)
            mapping = mapper.map_stage(stage)
            assert mapping.causes_shuffle is True, f"{op} should cause shuffle"
