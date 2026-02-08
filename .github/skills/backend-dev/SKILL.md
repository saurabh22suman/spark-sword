# PrepRabbit Backend Development Skill

## Purpose
Expert backend development for PrepRabbit's Python/FastAPI services with strict Test-Driven Development (TDD) and Spark-centric architecture.

## When to Apply
Activate this skill when working on:
- Backend API endpoints (`/api/*`)
- Event log parsing and analysis
- Optimization detection algorithms
- DuckDB schema and queries
- FastAPI route handlers
- Pydantic model definitions
- Test writing (pytest)
- Backend configuration

## Core Philosophy

### Non-Negotiables
1. **Test-Driven Development (TDD)** - RED → GREEN → REFACTOR → VERIFY
2. **No Spark Execution** - Explain, simulate, suggest (never run actual Spark jobs)
3. **Evidence-Based Insights** - Every optimization must reference measurable Spark signals
4. **No Performance Guarantees** - Always show tradeoffs, never claim "best" solutions
5. **Data-Shape Agnostic** - Simulations based on partition counts and operation types, not data values

### Architecture Principles
- **Event-Driven Analysis**: Parse Spark event logs into DuckDB for SQL-based insights
- **Detector Pattern**: Each optimization category has dedicated detector class
- **Confidence Scoring**: All heuristics include explicit confidence levels
- **API-First Design**: Backend serves as analysis engine, frontend consumes JSON

---

## Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| Python | 3.11+ | Language |
| FastAPI | 0.109+ | API framework |
| DuckDB | 0.9+ | Analytics database |
| Pydantic | 2.5+ | Schema validation |
| pytest | Latest | Testing |
| uvicorn | 0.27+ | ASGI server |

---

## Project Structure

```
backend/
├── app/
│   ├── api/          # FastAPI route handlers
│   ├── core/         # Config, dependencies, auth
│   ├── models/       # Pydantic schemas
│   ├── parsers/      # Event log & notebook parsers
│   ├── analyzers/    # Optimization detectors
│   ├── simulators/   # DataFrame shape playground
│   ├── services/     # Business logic
│   └── scenarios/    # Real-life scenario definitions
├── tests/
│   ├── unit/         # Single-function tests
│   ├── integration/  # Multi-component tests
│   ├── simulation/   # Playground validation
│   └── workflows/    # End-to-end flows
└── data/             # DuckDB files (gitignored)
```

---

## TDD Workflow (MANDATORY)

### Red-Green-Refactor-Verify Cycle

```python
# 1. RED - Write failing test describing Spark behavior
def test_detects_shuffle_on_groupby():
    """groupBy causes shuffle — must detect and explain WHY."""
    log = create_event_log_with_groupby()
    detector = ShuffleDetector()
    
    insights = detector.detect(log)
    
    assert len(insights) > 0
    assert "groupBy" in insights[0].description
    assert insights[0].evidence["shuffle_bytes"] > 0  # Must link to metrics
    assert insights[0].confidence in ["high", "medium", "low"]

# 2. GREEN - Implement minimal logic to pass
class ShuffleDetector(BaseDetector):
    def detect(self, log):
        # Implementation

# 3. REFACTOR - Improve without changing behavior
# 4. VERIFY - Run full test suite
```

### Testing Rules

| Rule | Description |
|------|-------------|
| **Behavior First** | Test describes Spark behavior, not implementation |
| **Evidence Required** | Every insight must reference event log metrics |
| **No Guarantees** | Tests must NEVER assert "performance will improve by X%" |
| **Deterministic** | Same input → same output (no randomness) |
| **Fast** | Unit tests < 50ms, integration < 500ms |

---

## Code Patterns

### 1. Detector Pattern

