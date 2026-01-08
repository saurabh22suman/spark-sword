"""API routes for event log upload and analysis."""

from fastapi import APIRouter, File, HTTPException, UploadFile

from app.parsers import EventLogParser, NotebookParser
from app.services.analysis_service import AnalysisService

router = APIRouter(prefix="/api", tags=["analysis"])

# Services
parser = EventLogParser()
notebook_parser = NotebookParser()
analysis_service = AnalysisService()


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
