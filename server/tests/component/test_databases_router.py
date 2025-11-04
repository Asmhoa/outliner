import pytest
from fastapi.testclient import TestClient
from outliner_api_server.api import app
from outliner_api_server.db.sysdb import SystemDatabase
from outliner_api_server.routers.dependencies import get_sys_db
from unittest.mock import MagicMock

@pytest.fixture
def client():
    """Create a TestClient for the API."""
    return TestClient(app)

@pytest.fixture
def mock_sys_db():
    """Mock the SystemDatabase dependency."""
    db = MagicMock(spec=SystemDatabase)
    app.dependency_overrides[get_sys_db] = lambda: db
    yield db
    app.dependency_overrides = {}


def test_get_databases_empty(client, mock_sys_db):
    """Test that GET /databases returns an empty list when there are no databases."""
    mock_sys_db.get_all_user_databases.return_value = []
    response = client.get("/databases")
    assert response.status_code == 200
    assert response.json() == []


def test_get_databases_with_data(client, mock_sys_db):
    """Test that GET /databases returns a list of databases."""
    mock_sys_db.get_all_user_databases.return_value = [
        {"id": "uuid1", "name": "db1", "path": "/db1.sqlite", "created_at": "2023-01-01T00:00:00"},
        {"id": "uuid2", "name": "db2", "path": "/db2.sqlite", "created_at": "2023-01-01T00:00:00"},
    ]
    response = client.get("/databases")
    assert response.status_code == 200
    assert len(response.json()) == 2


def test_create_database(client, mock_sys_db):
    """Test that a database can be created successfully."""
    response = client.post("/databases", json={"name": "new_db"})
    assert response.status_code == 200
    assert response.json() == {"status": "success"}
    mock_sys_db.add_user_database.assert_called_once_with("new_db")


def test_create_database_already_exists(client, mock_sys_db):
    """Test that creating a database that already exists returns a 409 error."""
    from outliner_api_server.db.errors import UserDatabaseAlreadyExistsError
    mock_sys_db.add_user_database.side_effect = UserDatabaseAlreadyExistsError
    response = client.post("/databases", json={"name": "existing_db"})
    assert response.status_code == 409


def test_get_database(client, mock_sys_db):
    """Test that a database can be retrieved by ID."""
    mock_sys_db.get_user_database_by_id.return_value = {
        "id": "uuid1", "name": "test_db", "path": "/test.sqlite", "created_at": "2023-01-01T00:00:00"
    }
    response = client.get("/databases/uuid1")
    assert response.status_code == 200
    assert response.json()["name"] == "test_db"


def test_get_database_not_found(client, mock_sys_db):
    """Test that getting a database that doesn't exist returns a 404 error."""
    from outliner_api_server.db.errors import UserDatabaseNotFoundError
    mock_sys_db.get_user_database_by_id.side_effect = UserDatabaseNotFoundError("Database with id 'non_existent_id' not found.")
    response = client.get("/databases/non_existent_id")
    assert response.status_code == 404


def test_delete_database(client, mock_sys_db):
    """Test that a database can be deleted successfully."""
    response = client.delete("/databases/uuid1")
    assert response.status_code == 200
    assert response.json() == {"status": "success"}
    mock_sys_db.delete_user_database.assert_called_once_with("uuid1")


def test_delete_database_not_found(client, mock_sys_db):
    """Test that deleting a database that doesn't exist returns a 404 error."""
    from outliner_api_server.db.errors import UserDatabaseNotFoundError
    mock_sys_db.delete_user_database.side_effect = UserDatabaseNotFoundError("Database with id 'non_existent_id' not found.")
    response = client.delete("/databases/non_existent_id")
    assert response.status_code == 404
