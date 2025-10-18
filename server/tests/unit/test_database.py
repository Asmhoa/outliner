import pytest
from outliner_api_server.data import Database


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
    assert isinstance(page_id, int)
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
    result = db.rename_page(999, "New Title")
    assert result is False


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
    assert isinstance(block_id, int)
    cursor = db.conn.cursor()
    cursor.execute("SELECT content FROM blocks WHERE block_id = ?", (block_id,))
    assert cursor.fetchone()[0] == "Test Block"


def test_add_block_to_block(db):
    """Test adding a block as a child of another block."""
    page_id = db.add_page("Test Page")
    parent_block_id = db.add_block("Parent Block", 1, page_id=page_id)
    child_block_id = db.add_block("Child Block", 1, parent_block_id=parent_block_id)
    assert isinstance(child_block_id, int)
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
