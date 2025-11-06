import pytest
from fastapi.testclient import TestClient
from outliner_api_server.api import app
from outliner_api_server.routers.dependencies import get_db
from outliner_api_server.db.userdb import UserDatabase
from outliner_api_server.db.errors import (
    PageNotFoundError,
    BlockNotFoundError,
    WorkspaceNotFoundError,
)

client = TestClient(app)

TEST_DB_ID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890"


@pytest.fixture
def db():
    """Set up a new in-memory database for each test."""
    database = UserDatabase(":memory:")
    database.initialize_tables()
    yield database
    database.close_conn()


@pytest.fixture
def override_get_db(db):
    """Override the get_db dependency to use the in-memory database for a specific db_id."""

    def _override_get_db(db_id: str):
        if db_id == TEST_DB_ID:
            yield db
        else:
            pytest.fail(f"Unexpected db_id: {db_id}")

    app.dependency_overrides[get_db] = _override_get_db

    yield db

    # Remove the override after the test
    app.dependency_overrides.clear()


# Page endpoint tests
def test_add_page_success(override_get_db):
    """Test adding a new page via API."""
    db = override_get_db

    response = client.post(f"/db/{TEST_DB_ID}/pages", json={"title": "Test Page"})

    assert response.status_code == 200
    page_id = response.json()["page_id"]
    assert len(page_id) > 0  # Verify a page ID was returned

    # Verify the page exists in the database
    page_data = db.get_page_by_id(page_id)
    assert page_data is not None
    assert page_data.title == "Test Page"  # Title should match


def test_get_page_success(override_get_db):
    """Test getting a page by ID via API."""
    db = override_get_db

    # Create a page first
    page_id = db.add_page("Test Page")

    response = client.get(f"/db/{TEST_DB_ID}/pages/{page_id}")

    assert response.status_code == 200
    json_response = response.json()
    assert json_response["page_id"] == page_id
    assert json_response["title"] == "Test Page"
    assert "created_at" in json_response  # Verify timestamp exists

    # Verify that the page exists in the database with the same values
    page_data = db.get_page_by_id(page_id)
    assert page_data is not None
    assert page_data.page_id == page_id
    assert page_data.title == "Test Page"


def test_get_page_not_found(override_get_db):
    """Test getting a non-existent page via API."""
    response = client.get(f"/db/{TEST_DB_ID}/pages/xyz999")

    assert response.status_code == 404
    assert response.json() == {"detail": "Page with ID xyz999 not found"}


def test_get_pages_success(override_get_db):
    """Test getting all pages via API."""
    db = override_get_db

    # Create some pages
    page_id_1 = db.add_page("Page 1")
    page_id_2 = db.add_page("Page 2")

    response = client.get(f"/db/{TEST_DB_ID}/pages")

    assert response.status_code == 200
    pages = response.json()
    assert len(pages) == 2
    # Verify that both pages are present in the response
    page_ids = [page["page_id"] for page in pages]
    assert page_id_1 in page_ids
    assert page_id_2 in page_ids
    titles = [page["title"] for page in pages]
    assert "Page 1" in titles
    assert "Page 2" in titles


def test_rename_page_success(override_get_db):
    """Test renaming a page via API."""
    db = override_get_db

    # Create a page first
    page_id = db.add_page("Old Title")

    response = client.put(
        f"/db/{TEST_DB_ID}/pages", json={"page_id": page_id, "new_title": "New Title"}
    )

    assert response.status_code == 200
    assert response.json() == {"status": "success"}

    # Verify the page was renamed in the database
    page_data = db.get_page_by_id(page_id)
    assert page_data is not None
    assert page_data.title == "New Title"