```python
from app.analyzers.base import BaseDetector
from app.models.insights import Insight, InsightType, Confidence

class SkewDetector(BaseDetector):
    """Detects data skew in shuffle operations."""
    
    @property
    def name(self) -> str:
        return "skew_detector"
    
    def detect(self, parsed_log: ParsedEventLog) -> list[Insight]:
        """Analyze task metrics for skew indicators."""
        insights = []
        
        for stage in parsed_log.stages:
            if not self._is_shuffle_stage(stage):
                continue
            
            skew_ratio = self._calculate_skew_ratio(stage.tasks)
            
            if skew_ratio > 3.0:  # Evidence-based threshold
                insights.append(Insight(
                    type=InsightType.DATA_SKEW,
                    title="High Task Skew Detected",
                    description=f"Stage {stage.id}: Max task duration is {skew_ratio:.1f}x median",
                    evidence={
                        "stage_id": stage.id,
                        "skew_ratio": skew_ratio,
                        "max_duration_ms": max(t.duration for t in stage.tasks),
                        "median_duration_ms": self._median([t.duration for t in stage.tasks])
                    },
                    confidence=Confidence.HIGH if skew_ratio > 5.0 else Confidence.MEDIUM,
                    suggestion="Consider salting join keys or using adaptive skew join",
                    spark_docs_ref="https://spark.apache.org/docs/latest/sql-performance-tuning.html#skew-join"
                ))
        
        return insights
    
    def _calculate_skew_ratio(self, tasks: list[Task]) -> float:
        """Calculate ratio of max to median task duration."""
        durations = [t.duration for t in tasks]
        return max(durations) / self._median(durations) if durations else 0.0
```

### 2. API Endpoint Pattern

```python
from fastapi import APIRouter, UploadFile, HTTPException
from app.parsers.event_log_parser import parse_event_log
from app.analyzers import get_all_detectors

router = APIRouter(prefix="/api", tags=["analysis"])

@router.post("/upload/event-log")
async def upload_event_log(file: UploadFile) -> dict:
    """Parse event log and detect optimization opportunities."""
    try:
        # 1. Validate input
        if not file.filename.endswith(('.json', '.log', '.txt')):
            raise HTTPException(400, "Invalid file type")
        
        # 2. Parse event log
        content = await file.read()
        parsed_log = parse_event_log(content)
        
        # 3. Run all detectors
        detectors = get_all_detectors()
        all_insights = []
        for detector in detectors:
            insights = detector.detect(parsed_log)
            all_insights.extend(insights)
        
        # 4. Build DAG
        dag = build_dag(parsed_log)
        
        # 5. Return analysis
        return {
            "dag": dag.model_dump(),
            "insights": [i.model_dump() for i in all_insights],
            "stats": {
                "total_jobs": len(parsed_log.jobs),
                "total_stages": len(parsed_log.stages),
                "total_tasks": sum(len(s.tasks) for s in parsed_log.stages)
            }
        }
    
    except Exception as e:
        raise HTTPException(500, f"Analysis failed: {str(e)}")
```

### 3. Pydantic Model Pattern

```python
from pydantic import BaseModel, Field, field_validator
from enum import Enum

class Confidence(str, Enum):
    """Insight confidence level."""
    HIGH = "high"      # >90% certain based on clear metrics
    MEDIUM = "medium"  # 70-90% certain, some ambiguity
    LOW = "low"        # <70% certain, requires context

class InsightType(str, Enum):
    """Category of optimization insight."""
    SHUFFLE_BOUNDARY = "shuffle_boundary"
    DATA_SKEW = "data_skew"
    BROADCAST_JOIN = "broadcast_join"
    PARTITION_COUNT = "partition_count"

class Insight(BaseModel):
    """Optimization insight with evidence and confidence."""
    
    type: InsightType
    title: str = Field(..., min_length=10, max_length=100)
    description: str = Field(..., min_length=20)
    evidence: dict = Field(default_factory=dict)  # Metrics from event log
    confidence: Confidence
    suggestion: str | None = None
    spark_docs_ref: str | None = None
    
    @field_validator('evidence')
    @classmethod
    def evidence_must_not_be_empty(cls, v):
        if not v:
            raise ValueError("Every insight must have evidence from event log")
        return v
```

---

## Database Patterns (DuckDB)

### Schema Design

