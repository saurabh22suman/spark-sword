# Backend

See parent [README.md](../README.md) for project overview.

## Development Setup

```bash
# Create virtual environment
python -m venv .venv
source .venv/bin/activate

# Install with dev dependencies
pip install -e ".[dev]"

# Run tests
pytest

# Run with coverage
pytest --cov=app --cov-report=html

# Start server
uvicorn app.main:app --reload --port 8000
```

## API Endpoints

- `GET /health` - Health check
- More endpoints coming soon...

## Running Linters

```bash
# Format check
ruff check .

# Type check
mypy app/
```
