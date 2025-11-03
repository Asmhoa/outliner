import pytest
from outliner_api_server.db.sysdb import SystemDatabase
from outliner_api_server.db.userdb import UserDatabase
import os


@pytest.fixture
def sys_db():
    """Set up a new system database for each test."""
    db = SystemDatabase()
    yield db
    db.close_conn()
    os.remove(db.db_path)


def test_add_and_load_user_database(sys_db):
    """Test that a new user database can be added and loaded."""
    sys_db.add_user_database("test_db")
    db_info = sys_db.get_user_database_by_name("test_db")
    user_db = UserDatabase(db_info.path)

    # Check that the tables were created
    cursor = user_db.conn.cursor()
    cursor.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='workspaces'"
    )
    assert cursor.fetchone() is not None
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='pages'")
    assert cursor.fetchone() is not None
    cursor.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='blocks'"
    )
    assert cursor.fetchone() is not None

    # Check that the default workspace exists
    cursor.execute("SELECT COUNT(*) FROM workspaces")
    assert cursor.fetchone()[0] == 1

    user_db.close_conn()
    os.remove(db_info.path)
