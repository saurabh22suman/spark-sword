# PrepRabbit Testing & Quality Assurance Skill

## Purpose
Expert test-driven development (TDD) and quality assurance for PrepRabbit, ensuring correctness of Spark analysis while preventing hallucinations.

## When to Apply
Activate this skill when:
- Writing tests before implementation (TDD)
- Validating optimization detection logic
- Testing simulation accuracy
- Creating E2E workflow tests
- Debugging test failures
- Ensuring code coverage
- Validating Spark behavior claims

## Core Philosophy

### Testing Commandments

1. **RED → GREEN → REFACTOR → VERIFY** - No exceptions to TDD workflow
2. **Tests Prove WHY** - Every insight must have test proving its trigger condition
3. **No Performance Guarantees** - Tests must never assert "X% faster"
4. **Evidence Required** - All assertions link to measurable Spark metrics
5. **Deterministic** - Same input always produces same output
6. **Fast Feedback** - Unit tests <50ms, integration <500ms

---

## Test Pyramid

```
         E2E (10%)              ← Full system, slow, critical flows
       /           \
    Workflow (20%)              ← Multi-component, medium speed
   /                 \
Integration (30%)                ← Component interaction
/                       \
Unit Tests (40%)                 ← Fast, isolated, comprehensive
```

### Coverage Targets

| Category | Minimum Coverage | Speed | Purpose |
|----------|-----------------|-------|---------|
| **Unit** | 95% | <50ms | Function correctness |
| **Integration** | 90% | <500ms | Component interaction |
| **Workflow** | 85% | <2s | User journeys |
| **E2E** | Behavioral | <10s | Visual + analytical consistency |

---

## Backend Testing

### Unit Test Pattern

```python
import pytest
from app.analyzers.shuffle_detector import ShuffleDetector
from app.models.event_log import ParsedEventLog, StageInfo
from app.models.insights import InsightType, Confidence

def test_detects_shuffle_on_groupby():
    """groupBy causes shuffle — detector must identify and explain."""
    # Arrange: Create event log with known shuffle pattern
    log = ParsedEventLog(
        jobs=[],
        stages=[
            StageInfo(
                id=1,
                name="mapPartitions at line 10",
                shuffle_write_bytes=0,
                shuffle_read_bytes=0
            ),
            StageInfo(
                id=2,
                name="groupByKey at line 15",
                shuffle_write_bytes=500_000_000,  # 500MB written
                shuffle_read_bytes=0
            ),
            StageInfo(
                id=3,
                name="map at line 18",
                shuffle_write_bytes=0,
                shuffle_read_bytes=500_000_000  # 500MB read (shuffle boundary)
            )
        ]
    )
    detector = ShuffleDetector()
    
    # Act: Run detection
    insights = detector.detect(log)
    
    # Assert: Verify detection and explanation
    assert len(insights) == 1, "Should detect exactly one shuffle boundary"
    
    insight = insights[0]
    assert insight.type == InsightType.SHUFFLE_BOUNDARY
    assert "groupByKey" in insight.description.lower()
    assert insight.confidence == Confidence.HIGH  # Clear metrics = high confidence
    
    # Evidence must link to event log metrics
    assert "shuffle_read_bytes" in insight.evidence
    assert insight.evidence["shuffle_read_bytes"] == 500_000_000
    assert insight.evidence["stage_id"] == 3
    
    # Suggestion must exist and be actionable
    assert insight.suggestion is not None
    assert len(insight.suggestion) > 10  # Not just placeholder text
    
    # NO performance guarantees allowed
    assert "faster" not in insight.suggestion.lower()
    assert "%" not in insight.suggestion
    assert "will improve" not in insight.suggestion.lower()

def test_no_false_positive_on_map():
    """map operations don't shuffle — must not trigger detector."""
    log = ParsedEventLog(
        stages=[
            StageInfo(
                id=1,
                name="map at line 5",
                shuffle_write_bytes=0,
                shuffle_read_bytes=0
            )
        ]
    )
    detector = ShuffleDetector()
    
    insights = detector.detect(log)
    
    assert len(insights) == 0, "Map without shuffle should not trigger detector"

def test_confidence_decreases_with_ambiguity():
    """When metrics are unclear, confidence must be lower."""
    log = ParsedEventLog(
        stages=[
            StageInfo(
                id=1,
                name="unknown operation at line 20",  # No clear operation name
                shuffle_write_bytes=100,  # Very small shuffle (could be noise)
                shuffle_read_bytes=0
            )
        ]
    )
    detector = ShuffleDetector()
    
    insights = detector.detect(log)
    
    if len(insights) > 0:
        # If detector triggers on ambiguous case, confidence MUST be low
        assert insights[0].confidence in [Confidence.LOW, Confidence.MEDIUM]
```

