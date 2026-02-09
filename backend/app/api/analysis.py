"""API routes for event log upload and analysis."""

from fastapi import APIRouter, File, HTTPException, UploadFile

from app.parsers import EventLogParser, NotebookParser
from app.services.analysis_service import AnalysisService
from app.services.failure_analysis import FailureAnalysisService
from app.analyzers.dataflow_analyzer import DataFlowAnalyzer
from app.services.code_mapper_service import EnhancedCodeMapper
from app.services.fix_wizard import FixItWizard
from app.services.anti_patterns import (
    get_all_anti_patterns,
    get_anti_pattern_by_id,
    get_anti_patterns_by_category,
)

router = APIRouter(prefix="/api", tags=["analysis"])

# Services
parser = EventLogParser()
notebook_parser = NotebookParser()
analysis_service = AnalysisService()
failure_analysis_service = FailureAnalysisService()
dataflow_analyzer = DataFlowAnalyzer()
code_mapper = EnhancedCodeMapper()
fix_wizard = FixItWizard()


@router.post("/upload/event-log")
async def upload_event_log(file: UploadFile = File(...)) -> dict:
    """Upload and analyze a Spark event log.

    Args:
        file: The event log file (JSON format, newline-delimited).

    Returns:
        Complete analysis result with DAG and insights.
    """
    # Validate file type
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")

    # Read file content with size limit (100MB max to prevent DoS)
    MAX_FILE_SIZE = 100 * 1024 * 1024  # 100MB
    try:
        content = await file.read()
        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=413,
                detail=f"File too large. Maximum size is {MAX_FILE_SIZE // (1024*1024)}MB",
            )
        content_str = content.decode("utf-8")
    except UnicodeDecodeError:
        raise HTTPException(
            status_code=400,
            detail="File must be UTF-8 encoded text",
        )

    # Parse event log
    try:
        parsed_log = parser.parse(content_str)
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Failed to parse event log: {str(e)}",
        )

    # Validate we got some data
    if parsed_log.total_events == 0:
        raise HTTPException(
            status_code=400,
            detail="Event log appears to be empty or invalid",
        )

    # Run analysis
    result = analysis_service.analyze(parsed_log)

    return result.to_dict()


