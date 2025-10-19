import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock
import sys
import os

from outliner_api_server.api import app
from outliner_api_server.data import Database

client = TestClient(app)


@pytest.fixture
def mock_db():
    mock_database = MagicMock(spec=Database)
    
    # Import get_db function to override
    from outliner_api_server.api import get_db
    
    # Create a generator function that yields the mock database
    def override_get_db():
        yield mock_database
    
    # Override the dependency
    app.dependency_overrides[get_db] = override_get_db
    
    yield mock_database
    
    # Remove the override after the test
    app.dependency_overrides.clear()


# Page endpoint tests
def test_add_page_success(mock_db):
    """Test adding a new page via API."""
    mock_db.add_page.return_value = 123

    response = client.post("/pages", json={"title": "Test Page"})

    assert response.status_code == 200
    assert response.json() == {"page_id": 123}
    mock_db.add_page.assert_called_once_with("Test Page")


def test_get_page_success(mock_db):
    """Test getting a page by ID via API."""
    mock_db.get_page_by_id.return_value = (123, "Test Page", "2023-01-01 00:00:00")

    response = client.get("/pages/123")

    assert response.status_code == 200
    assert response.json() == {
        "page_id": 123,
        "title": "Test Page",
        "created_at": "2023-01-01T00:00:00",
    }
    mock_db.get_page_by_id.assert_called_once_with(123)


def test_get_page_not_found(mock_db):
    """Test getting a non-existent page via API."""
    mock_db.get_page_by_id.return_value = None

    response = client.get("/pages/999")

    assert response.status_code == 404
    assert response.json() == {"detail": "Page not found"}


def test_get_pages_success(mock_db):
    """Test getting all pages via API."""
    mock_db.get_pages.return_value = [
        (123, "Page 1", "2023-01-01 00:00:00"),
        (456, "Page 2", "2023-01-02 00:00:00"),
    ]

    response = client.get("/pages")

    assert response.status_code == 200
    assert response.json() == [
        {
            "page_id": 123,
            "title": "Page 1",
            "created_at": "2023-01-01T00:00:00",
        },
        {
            "page_id": 456,
            "title": "Page 2",
            "created_at": "2023-01-02T00:00:00",
        },
    ]
    mock_db.get_pages.assert_called_once()


def test_rename_page_success(mock_db):
    """Test renaming a page via API."""
    mock_db.rename_page.return_value = True

    response = client.put("/pages", json={"page_id": 123, "new_title": "New Title"})

    assert response.status_code == 200
    assert response.json() == {"status": "success"}
    mock_db.rename_page.assert_called_once_with(123, "New Title")


def test_rename_page_not_found(mock_db):
    """Test renaming a non-existent page via API."""
    mock_db.rename_page.return_value = False

    response = client.put("/pages", json={"page_id": 999, "new_title": "New Title"})

    assert response.status_code == 404
    assert response.json() == {"detail": "Page not found"}


def test_delete_page_success(mock_db):
    """Test deleting a page via API."""
    mock_db.delete_page.return_value = True

    response = client.delete("/pages/123")

    assert response.status_code == 200
    assert response.json() == {"status": "success"}
    mock_db.delete_page.assert_called_once_with(123)


def test_delete_page_not_found(mock_db):
    """Test deleting a non-existent page via API."""
    mock_db.delete_page.return_value = False

    response = client.delete("/pages/999")

    assert response.status_code == 404
    assert response.json() == {"detail": "Page not found"}


# Block endpoint tests
def test_add_block_success(mock_db):
    """Test adding a block via API."""
    mock_db.add_block.return_value = 456
    mock_db.get_block_content_by_id.return_value = (
        456,
        "Test Block",
        123,
        None,
        1,
        "2023-01-01 00:00:00",
    )

    response = client.post(
        "/blocks", json={"content": "Test Block", "position": 1, "page_id": 123}
    )

    assert response.status_code == 200
    assert response.json() == {
        "block_id": 456,
        "content": "Test Block",
        "page_id": 123,
        "parent_block_id": None,
        "position": 1,
        "created_at": "2023-01-01T00:00:00",
    }
    mock_db.add_block.assert_called_once_with("Test Block", 1, 123, None)