### Integration Test Pattern

```python
@pytest.mark.integration
def test_end_to_end_event_log_analysis(tmp_path):
    """Full pipeline: upload → parse → analyze → return JSON."""
    # Arrange: Create sample event log file
    event_log_path = tmp_path / "sample.json"
    event_log_path.write_text('''
    {
      "SparkListenerLogStart": {"Spark Version": "3.5.0"},
      "SparkListenerJobStart": {"Job ID": 0, "Stage IDs": [0, 1]},
      "SparkListenerStageSubmitted": {
        "Stage Info": {
          "Stage ID": 0,
          "Stage Name": "groupBy at Main.scala:42"
        }
      }
    }
    ''')
    
    # Act: Parse and analyze
    with open(event_log_path) as f:
        content = f.read()
    
    parsed_log = parse_event_log(content)
    
    detectors = get_all_detectors()
    all_insights = []
    for detector in detectors:
        all_insights.extend(detector.detect(parsed_log))
    
    # Assert: Verify output structure
    assert isinstance(all_insights, list)
    
    for insight in all_insights:
        # Every insight must have complete structure
        assert insight.type in InsightType
        assert insight.confidence in Confidence
        assert isinstance(insight.evidence, dict)
        assert len(insight.evidence) > 0  # Evidence required
        assert insight.title
        assert insight.description
        
        # Validate no performance guarantees
        assert "guarantee" not in insight.description.lower()
        assert "will be" not in insight.suggestion.lower() if insight.suggestion else True

@pytest.mark.integration
def test_skew_detector_with_real_metrics():
    """Use actual event log metrics to validate skew detection."""
    log = ParsedEventLog(
        stages=[
            StageInfo(
                id=1,
                name="join at line 100",
                tasks=[
                    TaskInfo(id=1, duration_ms=5000, executor_id="exec-1"),
                    TaskInfo(id=2, duration_ms=6000, executor_id="exec-2"),
                    TaskInfo(id=3, duration_ms=45000, executor_id="exec-3"),  # Skewed task
                    TaskInfo(id=4, duration_ms=5500, executor_id="exec-4"),
                ]
            )
        ]
    )
    
    detector = SkewDetector()
    insights = detector.detect(log)
    
    assert len(insights) > 0
    assert insights[0].type == InsightType.DATA_SKEW
    
    # Verify skew calculation is correct
    skew_ratio = insights[0].evidence["skew_ratio"]
    assert skew_ratio > 7.0  # 45000 / ~5500 median ≈ 8.2
```

### Simulation Test Pattern

```python
@pytest.mark.simulation
def test_simulation_is_data_agnostic():
    """Simulations must NOT depend on actual data values."""
    from app.simulators.dataframe_playground import simulate_operation
    
    # Arrange: Define operation shape (NOT data)
    operation = {
        "type": "groupBy",
        "input_partitions": 200,
        "keys": 100_000,  # Cardinality estimate, not actual values
        "rows_per_partition": 50_000
    }
    
    # Act: Run simulation
    result = simulate_operation(operation)
    
    # Assert: Result is based on shape, not data
    assert "output_partitions" in result
    assert "estimated_shuffle_bytes" in result
    assert "confidence" in result
    
    # Verify confidence labeling
    assert result["confidence"] in ["high", "medium", "low"]
    
    # Verify no data inspection happened
    assert "sample_values" not in result
    assert "actual_shuffle_bytes" not in result  # "estimated" only

@pytest.mark.simulation
def test_simulation_shows_tradeoffs():
    """Simulations must show tradeoffs, not just improvements."""
    from app.simulators.config_simulator import simulate_config_change
    
    # Arrange
    baseline = {"spark.sql.shuffle.partitions": 200}
    variant = {"spark.sql.shuffle.partitions": 800}
    
    # Act
    comparison = simulate_config_change(baseline, variant)
    
    # Assert: Both pros and cons are shown
    assert "tradeoffs" in comparison
    assert len(comparison["tradeoffs"]["pros"]) > 0
    assert len(comparison["tradeoffs"]["cons"]) > 0
    
    # NO guarantee claims
    assert "guaranteed" not in str(comparison).lower()
```

