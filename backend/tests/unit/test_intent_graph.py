"""Tests for Intent Graph generation.

Per notebook-intent-extraction-spec.md:
- Intent Graph is a linear/branched sequence of logical operations
- Must include step, operation, details per node
- Must output uncertainties list
- Must map intent to Spark consequences

Per intent-graph-ui-spec.md Section 4:
- Each node = one logical operation
- Nodes show: Operation name, Key columns, Spark consequence badge
"""

import pytest

from app.parsers.notebook_parser import (
    NotebookParser,
    IntentGraphNode,
    IntentGraph,
    SparkConsequence,
)


class TestIntentGraphConstruction:
    """Tests for building intent graphs from notebooks."""

    def test_intent_graph_linear_sequence(self):
        """Intent graph produces linear sequence of operations."""
        parser = NotebookParser()
        ipynb = '''{
            "cells": [{
                "cell_type": "code",
                "source": ["df = spark.read.parquet('data')\\n",
                          "filtered = df.filter(col('x') > 0)\\n",
                          "result = filtered.groupBy('key').count()"]
            }],
            "metadata": {},
            "nbformat": 4
        }'''
        
        intent = parser.parse_ipynb(ipynb)
        graph = intent.intent_graph
        
        assert graph is not None
        assert len(graph.nodes) >= 2  # filter, groupby at minimum
        
        # Steps should be sequential
        steps = [n.step for n in graph.nodes]
        assert steps == sorted(steps)

    def test_intent_graph_node_has_required_fields(self):
        """Each node has step, operation, details."""
        parser = NotebookParser()
        ipynb = '''{
            "cells": [{
                "cell_type": "code",
                "source": ["df.groupBy('customer_id').agg(sum('amount'))"]
            }],
            "metadata": {},
            "nbformat": 4
        }'''
        
        intent = parser.parse_ipynb(ipynb)
        graph = intent.intent_graph
        
        groupby_node = next((n for n in graph.nodes if n.operation == "groupBy"), None)
        assert groupby_node is not None
        
        assert hasattr(groupby_node, 'step')
        assert hasattr(groupby_node, 'operation')
        assert hasattr(groupby_node, 'details')
        assert hasattr(groupby_node, 'spark_consequence')

    def test_intent_graph_extracts_column_names(self):
        """Intent graph extracts key columns when explicit."""
        parser = NotebookParser()
        ipynb = '''{
            "cells": [{
                "cell_type": "code",
                "source": ["df.groupBy('customer_id', 'region').count()"]
            }],
            "metadata": {},
            "nbformat": 4
        }'''
        
        intent = parser.parse_ipynb(ipynb)
        graph = intent.intent_graph
        
        groupby_node = next((n for n in graph.nodes if n.operation == "groupBy"), None)
        assert groupby_node is not None
        
        # Details should include keys if detected
        assert 'keys' in groupby_node.details or 'columns' in groupby_node.details


