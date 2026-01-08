"""Notebook Parser for Static Intent Extraction.

Per must-have-spec.md Feature 5:
- Extracts INTENT, not execution, from notebooks
- MAY: Identify transformations, infer operation order, detect joins/groupBy/windows
- MUST NOT: Execute code, infer schema, infer data volume
- All output MUST be labeled: "Inferred Intent (User Adjustable)"

Per notebook-intent-extraction-spec.md:
- Intent Graph is a linear/branched sequence of logical operations
- Must include step, operation, details per node
- Must map intent to Spark consequences
- Must output uncertainties list

This is static analysis only. We never run user code.
"""

import json
import re
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional


class SparkConsequence(Enum):
    """Mapping of intent to Spark execution consequences.
    
    Per notebook-intent-extraction-spec.md Section 7.
    """
    NARROW = "Narrow transformation"
    SHUFFLE_REQUIRED = "Shuffle required"
    SHUFFLE_BOTH_SIDES = "Shuffle on both sides"
    BROADCAST_JOIN_LIKELY = "Broadcast join likely"
    FULL_SHUFFLE = "Full shuffle"
    NO_SHUFFLE = "No shuffle"
    SHUFFLE_AND_SORT = "Shuffle + sort"
    MEMORY_PRESSURE_RISK = "Memory pressure risk"
    FILE_EXPLOSION_RISK = "Possible file explosion"
    UNKNOWN = "Unknown consequence"


# Mapping of operations to their Spark consequences
OPERATION_CONSEQUENCES: dict[str, SparkConsequence] = {
    # Narrow transformations
    "filter": SparkConsequence.NARROW,
    "select": SparkConsequence.NARROW,
    "map": SparkConsequence.NARROW,
    "flatmap": SparkConsequence.NARROW,
    "mappartitions": SparkConsequence.NARROW,
    "union": SparkConsequence.NARROW,
    "withcolumn": SparkConsequence.NARROW,
    "drop": SparkConsequence.NARROW,
    "alias": SparkConsequence.NARROW,
    "where": SparkConsequence.NARROW,
    
    # Shuffle operations
    "groupby": SparkConsequence.SHUFFLE_REQUIRED,
    "groupbykey": SparkConsequence.SHUFFLE_REQUIRED,
    "reducebykey": SparkConsequence.SHUFFLE_REQUIRED,
    "aggregatebykey": SparkConsequence.SHUFFLE_REQUIRED,
    "distinct": SparkConsequence.SHUFFLE_REQUIRED,
    "agg": SparkConsequence.SHUFFLE_REQUIRED,
    "pivot": SparkConsequence.SHUFFLE_REQUIRED,
    
    # Join operations (default - may change with hints)
    "join": SparkConsequence.SHUFFLE_BOTH_SIDES,
    "innerjoin": SparkConsequence.SHUFFLE_BOTH_SIDES,
    "leftjoin": SparkConsequence.SHUFFLE_BOTH_SIDES,
    "rightjoin": SparkConsequence.SHUFFLE_BOTH_SIDES,
    "fulljoin": SparkConsequence.SHUFFLE_BOTH_SIDES,
    "crossjoin": SparkConsequence.SHUFFLE_BOTH_SIDES,
    
    # Repartition
    "repartition": SparkConsequence.FULL_SHUFFLE,
    "coalesce": SparkConsequence.NO_SHUFFLE,
    
    # Sort
    "sort": SparkConsequence.SHUFFLE_AND_SORT,
    "sortby": SparkConsequence.SHUFFLE_AND_SORT,
    "orderby": SparkConsequence.SHUFFLE_AND_SORT,
    
    # Cache/persist
    "cache": SparkConsequence.MEMORY_PRESSURE_RISK,
    "persist": SparkConsequence.MEMORY_PRESSURE_RISK,
    
    # Write
    "write": SparkConsequence.FILE_EXPLOSION_RISK,
    "save": SparkConsequence.FILE_EXPLOSION_RISK,
}


@dataclass
class IntentGraphNode:
    """A node in the Intent Graph representing one logical operation.
    
    Per intent-graph-ui-spec.md Section 4.2:
    - Operation name
    - Key columns (if known)
    - Spark consequence badge
    - Editable assumptions
    """
    step: int
    operation: str
    details: dict
    spark_consequence: SparkConsequence
    is_uncertain: bool = False
    uncertainty_reason: str | None = None
    
    def to_dict(self) -> dict:
        """Convert to dictionary for JSON serialization."""
        return {
            "step": self.step,
            "operation": self.operation,
            "details": self.details,
            "spark_consequence": self.spark_consequence.value,
            "is_uncertain": self.is_uncertain,
            "uncertainty_reason": self.uncertainty_reason,
        }