---

## Frontend Testing (Playwright)

### E2E Test Pattern

```typescript
// e2e/upload_page.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Event Log Upload Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000')
  })
  
  test('should upload event log and display insights', async ({ page }) => {
    // Navigate to upload
    await page.getByRole('link', { name: /upload/i }).click()
    await expect(page).toHaveURL(/\/upload/)
    
    // Upload file
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles('./e2e/fixtures/sample_event_log.json')
    
    // Trigger analysis
    await page.getByRole('button', { name: /analyze/i }).click()
    
    // Wait for results
    await page.waitForSelector('[data-testid="dag-visualization"]', {
      timeout: 5000
    })
    
    // Verify DAG rendered
    const dagNodes = page.locator('.react-flow__node')
    await expect(dagNodes).toHaveCount(3)  // Based on fixture
    
    // Verify insights displayed
    const insights = page.locator('[data-testid="insight-card"]')
    await expect(insights).toHaveCount(2)
    
    // Check first insight structure
    const firstInsight = insights.first()
    await expect(firstInsight).toContainText(/shuffle/i)
    await expect(firstInsight).toContainText(/confidence/i)
    
    // Verify confidence badge exists
    const confidenceBadge = firstInsight.locator('[data-testid="confidence-badge"]')
    await expect(confidenceBadge).toHaveText(/high|medium|low/)
    
    // Verify evidence section
    await firstInsight.locator('button', { hasText: /evidence/i }).click()
    const evidencePanel = firstInsight.locator('[data-testid="evidence-panel"]')
    await expect(evidencePanel).toBeVisible()
    await expect(evidencePanel).toContainText(/shuffle_read_bytes|stage_id/)
  })
  
  test('should validate no performance guarantees in UI', async ({ page }) => {
    await page.goto('/upload')
    await page.locator('input[type="file"]').setInputFiles('./e2e/fixtures/sample_event_log.json')
    await page.getByRole('button', { name: /analyze/i }).click()
    
    await page.waitForSelector('[data-testid="insight-card"]')
    
    // Get all insight text
    const allText = await page.locator('[data-testid="insight-card"]').allTextContents()
    const combinedText = allText.join(' ').toLowerCase()
    
    // Verify no guarantee language
    expect(combinedText).not.toContain('guaranteed')
    expect(combinedText).not.toContain('will improve by')
    expect(combinedText).not.toContain('% faster')
    expect(combinedText).not.toContain('best configuration')
  })
  
  test('should handle auth-required features gracefully', async ({ page }) => {
    // Protected route without login
    await page.goto('/learn')
    
    // Should show login prompt
    const loginPrompt = page.getByText(/sign in to track/i)
    await expect(loginPrompt).toBeVisible()
    
    // Core features still accessible
    await page.goto('/upload')
    await expect(page.locator('input[type="file"]')).toBeVisible()
  })
  
  test('should be accessible (WCAG 2.1 AA)', async ({ page }) => {
    await page.goto('/upload')
    
    // Check contrast ratios
    const button = page.getByRole('button', { name: /analyze/i })
    const bgColor = await button.evaluate(el => 
      window.getComputedStyle(el).backgroundColor
    )
    const textColor = await button.evaluate(el => 
      window.getComputedStyle(el).color
    )
    // Actual contrast check would use color contrast library
    
    // Check keyboard navigation
    await page.keyboard.press('Tab')
    const focusedElement = page.locator(':focus')
    await expect(focusedElement).toBeVisible()
    
    // Check ARIA labels
    const fileInput = page.locator('input[type="file"]')
    const ariaLabel = await fileInput.getAttribute('aria-label')
    expect(ariaLabel).toBeTruthy()
  })
})
```

### Visual Regression Testing

