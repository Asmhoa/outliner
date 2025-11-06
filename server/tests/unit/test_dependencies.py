import pytest
from unittest.mock import MagicMock, patch
from datetime import datetime
from fastapi import HTTPException
from outliner_api_server.routers.dependencies import get_sys_db, get_db
from outliner_api_server.db.sysdb import SystemDatabase
from outliner_api_server.db.errors import UserDatabaseNotFoundError
from outliner_api_server.db.models import UserDatabaseModel


def test_get_sys_db():
    """
    Test the get_sys_db dependency.
    """
    with patch("outliner_api_server.routers.dependencies.SystemDatabase") as mock_sys_db_class:
        mock_sys_db_instance = MagicMock()
        mock_sys_db_class.return_value = mock_sys_db_instance

        dep = get_sys_db()
        db_instance = next(dep)

        assert db_instance == mock_sys_db_instance
        mock_sys_db_class.assert_called_once()

        # Ensure the connection is closed
        with pytest.raises(StopIteration):
            next(dep)
        mock_sys_db_instance.close_conn.assert_called_once()


def test_get_db_success():
    """
    Test the get_db dependency for a successful database lookup.
    """
    mock_sys_db = MagicMock(spec=SystemDatabase)
    db_info = UserDatabaseModel(id="a1b2c3d4-e5f6-7890-abcd-ef1234567890", name="test_db", path="/test/db.sqlite", created_at=datetime.now())
    mock_sys_db.get_user_database_by_id.return_value = db_info

    with patch("outliner_api_server.routers.dependencies.UserDatabase") as mock_user_db_class:
        mock_user_db_instance = MagicMock()
        mock_user_db_class.return_value = mock_user_db_instance

        dep = get_db("1", mock_sys_db)
        db_instance = next(dep)

        assert db_instance == mock_user_db_instance
        mock_sys_db.get_user_database_by_id.assert_called_once_with("1")
        mock_user_db_class.assert_called_once_with("/test/db.sqlite")

        # Ensure the connection is closed
        with pytest.raises(StopIteration):
            next(dep)
        mock_user_db_instance.close_conn.assert_called_once()


def test_get_db_not_found():
    """
    Test the get_db dependency for a database that is not found.
    """
    mock_sys_db = MagicMock(spec=SystemDatabase)
    mock_sys_db.get_user_database_by_id.side_effect = UserDatabaseNotFoundError

    with pytest.raises(HTTPException) as exc_info:
        dep = get_db("non_existent_db_id", mock_sys_db)
        next(dep)

    assert exc_info.value.status_code == 404
    assert "Database with id 'non_existent_db_id' not found" in exc_info.value.detail
    mock_sys_db.get_user_database_by_id.assert_called_once_with("non_existent_db_id")
