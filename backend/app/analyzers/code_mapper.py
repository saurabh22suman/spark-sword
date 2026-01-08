"""Code-to-Execution Mapper.

Maps Spark transformations to execution stages, enabling users to understand:
- WHY each stage exists
- WHAT code triggered it
- WHETHER it causes a shuffle

This is the bridge between user code and Spark's physical execution.
"""

import re
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional

from app.models.spark_events import StageInfo


class TransformationType(str, Enum):
    """Types of Spark transformations."""
    
    # Narrow transformations (no shuffle)
    MAP = "map"
    FILTER = "filter"
    FLAT_MAP = "flatMap"
    MAP_PARTITIONS = "mapPartitions"
    UNION = "union"
    COALESCE = "coalesce"
    
    # Wide transformations (cause shuffle)
    GROUP_BY = "groupBy"
    REDUCE_BY_KEY = "reduceByKey"
    AGGREGATE_BY_KEY = "aggregateByKey"
    JOIN = "join"
    REPARTITION = "repartition"
    DISTINCT = "distinct"
    SORT = "sort"
    SORT_BY = "sortBy"
    ORDER_BY = "orderBy"
    
    # Actions
    ACTION = "action"
    
    # Unknown
    UNKNOWN = "unknown"


# Transformations that cause shuffles
WIDE_TRANSFORMATIONS = {
    TransformationType.GROUP_BY,
    TransformationType.REDUCE_BY_KEY,
    TransformationType.AGGREGATE_BY_KEY,
    TransformationType.JOIN,
    TransformationType.REPARTITION,
    TransformationType.DISTINCT,
    TransformationType.SORT,
    TransformationType.SORT_BY,
    TransformationType.ORDER_BY,
}

# Actions (terminal operations)
ACTIONS = {"collect", "count", "take", "first", "show", "save", "write", "foreach"}

# Mapping from stage name keywords to transformation types
TRANSFORMATION_KEYWORDS = {
    "map": TransformationType.MAP,
    "filter": TransformationType.FILTER,
    "flatmap": TransformationType.FLAT_MAP,
    "mappartitions": TransformationType.MAP_PARTITIONS,
    "union": TransformationType.UNION,
    "coalesce": TransformationType.COALESCE,
    "groupby": TransformationType.GROUP_BY,
    "groupbykey": TransformationType.GROUP_BY,
    "reducebykey": TransformationType.REDUCE_BY_KEY,
    "aggregatebykey": TransformationType.AGGREGATE_BY_KEY,
    "join": TransformationType.JOIN,
    "leftjoin": TransformationType.JOIN,
    "rightjoin": TransformationType.JOIN,
    "innerjoin": TransformationType.JOIN,
    "outerjoin": TransformationType.JOIN,
    "repartition": TransformationType.REPARTITION,
    "distinct": TransformationType.DISTINCT,
    "sort": TransformationType.SORT,
    "sortby": TransformationType.SORT_BY,
    "orderby": TransformationType.ORDER_BY,
}


@dataclass
class CodeLocation:
    """Location in user code that triggered a stage."""
    
    file_name: str
    line_number: int
    full_path: Optional[str] = None
    
    def __str__(self) -> str:
        return f"{self.file_name}:{self.line_number}"


@dataclass
class TransformationMapping:
    """Mapping between a stage and its source transformation."""
    
    stage_id: int
    stage_name: str
    transformation_type: TransformationType
    location: Optional[CodeLocation] = None
    causes_shuffle: bool = False
    is_action: bool = False
    num_tasks: int = 0
    parent_stage_ids: list[int] = field(default_factory=list)
    
    @property
    def is_narrow(self) -> bool:
        """Check if this is a narrow transformation."""
        return not self.causes_shuffle and not self.is_action
    
    @property
    def is_wide(self) -> bool:
        """Check if this is a wide transformation."""
        return self.causes_shuffle