@router.post("/upload/notebook")
async def upload_notebook(file: UploadFile = File(...)) -> dict:
    """Upload and analyze a Spark notebook for intent extraction.

    Per must-have-spec.md Feature 5:
    - Extracts INTENT, not execution
    - MAY: Identify transformations, infer operation order, detect joins/groupBy
    - MUST NOT: Execute code, infer schema, infer data volume
    - Output labeled as "Inferred Intent (User Adjustable)"

    Args:
        file: A notebook file (.ipynb or .py).

    Returns:
        InferredIntent with detected transformations and summary.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")

    # Read file content with size limit (50MB max for notebooks)
    MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB
    try:
        content = await file.read()
        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=413,
                detail=f"File too large. Maximum size is {MAX_FILE_SIZE // (1024*1024)}MB",
            )
        content_str = content.decode("utf-8")
    except UnicodeDecodeError:
        raise HTTPException(
            status_code=400,
            detail="File must be UTF-8 encoded text",
        )

    # Determine file type and parse accordingly
    filename_lower = file.filename.lower()
    
    if filename_lower.endswith(".ipynb"):
        result = notebook_parser.parse_ipynb(content_str)
        # Check for parse errors (invalid JSON)
        if result.summary.startswith("Could not parse notebook"):
            raise HTTPException(
                status_code=400,
                detail=result.summary,
            )
    elif filename_lower.endswith(".py"):
        result = notebook_parser.parse_py(content_str)
    else:
        raise HTTPException(
            status_code=400,
            detail="Unsupported file type. Please upload .ipynb or .py files.",
        )

    return result.to_dict()


@router.post("/analyze/text")
async def analyze_event_log_text(content: str) -> dict:
    """Analyze event log content directly (for testing/API usage).

    Args:
        content: The event log content as a string.

    Returns:
        Complete analysis result with DAG and insights.
    """
    # Validate content size (100MB max)
    MAX_CONTENT_SIZE = 100 * 1024 * 1024
    if len(content.encode('utf-8')) > MAX_CONTENT_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"Content too large. Maximum size is {MAX_CONTENT_SIZE // (1024*1024)}MB",
        )
    
    # Parse event log
    try:
        parsed_log = parser.parse(content)
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Failed to parse event log: {str(e)}",
        )

    if parsed_log.total_events == 0:
        raise HTTPException(
            status_code=400,
            detail="Event log appears to be empty or invalid",
        )

    # Run analysis
    result = analysis_service.analyze(parsed_log)

    return result.to_dict()


@router.get("/demo")
async def get_demo_analysis() -> dict:
    """Get pre-analyzed demo event log for exploration.
    
    Feature 6: Sample Canonical Spark Job
    Per must-have-spec.md: Provide a sample event log with known
    shuffle, skew, and join for demo mode exploration.
    
    Returns:
        Complete analysis result with DAG and insights from demo data,
        plus a demo flag for UI labeling.
    """
    import os
    
    # Find demo event log in fixtures
    fixtures_dir = os.path.join(
        os.path.dirname(__file__),
        "..",
        "..",
        "tests",
        "fixtures",
        "spark_event_logs",
    )
    demo_file = os.path.join(fixtures_dir, "demo_analytics_pipeline.json")
    
    if not os.path.exists(demo_file):
        raise HTTPException(
            status_code=404,
            detail="Demo event log not found",
        )
    
    # Read and parse demo event log
    with open(demo_file, "r") as f:
        content = f.read()
    
    try:
        parsed_log = parser.parse(content)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to parse demo event log: {str(e)}",
        )
    
    # Run analysis
    result = analysis_service.analyze(parsed_log)
    result_dict = result.to_dict()
    
    # Add demo flag per spec
    result_dict["is_demo"] = True
    result_dict["demo_label"] = "Demo Data — Try uploading your own files for real analysis"
    
    return result_dict


@router.post("/analyze/failures")
async def analyze_failures(file: UploadFile = File(...)) -> dict:
    """Analyze event log for failure patterns.
    
    Feature 1: Failure Diagnostics
    Detects 4 failure patterns: Stuck Tasks, GC Pressure, Excessive Spill, Executor Loss.
    
    Args:
        file: Event log file
    
    Returns:
        Detected failure patterns with explanations and evidence
    """
    try:
        content = await file.read()
        content_str = content.decode("utf-8")
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="File must be UTF-8 encoded")
    
    try:
        parsed_log = parser.parse(content_str)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to parse event log: {str(e)}",
        )
    
    # Detect patterns
    patterns = failure_analysis_service.analyze(parsed_log)
    
    return {
        "patterns": [p.model_dump() for p in patterns],
        "total_patterns": len(patterns),
        "has_failures": len(patterns) > 0
    }


@router.post("/analyze/dataflow")
async def analyze_dataflow(file: UploadFile = File(...)) -> dict:
    """Analyze data flow across stages (Sankey diagram data).
    
    Feature 3: Data Flow Visualization
    Shows how data moves through shuffle boundaries.
    
    Args:
        file: Event log file
    
    Returns:
        Nodes and links for Sankey diagram
    """
    try:
        content = await file.read()
        content_str = content.decode("utf-8")
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="File must be UTF-8 encoded")
    
    try:
        parsed_log = parser.parse(content_str)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to parse event log: {str(e)}",
        )
    
    # Analyze data flow
    flow_data = dataflow_analyzer.analyze(parsed_log)
    
    return {
        "nodes": [n.model_dump() for n in flow_data.nodes],
        "links": [l.model_dump() for l in flow_data.links],
        "total_shuffle_bytes": sum(l.bytes_shuffled for l in flow_data.links)
    }


@router.post("/analyze/code-mapping")
async def analyze_code_mapping(
    event_log: UploadFile = File(...),
    notebook: UploadFile | None = File(None)
) -> dict:
    """Map notebook code to Spark stages.
    
    Feature 5: Code-to-Stage Mapper
    Links each transformation in user code to the stages it triggers.
    
    Args:
        event_log: Event log file
        notebook: Optional Jupyter notebook (.ipynb)
    
    Returns:
        Bidirectional mapping: code lines → stages and stages → code
    """
    try:
        log_content = await event_log.read()
        log_str = log_content.decode("utf-8")
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="Event log must be UTF-8 encoded")
    
    try:
        parsed_log = parser.parse(log_str)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to parse event log: {str(e)}",
        )
    
    # Parse notebook if provided
    parsed_notebook = None
    if notebook:
        try:
            nb_content = await notebook.read()
            nb_str = nb_content.decode("utf-8")
            parsed_notebook = notebook_parser.parse(nb_str)
        except Exception as e:
            raise HTTPException(
                status_code=400,
                detail=f"Failed to parse notebook: {str(e)}",
            )
    
    # Create mapping
    mapping = code_mapper.create_mapping(parsed_log, parsed_notebook)
    
    return {
        "stage_links": [link.model_dump() for link in mapping.stage_links],
        "total_stages": len(mapping.stage_links),
        "has_code": parsed_notebook is not None
    }


@router.post("/analyze/fix-wizard")
async def generate_fixes(file: UploadFile = File(...)) -> dict:
    """Generate actionable fixes from detected failure patterns.
    
    Feature 6: Fix-It Wizard
    Analyzes failures → suggests config changes, code mods, and impact estimates.
    
    Args:
        file: Event log file
    
    Returns:
        List of Fix objects sorted by priority (easy + low-risk first)
    """
    try:
        content = await file.read()
        content_str = content.decode("utf-8")
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="File must be UTF-8 encoded")
    
    try:
        parsed_log = parser.parse(content_str)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to parse event log: {str(e)}",
        )
    
    # Detect patterns
    patterns = failure_analysis_service.analyze(parsed_log)
    
    # Generate fixes
    fixes = fix_wizard.generate_fixes(patterns)
    
    try:
        return {
            "fixes": [f.model_dump() for f in fixes],
            "patterns_analyzed": len(patterns),
            "total_fixes": len(fixes)
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate fixes: {str(e)}",
        )


@router.get("/anti-patterns")
async def get_antipatterns(category: str | None = None) -> dict:
    """Get anti-pattern examples from the gallery.
    
    Feature 7: Anti-Pattern Gallery
    Educational examples of bad Spark code with runnable scenarios.
    
    Args:
        category: Optional filter by category (joins, memory, shuffles, actions, caching)
    
    Returns:
        List of anti-pattern examples with bad/good code, metrics, and explanations
    """
    try:
        if category:
            patterns = get_anti_patterns_by_category(category)
        else:
            patterns = get_all_anti_patterns()
        
        return {
            "anti_patterns": [p.model_dump() for p in patterns],
            "total": len(patterns),
            "categories": ["joins", "memory", "shuffles", "actions", "caching", "correctness"]
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch anti-patterns: {str(e)}",
        )


@router.get("/anti-patterns/{pattern_id}")
async def get_antipattern_detail(pattern_id: str) -> dict:
    """Get detailed view of a specific anti-pattern.
    
    Args:
        pattern_id: The anti-pattern ID (e.g., "cartesian-join")
    
    Returns:
        Full anti-pattern details including code examples and metrics
    """
    pattern = get_anti_pattern_by_id(pattern_id)
    
    if not pattern:
        raise HTTPException(
            status_code=404,
            detail=f"Anti-pattern '{pattern_id}' not found"
        )
    
    return pattern.model_dump()
