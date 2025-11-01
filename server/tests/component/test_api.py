import pytest
from fastapi.testclient import TestClient
from outliner_api_server.api import app, get_db
from outliner_api_server.userdb import UserDatabase
from outliner_api_server.sysdb import SystemDatabase
import os

# Define paths relative to the server directory
TEST_DB_DIR = os.path.join(os.path.dirname(__file__), "test_data")
TEST_USER_DB_PATH = os.path.join(TEST_DB_DIR, "test.db")
TEST_SYS_DB_PATH = os.path.join(TEST_DB_DIR, "test_sys.db")
TEST_DB_NAME = "test_db"


@pytest.fixture(scope="module", autouse=True)
def setup_test_data_dir():
    os.makedirs(TEST_DB_DIR, exist_ok=True)
    yield
    # Clean up the directory after all tests in the module are done
    for f in os.listdir(TEST_DB_DIR):
        os.remove(os.path.join(TEST_DB_DIR, f))
    os.rmdir(TEST_DB_DIR)


@pytest.fixture(scope="module")
def sys_db(setup_test_data_dir):
    os.environ["OUTLINER_SYS_DB_PATH"] = TEST_SYS_DB_PATH
    db = SystemDatabase()
    yield db
    db.close_conn()
    del os.environ["OUTLINER_SYS_DB_PATH"]


@pytest.fixture(scope="module")
def test_db(sys_db):
    sys_db.add_user_database(TEST_DB_NAME, TEST_USER_DB_PATH)
    db = UserDatabase(TEST_USER_DB_PATH)
    db.create_new_database()
    yield db
    db.close_conn()
    sys_db.delete_user_database(TEST_DB_NAME)
    os.remove(TEST_USER_DB_PATH)


@pytest.fixture(scope="module")
def client(test_db):
    def override_get_db(db_name: str):
        if db_name == TEST_DB_NAME:
            try:
                yield test_db
            finally:
                pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c



def test_add_and_get_workspace(client):
    # Add a workspace
    response = client.post(
        f"/db/{TEST_DB_NAME}/workspaces", json={"name": "Test Workspace", "color": "#FF5733"}
    )
    assert response.status_code == 200
    new_workspace = response.json()
    assert new_workspace["name"] == "Test Workspace"
    assert new_workspace["color"] == "#FF5733"
    assert "workspace_id" in new_workspace

    # Get the workspace back
    workspace_id = new_workspace["workspace_id"]
    response = client.get(f"/db/{TEST_DB_NAME}/workspaces/{workspace_id}")
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
    client.post(f"/db/{TEST_DB_NAME}/workspaces", json={"name": "Workspace 1", "color": "#111111"})
    client.post(f"/db/{TEST_DB_NAME}/workspaces", json={"name": "Workspace 2", "color": "#222222"})

    # Get all workspaces
    response = client.get(f"/db/{TEST_DB_NAME}/workspaces")
    assert response.status_code == 200
    workspaces = response.json()
    assert len(workspaces) >= 2  # >= because of default workspace
    assert workspaces[-2]["name"] == "Workspace 1"
    assert workspaces[-2]["color"] == "#111111"
    assert workspaces[-1]["name"] == "Workspace 2"
    assert workspaces[-1]["color"] == "#222222"
