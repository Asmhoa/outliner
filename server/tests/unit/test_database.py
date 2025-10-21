import pytest
from outliner_api_server.data import Database, PageNotFoundError, PageAlreadyExistsError


@pytest.fixture
def db():
    """Set up a new database for each test."""
    database = Database(":memory:")
    database.create_new_database()
    yield database
    database.close_conn()


def test_create_new_database(db):
    """Test if tables are created."""
    cursor = db.conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='pages'")
    assert cursor.fetchone() is not None
    cursor.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='blocks'"
    )
    assert cursor.fetchone() is not None


def test_add_page(db):
    """Test adding a new page."""
    page_id = db.add_page("Test Page")
    assert isinstance(page_id, str)
    cursor = db.conn.cursor()
    cursor.execute("SELECT title FROM pages WHERE page_id = ?", (page_id,))
    assert cursor.fetchone()[0] == "Test Page"


def test_rename_page(db):
    """Test renaming a page."""
    page_id = db.add_page("Old Title")
    result = db.rename_page(page_id, "New Title")
    assert result is True
    cursor = db.conn.cursor()
    cursor.execute("SELECT title FROM pages WHERE page_id = ?", (page_id,))
    assert cursor.fetchone()[0] == "New Title"


def test_rename_nonexistent_page(db):
    """Test renaming a non-existent page."""
    with pytest.raises(PageNotFoundError):
        db.rename_page(999, "New Title")


def test_add_page_duplicate_title(db):
    """Test that adding a page with a duplicate title raises an error."""
    # Add the first page
    page_id_1 = db.add_page("Test Page")
    assert isinstance(page_id_1, str)
    
    # Try to add a second page with the same title - should raise PageAlreadyExistsError
    with pytest.raises(PageAlreadyExistsError, match="Page with title 'Test Page' already exists"):
        db.add_page("Test Page")
    
    # Verify only one page exists in the database
    cursor = db.conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM pages")
    count = cursor.fetchone()[0]
    assert count == 1


def test_rename_page_duplicate_title(db):
    """Test that renaming a page to an existing title raises an error."""
    # Add two pages with different titles
    page_id_1 = db.add_page("Page One")
    page_id_2 = db.add_page("Page Two")
    
    # Try to rename page 2 to page 1's title - should raise PageAlreadyExistsError
    with pytest.raises(PageAlreadyExistsError, match="Page with title 'Page One' already exists"):
        db.rename_page(page_id_2, "Page One")
    
    # Verify page 2 still has its original title
    cursor = db.conn.cursor()
    cursor.execute("SELECT title FROM pages WHERE page_id = ?", (page_id_2,))
    assert cursor.fetchone()[0] == "Page Two"
    
    # Verify page 1 still has its original title
    cursor.execute("SELECT title FROM pages WHERE page_id = ?", (page_id_1,))
    assert cursor.fetchone()[0] == "Page One"


def test_delete_page(db):
    """Test deleting a page."""
    page_id = db.add_page("Test Page")
    result = db.delete_page(page_id)
    assert result is True
    cursor = db.conn.cursor()
    cursor.execute("SELECT * FROM pages WHERE page_id = ?", (page_id,))
    assert cursor.fetchone() is None


def test_delete_nonexistent_page(db):
    """Test deleting a non-existent page."""
    result = db.delete_page(999)
    assert result is False


def test_add_block_to_page(db):
    """Test adding a block to a page."""
    page_id = db.add_page("Test Page")
    block_id = db.add_block("Test Block", 1, page_id=page_id)
    assert isinstance(block_id, str)
    cursor = db.conn.cursor()
    cursor.execute("SELECT content FROM blocks WHERE block_id = ?", (block_id,))
    assert cursor.fetchone()[0] == "Test Block"


def test_add_block_to_block(db):
    """Test adding a block as a child of another block."""
    page_id = db.add_page("Test Page")
    parent_block_id = db.add_block("Parent Block", 1, page_id=page_id)
    child_block_id = db.add_block("Child Block", 1, parent_block_id=parent_block_id)
    assert isinstance(child_block_id, str)
    cursor = db.conn.cursor()
    cursor.execute("SELECT content FROM blocks WHERE block_id = ?", (child_block_id,))
    assert cursor.fetchone()[0] == "Child Block"
    cursor.execute(
        "SELECT parent_block_id FROM blocks WHERE block_id = ?", (child_block_id,)
    )
    assert cursor.fetchone()[0] == parent_block_id