```python
def create_event_log_schema(conn: duckdb.DuckDBPyConnection):
    """Create tables for parsed event log data."""
    
    # Jobs table
    conn.execute("""
        CREATE TABLE IF NOT EXISTS jobs (
            job_id INTEGER PRIMARY KEY,
            submission_time TIMESTAMP,
            completion_time TIMESTAMP,
            status VARCHAR,
            num_stages INTEGER
        )
    """)
    
    # Stages table
    conn.execute("""
        CREATE TABLE IF NOT EXISTS stages (
            stage_id INTEGER PRIMARY KEY,
            job_id INTEGER,
            name VARCHAR,
            num_tasks INTEGER,
            shuffle_read_bytes BIGINT,
            shuffle_write_bytes BIGINT,
            FOREIGN KEY (job_id) REFERENCES jobs(job_id)
        )
    """)
    
    # Tasks table
    conn.execute("""
        CREATE TABLE IF NOT EXISTS tasks (
            task_id BIGINT PRIMARY KEY,
            stage_id INTEGER,
            executor_id VARCHAR,
            duration_ms BIGINT,
            input_bytes BIGINT,
            output_bytes BIGINT,
            FOREIGN KEY (stage_id) REFERENCES stages(stage_id)
        )
    """)
```

### Query Patterns

```python
def find_skewed_stages(conn: duckdb.DuckDBPyConnection) -> list[dict]:
    """Find stages with high task duration variance (skew indicator)."""
    return conn.execute("""
        WITH task_stats AS (
            SELECT 
                stage_id,
                MAX(duration_ms) as max_duration,
                MEDIAN(duration_ms) as median_duration,
                COUNT(*) as task_count
            FROM tasks
            GROUP BY stage_id
        )
        SELECT 
            s.stage_id,
            s.name,
            t.max_duration,
            t.median_duration,
            (t.max_duration::FLOAT / NULLIF(t.median_duration, 0)) as skew_ratio
        FROM stages s
        JOIN task_stats t ON s.stage_id = t.stage_id
        WHERE (t.max_duration::FLOAT / NULLIF(t.median_duration, 0)) > 3.0
        ORDER BY skew_ratio DESC
    """).fetchall()
```

---

## Testing Patterns

### Unit Test Example

```python
import pytest
from app.analyzers.join_detector import JoinDetector
from app.models.event_log import ParsedEventLog, StageInfo

def test_detects_broadcast_join_opportunity():
    """Small table join should suggest broadcast hint."""
    # Arrange
    log = ParsedEventLog(
        stages=[
            StageInfo(
                id=1,
                name="join at line 42",
                shuffle_read_bytes=500_000_000,  # 500MB shuffle (expensive)
                num_tasks=200
            )
        ]
    )
    detector = JoinDetector()
    
    # Act
    insights = detector.detect(log)
    
    # Assert
    assert len(insights) == 1
    assert insights[0].type == InsightType.BROADCAST_JOIN
    assert "broadcast" in insights[0].suggestion.lower()
    assert insights[0].evidence["shuffle_read_bytes"] == 500_000_000
```

### Integration Test Example

```python
@pytest.mark.integration
def test_end_to_end_event_log_analysis(sample_event_log_content):
    """Full pipeline: upload → parse → analyze → return insights."""
    # Parse
    parsed = parse_event_log(sample_event_log_content)
    
    # Analyze
    detectors = get_all_detectors()
    all_insights = []
    for detector in detectors:
        all_insights.extend(detector.detect(parsed))
    
    # Verify
    assert len(all_insights) > 0  # Should find something
    for insight in all_insights:
        assert insight.evidence  # Must have evidence
        assert insight.confidence  # Must have confidence
```

---

## Environment Configuration

### .env Structure

```bash
# Database
DUCKDB_PATH=/app/data/spark_sword.duckdb
PROGRESS_DB_PATH=/app/data/progress.duckdb

# API
API_HOST=0.0.0.0
API_PORT=8000
ALLOWED_ORIGINS=http://localhost:3000,https://spark.preprabbit.in

# Auth (Optional)
GOOGLE_CLIENT_ID=your-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-secret
JWT_SECRET_KEY=your-32-char-secret
COOKIE_DOMAIN=.preprabbit.in

# Debug
DEBUG=true  # Enables /docs endpoint
```

---

## Common Patterns & Anti-Patterns

### ✅ DO