```typescript
// e2e/visual_regression.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Visual Regression Tests', () => {
  test('DAG visualization renders consistently', async ({ page }) => {
    await page.goto('/upload')
    await page.locator('input[type="file"]').setInputFiles('./e2e/fixtures/sample_event_log.json')
    await page.getByRole('button', { name: /analyze/i }).click()
    
    await page.waitForSelector('[data-testid="dag-visualization"]')
    
    // Take screenshot
    const dag = page.locator('[data-testid="dag-visualization"]')
    await expect(dag).toHaveScreenshot('dag-render.png', {
      maxDiffPixels: 100  // Allow minor rendering differences
    })
  })
})
```

---

## Testing Anti-Patterns

### ❌ FORBIDDEN TEST PATTERNS

```python
# ❌ NEVER: Performance guarantee assertions
def test_optimization_improves_performance():
    result = apply_optimization(config)
    assert result.speedup == "3x faster"  # ❌ FORBIDDEN

# ❌ NEVER: Tests without evidence
def test_detects_issue():
    insights = detector.detect(log)
    assert len(insights) > 0  # ❌ Not checking evidence

# ❌ NEVER: Non-deterministic tests
def test_analysis():
    result = analyze(log)
    assert result.timestamp == datetime.now()  # ❌ Time-dependent

# ❌ NEVER: Slow unit tests
def test_parser():
    time.sleep(5)  # ❌ Unit tests must be <50ms
    assert parse_log(content)

# ❌ NEVER: Tests that inspect actual data
def test_simulation():
    result = simulate(dataframe)
    assert result.first_row["user_id"] == "12345"  # ❌ Data inspection
```

### ✅ CORRECT TEST PATTERNS

```python
# ✅ Evidence-based assertion
def test_detects_shuffle_with_evidence():
    insights = detector.detect(log)
    assert insights[0].evidence["shuffle_read_bytes"] > 0
    assert "stage_id" in insights[0].evidence

# ✅ Confidence-aware assertion
def test_low_confidence_when_ambiguous():
    insights = detector.detect(ambiguous_log)
    if insights:
        assert insights[0].confidence in [Confidence.LOW, Confidence.MEDIUM]

# ✅ Tradeoff validation
def test_shows_tradeoffs():
    comparison = simulate_config_change(baseline, variant)
    assert len(comparison["tradeoffs"]["pros"]) > 0
    assert len(comparison["tradeoffs"]["cons"]) > 0

# ✅ Fast, focused test
def test_parse_stage_info():
    data = {"Stage ID": 1, "Stage Name": "map at line 10"}
    stage = parse_stage_info(data)
    assert stage.id == 1
    assert stage.name == "map at line 10"
```

---

## Test Fixtures

### Backend Fixtures (pytest)

```python
# tests/conftest.py
import pytest
from app.models.event_log import ParsedEventLog, StageInfo, TaskInfo

@pytest.fixture
def sample_shuffle_log():
    """Event log with clear shuffle boundary."""
    return ParsedEventLog(
        stages=[
            StageInfo(
                id=1,
                name="groupByKey at Main.scala:42",
                shuffle_write_bytes=1_000_000_000,
                shuffle_read_bytes=0,
                tasks=[]
            ),
            StageInfo(
                id=2,
                name="map at Main.scala:45",
                shuffle_write_bytes=0,
                shuffle_read_bytes=1_000_000_000,
                tasks=[]
            )
        ]
    )

@pytest.fixture
def skewed_task_log():
    """Event log with high task duration variance."""
    return ParsedEventLog(
        stages=[
            StageInfo(
                id=1,
                name="join at Query.scala:100",
                tasks=[
                    TaskInfo(id=1, duration_ms=5000),
                    TaskInfo(id=2, duration_ms=6000),
                    TaskInfo(id=3, duration_ms=50000),  # Skewed
                    TaskInfo(id=4, duration_ms=5500),
                ]
            )
        ]
    )

@pytest.fixture
def duckdb_connection():
    """In-memory DuckDB for testing."""
    import duckdb
    conn = duckdb.connect(':memory:')
    yield conn
    conn.close()
```

### Frontend Fixtures (Playwright)

```typescript
// e2e/fixtures/sample_event_log.json
{
  "SparkListenerLogStart": {
    "Spark Version": "3.5.0"
  },
  "SparkListenerJobStart": {
    "Job ID": 0,
    "Stage IDs": [0, 1, 2]
  },
  "SparkListenerStageSubmitted": {
    "Stage Info": {
      "Stage ID": 1,
      "Stage Name": "groupBy at Main.scala:42",
      "Number of Tasks": 200
    }
  }
}
```