def test_get_block_success(mock_db):
    """Test getting a block by ID via API."""
    mock_db.get_block_content_by_id.return_value = (
        456,
        "Test Block",
        123,
        None,
        1,
        "2023-01-01 00:00:00",
    )

    response = client.get("/block/456")

    assert response.status_code == 200
    assert response.json() == {
        "block_id": 456,
        "content": "Test Block",
        "page_id": 123,
        "parent_block_id": None,
        "position": 1,
        "created_at": "2023-01-01T00:00:00",
    }
    mock_db.get_block_content_by_id.assert_called_once_with(456)


def test_get_block_not_found(mock_db):
    """Test getting a non-existent block via API."""
    mock_db.get_block_content_by_id.return_value = None

    response = client.get("/block/999")

    assert response.status_code == 404
    assert response.json() == {"detail": "Block not found"}


def test_get_blocks_by_page_success(mock_db):
    """Test getting all blocks for a page via API."""
    mock_db.get_blocks_by_page.return_value = [
        (456, "Block 1", 123, None, 1, "2023-01-01 00:00:00"),
        (789, "Block 2", 123, 456, 2, "2023-01-02 00:00:00"),
    ]

    response = client.get("/blocks/123")

    assert response.status_code == 200
    assert response.json() == [
        {
            "block_id": 456,
            "content": "Block 1",
            "page_id": 123,
            "parent_block_id": None,
            "position": 1,
            "created_at": "2023-01-01T00:00:00",
        },
        {
            "block_id": 789,
            "content": "Block 2",
            "page_id": 123,
            "parent_block_id": 456,
            "position": 2,
            "created_at": "2023-01-02T00:00:00",
        },
    ]
    mock_db.get_blocks_by_page.assert_called_once_with(123)


def test_update_block_content_success(mock_db):
    """Test updating block content via API."""
    mock_db.update_block_content.return_value = True

    response = client.put(
        "/blocks/content", json={"block_id": 456, "new_content": "Updated Content"}
    )

    assert response.status_code == 200
    assert response.json() == {"status": "success"}
    mock_db.update_block_content.assert_called_once_with(456, "Updated Content")


def test_update_block_content_not_found(mock_db):
    """Test updating content of a non-existent block via API."""
    mock_db.update_block_content.return_value = False

    response = client.put(
        "/blocks/content", json={"block_id": 999, "new_content": "Updated Content"}
    )

    assert response.status_code == 404
    assert response.json() == {"detail": "Block not found"}


def test_update_block_parent_success(mock_db):
    """Test updating block parent via API."""
    mock_db.update_block_parent.return_value = True

    response = client.put("/blocks/parent", json={"block_id": 456, "new_page_id": 123})

    assert response.status_code == 200
    assert response.json() == {"status": "success"}
    mock_db.update_block_parent.assert_called_once_with(456, 123, None)


def test_update_block_parent_invalid(mock_db):
    """Test updating block parent with invalid parameters via API."""
    mock_db.update_block_parent.return_value = False

    response = client.put(
        "/blocks/parent",
        json={"block_id": 999, "new_page_id": 123, "new_parent_block_id": 456},
    )

    assert response.status_code == 404
    assert response.json() == {"detail": "Block not found or invalid parent update"}


def test_delete_block_success(mock_db):
    """Test deleting a block via API."""
    mock_db.delete_block.return_value = True

    response = client.delete("/blocks/456")

    assert response.status_code == 200
    assert response.json() == {"status": "success"}
    mock_db.delete_block.assert_called_once_with(456)


def test_delete_block_not_found(mock_db):
    """Test deleting a non-existent block via API."""
    mock_db.delete_block.return_value = False

    response = client.delete("/blocks/999")

    assert response.status_code == 404
    assert response.json() == {"detail": "Block not found"}


# Workspace endpoint tests - NEW
def test_add_workspace_success(mock_db):
    """Test adding a new workspace via API."""
    mock_db.add_workspace.return_value = 789
    mock_db.get_workspace_by_id.return_value = (789, "Test Workspace", "#FF0000")

    response = client.post("/workspaces", json={
        "name": "Test Workspace",
        "color": "#FF0000"
    })

    assert response.status_code == 200
    assert response.json() == {
        "workspace_id": 789,
        "name": "Test Workspace",
        "color": "#FF0000"
    }
    mock_db.add_workspace.assert_called_once_with("Test Workspace", "#FF0000")