class CodeMapper:
    """Maps Spark stages to their source code transformations."""
    
    # Pattern to extract transformation and location from stage name
    # Examples: "groupBy at analysis.py:42", "join at /path/to/file.scala:100"
    STAGE_NAME_PATTERN = re.compile(
        r"^(\w+)\s+at\s+(.+):(\d+)$"
    )
    
    # Simpler pattern for just transformation name
    SIMPLE_PATTERN = re.compile(r"^(\w+)")
    
    def map_stage(self, stage: StageInfo) -> TransformationMapping:
        """Map a single stage to its transformation.
        
        Args:
            stage: The stage info from parsed event log.
            
        Returns:
            TransformationMapping with extracted information.
        """
        transformation_type = TransformationType.UNKNOWN
        location = None
        is_action = False
        
        # Try to parse full stage name with location
        match = self.STAGE_NAME_PATTERN.match(stage.name)
        if match:
            op_name = match.group(1).lower()
            file_path = match.group(2)
            line_num = int(match.group(3))
            
            # Extract just filename from path
            file_name = file_path.split("/")[-1]
            
            location = CodeLocation(
                file_name=file_name,
                line_number=line_num,
                full_path=file_path if "/" in file_path else None,
            )
            
            # Determine transformation type
            transformation_type = self._get_transformation_type(op_name)
            is_action = op_name in ACTIONS
        else:
            # Try simple pattern
            simple_match = self.SIMPLE_PATTERN.match(stage.name)
            if simple_match:
                op_name = simple_match.group(1).lower()
                transformation_type = self._get_transformation_type(op_name)
                is_action = op_name in ACTIONS
        
        # If it's an action, set the type
        if is_action:
            transformation_type = TransformationType.ACTION
        
        # Determine if this causes a shuffle
        causes_shuffle = transformation_type in WIDE_TRANSFORMATIONS
        
        return TransformationMapping(
            stage_id=stage.stage_id,
            stage_name=stage.name,
            transformation_type=transformation_type,
            location=location,
            causes_shuffle=causes_shuffle,
            is_action=is_action,
            num_tasks=stage.num_tasks,
            parent_stage_ids=stage.parent_ids,
        )
    
    def _get_transformation_type(self, op_name: str) -> TransformationType:
        """Get transformation type from operation name."""
        # Normalize the name
        normalized = op_name.lower().replace("_", "")
        
        # Check direct mapping
        if normalized in TRANSFORMATION_KEYWORDS:
            return TRANSFORMATION_KEYWORDS[normalized]
        
        # Check if it's an action
        if normalized in ACTIONS:
            return TransformationType.ACTION
        
        return TransformationType.UNKNOWN
    
    def map_stages(self, stages: list[StageInfo]) -> list[TransformationMapping]:
        """Map multiple stages to their transformations.
        
        Args:
            stages: List of stage info objects.
            
        Returns:
            List of transformation mappings in order.
        """
        return [self.map_stage(stage) for stage in stages]
    
    def explain(self, mapping: TransformationMapping) -> str:
        """Generate a human-readable explanation for a transformation mapping.
        
        Args:
            mapping: The transformation mapping to explain.
            
        Returns:
            Human-readable explanation string.
        """
        parts = []
        
        # Stage identification
        parts.append(f"Stage {mapping.stage_id}:")
        
        # Transformation type
        if mapping.transformation_type == TransformationType.ACTION:
            parts.append(f"This stage executes an action")
        elif mapping.transformation_type != TransformationType.UNKNOWN:
            parts.append(f"This stage executes a {mapping.transformation_type.value} operation")
        else:
            parts.append("This stage executes an operation")
        
        # Location info
        if mapping.location:
            parts.append(f"triggered at {mapping.location.file_name} line {mapping.location.line_number}")
        
        # Shuffle warning
        if mapping.causes_shuffle:
            parts.append("(causes shuffle - data is redistributed across the cluster)")
        
        # Task count
        parts.append(f"with {mapping.num_tasks} tasks")
        
        return " ".join(parts) + "."
    
    def explain_all(self, mappings: list[TransformationMapping]) -> list[str]:
        """Generate explanations for all mappings.
        
        Args:
            mappings: List of transformation mappings.
            
        Returns:
            List of explanation strings.
        """
        return [self.explain(m) for m in mappings]
    
    def get_shuffle_stages(self, mappings: list[TransformationMapping]) -> list[TransformationMapping]:
        """Get all stages that cause shuffles.
        
        Args:
            mappings: List of transformation mappings.
            
        Returns:
            List of mappings that cause shuffles.
        """
        return [m for m in mappings if m.causes_shuffle]
    
    def get_code_locations(self, mappings: list[TransformationMapping]) -> dict[str, list[int]]:
        """Get all code locations grouped by file.
        
        Args:
            mappings: List of transformation mappings.
            
        Returns:
            Dictionary mapping file names to list of line numbers.
        """
        locations: dict[str, list[int]] = {}
        for m in mappings:
            if m.location:
                file_name = m.location.file_name
                if file_name not in locations:
                    locations[file_name] = []
                locations[file_name].append(m.location.line_number)
        return locations