```python
# Evidence-based insight with confidence
insight = Insight(
    type=InsightType.SHUFFLE_BOUNDARY,
    title="Shuffle Detected After GroupBy",
    description="Stage 2 reads 1.2GB shuffle data from Stage 1",
    evidence={
        "stage_id": 2,
        "shuffle_read_bytes": 1_200_000_000,
        "shuffle_write_bytes": 1_150_000_000
    },
    confidence=Confidence.HIGH,  # Clear metrics support this
    suggestion="Consider using reduceByKey instead of groupByKey if applicable"
)
```

### ❌ DON'T

```python
# NO performance guarantees
insight = Insight(
    description="This will make your job 3x faster",  # ❌ NEVER
    suggestion="Use broadcast join to improve performance by 10x"  # ❌ NEVER
)

# NO insights without evidence
insight = Insight(
    evidence={}  # ❌ Empty evidence not allowed
)

# NO data value inspection
if dataframe.collect()[0]["user_id"] == "12345":  # ❌ Never inspect actual data
    pass
```

---

## API Response Format

### Standard Response Structure

```json
{
  "dag": {
    "nodes": [...],
    "edges": [...]
  },
  "insights": [
    {
      "type": "data_skew",
      "title": "High Task Skew in Stage 3",
      "description": "Max task took 45s, median was 8s (5.6x difference)",
      "evidence": {
        "stage_id": 3,
        "skew_ratio": 5.6,
        "max_duration_ms": 45000,
        "median_duration_ms": 8000
      },
      "confidence": "high",
      "suggestion": "Enable adaptive skew join: spark.sql.adaptive.skewJoin.enabled=true",
      "spark_docs_ref": "https://spark.apache.org/docs/latest/sql-performance-tuning.html"
    }
  ],
  "stats": {
    "total_jobs": 1,
    "total_stages": 5,
    "total_tasks": 842
  }
}
```

---

## Development Workflow

### Starting Backend

```bash
cd /home/soloengine/Github/spark-sword/backend

# Activate venv
source .venv/bin/activate

# Run server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Running Tests

```bash
# All tests
python -m pytest tests/ -v

# Specific category
python -m pytest tests/unit/ -v
python -m pytest tests/integration/ -v

# With coverage
python -m pytest tests/ --cov=app --cov-report=term-missing

# Single test
python -m pytest tests/unit/test_shuffle_detector.py::test_detects_groupby_shuffle -v
```

### Adding New Detector

1. **Write test first** (`tests/unit/test_my_detector.py`)
2. **Create detector** (`app/analyzers/my_detector.py`)
3. **Register in `__init__.py`** (`app/analyzers/__init__.py`)
4. **Verify with integration test**
5. **Update documentation**

---

## Pre-Commit Checklist

Before committing backend code:

- [ ] All tests pass (`pytest tests/`)
- [ ] No f-strings in tests (use assert messages)
- [ ] All insights have evidence
- [ ] All insights have confidence levels
- [ ] No performance guarantees in strings
- [ ] Type hints on all functions
- [ ] Docstrings on public methods
- [ ] No `print()` statements (use logging)
- [ ] No hardcoded paths
- [ ] Environment variables documented in `.env.example`

---

## Error Handling Pattern

```python
from fastapi import HTTPException
import logging

logger = logging.getLogger(__name__)

@router.post("/analyze")
async def analyze(file: UploadFile):
    try:
        content = await file.read()
        result = parse_and_analyze(content)
        return result
    except ValueError as e:
        logger.warning(f"Invalid input: {e}")
        raise HTTPException(400, f"Invalid event log format: {str(e)}")
    except Exception as e:
        logger.error(f"Analysis failed: {e}", exc_info=True)
        raise HTTPException(500, "Internal analysis error")
```

---

## Performance Guidelines

| Guideline | Threshold |
|-----------|-----------|
| API response time | < 2s for typical event log |
| DuckDB query time | < 500ms for analytics |
| Unit test execution | < 50ms per test |
| Memory usage | < 500MB for 10MB event log |

---

## References

- [FastAPI Best Practices](https://fastapi.tiangolo.com/tutorial/bigger-applications/)
- [Pydantic Documentation](https://docs.pydantic.dev/latest/)
- [DuckDB Python API](https://duckdb.org/docs/api/python/overview)
- [Spark Event Log Format](https://spark.apache.org/docs/latest/monitoring.html#spark-history-server-configuration-options)
- [PrepRabbit Philosophy](/.github/copilot-instructions.md)