def test_add_block_with_both_page_and_parent(db):
    """Test that adding a block with both page_id and parent_block_id returns None."""
    page_id = db.add_page("Test Page")
    parent_block_id = db.add_block("Parent Block", 1, page_id=page_id)
    block_id = db.add_block(
        "Test Block", 1, page_id=page_id, parent_block_id=parent_block_id
    )
    assert block_id is None


def test_delete_block(db):
    """Test deleting a block."""
    page_id = db.add_page("Test Page")
    block_id = db.add_block("Test Block", 1, page_id=page_id)
    result = db.delete_block(block_id)
    assert result is True
    cursor = db.conn.cursor()
    cursor.execute("SELECT * FROM blocks WHERE block_id = ?", (block_id,))
    assert cursor.fetchone() is None


def test_delete_nonexistent_block(db):
    """Test deleting a non-existent block."""
    result = db.delete_block(999)
    assert result is False


def test_delete_page_cascades_to_blocks(db):
    """Test that deleting a page also deletes its blocks."""
    page_id = db.add_page("Test Page")
    block_id = db.add_block("Test Block", 1, page_id=page_id)
    db.delete_page(page_id)
    cursor = db.conn.cursor()
    cursor.execute("SELECT * FROM blocks WHERE block_id = ?", (block_id,))
    assert cursor.fetchone() is None


def test_delete_block_cascades_to_child_blocks(db):
    """Test that deleting a block also deletes its child blocks."""
    page_id = db.add_page("Test Page")
    parent_block_id = db.add_block("Parent Block", 1, page_id=page_id)
    child_block_id = db.add_block("Child Block", 1, parent_block_id=parent_block_id)
    db.delete_block(parent_block_id)
    cursor = db.conn.cursor()
    cursor.execute("SELECT * FROM blocks WHERE block_id = ?", (child_block_id,))
    assert cursor.fetchone() is None


def test_update_block_content(db):
    """Test updating the content of a block."""
    page_id = db.add_page("Test Page")
    block_id = db.add_block("Original Content", 1, page_id=page_id)
    result = db.update_block_content(block_id, "New Content")
    assert result is True
    cursor = db.conn.cursor()
    cursor.execute("SELECT content FROM blocks WHERE block_id = ?", (block_id,))
    assert cursor.fetchone()[0] == "New Content"


def test_update_block_content_nonexistent_block(db):
    """Test updating content of a non-existent block."""
    result = db.update_block_content(999, "New Content")
    assert result is False


def test_update_block_parent_to_new_page(db):
    """Test updating a block's parent to a different page."""
    page_id_1 = db.add_page("Page One")
    page_id_2 = db.add_page("Page Two")
    block_id = db.add_block("Block on Page One", 1, page_id=page_id_1)
    result = db.update_block_parent(block_id, new_page_id=page_id_2)
    assert result is True
    cursor = db.conn.cursor()
    cursor.execute(
        "SELECT page_id, parent_block_id FROM blocks WHERE block_id = ?", (block_id,)
    )
    page_id, parent_block_id = cursor.fetchone()
    assert page_id == page_id_2
    assert parent_block_id is None


def test_update_block_parent_to_new_parent_block(db):
    """Test updating a block's parent to a different block."""
    page_id = db.add_page("Test Page")
    parent_block_id_1 = db.add_block("Parent Block One", 1, page_id=page_id)
    parent_block_id_2 = db.add_block("Parent Block Two", 2, page_id=page_id)
    block_id = db.add_block("Child Block", 1, parent_block_id=parent_block_id_1)
    result = db.update_block_parent(block_id, new_parent_block_id=parent_block_id_2)
    assert result is True
    cursor = db.conn.cursor()
    cursor.execute(
        "SELECT page_id, parent_block_id FROM blocks WHERE block_id = ?", (block_id,)
    )
    page_id, parent_block_id = cursor.fetchone()
    assert page_id is None
    assert parent_block_id == parent_block_id_2


