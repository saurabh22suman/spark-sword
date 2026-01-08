"""Tests for notebook parser.

Per must-have-spec.md Feature 5:
- MAY: Identify transformations, infer operation order, detect joins/groupBy/windows
- MUST NOT: Execute code, infer schema, infer data volume
- Output MUST be labeled: "Inferred Intent (User Adjustable)"
"""

import pytest

from app.parsers.notebook_parser import NotebookParser, InferredIntent


class TestNotebookParserIPYNB:
    """Tests for .ipynb file parsing."""

    def test_parse_valid_ipynb_structure(self):
        """Parser handles valid .ipynb JSON structure."""
        parser = NotebookParser()
        ipynb_content = '''{
            "cells": [
                {
                    "cell_type": "code",
                    "source": ["df = spark.read.parquet('data.parquet')\\n", "df.show()"]
                }
            ],
            "metadata": {},
            "nbformat": 4
        }'''
        
        result = parser.parse_ipynb(ipynb_content)
        
        assert result is not None
        assert len(result.code_cells) == 1

    def test_extract_transformations_from_code(self):
        """Parser identifies transformations without executing."""
        parser = NotebookParser()
        ipynb_content = '''{
            "cells": [
                {
                    "cell_type": "code",
                    "source": ["df.groupBy('key').agg(sum('value'))"]
                }
            ],
            "metadata": {},
            "nbformat": 4
        }'''
        
        result = parser.parse_ipynb(ipynb_content)
        
        assert "groupby" in [t.operation for t in result.transformations]

    def test_detect_join_operations(self):
        """Parser detects join operations."""
        parser = NotebookParser()
        ipynb_content = '''{
            "cells": [
                {
                    "cell_type": "code",
                    "source": ["result = df1.join(df2, 'id')"]
                }
            ],
            "metadata": {},
            "nbformat": 4
        }'''
        
        result = parser.parse_ipynb(ipynb_content)
        
        assert "join" in [t.operation for t in result.transformations]

    def test_infer_operation_order(self):
        """Parser preserves operation order."""
        parser = NotebookParser()
        ipynb_content = '''{
            "cells": [
                {
                    "cell_type": "code",
                    "source": ["df.filter(col('x') > 0).groupBy('key').count()"]
                }
            ],
            "metadata": {},
            "nbformat": 4
        }'''
        
        result = parser.parse_ipynb(ipynb_content)
        
        ops = [t.operation for t in result.transformations]
        assert ops.index("filter") < ops.index("groupby")

    def test_output_labeled_as_inferred(self):
        """Output must be labeled as 'Inferred Intent'."""
        parser = NotebookParser()
        ipynb_content = '''{
            "cells": [
                {
                    "cell_type": "code",
                    "source": ["df.show()"]
                }
            ],
            "metadata": {},
            "nbformat": 4
        }'''
        
        result = parser.parse_ipynb(ipynb_content)
        
        assert result.is_inferred is True
        assert "Inferred" in result.label

    def test_skip_markdown_cells(self):
        """Parser only processes code cells."""
        parser = NotebookParser()
        ipynb_content = '''{
            "cells": [
                {
                    "cell_type": "markdown",
                    "source": ["# Analysis notebook"]
                },
                {
                    "cell_type": "code",
                    "source": ["df.filter(col('x') > 0)"]
                }
            ],
            "metadata": {},
            "nbformat": 4
        }'''
        
        result = parser.parse_ipynb(ipynb_content)
        
        assert len(result.code_cells) == 1


class TestNotebookParserPy:
    """Tests for .py file parsing."""

    def test_parse_valid_py_file(self):
        """Parser handles .py files."""
        parser = NotebookParser()
        py_content = '''
from pyspark.sql import SparkSession
spark = SparkSession.builder.getOrCreate()
df = spark.read.parquet('data.parquet')
df.groupBy('key').count().show()
'''
        result = parser.parse_py(py_content)
        
        assert result is not None
        assert "groupby" in [t.operation for t in result.transformations]

    def test_py_output_labeled_as_inferred(self):
        """.py output must also be labeled as inferred."""
        parser = NotebookParser()
        py_content = "df.filter(col('x') > 0)"
        
        result = parser.parse_py(py_content)
        
        assert result.is_inferred is True


class TestNotebookParserForbiddenBehaviors:
    """Tests ensuring parser does NOT do forbidden things."""

    def test_does_not_execute_code(self):
        """Parser must not execute any code."""
        parser = NotebookParser()
        # This code would crash if executed
        ipynb_content = '''{
            "cells": [
                {
                    "cell_type": "code",
                    "source": ["import nonexistent_module\\n", "crash_the_system()"]
                }
            ],
            "metadata": {},
            "nbformat": 4
        }'''
        
        # Should not raise - we only parse, never execute
        result = parser.parse_ipynb(ipynb_content)
        assert result is not None

    def test_does_not_infer_schema(self):
        """Parser must not claim to know schema."""
        parser = NotebookParser()
        ipynb_content = '''{
            "cells": [
                {
                    "cell_type": "code",
                    "source": ["df = spark.read.parquet('data')"]
                }
            ],
            "metadata": {},
            "nbformat": 4
        }'''
        
        result = parser.parse_ipynb(ipynb_content)
        
        # Should have no schema information
        assert not hasattr(result, 'schema') or result.schema is None

    def test_does_not_infer_data_volume(self):
        """Parser must not claim to know data volume."""
        parser = NotebookParser()
        ipynb_content = '''{
            "cells": [
                {
                    "cell_type": "code",
                    "source": ["df = spark.read.parquet('data')"]
                }
            ],
            "metadata": {},
            "nbformat": 4
        }'''
        
        result = parser.parse_ipynb(ipynb_content)
        
        # Should have no row count or size information
        assert not hasattr(result, 'row_count') or result.row_count is None
        assert not hasattr(result, 'data_size') or result.data_size is None


class TestInferredIntentOutput:
    """Tests for the InferredIntent model."""

    def test_intent_summary_generation(self):
        """InferredIntent generates human-readable summary."""
        parser = NotebookParser()
        ipynb_content = '''{
            "cells": [
                {
                    "cell_type": "code",
                    "source": ["df.groupBy('key').join(other, 'id').show()"]
                }
            ],
            "metadata": {},
            "nbformat": 4
        }'''
        
        result = parser.parse_ipynb(ipynb_content)
        
        assert result.summary is not None
        assert len(result.summary) > 0
        # Summary should mention detected patterns
        assert "shuffle" in result.summary.lower() or "join" in result.summary.lower()