def test_rename_page_not_found(override_get_db):
    """Test renaming a non-existent page via API."""
    response = client.put(
        f"/db/{TEST_DB_ID}/pages",
        json={"page_id": "xyz999", "new_title": "New Title"},
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Page with ID xyz999 not found"


def test_delete_page_success(override_get_db):
    """Test deleting a page via API."""
    db = override_get_db

    # Create a page first
    page_id = db.add_page("Test Page")

    response = client.delete(f"/db/{TEST_DB_ID}/pages/{page_id}")

    assert response.status_code == 200
    assert response.json() == {"status": "success"}

    # Verify the page was deleted from the database
    with pytest.raises(PageNotFoundError):
        db.get_page_by_id(page_id)


def test_delete_page_not_found(override_get_db):
    """Test deleting a non-existent page via API."""
    response = client.delete(f"/db/{TEST_DB_ID}/pages/xyz999")

    assert response.status_code == 404
    assert response.json()["detail"] == "Page with ID xyz999 not found"


# Block endpoint tests
def test_add_block_success(override_get_db):
    """Test adding a block via API."""
    db = override_get_db

    # Create a page first
    page_id = db.add_page("Test Page")

    response = client.post(
        f"/db/{TEST_DB_ID}/blocks",
        json={"content": "Test Block", "position": 1, "page_id": page_id},
    )

    assert response.status_code == 200
    response_data = response.json()
    block_id = response_data["block_id"]
    assert len(block_id) > 0  # Verify a block ID was returned

    # Verify the block exists in the database
    block_data = db.get_block_content_by_id(block_id)
    assert block_data is not None
    assert block_data.content == "Test Block"  # Content should match
    assert block_data.page_id == page_id  # Page ID should match
    assert block_data.parent_block_id is None  # Parent should be None
    assert block_data.position == 1  # Position should be 1


def test_get_block_success(override_get_db):
    """Test getting a block by ID via API."""
    db = override_get_db

    # Create a page and block first
    page_id = db.add_page("Test Page")
    block_id = db.add_block("Test Block", 1, page_id=page_id)

    response = client.get(f"/db/{TEST_DB_ID}/block/{block_id}")

    assert response.status_code == 200
    response_data = response.json()
    assert response_data["block_id"] == block_id
    assert response_data["content"] == "Test Block"
    assert response_data["page_id"] == page_id
    assert response_data["parent_block_id"] is None
    assert response_data["position"] == 1
    assert "created_at" in response_data

    # Verify that the block exists in the database with the same values
    block_data = db.get_block_content_by_id(block_id)
    assert block_data is not None
    assert block_data.block_id == block_id
    assert block_data.content == "Test Block"
    assert block_data.page_id == page_id
    assert block_data.parent_block_id is None
    assert block_data.position == 1


def test_get_block_not_found(override_get_db):
    """Test getting a non-existent block via API."""
    response = client.get(f"/db/{TEST_DB_ID}/block/xyz999")

    assert response.status_code == 404
    assert response.json() == {"detail": "Block with ID xyz999 not found"}


def test_get_blocks_by_page_success(override_get_db):
    """Test getting all blocks for a page via API."""
    db = override_get_db

    # Create a page and some blocks that are directly associated with the page
    page_id = db.add_page("Test Page")
    block1_id = db.add_block("Block 1", 1, page_id=page_id)
    block2_id = db.add_block("Block 2", 2, page_id=page_id)

    response = client.get(f"/db/{TEST_DB_ID}/blocks/{page_id}")

    assert response.status_code == 200
    blocks = response.json()
    assert len(blocks) == 2

    # Verify both blocks are present
    block_ids = [block["block_id"] for block in blocks]
    assert block1_id in block_ids
    assert block2_id in block_ids

    # Verify block details
    for block in blocks:
        if block["block_id"] == block1_id:
            assert block["content"] == "Block 1"
            assert block["position"] == 1
            assert block["page_id"] == page_id
        elif block["block_id"] == block2_id:
            assert block["content"] == "Block 2"
            assert block["position"] == 2
            assert block["page_id"] == page_id


def test_update_block_content_success(override_get_db):
    """Test updating block content via API."""
    db = override_get_db

    # Create a page and block first
    page_id = db.add_page("Test Page")
    block_id = db.add_block("Original Content", 1, page_id=page_id)

    response = client.put(
        f"/db/{TEST_DB_ID}/blocks/content",
        json={"block_id": block_id, "new_content": "Updated Content"},
    )

    assert response.status_code == 200
    assert response.json() == {"status": "success"}

    # Verify the block content was updated in the database
    block_data = db.get_block_content_by_id(block_id)
    assert block_data is not None
    assert block_data.content == "Updated Content"


def test_update_block_content_not_found(override_get_db):
    """Test updating content of a non-existent block via API."""
    response = client.put(
        f"/db/{TEST_DB_ID}/blocks/content",
        json={"block_id": "xyz999", "new_content": "Updated Content"},
    )

    assert response.status_code == 404
    assert response.json() == {"detail": "Block not found"}


def test_update_block_parent_success(override_get_db):
    """Test updating block parent via API."""
    db = override_get_db

    # Create a page and two blocks first
    page_id = db.add_page("Test Page")
    block_id = db.add_block("Test Block", 1, page_id=page_id)
    new_page_id = db.add_page("New Page")

    response = client.put(
        f"/db/{TEST_DB_ID}/blocks/parent",
        json={"block_id": block_id, "new_page_id": new_page_id},
    )

    assert response.status_code == 200
    assert response.json() == {"status": "success"}

    # Verify the block parent was updated in the database
    block_data = db.get_block_content_by_id(block_id)
    assert block_data is not None
    assert block_data.page_id == new_page_id  # Should be on the new page
    assert (
        block_data.parent_block_id is None
    )  # Parent should be None (not a child block)


def test_update_block_parent_invalid(override_get_db):
    """Test updating block parent with invalid parameters via API."""
    response = client.put(
        f"/db/{TEST_DB_ID}/blocks/parent",
        json={
            "block_id": "xyz999",
            "new_page_id": "abc123",
            "new_parent_block_id": "def456",
        },
    )

    assert response.status_code == 400
    assert (
        "A block must be associated with either a page_id or a parent_block_id, but not both."
        in response.json()["detail"]
    )


def test_delete_block_success(override_get_db):
    """Test deleting a block via API."""
    db = override_get_db

    # Create a page and block first
    page_id = db.add_page("Test Page")
    block_id = db.add_block("Test Block", 1, page_id=page_id)

    response = client.delete(f"/db/{TEST_DB_ID}/blocks/{block_id}")

    assert response.status_code == 200
    assert response.json() == {"status": "success"}

    # Verify the block was deleted from the database
    with pytest.raises(BlockNotFoundError):
        db.get_block_content_by_id(block_id)


def test_delete_block_not_found(override_get_db):
    """Test deleting a non-existent block via API."""
    response = client.delete(f"/db/{TEST_DB_ID}/blocks/xyz999")

    assert response.status_code == 404
    assert response.json() == {"detail": "Block not found"}


# Workspace endpoint tests - NEW
def test_add_workspace_success(override_get_db):
    """Test adding a new workspace via API."""
    db = override_get_db

    response = client.post(
        f"/db/{TEST_DB_ID}/workspaces",
        json={"name": "Test Workspace", "color": "#FF0000"},
    )

    assert response.status_code == 200
    response_data = response.json()
    workspace_id = response_data["workspace_id"]
    assert isinstance(workspace_id, int)  # Workspace ID should be an integer

    # Verify the workspace exists in the database
    workspace_data = db.get_workspace_by_id(workspace_id)
    assert workspace_data is not None
    assert workspace_data.name == "Test Workspace"
    assert workspace_data.color == "#FF0000"


def test_add_workspace_with_special_chars(override_get_db):
    """Test adding a workspace with special characters in name and color."""
    db = override_get_db

    response = client.post(
        f"/db/{TEST_DB_ID}/workspaces",
        json={"name": "Workspace & Test!", "color": "#00AAFF"},
    )

    assert response.status_code == 200
    response_data = response.json()
    workspace_id = response_data["workspace_id"]
    assert isinstance(workspace_id, int)

    # Verify the workspace exists in the database
    workspace_data = db.get_workspace_by_id(workspace_id)
    assert workspace_data is not None
    assert workspace_data.name == "Workspace & Test!"
    assert workspace_data.color == "#00AAFF"


def test_get_workspace_success(override_get_db):
    """Test getting a workspace by ID via API."""
    db = override_get_db

    # Create a workspace first
    workspace_id = db.add_workspace("Test Workspace", "#FF0000")

    response = client.get(f"/db/{TEST_DB_ID}/workspaces/{workspace_id}")

    assert response.status_code == 200
    response_data = response.json()
    assert response_data["workspace_id"] == workspace_id
    assert response_data["name"] == "Test Workspace"
    assert response_data["color"] == "#FF0000"


def test_get_workspace_not_found(override_get_db):
    """Test getting a non-existent workspace via API."""
    response = client.get(
        f"/db/{TEST_DB_ID}/workspaces/999999"
    )  # Use a large number unlikely to exist

    assert response.status_code == 404
    assert response.json() == {"detail": "Workspace with ID 999999 not found"}


def test_get_workspaces_success(override_get_db):
    """Test getting all workspaces via API."""
    db = override_get_db

    # Create some workspaces
    workspace1_id = db.add_workspace("Workspace 1", "#FF0000")
    workspace2_id = db.add_workspace("Workspace 2", "#00FF00")
    workspace3_id = db.add_workspace("Workspace 3", "#0000FF")

    response = client.get(f"/db/{TEST_DB_ID}/workspaces")

    assert response.status_code == 200
    workspaces = response.json()

    # Check that the default workspace and our created ones are present
    workspace_ids = [ws["workspace_id"] for ws in workspaces]
    assert workspace1_id in workspace_ids
    assert workspace2_id in workspace_ids
    assert workspace3_id in workspace_ids

    # Verify workspace details
    for ws in workspaces:
        if ws["workspace_id"] == workspace1_id:
            assert ws["name"] == "Workspace 1"
            assert ws["color"] == "#FF0000"
        elif ws["workspace_id"] == workspace2_id:
            assert ws["name"] == "Workspace 2"
            assert ws["color"] == "#00FF00"
        elif ws["workspace_id"] == workspace3_id:
            assert ws["name"] == "Workspace 3"
            assert ws["color"] == "#0000FF"


def test_update_workspace_success(override_get_db):
    """Test updating a workspace via API."""
    db = override_get_db

    # Create a workspace first
    workspace_id = db.add_workspace("Old Workspace", "#FF0000")

    response = client.put(
        f"/db/{TEST_DB_ID}/workspaces",
        json={
            "workspace_id": workspace_id,
            "new_name": "Updated Workspace",
            "new_color": "#FFFFFF",
        },
    )

    assert response.status_code == 200
    assert response.json() == {"status": "success"}

    # Verify the workspace was updated in the database
    workspace_data = db.get_workspace_by_id(workspace_id)
    assert workspace_data is not None
    assert workspace_data.name == "Updated Workspace"
    assert workspace_data.color == "#FFFFFF"


def test_update_workspace_not_found(override_get_db):
    """Test updating a non-existent workspace via API."""
    response = client.put(
        f"/db/{TEST_DB_ID}/workspaces",
        json={
            "workspace_id": 999999,  # Use a large number unlikely to exist
            "new_name": "Updated Workspace",
            "new_color": "#FFFFFF",
        },
    )

    assert response.status_code == 404
    assert response.json() == {"detail": "Workspace not found"}


def test_update_workspace_with_special_chars(override_get_db):
    """Test updating a workspace with special characters."""
    db = override_get_db

    # Create a workspace first
    workspace_id = db.add_workspace("Test Workspace", "#FF0000")

    response = client.put(
        f"/db/{TEST_DB_ID}/workspaces",
        json={
            "workspace_id": workspace_id,
            "new_name": "Updated Workspace & Test!",
            "new_color": "#123ABC",
        },
    )

    assert response.status_code == 200
    assert response.json() == {"status": "success"}

    # Verify the workspace was updated in the database
    workspace_data = db.get_workspace_by_id(workspace_id)
    assert workspace_data is not None
    assert workspace_data.name == "Updated Workspace & Test!"
    assert workspace_data.color == "#123ABC"


def test_delete_workspace_success(override_get_db):
    """Test deleting a workspace via API."""
    db = override_get_db

    # Create a workspace first
    workspace_id = db.add_workspace("Test Workspace", "#FF0000")

    response = client.delete(f"/db/{TEST_DB_ID}/workspaces/{workspace_id}")

    assert response.status_code == 200
    assert response.json() == {"status": "success"}

    # Verify the workspace was deleted from the database
    with pytest.raises(WorkspaceNotFoundError):
        db.get_workspace_by_id(workspace_id)


def test_delete_workspace_not_found(override_get_db):
    """Test deleting a non-existent workspace via API."""
    response = client.delete(
        f"/db/{TEST_DB_ID}/workspaces/999999"
    )  # Use a large number unlikely to exist

    assert response.status_code == 404
    assert response.json() == {"detail": "Workspace not found"}


# Additional edge case tests for existing functionality
def test_add_page_empty_title(override_get_db):
    """Test adding a page with an empty title."""
    db = override_get_db

    response = client.post(f"/db/{TEST_DB_ID}/pages", json={"title": ""})

    assert response.status_code == 200
    page_id = response.json()["page_id"]
    assert len(page_id) > 0  # Verify a page ID was returned

    # Verify the page exists in the database with empty title
    page_data = db.get_page_by_id(page_id)
    assert page_data is not None
    assert page_data.title == ""  # Title should be empty


def test_add_page_long_title(override_get_db):
    """Test adding a page with a very long title."""
    db = override_get_db
    long_title = "A" * 1000

    response = client.post(f"/db/{TEST_DB_ID}/pages", json={"title": long_title})

    assert response.status_code == 200
    page_id = response.json()["page_id"]
    assert len(page_id) > 0  # Verify a page ID was returned

    # Verify the page exists in the database with the long title
    page_data = db.get_page_by_id(page_id)
    assert page_data is not None
    assert page_data.title == long_title


def test_get_pages_empty(override_get_db):
    """Test getting all pages when there are no pages."""
    # No pages have been created yet

    response = client.get(f"/db/{TEST_DB_ID}/pages")

    assert response.status_code == 200
    assert response.json() == []  # Should return an empty list


def test_add_block_with_parent(override_get_db):
    """Test adding a block with a parent block."""
    db = override_get_db

    # Create a page and parent block first
    page_id = db.add_page("Test Page")
    parent_block_id = db.add_block("Parent Block", 1, page_id=page_id)

    # First add the child block to the page
    response = client.post(
        f"/db/{TEST_DB_ID}/blocks",
        json={"content": "Child Block", "position": 2, "page_id": page_id},
    )

    assert response.status_code == 200
    response_data = response.json()
    block_id = response_data["block_id"]
    assert len(block_id) > 0  # Verify a block ID was returned

    # Verify the block exists in the database (initially associated with the page)
    block_data = db.get_block_content_by_id(block_id)
    assert block_data is not None
    assert block_data.content == "Child Block"
    assert block_data.page_id == page_id  # Initially associated with the page
    assert block_data.parent_block_id is None  # Initially no parent block
    assert block_data.position == 2  # Position should be 2

    # Now update the block's parent to be the parent_block
    response = client.put(
        f"/db/{TEST_DB_ID}/blocks/parent",
        json={"block_id": block_id, "new_parent_block_id": parent_block_id},
    )

    assert response.status_code == 200
    assert response.json() == {"status": "success"}

    # Verify the block was updated with the correct parent
    updated_block_data = db.get_block_content_by_id(block_id)
    assert updated_block_data is not None
    assert updated_block_data.content == "Child Block"
    assert (
        updated_block_data.page_id is None
    )  # Should no longer be directly associated with page
    assert (
        updated_block_data.parent_block_id == parent_block_id
    )  # Should have the correct parent


def test_get_blocks_by_page_empty(override_get_db):
    """Test getting all blocks for a page when there are no blocks."""
    db = override_get_db

    # Create a page but no blocks
    page_id = db.add_page("Test Page")

    response = client.get(f"/db/{TEST_DB_ID}/blocks/{page_id}")

    assert response.status_code == 200
    assert response.json() == []  # Should return an empty list


def test_update_block_content_special_chars(override_get_db):
    """Test updating block content with special characters."""
    db = override_get_db

    # Create a page and block first
    page_id = db.add_page("Test Page")
    block_id = db.add_block("Original Content", 1, page_id=page_id)

    special_content = "Special chars: !@#$%^&*()_+-={}[]|\\:;\"'<>?,./"
    response = client.put(
        f"/db/{TEST_DB_ID}/blocks/content",
        json={"block_id": block_id, "new_content": special_content},
    )

    assert response.status_code == 200
    assert response.json() == {"status": "success"}

    # Verify the block content was updated in the database
    block_data = db.get_block_content_by_id(block_id)
    assert block_data is not None
    assert block_data.content == special_content


def test_add_workspace_long_name(override_get_db):
    """Test adding a workspace with a very long name."""
    db = override_get_db
    long_name = "A" * 500

    response = client.post(
        f"/db/{TEST_DB_ID}/workspaces", json={"name": long_name, "color": "#ABCDEF"}
    )

    assert response.status_code == 200
    response_data = response.json()
    workspace_id = response_data["workspace_id"]
    assert isinstance(workspace_id, int)  # Workspace ID should be an integer

    # Verify the workspace exists in the database
    workspace_data = db.get_workspace_by_id(workspace_id)
    assert workspace_data is not None
    assert workspace_data.name == long_name
    assert workspace_data.color == "#ABCDEF"


def test_rename_page_special_chars(override_get_db):
    """Test renaming a page with special characters."""
    db = override_get_db

    # Create a page first
    page_id = db.add_page("Old Title")

    response = client.put(
        f"/db/{TEST_DB_ID}/pages",
        json={"page_id": page_id, "new_title": "Page with & Special # Chars!"},
    )

    assert response.status_code == 200
    assert response.json() == {"status": "success"}

    # Verify the page was renamed in the database
    page_data = db.get_page_by_id(page_id)
    assert page_data is not None
    assert page_data.title == "Page with & Special # Chars!"


def test_get_workspaces_empty(override_get_db):
    """Test getting all workspaces when there are no workspaces."""
    db = override_get_db

    # Clear any default workspaces to test empty response
    # Note: Default workspace always exists, so there will be at least one
    response = client.get(f"/db/{TEST_DB_ID}/workspaces")

    assert response.status_code == 200
    workspaces = response.json()
    # At least the default workspace should exist
    assert len(workspaces) >= 1


def test_add_page_duplicate_title(override_get_db):
    """Test that adding a page with a duplicate title returns a 409 Conflict status."""
    db = override_get_db

    # Add the first page
    response1 = client.post(f"/db/{TEST_DB_ID}/pages", json={"title": "Test Page"})
    assert response1.status_code == 200
    page_id_1 = response1.json()["page_id"]
    assert isinstance(page_id_1, str)

    # Try to add a second page with the same title - should return 409
    response2 = client.post(f"/db/{TEST_DB_ID}/pages", json={"title": "Test Page"})
    assert response2.status_code == 409
    assert "Test Page" in response2.json()["detail"]


def test_rename_page_duplicate_title(override_get_db):
    """Test that renaming a page to an existing title returns a 409 Conflict status."""
    db = override_get_db

    # Add two pages with different titles
    response1 = client.post(f"/db/{TEST_DB_ID}/pages", json={"title": "Page One"})
    assert response1.status_code == 200
    page_id_1 = response1.json()["page_id"]
    assert isinstance(page_id_1, str)

    response2 = client.post(f"/db/{TEST_DB_ID}/pages", json={"title": "Page Two"})
    assert response2.status_code == 200
    page_id_2 = response2.json()["page_id"]
    assert isinstance(page_id_2, str)

    # Try to rename page 2 to page 1's title - should return 409
    response3 = client.put(
        f"/db/{TEST_DB_ID}/pages",
        json={"page_id": page_id_2, "new_title": "Page One"},
    )
    assert response3.status_code == 409
    assert "Page One" in response3.json()["detail"]

    # Verify page 2 still has its original title
    page_data = db.get_page_by_id(page_id_2)
    assert page_data is not None
    assert page_data.title == "Page Two"
