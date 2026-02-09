"""
Data Flow Analyzer for Sankey Diagram Visualization.

Analyzes how data flows through Spark stages:
- Input → Processing → Output/Shuffle
- Identifies data expansion (output > input)
- Highlights inefficient stages
"""
from typing import List, Dict, Any, Tuple
from enum import Enum
from pydantic import BaseModel

from app.models.spark_events import ParsedEventLog, StageInfo


class FlowType(str, Enum):
    """Type of data flow between stages."""
    INPUT = "input"  # External data source
    SHUFFLE = "shuffle"  # Inter-stage shuffle
    OUTPUT = "output"  # External sink
    MEMORY = "memory"  # Cached data


class DataFlowNode(BaseModel):
    """Represents a stage or source/sink in the data flow."""
    id: str  # Unique identifier
    name: str  # Display name
    type: str  # "source", "stage", "sink"
    stage_id: int | None = None  # Spark stage ID if applicable
    bytes_processed: int  # Total bytes flowing through this node


class DataFlowLink(BaseModel):
    """Represents data movement between nodes."""
    source: str  # Source node ID
    target: str  # Target node ID
    value: int  # Bytes transferred
    flow_type: FlowType  # Type of flow
    is_expansion: bool = False  # True if output > input (data explosion)
    expansion_ratio: float | None = None  # How much data grew (if expansion)


class DataFlowDiagram(BaseModel):
    """Complete data flow representation for Sankey visualization."""
    nodes: List[DataFlowNode]
    links: List[DataFlowLink]
    total_input_bytes: int
    total_output_bytes: int
    total_shuffle_bytes: int
    max_expansion_ratio: float  # Highest expansion in the pipeline


class DataFlowAnalyzer:
    """Analyzes data flow through Spark execution for visualization."""
    
    def analyze(self, parsed_log: ParsedEventLog) -> DataFlowDiagram:
        """
        Analyze data flow from parsed event log.
        
        Returns a Sankey diagram data structure showing:
        - How data enters the pipeline (input sources)
        - How it flows between stages (shuffles)
        - Where it expands or shrinks
        - Where it exits (outputs)
        """
        nodes: List[DataFlowNode] = []
        links: List[DataFlowLink] = []
        
        # Sort stages by topology (parents before children)
        sorted_stages = self._topological_sort(parsed_log.stages)
        
        # Track total bytes
        total_input = 0
        total_output = 0
        total_shuffle = 0
        max_expansion = 1.0
        
        # Create nodes for each stage
        stage_nodes = {}
        for stage in sorted_stages:
            node_id = f"stage_{stage.stage_id}"
            stage_nodes[stage.stage_id] = node_id
            
            bytes_processed = max(
                stage.input_bytes,
                stage.shuffle_read_bytes,
                1  # Avoid zero
            )
            
            nodes.append(DataFlowNode(
                id=node_id,
                name=self._format_stage_name(stage),
                type="stage",
                stage_id=stage.stage_id,
                bytes_processed=bytes_processed,
            ))
        
        # Create links between stages based on shuffle dependencies
        for stage in sorted_stages:
            source_node = stage_nodes[stage.stage_id]
            
            # Input from external source
            if stage.input_bytes > 0 and stage.shuffle_read_bytes == 0:
                # This is a source stage (reads from external storage)
                source_id = f"input_{stage.stage_id}"
                nodes.append(DataFlowNode(
                    id=source_id,
                    name="Input Data",
                    type="source",
                    bytes_processed=stage.input_bytes,
                ))
                links.append(DataFlowLink(
                    source=source_id,
                    target=source_node,
                    value=stage.input_bytes,
                    flow_type=FlowType.INPUT,
                ))
                total_input += stage.input_bytes
            
            # Shuffle reads from parent stages
            if stage.shuffle_read_bytes > 0:
                # Find parent stages
                for parent_id in stage.parent_ids:
                    if parent_id in stage_nodes:
                        parent_node = stage_nodes[parent_id]
                        parent_stage = next((s for s in sorted_stages if s.stage_id == parent_id), None)
                        
                        if parent_stage and parent_stage.shuffle_write_bytes > 0:
                            shuffle_bytes = min(
                                stage.shuffle_read_bytes,
                                parent_stage.shuffle_write_bytes
                            )
                            
                            links.append(DataFlowLink(
                                source=parent_node,
                                target=source_node,
                                value=shuffle_bytes,
                                flow_type=FlowType.SHUFFLE,
                            ))
                            total_shuffle += shuffle_bytes
            
            # Output to external sink
            if stage.output_bytes > 0:
                sink_id = f"output_{stage.stage_id}"
                nodes.append(DataFlowNode(
                    id=sink_id,
                    name="Output Data",
                    type="sink",
                    bytes_processed=stage.output_bytes,
                ))
                links.append(DataFlowLink(
                    source=source_node,
                    target=sink_id,
                    value=stage.output_bytes,
                    flow_type=FlowType.OUTPUT,
                ))
                total_output += stage.output_bytes
            
            # Detect data expansion within stage
            input_to_stage = stage.input_bytes + stage.shuffle_read_bytes
            output_from_stage = stage.output_bytes + stage.shuffle_write_bytes
            
            if input_to_stage > 0 and output_from_stage > input_to_stage * 1.5:
                # Data expanded by >50%
                expansion_ratio = output_from_stage / input_to_stage
                max_expansion = max(max_expansion, expansion_ratio)
                
                # Mark shuffle links from this stage as expansions
                for link in links:
                    if link.source == source_node and link.flow_type == FlowType.SHUFFLE:
                        link.is_expansion = True
                        link.expansion_ratio = expansion_ratio
        
        return DataFlowDiagram(
            nodes=nodes,
            links=links,
            total_input_bytes=total_input,
            total_output_bytes=total_output,
            total_shuffle_bytes=total_shuffle,
            max_expansion_ratio=round(max_expansion, 2),
        )
    
    def _topological_sort(self, stages: List[StageInfo]) -> List[StageInfo]:
        """Sort stages by execution order (parents before children)."""
        # Simple topological sort based on parent_ids
        sorted_stages = []
        remaining = stages.copy()
        added_ids = set()
        
        while remaining:
            # Find stages with all parents already added
            ready = [
                s for s in remaining
                if all(p in added_ids or p not in [st.stage_id for st in stages] for p in s.parent_ids)
            ]
            
            if not ready:
                # Circular dependency or disconnected graph - just take first
                ready = [remaining[0]]
            
            for stage in ready:
                sorted_stages.append(stage)
                added_ids.add(stage.stage_id)
                remaining.remove(stage)
        
        return sorted_stages
    
    def _format_stage_name(self, stage: StageInfo) -> str:
        """Format stage name for display."""
        # Extract meaningful part from stage name
        name = stage.name or f"Stage {stage.stage_id}"
        
        # Simplify common patterns
        if "mapPartitionsInternal" in name:
            return f"Map (Stage {stage.stage_id})"
        elif "groupByKey" in name:
            return f"GroupBy (Stage {stage.stage_id})"
        elif "join" in name.lower():
            return f"Join (Stage {stage.stage_id})"
        elif "aggregate" in name.lower():
            return f"Aggregate (Stage {stage.stage_id})"
        else:
            # Truncate if too long
            if len(name) > 30:
                return f"{name[:27]}... (Stage {stage.stage_id})"
            return name