def test_update_block_parent_from_page_to_block(db):
    """Test moving a block from a page to be a child of another block."""
    page_id = db.add_page("Test Page")
    parent_block_id = db.add_block("Parent Block", 1, page_id=page_id)
    block_id = db.add_block("Block on Page", 1, page_id=page_id)
    result = db.update_block_parent(block_id, new_parent_block_id=parent_block_id)
    assert result is True
    cursor = db.conn.cursor()
    cursor.execute(
        "SELECT page_id, parent_block_id FROM blocks WHERE block_id = ?", (block_id,)
    )
    page_id, parent_block_id_from_db = cursor.fetchone()
    assert page_id is None
    assert parent_block_id_from_db == parent_block_id


def test_update_block_parent_from_block_to_page(db):
    """Test moving a block from a parent block to be directly under a page."""
    page_id_1 = db.add_page("Page One")
    page_id_2 = db.add_page("Page Two")
    parent_block_id = db.add_block("Parent Block", 1, page_id=page_id_1)
    block_id = db.add_block("Child Block", 1, parent_block_id=parent_block_id)
    result = db.update_block_parent(block_id, new_page_id=page_id_2)
    assert result is True
    cursor = db.conn.cursor()
    cursor.execute(
        "SELECT page_id, parent_block_id FROM blocks WHERE block_id = ?", (block_id,)
    )
    page_id_from_db, parent_block_id_from_db = cursor.fetchone()
    assert page_id_from_db == page_id_2
    assert parent_block_id_from_db is None


def test_update_block_parent_with_both_params(db):
    """Test that updating a block's parent with both page_id and parent_block_id returns False."""
    page_id = db.add_page("Test Page")
    block_id = db.add_block("Test Block", 1, page_id=page_id)
    result = db.update_block_parent(
        block_id, new_page_id=page_id, new_parent_block_id=block_id
    )
    assert result is False


def test_update_block_parent_with_neither_params(db):
    """Test that updating a block's parent with neither page_id nor parent_block_id returns False."""
    page_id = db.add_page("Test Page")
    block_id = db.add_block("Test Block", 1, page_id=page_id)
    result = db.update_block_parent(block_id)
    assert result is False


def test_update_block_parent_nonexistent_block(db):
    """Test updating parent of a non-existent block."""
    page_id = db.add_page("Test Page")
    result = db.update_block_parent(999, new_page_id=page_id)
    assert result is False


def test_add_workspace(db):
    """Test adding a new workspace."""
    workspace_id = db.add_workspace("Test Workspace", "#FF0000")
    assert isinstance(workspace_id, int)
    cursor = db.conn.cursor()
    cursor.execute(
        "SELECT name, color FROM workspaces WHERE workspace_id = ?", (workspace_id,)
    )
    title, color = cursor.fetchone()
    assert title == "Test Workspace"
    assert color == b"\xff\x00\x00"


def test_get_workspace_by_id(db):
    """Test retrieving a workspace by its ID."""
    workspace_id = db.add_workspace("Test Workspace", "#00FF00")
    workspace = db.get_workspace_by_id(workspace_id)
    assert workspace[0] == workspace_id
    assert workspace[1] == "Test Workspace"
    assert workspace[2] == "#00FF00"


def test_get_workspaces(db):
    """Test retrieving all workspaces."""
    db.add_workspace("Workspace 1", "#FF0000")
    db.add_workspace("Workspace 2", "#00FF00")
    workspaces = db.get_workspaces()
    assert len(workspaces) == 3  # Including default workspace
    assert workspaces[1][1] == "Workspace 1"
    assert workspaces[1][2] == "#FF0000"
    assert workspaces[2][1] == "Workspace 2"
    assert workspaces[2][2] == "#00FF00"


def test_update_workspace(db):
    """Test updating an existing workspace."""
    workspace_id = db.add_workspace("Old Title", "#FF0000")
    result = db.update_workspace(workspace_id, "New Title", "#0000FF")
    assert result is True
    workspace = db.get_workspace_by_id(workspace_id)
    assert workspace[1] == "New Title"
    assert workspace[2] == "#0000FF"


def test_update_nonexistent_workspace(db):
    """Test updating a non-existent workspace."""
    result = db.update_workspace(999, "New Title", "#0000FF")
    assert result is False


def test_delete_workspace(db):
    """Test deleting a workspace."""
    workspace_id = db.add_workspace("Test Workspace", "#FF0000")
    result = db.delete_workspace(workspace_id)
    assert result is True
    workspace = db.get_workspace_by_id(workspace_id)
    assert workspace is None


def test_delete_nonexistent_workspace(db):
    """Test deleting a non-existent workspace."""
    result = db.delete_workspace(999)
    assert result is False
