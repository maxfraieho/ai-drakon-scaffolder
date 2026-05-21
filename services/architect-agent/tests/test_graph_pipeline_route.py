import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'shared')))
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_list_pipelines():
    r = client.get("/graph-pipelines")
    assert r.status_code == 200
    data = r.json()
    assert "pipelines" in data
    names = [p["name"] for p in data["pipelines"]]
    assert "pipeline_a" in names
    assert "pipeline_b" in names

def test_get_pipeline_a():
    r = client.get("/graph-pipelines/pipeline_a")
    assert r.status_code == 200
    ir = r.json()
    assert "items" in ir
    assert "1" in ir["items"]

def test_get_nonexistent_pipeline():
    r = client.get("/graph-pipelines/nonexistent")
    assert r.status_code == 404
