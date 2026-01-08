# Spark-Sword

**Spark Internals Explorer — Explain, Simulate, Suggest**

A web application that helps developers and students understand Spark/Databricks internals by visualizing how Spark executes code, explaining why it behaves a certain way, and suggesting performance improvements.

## 🎯 Core Philosophy

- This is an *explain → simulate → suggest* system, **NOT** an auto-optimizer
- Spark performance depends on execution shape, not raw data
- Teach users to *think like Spark*
- Every insight must be tied to Spark's execution model
- **Never hallucinate Spark behavior** — all insights must be evidence-based

## 🚀 Quick Start

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -e ".[dev]"

# Run tests
pytest

# Start development server
uvicorn app.main:app --reload
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev
```

## 📁 Project Structure

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
│       ├── unit/          # Fast, isolated tests
│       ├── integration/   # Multi-component tests
│       ├── simulation/    # DataFrame playground tests
│       ├── workflows/     # User flow tests
│       └── fixtures/      # Test data
├── frontend/
│   ├── src/
│   │   ├── app/           # Next.js App Router
│   │   ├── components/    # React components
│   │   ├── lib/           # Utilities
│   │   └── types/         # TypeScript types
│   └── e2e/               # Playwright tests
└── docs/
    ├── plan.md            # Project plan
    └── test.md            # Test strategy
```

## 🧪 Testing

This project follows **strict Test-Driven Development (TDD)**.

### The Red-Green-Refactor-Verify Cycle

```
RED      → Write a failing test describing Spark behavior
GREEN    → Implement minimal logic to pass
REFACTOR → Improve structure without changing meaning
VERIFY   → Run full analysis + visualization test suite
```

### Running Tests

```bash
# All tests
pytest

# With coverage
pytest --cov=app --cov-report=html

# Specific test categories
pytest tests/unit/
pytest tests/integration/
pytest tests/simulation/
```

## 🔧 Technology Stack

### Backend
- **Python 3.11** — Modern Python with type hints
- **FastAPI** — Async API framework
- **DuckDB** — Analytical engine for event log exploration
- **Pydantic** — Schema validation
- **pytest** — Testing framework

### Frontend
- **React + TypeScript** — UI framework
- **Next.js** — App Router architecture
- **D3.js + React Flow** — DAG visualization
- **Vega-Lite** — Timelines & metrics
- **Tailwind CSS** — Styling
- **Playwright** — E2E testing

## 📊 Core Features

1. **Event Log Parsing** — Parse Spark event logs into queryable tables
2. **DAG Visualization** — Interactive job/stage/task graph
3. **Optimization Insights** — Evidence-based recommendations
4. **Code-to-Execution Mapping** — Link transformations to stages
5. **DataFrame Shape Playground** — Shape-based simulation (key differentiator)
6. **Config Impact Simulator** — Interactive config toggles

## ⚠️ Non-Goals

This app will NOT:
- Claim guaranteed performance gains
- Run actual Spark jobs
- Access user data directly
- Pretend to replace Spark UI

## 📚 Documentation

- [Project Plan](docs/plan.md)
- [Test Strategy](docs/test.md)

## 🤝 Contributing

1. Follow TDD — write tests first
2. All insights must be evidence-based
3. Include confidence levels for heuristics
4. Never claim guaranteed improvements

## 📝 License

MIT