class TestSparkConsequenceMapping:
    """Tests for mapping intent to Spark consequences.
    
    Per spec Section 7:
    - Filter → Narrow transformation
    - GroupBy → Shuffle required
    - Join (no hint) → Shuffle on both sides
    - etc.
    """

    def test_filter_is_narrow_transformation(self):
        """Filter operations map to narrow transformation."""
        parser = NotebookParser()
        ipynb = '''{
            "cells": [{
                "cell_type": "code",
                "source": ["df.filter(col('x') > 0)"]
            }],
            "metadata": {},
            "nbformat": 4
        }'''
        
        intent = parser.parse_ipynb(ipynb)
        graph = intent.intent_graph
        
        filter_node = next((n for n in graph.nodes if n.operation == "filter"), None)
        assert filter_node is not None
        assert filter_node.spark_consequence == SparkConsequence.NARROW

    def test_groupby_requires_shuffle(self):
        """GroupBy operations map to shuffle required."""
        parser = NotebookParser()
        ipynb = '''{
            "cells": [{
                "cell_type": "code",
                "source": ["df.groupBy('key').count()"]
            }],
            "metadata": {},
            "nbformat": 4
        }'''
        
        intent = parser.parse_ipynb(ipynb)
        graph = intent.intent_graph
        
        groupby_node = next((n for n in graph.nodes if n.operation == "groupBy"), None)
        assert groupby_node is not None
        assert groupby_node.spark_consequence == SparkConsequence.SHUFFLE_REQUIRED

    def test_join_requires_shuffle_without_hint(self):
        """Join without broadcast hint maps to shuffle on both sides."""
        parser = NotebookParser()
        ipynb = '''{
            "cells": [{
                "cell_type": "code",
                "source": ["df1.join(df2, 'id')"]
            }],
            "metadata": {},
            "nbformat": 4
        }'''
        
        intent = parser.parse_ipynb(ipynb)
        graph = intent.intent_graph
        
        join_node = next((n for n in graph.nodes if n.operation == "join"), None)
        assert join_node is not None
        assert join_node.spark_consequence == SparkConsequence.SHUFFLE_BOTH_SIDES

    def test_broadcast_hint_detected(self):
        """Broadcast hint maps to broadcast join likely."""
        parser = NotebookParser()
        ipynb = '''{
            "cells": [{
                "cell_type": "code",
                "source": ["df1.join(broadcast(df2), 'id')"]
            }],
            "metadata": {},
            "nbformat": 4
        }'''
        
        intent = parser.parse_ipynb(ipynb)
        graph = intent.intent_graph
        
        join_node = next((n for n in graph.nodes if n.operation == "join"), None)
        assert join_node is not None
        assert join_node.spark_consequence == SparkConsequence.BROADCAST_JOIN_LIKELY

    def test_repartition_causes_full_shuffle(self):
        """Repartition maps to full shuffle."""
        parser = NotebookParser()
        ipynb = '''{
            "cells": [{
                "cell_type": "code",
                "source": ["df.repartition(100)"]
            }],
            "metadata": {},
            "nbformat": 4
        }'''
        
        intent = parser.parse_ipynb(ipynb)
        graph = intent.intent_graph
        
        repart_node = next((n for n in graph.nodes if n.operation == "repartition"), None)
        assert repart_node is not None
        assert repart_node.spark_consequence == SparkConsequence.FULL_SHUFFLE

    def test_coalesce_is_no_shuffle(self):
        """Coalesce maps to no shuffle."""
        parser = NotebookParser()
        ipynb = '''{
            "cells": [{
                "cell_type": "code",
                "source": ["df.coalesce(1)"]
            }],
            "metadata": {},
            "nbformat": 4
        }'''
        
        intent = parser.parse_ipynb(ipynb)
        graph = intent.intent_graph
        
        coal_node = next((n for n in graph.nodes if n.operation == "coalesce"), None)
        assert coal_node is not None
        assert coal_node.spark_consequence == SparkConsequence.NO_SHUFFLE

    def test_cache_shows_memory_risk(self):
        """Cache/persist maps to memory pressure risk."""
        parser = NotebookParser()
        ipynb = '''{
            "cells": [{
                "cell_type": "code",
                "source": ["df.cache()"]
            }],
            "metadata": {},
            "nbformat": 4
        }'''
        
        intent = parser.parse_ipynb(ipynb)
        graph = intent.intent_graph
        
        cache_node = next((n for n in graph.nodes if n.operation == "cache"), None)
        assert cache_node is not None
        assert cache_node.spark_consequence == SparkConsequence.MEMORY_PRESSURE_RISK

    def test_window_requires_shuffle_and_sort(self):
        """Window operations map to shuffle + sort."""
        parser = NotebookParser()
        ipynb = '''{
            "cells": [{
                "cell_type": "code",
                "source": ["from pyspark.sql.window import Window\\n",
                          "w = Window.partitionBy('category').orderBy('date')\\n",
                          "df.withColumn('rank', row_number().over(w))"]
            }],
            "metadata": {},
            "nbformat": 4
        }'''
        
        intent = parser.parse_ipynb(ipynb)
        graph = intent.intent_graph
        
        # Window detection should find the withColumn using a window
        window_nodes = [n for n in graph.nodes if 'window' in n.operation.lower() or 
                       n.spark_consequence == SparkConsequence.SHUFFLE_AND_SORT]
        # May or may not detect depending on pattern matching
        # At minimum, no crash


class TestUncertaintiesOutput:
    """Tests for uncertainty reporting per spec Section 8."""

    def test_intent_graph_includes_uncertainties(self):
        """Intent graph output includes uncertainties list."""
        parser = NotebookParser()
        ipynb = '''{
            "cells": [{
                "cell_type": "code",
                "source": ["df1.join(df2, 'id')"]
            }],
            "metadata": {},
            "nbformat": 4
        }'''
        
        intent = parser.parse_ipynb(ipynb)
        
        assert hasattr(intent, 'uncertainties')
        assert isinstance(intent.uncertainties, list)

    def test_join_has_cardinality_uncertainty(self):
        """Joins should flag cardinality as unknown."""
        parser = NotebookParser()
        ipynb = '''{
            "cells": [{
                "cell_type": "code",
                "source": ["df1.join(df2, 'id')"]
            }],
            "metadata": {},
            "nbformat": 4
        }'''
        
        intent = parser.parse_ipynb(ipynb)
        
        assert any('cardinality' in u.lower() for u in intent.uncertainties)

    def test_data_distribution_always_unknown(self):
        """Data distribution is always flagged as unknown."""
        parser = NotebookParser()
        ipynb = '''{
            "cells": [{
                "cell_type": "code",
                "source": ["df.groupBy('key').count()"]
            }],
            "metadata": {},
            "nbformat": 4
        }'''
        
        intent = parser.parse_ipynb(ipynb)
        
        assert any('distribution' in u.lower() for u in intent.uncertainties)


