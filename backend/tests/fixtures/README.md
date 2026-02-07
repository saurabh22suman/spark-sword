# Test Fixtures

This directory contains test fixtures for the PrepRabbit test suite.

## Directory Structure

```
fixtures/
├── spark_event_logs/    # Sample Spark event log files
├── notebooks/           # Sample PySpark/Spark SQL notebooks
├── spark_confs/         # Sample Spark configuration snapshots
└── expected_insights/   # Expected analysis outputs for validation
```

## Usage

Fixtures are loaded via pytest fixtures defined in `conftest.py`.

## Adding New Fixtures

When adding new test fixtures:

1. Place files in the appropriate subdirectory
2. Add a corresponding pytest fixture in `conftest.py`
3. Document the fixture's purpose and origin
4. Ensure fixtures are anonymized (no real customer data)
