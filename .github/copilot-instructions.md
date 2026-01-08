# Copilot Instructions — Spark-Sword

## Project Overview

**Spark-Sword** is a web application that helps developers and students understand Spark/Databricks internals by visualizing how Spark executes code, explaining why it behaves a certain way, and suggesting performance improvements.

**Core Philosophy:**
- This is an *explain → simulate → suggest* system, NOT an auto-optimizer
- Spark performance depends on execution shape, not raw data
- Teach users to *think like Spark*
- Every insight must be tied to Spark's execution model
- **Never hallucinate Spark behavior** — all insights must be evidence-based

---

## Technology Stack

### Backend (Python)
- **Python 3.11**
- **FastAPI** — async API framework
- **DuckDB** — local analytical engine for event log exploration
- **Pydantic** — schema validation
- **pytest** — testing framework

### Frontend (TypeScript)
- **React + TypeScript**
- **Next.js** (App Router)
- **D3.js + React Flow** — DAG visualization
- **Vega-Lite** — timelines & metrics
- **Tailwind CSS** — styling
- **Playwright** — E2E testing

---

## Development Philosophy

This project follows **strict Test-Driven Development (TDD)**. All code changes must adhere to the TDD workflow.

### The Red-Green-Refactor-Verify Cycle

```
RED      → Write a failing test describing Spark behavior
GREEN    → Implement minimal logic to pass
REFACTOR → Improve structure without changing meaning
VERIFY   → Run full analysis + visualization test suite
```

**Skipping steps is considered a quality failure.**

---

## Testing Philosophy

### Non-Negotiable Rules

- **No optimization insight may exist without a test proving WHY it is triggered**
- **No visualization may exist without a test validating DATA CORRECTNESS**
- **No heuristic may exist without explicit CONFIDENCE LABELING**

### Testing Principles

| Principle | Description |
|-----------|-------------|
| **Behavior First** | Tests describe Spark behavior, not implementation details |
| **Deterministic** | Same input artifacts → same insights |
| **Evidence-Based** | Every insight must reference a measurable Spark signal |
| **Explainable** | Tests validate explanation text, not just flags |
| **Non-Prescriptive** | Tests prevent guaranteed-performance claims |
| **Fail Loudly** | Silent misinterpretations are unacceptable |

### Coverage Requirements

| Area | Minimum Coverage |
|------|------------------|
| Event Log Parsing | 95% |
| Optimization Detectors | 90% |
| Simulation Engine | 90% |
| API Layer | 85% |
| Frontend Critical Flows | Behavioral |

---

## Project Structure

```
spark-sword/
├── backend/
│   ├── app/
│   │   ├── api/           # FastAPI routes
│   │   ├── core/          # Config, dependencies
│   │   ├── models/        # Pydantic models
│   │   ├── parsers/       # Event log, notebook parsers
│   │   ├── analyzers/     # Optimization detectors
│   │   ├── simulators/    # DataFrame shape playground
│   │   └── services/      # Business logic
│   └── tests/
│       ├── unit/
│       ├── integration/
│       ├── simulation/
│       ├── workflows/
│       └── fixtures/
├── frontend/
│   ├── src/
│   │   ├── app/           # Next.js App Router
│   │   ├── components/    # React components
│   │   ├── lib/           # Utilities
│   │   └── types/         # TypeScript types
│   └── e2e/               # Playwright tests
└── docs/
```

---

## Test Categories

| Type | Scope | Speed | Purpose |
|------|-------|-------|---------|
| **Unit** | Single rule / parser | Fast | Spark logic correctness |
| **Integration** | Event logs + rules | Medium | Insight accuracy |
| **Simulation** | DataFrame shape playground | Medium | Honest what-if modeling |
| **Workflow** | Upload → Insight → Action | Medium | User trust |
| **E2E** | Full web app | Slow | Visual + analytical consistency |

---

## Explicitly Forbidden

### In Tests
- Tests asserting guaranteed runtime improvement
- Tests assuming specific dataset values
- Tests claiming "best" configuration universally
- Tests hiding uncertainty or confidence levels

### In Code
- Making performance guarantees
- Running actual Spark jobs
- Accessing user data directly
- Pretending to replace Spark UI

---

## When Generating Code

1. **Always start with a failing test** describing expected Spark behavior
2. **Tests must prove WHY** — not just that something works
3. **Every insight needs evidence** — link to Spark metrics/signals
4. **Include confidence levels** for all heuristics
5. **Simulations are estimations** — never claim they are executions

### Test Naming Convention

Use descriptive names that explain behavior:
- `test_valid_event_log_parses`
- `test_shuffle_boundary_detection`
- `test_high_skew_increases_shuffle_estimate`
- `test_simulation_is_data_agnostic`

---

## Core Feature Modules

When implementing, follow this priority:

1. **Event Log Parsing** — Parse Spark event logs into DuckDB tables
2. **DAG Builder** — Reconstruct job/stage/task graph
3. **Optimization Detectors** — Rule-based insight engine
4. **Code-to-Execution Mapper** — Map transformations to stages
5. **DataFrame Shape Playground** — Shape-based simulation (key differentiator)
6. **Config Impact Simulator** — Interactive config toggles

---

## Guiding Principle

> Spark optimization is about **trade-offs, not tricks**.
> This tool exists to teach users how Spark thinks —
> so they can outgrow the tool itself.

**This system explains Spark. It must never hallucinate Spark.**

---

## Development Environment Commands

### Backend (Python)

**ALWAYS activate the virtual environment before running Python commands:**

```bash
# Activate venv (REQUIRED before any Python command)
source /home/soloengine/Github/spark-sword/backend/.venv/bin/activate

# Run all backend tests
cd /home/soloengine/Github/spark-sword/backend && python -m pytest tests/ -v

# Run specific test file
python -m pytest tests/unit/test_event_log_parser.py -v

# Run tests with coverage
python -m pytest tests/ --cov=app --cov-report=term-missing
```

### Frontend (TypeScript/Next.js)

```bash
# Navigate to frontend directory
cd /home/soloengine/Github/spark-sword/frontend

# Install dependencies (if needed)
npm install

# Run frontend unit tests
npm test

# Run Playwright E2E tests (requires containers running)
npx playwright test

# Run specific Playwright test
npx playwright test e2e/upload_page.spec.ts
```

### Docker Compose

```bash
# Start all services
cd /home/soloengine/Github/spark-sword && docker compose up -d

# Rebuild and restart a specific service
docker compose up --build frontend -d

# View logs
docker compose logs frontend --tail=50
docker compose logs backend --tail=50

# Check container status
docker compose ps
```

### Common Mistakes to Avoid

| ❌ Wrong Command | ✅ Correct Command |
|------------------|-------------------|
| `python -m pytest` (without venv) | `source backend/.venv/bin/activate && python -m pytest` |
| `docker compose exec backend python -m pytest` (pytest not in container) | Run tests locally with venv activated |
| `npm start` with `output: 'standalone'` | Use `node .next/standalone/server.js` or fix Dockerfile |