@dataclass
class IntentGraph:
    """A sequence of logical operations extracted from code.
    
    Per notebook-intent-extraction-spec.md Section 6.1:
    - Order matters
    - No cycles
    - No inferred parallelism
    """
    nodes: list[IntentGraphNode] = field(default_factory=list)
    
    def to_dict(self) -> list[dict]:
        """Convert to list of dictionaries for JSON."""
        return [node.to_dict() for node in self.nodes]


@dataclass
class DetectedTransformation:
    """A transformation detected in notebook code."""
    
    operation: str
    line_number: int
    cell_index: int
    code_snippet: str
    causes_shuffle: bool = False
    
    @property
    def description(self) -> str:
        """Human-readable description of this transformation."""
        if self.causes_shuffle:
            return f"{self.operation} (causes shuffle)"
        return self.operation


@dataclass
class InferredIntent:
    """Result of notebook parsing - labeled as inferred.
    
    Per spec: Output MUST be labeled "Inferred Intent (User Adjustable)"
    Per notebook-intent-extraction-spec.md Section 8: Must include intent_graph and uncertainties.
    """
    
    code_cells: list[str] = field(default_factory=list)
    transformations: list[DetectedTransformation] = field(default_factory=list)
    summary: str = ""
    
    # Intent Graph per spec Section 6
    intent_graph: IntentGraph = field(default_factory=IntentGraph)
    
    # Uncertainties per spec Section 8
    uncertainties: list[str] = field(default_factory=list)
    
    # These MUST always be True/set per spec
    is_inferred: bool = True
    label: str = "Inferred Intent (User Adjustable)"
    
    # Explicitly None per spec - we MUST NOT infer these
    schema: None = None
    row_count: None = None
    data_size: None = None

    def to_dict(self) -> dict:
        """Convert to dictionary for API response."""
        return {
            "label": self.label,
            "is_inferred": self.is_inferred,
            "summary": self.summary,
            "code_cells": self.code_cells,
            "transformations": [
                {
                    "operation": t.operation,
                    "line_number": t.line_number,
                    "cell_index": t.cell_index,
                    "code_snippet": t.code_snippet,
                    "causes_shuffle": t.causes_shuffle,
                }
                for t in self.transformations
            ],
            # Intent graph per spec Section 8
            "intent_graph": self.intent_graph.to_dict(),
            # Uncertainties per spec Section 8
            "uncertainties": self.uncertainties,
            # Explicit nulls to show we don't infer these
            "schema": None,
            "row_count": None,
            "data_size": None,
        }


# Operations that cause shuffles
SHUFFLE_OPERATIONS = {
    "groupby", "groupbykey", "reducebykey", "aggregatebykey",
    "join", "leftjoin", "rightjoin", "innerjoin", "fulljoin",
    "repartition", "distinct", "sort", "sortby", "orderby",
    "cogroup", "subtractbykey",
}

# Pattern to detect DataFrame/RDD operations
# Matches: df.operation( or .operation( at start of chain
OPERATION_PATTERN = re.compile(
    r'\.(\w+)\s*\(',
    re.IGNORECASE
)

# Known Spark transformation operations
SPARK_OPERATIONS = {
    # Narrow transformations
    "map", "filter", "flatmap", "mappartitions", "union", "coalesce",
    "select", "withcolumn", "drop", "alias", "cache", "persist",
    # Wide transformations (cause shuffle)
    "groupby", "reducebykey", "aggregatebykey", "join", "repartition",
    "distinct", "sort", "sortby", "orderby", "agg", "pivot",
    # Actions
    "collect", "count", "take", "first", "show", "write", "save",
}