def test_add_workspace_with_special_chars(mock_db):
    """Test adding a workspace with special characters in name and color."""
    mock_db.add_workspace.return_value = 999
    mock_db.get_workspace_by_id.return_value = (999, "Workspace & Test!", "#00AAFF")

    response = client.post("/workspaces", json={
        "name": "Workspace & Test!",
        "color": "#00AAFF"
    })

    assert response.status_code == 200
    assert response.json() == {
        "workspace_id": 999,
        "name": "Workspace & Test!",
        "color": "#00AAFF"
    }
    mock_db.add_workspace.assert_called_once_with("Workspace & Test!", "#00AAFF")


def test_get_workspace_success(mock_db):
    """Test getting a workspace by ID via API."""
    mock_db.get_workspace_by_id.return_value = (789, "Test Workspace", "#FF0000")

    response = client.get("/workspaces/789")

    assert response.status_code == 200
    assert response.json() == {
        "workspace_id": 789,
        "name": "Test Workspace",
        "color": "#FF0000"
    }
    mock_db.get_workspace_by_id.assert_called_once_with(789)


def test_get_workspace_not_found(mock_db):
    """Test getting a non-existent workspace via API."""
    mock_db.get_workspace_by_id.return_value = None

    response = client.get("/workspaces/999")

    assert response.status_code == 404
    assert response.json() == {"detail": "Workspace not found"}


def test_get_workspaces_success(mock_db):
    """Test getting all workspaces via API."""
    mock_db.get_workspaces.return_value = [
        (123, "Workspace 1", "#FF0000"),
        (456, "Workspace 2", "#00FF00"),
        (789, "Workspace 3", "#0000FF"),
    ]

    response = client.get("/workspaces")

    assert response.status_code == 200
    assert response.json() == [
        {
            "workspace_id": 123,
            "name": "Workspace 1",
            "color": "#FF0000"
        },
        {
            "workspace_id": 456,
            "name": "Workspace 2",
            "color": "#00FF00"
        },
        {
            "workspace_id": 789,
            "name": "Workspace 3",
            "color": "#0000FF"
        }
    ]
    mock_db.get_workspaces.assert_called_once()


def test_update_workspace_success(mock_db):
    """Test updating a workspace via API."""
    mock_db.update_workspace.return_value = True

    response = client.put("/workspaces", json={
        "workspace_id": 789,
        "new_name": "Updated Workspace",
        "new_color": "#FFFFFF"
    })

    assert response.status_code == 200
    assert response.json() == {"status": "success"}
    mock_db.update_workspace.assert_called_once_with(789, "Updated Workspace", "#FFFFFF")


def test_update_workspace_not_found(mock_db):
    """Test updating a non-existent workspace via API."""
    mock_db.update_workspace.return_value = False

    response = client.put("/workspaces", json={
        "workspace_id": 999,
        "new_name": "Updated Workspace",
        "new_color": "#FFFFFF"
    })

    assert response.status_code == 404
    assert response.json() == {"detail": "Workspace not found"}


def test_update_workspace_with_special_chars(mock_db):
    """Test updating a workspace with special characters."""
    mock_db.update_workspace.return_value = True

    response = client.put("/workspaces", json={
        "workspace_id": 789,
        "new_name": "Updated Workspace & Test!",
        "new_color": "#123ABC"
    })

    assert response.status_code == 200
    assert response.json() == {"status": "success"}
    mock_db.update_workspace.assert_called_once_with(789, "Updated Workspace & Test!", "#123ABC")


def test_delete_workspace_success(mock_db):
    """Test deleting a workspace via API."""
    mock_db.delete_workspace.return_value = True

    response = client.delete("/workspaces/789")

    assert response.status_code == 200
    assert response.json() == {"status": "success"}
    mock_db.delete_workspace.assert_called_once_with(789)


