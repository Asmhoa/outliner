import os
import logging
from sqlite3 import connect, Cursor, Connection

logger = logging.getLogger(__name__)

class SystemDatabase:
    """
    SystemDatabase manages the list of UserDatabases available to the application.
    It maintains a table of database names and their corresponding file paths.
    """
    
    def __init__(self, db_path: str = None) -> None:
        """
        Initialize the SystemDatabase.
        
        Args:
            db_path: Path to the system database file. If None, defaults to a system.db file
                     in the same directory as this module.
        """
        if db_path is None:
            current_dir = os.path.dirname(os.path.realpath(__file__))
            db_path = os.path.join(current_dir, "system.db")
        
        self.db_path = db_path
        # Use check_same_thread=False since we'll have different threads accessing 
        # the database in a web server context
        self.conn: Connection = connect(self.db_path, check_same_thread=False)
        self.cursor: Cursor = self.conn.cursor()
        self.cursor.execute("PRAGMA foreign_keys = ON")
        self._create_system_tables()
        logger.debug(f"System database connection established to '{self.db_path}'.")
    
    def close_conn(self) -> None:
        """Close the database connection."""
        self.conn.close()
        logger.debug(f"System database connection to '{self.db_path}' closed.")
    
    def _create_system_tables(self) -> None:
        """Create the system tables if they don't exist."""
        self.cursor.execute("""
            CREATE TABLE IF NOT EXISTS user_databases (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL,
                path TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        self.conn.commit()
        logger.debug(f"Table 'user_databases' created or already exists in '{self.db_path}'.")
    
    def add_user_database(self, name: str, path: str) -> bool:
        """
        Add a new UserDatabase entry.
        
        Args:
            name: The name of the user database
            path: The file path to the user database
            
        Returns:
            True if successfully added, False if name already exists
        """
        try:
            self.cursor.execute(
                "INSERT INTO user_databases (name, path) VALUES (?, ?)",
                (name, path)
            )
            self.conn.commit()
            logger.debug(f"User database '{name}' with path '{path}' added successfully.")
            return True
        except Exception as e:
            logger.warning(f"Failed to add user database '{name}': {str(e)}")
            return False
    
    def get_user_database_by_name(self, name: str) -> dict | None:
        """
        Get a UserDatabase by name.
        
        Args:
            name: The name of the user database
            
        Returns:
            Dictionary with 'id', 'name', 'path', 'created_at' if found, else None
        """
        self.cursor.execute(
            "SELECT id, name, path, created_at FROM user_databases WHERE name = ?",
            (name,)
        )
        row = self.cursor.fetchone()
        if row:
            return {
                'id': row[0],
                'name': row[1],
                'path': row[2],
                'created_at': row[3]
            }
        return None
    
    def get_user_database_by_path(self, path: str) -> dict | None:
        """
        Get a UserDatabase by path.
        
        Args:
            path: The file path of the user database
            
        Returns:
            Dictionary with 'id', 'name', 'path', 'created_at' if found, else None
        """
        self.cursor.execute(
            "SELECT id, name, path, created_at FROM user_databases WHERE path = ?",
            (path,)
        )
        row = self.cursor.fetchone()
        if row:
            return {
                'id': row[0],
                'name': row[1],
                'path': row[2],
                'created_at': row[3]
            }
        return None
    
    def get_all_user_databases(self) -> list:
        """
        Get all UserDatabases.
        
        Returns:
            List of dictionaries with 'id', 'name', 'path', 'created_at'
        """
        self.cursor.execute("SELECT id, name, path, created_at FROM user_databases")
        rows = self.cursor.fetchall()
        return [
            {
                'id': row[0],
                'name': row[1],
                'path': row[2],
                'created_at': row[3]
            }
            for row in rows
        ]
    
    def update_user_database(self, name: str, new_path: str = None, new_name: str = None) -> bool:
        """
        Update a UserDatabase.
        
        Args:
            name: The current name of the user database
            new_path: The new path (optional)
            new_name: The new name (optional)
            
        Returns:
            True if updated successfully, False if not found or other error
        """
        if new_path is None and new_name is None:
            return False
        
        if new_name is not None:
            # Check if the new name already exists
            existing = self.get_user_database_by_name(new_name)
            if existing is not None and existing['name'] != name:
                logger.warning(f"Cannot update database '{name}' to '{new_name}': name already exists")
                return False
        
        update_fields = []
        params = []
        
        if new_path is not None:
            update_fields.append("path = ?")
            params.append(new_path)
        
        if new_name is not None:
            update_fields.append("name = ?")
            params.append(new_name)
        
        if not update_fields:
            return False
        
        params.append(name)
        
        try:
            self.cursor.execute(
                f"UPDATE user_databases SET {', '.join(update_fields)} WHERE name = ?",
                params
            )
            self.conn.commit()
            if self.cursor.rowcount == 0:
                logger.debug(f"User database '{name}' not found.")
                return False
            logger.debug(f"User database '{name}' updated.")
            return True
        except Exception as e:
            logger.error(f"Failed to update user database '{name}': {str(e)}")
            return False
    
    def delete_user_database(self, name: str) -> bool:
        """
        Delete a UserDatabase.
        
        Args:
            name: The name of the user database to delete
            
        Returns:
            True if deleted successfully, False if not found
        """
        self.cursor.execute("DELETE FROM user_databases WHERE name = ?", (name,))
        self.conn.commit()
        if self.cursor.rowcount == 0:
            logger.debug(f"User database '{name}' not found.")
            return False
        logger.debug(f"User database '{name}' deleted successfully.")
        return True