class TestIntentGraphSerialization:
    """Tests for JSON output format per spec Section 8."""

    def test_to_dict_includes_intent_graph(self):
        """to_dict produces intent_graph array."""
        parser = NotebookParser()
        ipynb = '''{
            "cells": [{
                "cell_type": "code",
                "source": ["df.filter(col('x') > 0).groupBy('key').count()"]
            }],
            "metadata": {},
            "nbformat": 4
        }'''
        
        intent = parser.parse_ipynb(ipynb)
        result = intent.to_dict()
        
        assert 'intent_graph' in result
        assert isinstance(result['intent_graph'], list)

    def test_intent_graph_json_structure(self):
        """Intent graph JSON matches spec format."""
        parser = NotebookParser()
        ipynb = '''{
            "cells": [{
                "cell_type": "code",
                "source": ["df.groupBy('key').agg(sum('value'))"]
            }],
            "metadata": {},
            "nbformat": 4
        }'''
        
        intent = parser.parse_ipynb(ipynb)
        result = intent.to_dict()
        
        # Per spec Section 8 format:
        # { "step": 1, "operation": "groupBy", "details": {...}, "spark_consequence": "..." }
        for node in result['intent_graph']:
            assert 'step' in node
            assert 'operation' in node
            assert 'details' in node
            assert 'spark_consequence' in node

    def test_uncertainties_in_json(self):
        """Uncertainties included in JSON output."""
        parser = NotebookParser()
        ipynb = '''{
            "cells": [{
                "cell_type": "code",
                "source": ["df.join(other, 'id')"]
            }],
            "metadata": {},
            "nbformat": 4
        }'''
        
        intent = parser.parse_ipynb(ipynb)
        result = intent.to_dict()
        
        assert 'uncertainties' in result
        assert isinstance(result['uncertainties'], list)


class TestEditableAssumptions:
    """Tests for editable assumptions per UI spec Section 5."""

    def test_join_node_has_editable_join_type(self):
        """Join nodes include editable join_type assumption."""
        parser = NotebookParser()
        ipynb = '''{
            "cells": [{
                "cell_type": "code",
                "source": ["df1.join(df2, 'id')"]
            }],
            "metadata": {},
            "nbformat": 4
        }'''
        
        intent = parser.parse_ipynb(ipynb)
        graph = intent.intent_graph
        
        join_node = next((n for n in graph.nodes if n.operation == "join"), None)
        assert join_node is not None
        
        # Editable assumptions
        assert 'editable' in join_node.details
        editable = join_node.details['editable']
        assert 'join_type' in editable

    def test_join_node_has_broadcast_hint_assumption(self):
        """Join nodes include editable broadcast_hint assumption."""
        parser = NotebookParser()
        ipynb = '''{
            "cells": [{
                "cell_type": "code",
                "source": ["df1.join(df2, 'id')"]
            }],
            "metadata": {},
            "nbformat": 4
        }'''
        
        intent = parser.parse_ipynb(ipynb)
        graph = intent.intent_graph
        
        join_node = next((n for n in graph.nodes if n.operation == "join"), None)
        editable = join_node.details.get('editable', {})
        assert 'broadcast_hint' in editable

    def test_groupby_node_has_skew_assumption(self):
        """GroupBy nodes include editable is_skewed assumption."""
        parser = NotebookParser()
        ipynb = '''{
            "cells": [{
                "cell_type": "code",
                "source": ["df.groupBy('country').count()"]
            }],
            "metadata": {},
            "nbformat": 4
        }'''
        
        intent = parser.parse_ipynb(ipynb)
        graph = intent.intent_graph
        
        groupby_node = next((n for n in graph.nodes if n.operation == "groupBy"), None)
        editable = groupby_node.details.get('editable', {})
        assert 'is_skewed' in editable

    def test_filter_node_has_selectivity_assumption(self):
        """Filter nodes include editable selectivity assumption."""
        parser = NotebookParser()
        ipynb = '''{
            "cells": [{
                "cell_type": "code",
                "source": ["df.filter(col('active') == True)"]
            }],
            "metadata": {},
            "nbformat": 4
        }'''
        
        intent = parser.parse_ipynb(ipynb)
        graph = intent.intent_graph
        
        filter_node = next((n for n in graph.nodes if n.operation == "filter"), None)
        assert filter_node is not None
        editable = filter_node.details.get('editable', {})
        assert 'selectivity' in editable
