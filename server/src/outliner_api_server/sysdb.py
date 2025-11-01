import os
import logging
from sqlite3 import connect, Cursor, Connection, IntegrityError

from outliner_api_server.errors import (
    UserDatabaseAlreadyExistsError,
    UserDatabaseNotFoundError,
)

logger = logging.getLogger(__name__)


class SystemDatabase:
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
        self.db_path = os.environ.get("OUTLINER_SYS_DB_PATH")
        if self.db_path is None:
            self.db_path = os.path.join(current_dir, "system.db")

        # Define the directory for user databases
        self.databases_dir = os.path.join(current_dir, "databases")
        os.makedirs(self.databases_dir, exist_ok=True)

        # Use check_same_thread=False since we'll have different threads accessing
        # the database in a web server context
        self.conn: Connection = connect(self.db_path, check_same_thread=False)
        self.cursor: Cursor = self.conn.cursor()
        self.cursor.execute("PRAGMA foreign_keys = ON")
        logger.debug(f"System database connection established to '{self.db_path}'.")
        self._create_system_tables()

    def close_conn(self) -> None:
        """Close the database connection."""
        self.conn.close()
        logger.debug(f"System database connection to '{self.db_path}' closed.")

    def _create_system_tables(self) -> None:
        """Create the system tables if they don't exist."""
        self.cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS user_databases (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL,
                path TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """
        )
        self.conn.commit()
        logger.debug(
            f"Table 'user_databases' created or already exists in '{self.db_path}'."
        )

    def add_user_database(self, name: str, path: str) -> None:
        """
        Add a new UserDatabase entry.

        Args:
            name: The name of the user database
            path: The file path to the user database (will be sanitized and made relative to databases dir if not absolute)

        Raises:
            UserDatabaseAlreadyExistsError: If the database name already exists.
        """
        try:
            # Check if path is already an absolute path before sanitizing
            if os.path.isabs(path):
                # For absolute paths, sanitize the path to ensure it's safe
                sanitized_path = (
                    path.replace("/", "_").replace("\\", "_").replace("..", "_")
                )
                full_path = sanitized_path
            else:
                # For relative paths, sanitize after prepending with databases directory
                sanitized_path = (
                    path.replace("/", "_").replace("\\", "_").replace("..", "_")
                )
                # If it's a relative path, prepend with databases directory
                full_path = os.path.join(self.databases_dir, sanitized_path)
            self.cursor.execute(
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

    def get_user_database_by_name(self, name: str) -> dict:
        """
        Get a UserDatabase by name.

        Args:
            name: The name of the user database

        Returns:
            Dictionary with 'id', 'name', 'path', 'created_at' if found

        Raises:
            UserDatabaseNotFoundError: If the database is not found.
        """
        self.cursor.execute(
            "SELECT id, name, path, created_at FROM user_databases WHERE name = ?",
            (name,),
        )
        row = self.cursor.fetchone()
        if row:
            return {"id": row[0], "name": row[1], "path": row[2], "created_at": row[3]}
        raise UserDatabaseNotFoundError(f"Database '{name}' not found.")

    def get_user_database_by_path(self, path: str) -> dict:
        """
        Get a UserDatabase by path.

        Args:
            path: The file path of the user database

        Returns:
            Dictionary with 'id', 'name', 'path', 'created_at' if found

        Raises:
            UserDatabaseNotFoundError: If the database is not found.
        """
        self.cursor.execute(
            "SELECT id, name, path, created_at FROM user_databases WHERE path = ?",
            (path,),
        )
        row = self.cursor.fetchone()
        if row:
            return {"id": row[0], "name": row[1], "path": row[2], "created_at": row[3]}
        raise UserDatabaseNotFoundError(f"Database with path '{path}' not found.")

    def get_all_user_databases(self) -> list:
        """
        Get all UserDatabases.

        Returns:
            List of dictionaries with 'id', 'name', 'path', 'created_at'
        """
        cursor = self.conn.cursor()
        cursor.execute("SELECT id, name, path, created_at FROM user_databases")
        rows = cursor.fetchall()
        return [
            {"id": row[0], "name": row[1], "path": row[2], "created_at": row[3]}
            for row in rows
        ]

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
                if existing["name"] != name:
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
            self.cursor.execute(
                f"UPDATE user_databases SET {', '.join(update_fields)} WHERE name = ?",
                params,
            )
            self.conn.commit()
            if self.cursor.rowcount == 0:
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
        self.cursor.execute("DELETE FROM user_databases WHERE name = ?", (name,))
        self.conn.commit()
        if self.cursor.rowcount == 0:
            raise UserDatabaseNotFoundError(f"User database '{name}' not found.")
        logger.debug(f"User database '{name}' deleted successfully.")
