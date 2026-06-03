import json, os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))
from pipeline.graph_loader import load_graph_from_file

PIPELINES_DIR = os.path.join(os.path.dirname(__file__), '..', '..', 'pipelines')

def test_load_pipeline_a_compiles():
    path = os.path.join(PIPELINES_DIR, 'pipeline_a.drakon.json')
    graph = load_graph_from_file(path)
    assert graph is not None

def test_load_pipeline_b_compiles():
    path = os.path.join(PIPELINES_DIR, 'pipeline_b.drakon.json')
    graph = load_graph_from_file(path)
    assert graph is not None

def test_pipeline_a_has_measure_cc_node():
    path = os.path.join(PIPELINES_DIR, 'pipeline_a.drakon.json')
    graph = load_graph_from_file(path)
    assert 'measure_cc' in graph.nodes


def test_load_sonate_solidaire_agent_compiles():
    path = os.path.join(PIPELINES_DIR, 'sonate-solidaire-agent.drakon.json')
    graph = load_graph_from_file(path)
    assert graph is not None
    assert 'ss_log_analytics' in graph.nodes
