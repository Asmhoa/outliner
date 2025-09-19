import pytest
from src.data import Database

@pytest.fixture
def db():
    """Set up a new database for each test."""
    database = Database(':memory:')
    database.create_new_database()
    yield database
    database.close_conn()

def test_create_new_database(db):
    """Test if tables are created."""
    cursor = db.conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='pages'")
    assert cursor.fetchone() is not None
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='blocks'")
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
    cursor.execute("SELECT parent_block_id FROM blocks WHERE block_id = ?", (child_block_id,))
    assert cursor.fetchone()[0] == parent_block_id

def test_add_block_with_both_page_and_parent(db):
    """Test that adding a block with both page_id and parent_block_id returns None."""
    page_id = db.add_page("Test Page")
    parent_block_id = db.add_block("Parent Block", 1, page_id=page_id)
    block_id = db.add_block("Test Block", 1, page_id=page_id, parent_block_id=parent_block_id)
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