"""
Enhanced Code-to-Stage Mapper Service.

Links notebook cells to executed Spark stages, enabling:
- Click stage → see source code
- Click code → highlight affected stages
- Understand which line triggered each shuffle
"""
from typing import List, Dict, Optional, Tuple
from pydantic import BaseModel

from app.models.spark_events import ParsedEventLog
from app.analyzers.code_mapper import CodeMapper, TransformationMapping


class CodeSnippet(BaseModel):
    """Code snippet from notebook cell."""
    cell_index: int
    line_start: int
    line_end: int
    code: str
    language: str = "python"


class StageCodeLink(BaseModel):
    """Link between a stage and source code."""
    stage_id: int
    stage_name: str
    transformation_type: str
    causes_shuffle: bool
    code_snippet: Optional[CodeSnippet] = None
    file_name: Optional[str] = None
    line_number: Optional[int] = None
    
    # Reverse mapping: which other stages does this depend on
    depends_on_stages: List[int] = []
    
    # Forward mapping: which stages depend on this
    consumed_by_stages: List[int] = []


class CodeToStageMap(BaseModel):
    """Complete bidirectional mapping."""
    stage_links: List[StageCodeLink]
    
    # Quick lookup dictionaries
    stage_to_code: Dict[int, StageCodeLink] = {}
    line_to_stages: Dict[int, List[int]] = {}  # Line number → stage IDs


class EnhancedCodeMapper:
    """Service for creating bidirectional code-to-stage mappings."""
    
    def __init__(self):
        self.basic_mapper = CodeMapper()
    
    def create_mapping(
        self,
        event_log: ParsedEventLog,
        notebook_cells: Optional[List[Dict]] = None,
    ) -> CodeToStageMap:
        """
        Create complete code-to-stage mapping.
        
        Args:
            event_log: Parsed Spark event log
            notebook_cells: Optional notebook cell data with code
            
        Returns:
            Bidirectional mapping between code and stages
        """
        stage_links: List[StageCodeLink] = []
        stage_to_code: Dict[int, StageCodeLink] = {}
        line_to_stages: Dict[int, List[int]] = {}
        
        # Map each stage
        for stage in event_log.stages:
            mapping = self.basic_mapper.map_stage(stage)
            
            # Create link
            link = StageCodeLink(
                stage_id=stage.stage_id,
                stage_name=stage.name,
                transformation_type=mapping.transformation_type.value,
                causes_shuffle=mapping.causes_shuffle,
                depends_on_stages=stage.parent_ids.copy(),
                file_name=mapping.location.file_name if mapping.location else None,
                line_number=mapping.location.line_number if mapping.location else None,
            )
            
            # If we have notebook cells, try to find matching code snippet
            if notebook_cells and mapping.location:
                snippet = self._find_code_snippet(
                    notebook_cells,
                    mapping.location.line_number
                )
                if snippet:
                    link.code_snippet = snippet
            
            stage_links.append(link)
            stage_to_code[stage.stage_id] = link
            
            # Build reverse index: line number → stages
            if link.line_number:
                if link.line_number not in line_to_stages:
                    line_to_stages[link.line_number] = []
                line_to_stages[link.line_number].append(stage.stage_id)
        
        # Build forward dependencies (consumed_by)
        for link in stage_links:
            for parent_id in link.depends_on_stages:
                if parent_id in stage_to_code:
                    stage_to_code[parent_id].consumed_by_stages.append(link.stage_id)
        
        return CodeToStageMap(
            stage_links=stage_links,
            stage_to_code=stage_to_code,
            line_to_stages=line_to_stages,
        )
    
    def _find_code_snippet(
        self,
        notebook_cells: List[Dict],
        target_line: int,
        context_lines: int = 3
    ) -> Optional[CodeSnippet]:
        """
        Find code snippet from notebook cells given a line number.
        
        Args:
            notebook_cells: List of notebook cell dicts with 'source' and 'cell_type'
            target_line: Global line number from stage name
            context_lines: How many lines before/after to include
            
        Returns:
            CodeSnippet if found, None otherwise
        """
        # Track global line number across cells
        global_line = 1
        
        for cell_idx, cell in enumerate(notebook_cells):
            if cell.get('cell_type') != 'code':
                continue
            
            source = cell.get('source', [])
            if isinstance(source, str):
                source = source.split('\n')
            
            cell_lines = len(source)
            cell_start_line = global_line
            cell_end_line = global_line + cell_lines - 1
            
            # Check if target line is in this cell
            if cell_start_line <= target_line <= cell_end_line:
                # Found the cell! Extract snippet with context
                line_in_cell = target_line - cell_start_line
                
                snippet_start = max(0, line_in_cell - context_lines)
                snippet_end = min(cell_lines, line_in_cell + context_lines + 1)
                
                snippet_code = '\n'.join(source[snippet_start:snippet_end])
                
                return CodeSnippet(
                    cell_index=cell_idx,
                    line_start=snippet_start,
                    line_end=snippet_end,
                    code=snippet_code,
                    language='python',  # Could detect from cell metadata
                )
            
            global_line += cell_lines
        
        return None
    
    def get_stages_for_code_range(
        self,
        mapping: CodeToStageMap,
        start_line: int,
        end_line: int
    ) -> List[StageCodeLink]:
        """
        Get all stages triggered by code in a line range.
        
        Args:
            mapping: The code-to-stage mapping
            start_line: Start line number
            end_line: End line number
            
        Returns:
            List of stages triggered by that code range
        """
        stage_ids = set()
        
        for line in range(start_line, end_line + 1):
            if line in mapping.line_to_stages:
                stage_ids.update(mapping.line_to_stages[line])
        
        return [
            mapping.stage_to_code[sid]
            for sid in stage_ids
            if sid in mapping.stage_to_code
        ]