class NotebookParser:
    """Parser for extracting intent from Spark notebooks.
    
    This parser performs STATIC ANALYSIS only.
    It NEVER executes any user code.
    """

    def parse_ipynb(self, content: str) -> InferredIntent:
        """Parse a Jupyter notebook (.ipynb) file.
        
        Args:
            content: Raw JSON content of the .ipynb file.
            
        Returns:
            InferredIntent with detected transformations.
        """
        try:
            notebook = json.loads(content)
        except json.JSONDecodeError:
            # Return empty result for invalid JSON
            return InferredIntent(
                summary="Could not parse notebook: invalid JSON format"
            )

        code_cells: list[str] = []
        transformations: list[DetectedTransformation] = []

        cells = notebook.get("cells", [])
        
        for cell_idx, cell in enumerate(cells):
            # Only process code cells per spec
            if cell.get("cell_type") != "code":
                continue

            # Get source code (may be list of lines or single string)
            source = cell.get("source", [])
            if isinstance(source, list):
                code = "".join(source)
            else:
                code = str(source)

            code_cells.append(code)
            
            # Extract transformations from this cell
            cell_transforms = self._extract_transformations(code, cell_idx)
            transformations.extend(cell_transforms)

        # Generate summary
        summary = self._generate_summary(transformations)
        
        # Build intent graph per spec
        intent_graph, uncertainties = self._build_intent_graph(transformations, code_cells)

        return InferredIntent(
            code_cells=code_cells,
            transformations=transformations,
            summary=summary,
            intent_graph=intent_graph,
            uncertainties=uncertainties,
        )

    def parse_py(self, content: str) -> InferredIntent:
        """Parse a Python (.py) file.
        
        Args:
            content: Raw Python source code.
            
        Returns:
            InferredIntent with detected transformations.
        """
        transformations = self._extract_transformations(content, cell_index=0)
        summary = self._generate_summary(transformations)
        
        # Build intent graph per spec
        intent_graph, uncertainties = self._build_intent_graph(transformations, [content])

        return InferredIntent(
            code_cells=[content],
            transformations=transformations,
            summary=summary,
            intent_graph=intent_graph,
            uncertainties=uncertainties,
        )

    def _extract_transformations(
        self, code: str, cell_index: int
    ) -> list[DetectedTransformation]:
        """Extract Spark transformations from code.
        
        This is static pattern matching only - no execution.
        """
        transformations: list[DetectedTransformation] = []
        
        lines = code.split("\n")
        
        for line_num, line in enumerate(lines, start=1):
            # Find all operation calls in this line
            for match in OPERATION_PATTERN.finditer(line):
                op_name = match.group(1).lower()
                
                # Only track known Spark operations
                if op_name not in SPARK_OPERATIONS:
                    continue
                
                # Determine if this causes a shuffle
                causes_shuffle = op_name in SHUFFLE_OPERATIONS
                
                transformations.append(DetectedTransformation(
                    operation=op_name,
                    line_number=line_num,
                    cell_index=cell_index,
                    code_snippet=line.strip()[:100],  # Truncate long lines
                    causes_shuffle=causes_shuffle,
                ))

        return transformations

    def _generate_summary(
        self, transformations: list[DetectedTransformation]
    ) -> str:
        """Generate human-readable summary of inferred intent.
        
        Uses descriptive language per spec - no prescriptive claims.
        """
        if not transformations:
            return "No Spark transformations detected in this notebook."

        shuffle_ops = [t for t in transformations if t.causes_shuffle]
        
        ops_list = list(dict.fromkeys(t.operation for t in transformations))
        
        summary_parts = []
        
        summary_parts.append(
            f"This notebook appears to perform: {', '.join(ops_list)}."
        )
        
        if shuffle_ops:
            shuffle_names = list(dict.fromkeys(t.operation for t in shuffle_ops))
            summary_parts.append(
                f"Operations that typically introduce a shuffle: {', '.join(shuffle_names)}."
            )
        else:
            summary_parts.append(
                "No shuffle-inducing operations were detected."
            )

        # Add join-specific note if detected
        if any(t.operation == "join" for t in transformations):
            summary_parts.append(
                "A join was detected, which typically introduces a shuffle "
                "unless broadcast join is used."
            )

        return " ".join(summary_parts)

    def _build_intent_graph(
        self,
        transformations: list[DetectedTransformation],
        code_cells: list[str],
    ) -> tuple[IntentGraph, list[str]]:
        """Build an Intent Graph from detected transformations.
        
        Per notebook-intent-extraction-spec.md Section 6:
        - Order matters
        - No cycles
        - No inferred parallelism
        
        Returns:
            Tuple of (IntentGraph, list of uncertainties)
        """
        nodes: list[IntentGraphNode] = []
        uncertainties: list[str] = []
        
        # Always add base uncertainty about data distribution
        uncertainties.append("Data distribution unknown")
        
        # Check for broadcast hints in code
        all_code = "\n".join(code_cells)
        has_broadcast = "broadcast(" in all_code.lower()
        
        for step, transform in enumerate(transformations, start=1):
            op_name = transform.operation.lower()
            
            # Get Spark consequence
            consequence = self._get_spark_consequence(op_name, all_code)
            
            # Build details with editable assumptions
            details = self._build_node_details(op_name, transform.code_snippet)
            
            # Determine uncertainty
            is_uncertain = False
            uncertainty_reason = None
            
            if op_name == "join":
                uncertainties.append("Join cardinality unknown")
                is_uncertain = True
                uncertainty_reason = "Cannot determine join cardinality from static analysis"
            
            nodes.append(IntentGraphNode(
                step=step,
                operation=self._format_operation_name(op_name),
                details=details,
                spark_consequence=consequence,
                is_uncertain=is_uncertain,
                uncertainty_reason=uncertainty_reason,
            ))
        
        return IntentGraph(nodes=nodes), uncertainties

    def _get_spark_consequence(self, op_name: str, all_code: str) -> SparkConsequence:
        """Get the Spark consequence for an operation.
        
        Per notebook-intent-extraction-spec.md Section 7.
        If multiple interpretations exist, choose the most conservative.
        """
        # Special handling for join with broadcast hint
        if op_name == "join" and "broadcast(" in all_code.lower():
            return SparkConsequence.BROADCAST_JOIN_LIKELY
        
        # Look up in mapping
        return OPERATION_CONSEQUENCES.get(op_name, SparkConsequence.UNKNOWN)

    def _build_node_details(self, op_name: str, code_snippet: str) -> dict:
        """Build details dictionary with editable assumptions.
        
        Per intent-graph-ui-spec.md Section 5.1:
        - Join: join_type, broadcast_hint
        - GroupBy/Join: is_skewed
        - Filter: selectivity
        """
        details: dict = {
            "code_snippet": code_snippet,
        }
        
        # Extract columns if possible (simple pattern matching)
        columns = self._extract_columns(code_snippet)
        if columns:
            if op_name in ("groupby", "groupbykey"):
                details["keys"] = columns
            else:
                details["columns"] = columns
        
        # Add editable assumptions based on operation type
        editable: dict = {}
        
        if op_name in ("join", "leftjoin", "rightjoin", "innerjoin", "fulljoin"):
            editable["join_type"] = self._detect_join_type(code_snippet)
            editable["broadcast_hint"] = "broadcast(" in code_snippet.lower()
            editable["is_skewed"] = False  # Default assumption
            
        elif op_name in ("groupby", "groupbykey", "aggregatebykey"):
            editable["is_skewed"] = False  # Default assumption
            
        elif op_name in ("filter", "where"):
            editable["selectivity"] = 0.5  # Default: 50% selectivity
        
        if editable:
            details["editable"] = editable
        
        return details

    def _extract_columns(self, code_snippet: str) -> list[str]:
        """Extract column names from a code snippet.
        
        Uses simple pattern matching for quoted strings in function calls.
        """
        # Match quoted strings: 'column' or "column"
        pattern = r'["\']([a-zA-Z_][a-zA-Z0-9_]*)["\']'
        matches = re.findall(pattern, code_snippet)
        return matches if matches else []

    def _detect_join_type(self, code_snippet: str) -> str:
        """Detect join type from code snippet."""
        snippet_lower = code_snippet.lower()
        
        if "left" in snippet_lower:
            return "left"
        elif "right" in snippet_lower:
            return "right"
        elif "outer" in snippet_lower or "full" in snippet_lower:
            return "outer"
        elif "cross" in snippet_lower:
            return "cross"
        else:
            return "inner"  # Default

    def _format_operation_name(self, op_name: str) -> str:
        """Format operation name for display."""
        # Common mappings
        name_map = {
            "groupby": "groupBy",
            "groupbykey": "groupByKey",
            "reducebykey": "reduceByKey",
            "aggregatebykey": "aggregateByKey",
            "sortby": "sortBy",
            "orderby": "orderBy",
            "flatmap": "flatMap",
            "mappartitions": "mapPartitions",
            "withcolumn": "withColumn",
            "crossjoin": "crossJoin",
        }
        return name_map.get(op_name.lower(), op_name)