---

## Test Coverage Commands

### Backend

```bash
# All tests with coverage
cd /home/soloengine/Github/spark-sword/backend
source .venv/bin/activate
python -m pytest tests/ --cov=app --cov-report=html --cov-report=term-missing

# Coverage report location: htmlcov/index.html

# Specific test category
python -m pytest tests/unit/ --cov=app/analyzers
python -m pytest tests/integration/ --cov=app/services

# Fail if coverage below threshold
python -m pytest tests/ --cov=app --cov-fail-under=90
```

### Frontend

```bash
cd /home/soloengine/Github/spark-sword/frontend

# Run all Playwright tests
npx playwright test

# Run with UI (interactive debugging)
npx playwright test --ui

# Run specific test file
npx playwright test e2e/upload_page.spec.ts

# Generate HTML report
npx playwright show-report

# Update screenshots (visual regression)
npx playwright test --update-snapshots
```

---

## CI/CD Integration

### GitHub Actions Test Workflow

```yaml
name: Test Suite

on: [push, pull_request]

jobs:
  backend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      - run: |
          cd backend
          python -m venv .venv
          source .venv/bin/activate
          pip install -r requirements.txt
          python -m pytest tests/ --cov=app --cov-fail-under=90
  
  frontend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: |
          cd frontend
          npm ci
          npx playwright install --with-deps
          npx playwright test
```

---

## Debugging Test Failures

### Backend Test Debugging

```bash
# Run single test with verbose output
python -m pytest tests/unit/test_shuffle_detector.py::test_detects_groupby -vv

# Run with debugger (drops into pdb on failure)
python -m pytest tests/unit/test_shuffle_detector.py --pdb

# Show print statements (by default pytest captures output)
python -m pytest tests/unit/test_shuffle_detector.py -s

# Run only failed tests from last run
python -m pytest --lf
```

### Frontend Test Debugging

```bash
# Run with headed browser (see what's happening)
npx playwright test --headed

# Debug mode (interactive step-through)
npx playwright test --debug

# Trace viewer (record and replay)
npx playwright test --trace on
npx playwright show-trace trace.zip

# Screenshot on failure (automatic in CI)
npx playwright test --screenshot=on --video=on
```

---

## Test-Driven Development Workflow

### TDD Cycle Example

```bash
# 1. RED: Write failing test
cat > tests/unit/test_broadcast_detector.py << 'EOF'
def test_detects_broadcast_opportunity():
    log = create_small_table_join_log()
    detector = BroadcastDetector()
    insights = detector.detect(log)
    assert len(insights) == 1
    assert "broadcast" in insights[0].suggestion.lower()
EOF

python -m pytest tests/unit/test_broadcast_detector.py
# ❌ FAILS (detector doesn't exist)

# 2. GREEN: Minimal implementation
cat > app/analyzers/broadcast_detector.py << 'EOF'
class BroadcastDetector(BaseDetector):
    def detect(self, log):
        return [Insight(
            type=InsightType.BROADCAST_JOIN,
            suggestion="Consider broadcast hint"
        )]
EOF

python -m pytest tests/unit/test_broadcast_detector.py
# ✅ PASSES

# 3. REFACTOR: Improve implementation
# ... add proper logic, evidence, confidence ...

# 4. VERIFY: Run full suite
python -m pytest tests/
```

---

## Quality Gates

### Pre-Merge Checklist

- [ ] All unit tests pass (`pytest tests/unit/`)
- [ ] All integration tests pass (`pytest tests/integration/`)
- [ ] Coverage >90% (`--cov-fail-under=90`)
- [ ] All E2E tests pass (`npx playwright test`)
- [ ] No performance guarantee language in code
- [ ] All insights have evidence
- [ ] All insights have confidence levels
- [ ] Type checking passes (`npm run type-check`)
- [ ] No linting errors
- [ ] Documentation updated

---

## References

- [pytest Documentation](https://docs.pytest.org/)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [TDD by Example](https://www.oreilly.com/library/view/test-driven-development/0321146530/)
- [Testing Trophy](https://kentcdodds.com/blog/the-testing-trophy-and-testing-classifications)
- [WCAG 2.1 Testing](https://www.w3.org/WAI/test-evaluate/)
