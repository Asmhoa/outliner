
import pytest
from fastapi.testclient import TestClient
from outliner_api_server.api import app, get_db
from outliner_api_server.data import Database

# Create a new database for testing
TEST_DB_PATH = "./test.db"

@pytest.fixture(scope="module")
def test_db():
    db = Database(TEST_DB_PATH)
    db.create_new_database()
    yield db
    db.close_conn()
    import os
    os.remove(TEST_DB_PATH)

@pytest.fixture(scope="module")
def client(test_db):
    def override_get_db():
        try:
            yield test_db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c

def test_add_and_get_workspace(client):
    # Add a workspace
    response = client.post("/workspaces", json={"name": "Test Workspace", "color": "#FF5733"})
    assert response.status_code == 200
    new_workspace = response.json()
    assert new_workspace["name"] == "Test Workspace"
    assert new_workspace["color"] == "#FF5733"
    assert "workspace_id" in new_workspace

    # Get the workspace back
    workspace_id = new_workspace["workspace_id"]
    response = client.get(f"/workspaces/{workspace_id}")
    assert response.status_code == 200
    workspace = response.json()
    assert workspace["name"] == "Test Workspace"
    assert workspace["color"] == "#FF5733"
    assert workspace["workspace_id"] == workspace_id

def test_get_all_workspaces(client, test_db):
    # Clear workspaces
    test_db.cursor.execute("DELETE FROM workspaces WHERE workspace_id != 0")
    test_db.conn.commit()

    # Add a couple of workspaces
    client.post("/workspaces", json={"name": "Workspace 1", "color": "#111111"})
    client.post("/workspaces", json={"name": "Workspace 2", "color": "#222222"})

    # Get all workspaces
    response = client.get("/workspaces")
    assert response.status_code == 200
    workspaces = response.json()
    assert len(workspaces) >= 2 # >= because of default workspace
    assert workspaces[-2]["name"] == "Workspace 1"
    assert workspaces[-2]["color"] == "#111111"
    assert workspaces[-1]["name"] == "Workspace 2"
    assert workspaces[-1]["color"] == "#222222"