def test_delete_workspace_not_found(mock_db):
    """Test deleting a non-existent workspace via API."""
    mock_db.delete_workspace.return_value = False

    response = client.delete("/workspaces/999")

    assert response.status_code == 404
    assert response.json() == {"detail": "Workspace not found"}


# Additional edge case tests for existing functionality
def test_add_page_empty_title(mock_db):
    """Test adding a page with an empty title."""
    mock_db.add_page.return_value = 456

    response = client.post("/pages", json={"title": ""})

    assert response.status_code == 200
    assert response.json() == {"page_id": 456}
    mock_db.add_page.assert_called_once_with("")


def test_add_page_long_title(mock_db):
    """Test adding a page with a very long title."""
    long_title = "A" * 1000
    mock_db.add_page.return_value = 456

    response = client.post("/pages", json={"title": long_title})

    assert response.status_code == 200
    assert response.json() == {"page_id": 456}
    mock_db.add_page.assert_called_once_with(long_title)


def test_get_pages_empty(mock_db):
    """Test getting all pages when there are no pages."""
    mock_db.get_pages.return_value = []

    response = client.get("/pages")

    assert response.status_code == 200
    assert response.json() == []
    mock_db.get_pages.assert_called_once()


def test_add_block_with_parent(mock_db):
    """Test adding a block with a parent block."""
    mock_db.add_block.return_value = 555
    mock_db.get_block_content_by_id.return_value = (
        555,
        "Child Block",
        123,
        456,
        2,
        "2023-01-01 00:00:00",
    )

    response = client.post(
        "/blocks", 
        json={
            "content": "Child Block", 
            "position": 2, 
            "page_id": 123,
            "parent_block_id": 456
        }
    )

    assert response.status_code == 200
    assert response.json() == {
        "block_id": 555,
        "content": "Child Block",
        "page_id": 123,
        "parent_block_id": 456,
        "position": 2,
        "created_at": "2023-01-01T00:00:00",
    }
    mock_db.add_block.assert_called_once_with("Child Block", 2, 123, 456)


def test_get_blocks_by_page_empty(mock_db):
    """Test getting all blocks for a page when there are no blocks."""
    mock_db.get_blocks_by_page.return_value = []

    response = client.get("/blocks/123")

    assert response.status_code == 200
    assert response.json() == []
    mock_db.get_blocks_by_page.assert_called_once_with(123)


def test_update_block_content_special_chars(mock_db):
    """Test updating block content with special characters."""
    mock_db.update_block_content.return_value = True

    special_content = "Special chars: !@#$%^&*()_+-={}[]|\\:;\"'<>?,./"
    response = client.put(
        "/blocks/content", 
        json={"block_id": 456, "new_content": special_content}
    )

    assert response.status_code == 200
    assert response.json() == {"status": "success"}
    mock_db.update_block_content.assert_called_once_with(456, special_content)


def test_add_workspace_long_name(mock_db):
    """Test adding a workspace with a very long name."""
    long_name = "A" * 500
    mock_db.add_workspace.return_value = 999
    mock_db.get_workspace_by_id.return_value = (999, long_name, "#ABCDEF")

    response = client.post("/workspaces", json={
        "name": long_name,
        "color": "#ABCDEF"
    })

    assert response.status_code == 200
    assert response.json() == {
        "workspace_id": 999,
        "name": long_name,
        "color": "#ABCDEF"
    }
    mock_db.add_workspace.assert_called_once_with(long_name, "#ABCDEF")


def test_rename_page_special_chars(mock_db):
    """Test renaming a page with special characters."""
    mock_db.rename_page.return_value = True

    response = client.put("/pages", json={
        "page_id": 123, 
        "new_title": "Page with & Special # Chars!"
    })

    assert response.status_code == 200
    assert response.json() == {"status": "success"}
    mock_db.rename_page.assert_called_once_with(123, "Page with & Special # Chars!")


def test_get_workspaces_empty(mock_db):
    """Test getting all workspaces when there are no workspaces."""
    mock_db.get_workspaces.return_value = []

    response = client.get("/workspaces")

    assert response.status_code == 200
    assert response.json() == []
    mock_db.get_workspaces.assert_called_once()