import os
import logging
from sqlite3 import IntegrityError

from outliner_api_server.db.base_db import BaseDatabase
from outliner_api_server.db.errors import (
    UserDatabaseAlreadyExistsError,
    UserDatabaseNotFoundError,
)
from outliner_api_server.db.models import UserDatabaseModel

logger = logging.getLogger(__name__)


class SystemDatabase(BaseDatabase):
    """
    SystemDatabase manages the list of UserDatabases available to the application.
    It maintains a table of database names and their corresponding file paths.
    """

    def __init__(self) -> None:
        """
        Initialize the SystemDatabase.

        The path to the system database file is determined in the following order:
        1. OUTLINER_SYS_DB_PATH environment variable
        2. A 'system.db' file in the same directory as this module.
        """
        current_dir = os.path.dirname(os.path.realpath(__file__))
        parent_dir = os.path.dirname(current_dir)

        # Define the directory for user databases
        self.databases_dir = os.path.join(parent_dir, "databases")

        db_path = os.environ.get("OUTLINER_SYS_DB_PATH")
        if db_path is None:
            db_path = os.path.join(self.databases_dir, "system.db")

        os.makedirs(self.databases_dir, exist_ok=True)

        super().__init__(db_path)

    def initialize_tables(self) -> None:
        """Create the system tables if they don't exist."""
        with self.single_use_cursor() as cursor:
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS user_databases (
                    id INTEGER PRIMARY KEY,
                    name TEXT UNIQUE NOT NULL,
                    path TEXT UNIQUE NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """
            )
        self.conn.commit()
        logger.debug(
            f"Table 'user_databases' created or already exists in '{self.db_path}'."
        )

    def add_user_database(self, name: str) -> None:
        """
        Add a new UserDatabase entry.

        Args:
            name: The name of the user database

        Raises:
            UserDatabaseAlreadyExistsError: If the database name already exists.
        """
        # TODO: maybe allow full paths later?
        try:
            path = name.lower().replace(" ", "_") + ".db"
            sanitized_path = (
                path.lower().replace("/", "_").replace("\\", "_").replace("..", "_")
            )
            full_path = os.path.join(self.databases_dir, sanitized_path)
            with self.single_use_cursor() as cursor:
                cursor.execute(
                    "INSERT INTO user_databases (name, path) VALUES (?, ?)",
                    (name, full_path),
                )
            self.conn.commit()
            logger.debug(
                f"User database '{name}' with path '{full_path}' added successfully."
            )
        except IntegrityError as e:
            logger.warning(f"Failed to add user database '{name}': {str(e)}")
            raise UserDatabaseAlreadyExistsError(f"Database '{name}' already exists.")

    def get_user_database_by_name(self, name: str) -> UserDatabaseModel:
        """
        Get a UserDatabase by name.

        Args:
            name: The name of the user database

        Returns:
            Dictionary with 'id', 'name', 'path', 'created_at' if found

        Raises:
            UserDatabaseNotFoundError: If the database is not found.
        """
        with self.single_use_cursor() as cursor:
            cursor.execute(
                "SELECT id, name, path, created_at FROM user_databases WHERE name = ?",
                (name,),
            )
            row = cursor.fetchone()
        if row:
            return UserDatabaseModel(**row)
        raise UserDatabaseNotFoundError(f"Database '{name}' not found.")

    def get_user_database_by_path(self, path: str) -> UserDatabaseModel:
        """
        Get a UserDatabase by path.

        Args:
            path: The file path of the user database

        Returns:
            Dictionary with 'id', 'name', 'path', 'created_at' if found

        Raises:
            UserDatabaseNotFoundError: If the database is not found.
        """
        with self.single_use_cursor() as cursor:
            cursor.execute(
                "SELECT id, name, path, created_at FROM user_databases WHERE path = ?",
                (path,),
            )
            row = cursor.fetchone()
        if row:
            return UserDatabaseModel(**row)
        raise UserDatabaseNotFoundError(f"Database with path '{path}' not found.")

    def get_all_user_databases(self) -> list[UserDatabaseModel]:
        """
        Get all UserDatabases.

        Returns:
            List of dictionaries with 'id', 'name', 'path', 'created_at'
        """
        with self.single_use_cursor() as cursor:
            cursor.execute("SELECT id, name, path, created_at FROM user_databases")
            rows = cursor.fetchall()
        return [UserDatabaseModel(**row) for row in rows]

    def update_user_database(
        self, name: str, new_path: str = None, new_name: str = None
    ) -> None:
        """
        Update a UserDatabase.

        Args:
            name: The current name of the user database
            new_path: The new path (optional)
            new_name: The new name (optional)

        Raises:
            UserDatabaseNotFoundError: If the database to update is not found.
            UserDatabaseAlreadyExistsError: If the new name already exists.
        """
        if new_path is None and new_name is None:
            return

        if new_name is not None:
            try:
                existing = self.get_user_database_by_name(new_name)
                if existing.name != name:
                    raise UserDatabaseAlreadyExistsError(
                        f"Cannot update database '{name}' to '{new_name}': name already exists"
                    )
            except UserDatabaseNotFoundError:
                pass  # New name doesn't exist, which is good

        update_fields = []
        params = []

        if new_path is not None:
            update_fields.append("path = ?")
            params.append(new_path)

        if new_name is not None:
            update_fields.append("name = ?")
            params.append(new_name)

        if not update_fields:
            return

        params.append(name)

        try:
            rows_affected = 0
            with self.single_use_cursor() as cursor:
                cursor.execute(
                    f"UPDATE user_databases SET {', '.join(update_fields)} WHERE name = ?",
                    params,
                )
                rows_affected = cursor.rowcount
            self.conn.commit()
            if rows_affected == 0:
                raise UserDatabaseNotFoundError(f"User database '{name}' not found.")
            logger.debug(f"User database '{name}' updated.")
        except IntegrityError as e:
            logger.error(f"Failed to update user database '{name}': {str(e)}")
            raise UserDatabaseAlreadyExistsError(
                f"Database '{new_name or name}' already exists."
            )

    def delete_user_database(self, name: str) -> None:
        """
        Delete a UserDatabase.

        Args:
            name: The name of the user database to delete

        Raises:
            UserDatabaseNotFoundError: If the database to delete is not found.
        """
        rows_affected = 0
        with self.single_use_cursor() as cursor:
            cursor.execute("DELETE FROM user_databases WHERE name = ?", (name,))
            rows_affected = cursor.rowcount
        self.conn.commit()
        if rows_affected == 0:
            raise UserDatabaseNotFoundError(f"User database '{name}' not found.")
        logger.debug(f"User database '{name}' deleted successfully.")
