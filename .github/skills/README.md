# PrepRabbit Development Skills

This directory contains custom GitHub Copilot skills for PrepRabbit (Spark-Sword) development. These skills provide context-aware assistance for backend, frontend, and testing tasks.

## Available Skills

| Skill | Purpose | Trigger |
|-------|---------|---------|
| [**Backend Development**](./backend-dev/SKILL.md) | Python/FastAPI backend development with TDD | Backend API, parsers, analyzers, DuckDB |
| [**Frontend Development**](./frontend-dev/SKILL.md) | Next.js/React frontend with auth integration | UI components, pages, visualization, auth |
| [**Testing & QA**](./testing/SKILL.md) | Test-driven development and quality assurance | Writing tests, debugging, E2E flows |

---

## How to Use These Skills

### Explicit Activation

Reference a skill explicitly by mentioning it:

```
@workspace Using the backend development skill, create a new detector for 
identifying broadcast join opportunities in event logs.
```

```
@workspace Using the frontend development skill, build an interactive 
DAG visualization component with node click handlers.
```

```
@workspace Using the testing skill, write comprehensive unit tests for 
the shuffle detector that validate evidence-based insights.
```

### Implicit Activation

Copilot may automatically activate skills based on file context:

- Opening files in `backend/app/` → Backend skill
- Opening files in `frontend/src/` → Frontend skill  
- Opening files in `tests/` or `e2e/` → Testing skill

---

## Skill Contents

Each skill includes:

### 1. Core Philosophy
- Non-negotiable principles (e.g., TDD, no Spark execution)
- Architecture patterns
- Quality standards

### 2. Technology Stack
- Specific versions and tools
- When to use each technology
- Common configurations

### 3. Code Patterns
- Best practice examples
- Anti-patterns to avoid
- Reusable templates

### 4. Testing Guidelines
- Test structure and coverage
- CI/CD integration
- Debugging strategies

### 5. Development Workflow
- Commands to run
- File structure
- Environment setup

### 6. Pre-Commit Checklists
- Quality gates
- Common mistakes
- Validation steps

---

## PrepRabbit-Specific Context

These skills are optimized for PrepRabbit's unique requirements:

### Backend Skill Specializations
- **Event Log Parsing**: Spark event log JSON structure
- **Optimization Detectors**: Evidence-based insight generation
- **DuckDB Analytics**: SQL-based event log querying
- **No Spark Execution**: Explain/simulate/suggest only
- **Confidence Scoring**: Explicit uncertainty labeling

### Frontend Skill Specializations
- **Educational UX**: Progressive disclosure, interactive learning
- **Auth Integration**: Cookie-based multi-subdomain auth
- **Data Visualization**: D3.js DAGs, React Flow, Vega-Lite timelines
- **Type Safety**: Full TypeScript coverage
- **Responsive Design**: Mobile-first approach

### Testing Skill Specializations
- **TDD Enforcement**: RED → GREEN → REFACTOR → VERIFY cycle
- **Evidence Validation**: All insights must have metrics
- **No Performance Guarantees**: Tests prevent hallucination
- **Deterministic Testing**: Same input → same output
- **Fast Feedback**: Unit <50ms, Integration <500ms

---

## Examples

### Backend: Creating a New Detector

```python
# 1. Reference skill
# @workspace Using backend development skill, create skew detector

# 2. Copilot generates test-first approach:

# tests/unit/test_skew_detector.py
def test_detects_high_task_skew():
    """Tasks with >3x variance should trigger skew insight."""
    log = ParsedEventLog(
        stages=[
            StageInfo(
                id=1,
                tasks=[
                    TaskInfo(duration_ms=5000),
                    TaskInfo(duration_ms=6000),
                    TaskInfo(duration_ms=30000),  # Skewed
                ]
            )
        ]
    )
    
    detector = SkewDetector()
    insights = detector.detect(log)
    
    assert len(insights) == 1
    assert insights[0].type == InsightType.DATA_SKEW
    assert insights[0].evidence["skew_ratio"] > 3.0

# app/analyzers/skew_detector.py
class SkewDetector(BaseDetector):
    def detect(self, log: ParsedEventLog) -> list[Insight]:
        # Implementation...
```

### Frontend: Building Auth-Protected Component

```typescript
// @workspace Using frontend development skill, create learning dashboard

// src/components/LearningDashboard.tsx
'use client'

import { useAuth } from '@/contexts/AuthContext'
import { LoginPrompt } from '@/components/LoginPrompt'

export function LearningDashboard() {
  const { user, isLoading } = useAuth()
  
  if (isLoading) {
    return <LoadingSpinner />
  }
  
  if (!user) {
    return (
      <LoginPrompt 
        message="Sign in to track your learning progress"
        feature="Learning Paths"
      />
    )
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1>Welcome back, {user.name}!</h1>
      {/* Dashboard content */}
    </div>
  )
}
```

### Testing: E2E Workflow Test

```typescript
// @workspace Using testing skill, write E2E test for upload flow

// e2e/upload_page.spec.ts
import { test, expect } from '@playwright/test'

test('should upload event log and display insights', async ({ page }) => {
  await page.goto('http://localhost:3000/upload')
  
  await page.locator('input[type="file"]').setInputFiles(
    './e2e/fixtures/sample_event_log.json'
  )
  
  await page.getByRole('button', { name: /analyze/i }).click()
  
  await page.waitForSelector('[data-testid="dag-visualization"]')
  
  const insights = page.locator('[data-testid="insight-card"]')
  await expect(insights).toHaveCount(2)
  
  // Verify no performance guarantees
  const allText = await insights.allTextContents()
  expect(allText.join(' ')).not.toContain('% faster')
})
```

---

## Integration with Project Rules

These skills complement the main project instructions in [/.github/copilot-instructions.md](../../copilot-instructions.md):

| Project Rules | Skill Enhancement |
|---------------|-------------------|
| "Strict TDD" | Testing skill provides RED-GREEN-REFACTOR templates |
| "No Spark execution" | Backend skill enforces explain/simulate/suggest patterns |
| "Evidence-based insights" | All skills validate metrics linkage |
| "No performance guarantees" | Testing skill includes anti-pattern checks |
| "Type safety" | Frontend skill provides TypeScript patterns |

---

## Updating Skills

When adding new patterns or best practices:

1. **Update relevant skill file** (backend-dev/SKILL.md, frontend-dev/SKILL.md, testing/SKILL.md)
2. **Add code examples** showing both correct and incorrect patterns
3. **Update this README** if new skills are added
4. **Test skill activation** by referencing it in a prompt

---

## References

- [Main Project Instructions](../../copilot-instructions.md)
- [Backend README](../../../backend/README.md)
- [Frontend README](../../../frontend/README.md)
- [GitHub Copilot Documentation](https://docs.github.com/en/copilot)

---

## Skill Philosophy

> **These skills exist to enforce PrepRabbit's core principle:**
> 
> *Spark optimization is about trade-offs, not tricks.*
> 
> Every line of code, every test, every UI component must reinforce this truth.
> We explain Spark behavior. We never hallucinate Spark behavior.
