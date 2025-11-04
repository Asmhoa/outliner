import pytest
from outliner_api_server.db.sysdb import SystemDatabase
from outliner_api_server.db.userdb import UserDatabase
from outliner_api_server.db.errors import UserDatabaseAlreadyExistsError, UserDatabaseNotFoundError
import os
import tempfile

@pytest.fixture
def sys_db():
    """Set up a new system database for each test."""
    db = SystemDatabase()
    db.db_path = ":memory:"
    db.conn = db.new_connection()
    db.initialize_tables()
    yield db
    db.close_conn()


def test_add_and_load_user_database(sys_db):
    """Test that a new user database can be added and loaded."""
    with tempfile.NamedTemporaryFile(suffix=".db") as tmp:
        sys_db.add_user_database("test_db")
        db_info = sys_db.get_user_database_by_name("test_db")
        db_info_by_id = sys_db.get_user_database_by_id(db_info.id)
        assert db_info_by_id.name == "test_db"

        # The path is sanitized, so we need to get the path from the db_info
        user_db = UserDatabase(tmp.name)

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


def test_add_user_database_already_exists(sys_db):
    """Test that adding a database with a name that already exists raises an error."""
    sys_db.add_user_database("test_db")
    with pytest.raises(UserDatabaseAlreadyExistsError):
        sys_db.add_user_database("test_db")


def test_get_user_database_by_id_not_found(sys_db):
    """Test that getting a database that doesn't exist raises an error."""
    with pytest.raises(UserDatabaseNotFoundError):
        sys_db.get_user_database_by_id("non_existent_db")


def test_get_user_database_by_path(sys_db):
    """Test that a database can be retrieved by path."""
    sys_db.add_user_database("test_db")
    db_info = sys_db.get_user_database_by_name("test_db")
    retrieved_db_info = sys_db.get_user_database_by_path(db_info.path)
    assert retrieved_db_info.name == "test_db"


def test_get_user_database_by_path_not_found(sys_db):
    """Test that getting a database by path that doesn't exist raises an error."""
    with pytest.raises(UserDatabaseNotFoundError):
        sys_db.get_user_database_by_path("/non/existent/path.db")


def test_get_all_user_databases(sys_db):
    """Test that all user databases can be retrieved."""
    assert sys_db.get_all_user_databases() == []
    sys_db.add_user_database("test_db1")
    sys_db.add_user_database("test_db2")
    dbs = sys_db.get_all_user_databases()
    assert len(dbs) == 2
    assert dbs[0].name == "test_db1"
    assert dbs[1].name == "test_db2"


def test_update_user_database(sys_db):
    """Test updating a user database."""
    sys_db.add_user_database("test_db")
    db_info = sys_db.get_user_database_by_name("test_db")

    # Test updating the name
    sys_db.update_user_database(db_info.id, new_name="new_test_db")
    updated_db_info = sys_db.get_user_database_by_id(db_info.id)
    assert updated_db_info.name == "new_test_db"
    assert updated_db_info.path == db_info.path

    # Test updating the path
    sys_db.update_user_database(db_info.id, new_path="/new/path.db")
    updated_db_info = sys_db.get_user_database_by_id(db_info.id)
    assert updated_db_info.path == "/new/path.db"

    # Test updating both
    sys_db.update_user_database(db_info.id, new_name="another_db", new_path="/another/path.db")
    updated_db_info = sys_db.get_user_database_by_id(db_info.id)
    assert updated_db_info.name == "another_db"
    assert updated_db_info.path == "/another/path.db"


def test_update_user_database_not_found(sys_db):
    """Test that updating a database that doesn't exist raises an error."""
    with pytest.raises(UserDatabaseNotFoundError):
        sys_db.update_user_database("non_existent_db_id", new_name="new_name")


def test_update_user_database_already_exists(sys_db):
    """Test that updating a database to a name that already exists raises an error."""
    sys_db.add_user_database("test_db1")
    sys_db.add_user_database("test_db2")
    db1_info = sys_db.get_user_database_by_name("test_db1")
    with pytest.raises(UserDatabaseAlreadyExistsError):
        sys_db.update_user_database(db1_info.id, new_name="test_db2")
    

def test_update_user_database_no_changes(sys_db):
    """Test that nothing happens when updating a database with no new data."""
    sys_db.add_user_database("test_db")
    db_info = sys_db.get_user_database_by_name("test_db")
    sys_db.update_user_database(db_info.id)
    updated_db_info = sys_db.get_user_database_by_id(db_info.id)
    assert db_info.path == updated_db_info.path


def test_delete_user_database(sys_db):


    """Test that a user database can be deleted."""


    sys_db.add_user_database("test_db")


    db_info = sys_db.get_user_database_by_name("test_db")


    sys_db.delete_user_database(db_info.id)


    with pytest.raises(UserDatabaseNotFoundError):


        sys_db.get_user_database_by_id(db_info.id)


def test_delete_user_database_not_found(sys_db):
    """Test that deleting a database that doesn't exist raises an error."""
    with pytest.raises(UserDatabaseNotFoundError):
        sys_db.delete_user_database("non_existent_db_id")