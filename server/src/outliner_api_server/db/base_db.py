import logging
from sqlite3 import connect, Cursor, Connection, Row
from abc import ABC, abstractmethod

logger = logging.getLogger(__name__)


class BaseDatabase(ABC):
    """
    Base class for database operations.
    Handles connection and cursor management for a sqlite3 database.
    """

    def __init__(self, db_path: str) -> None:
        """
        Initialize the BaseDatabase.

        Args:
            db_path: The path to the database file.
        """
        self.db_path: str = db_path
        # Use check_same_thread=False since we'll have different threads accessing
        # the database in a web server context
        self.conn: Connection = connect(self.db_path, check_same_thread=False)
        self.conn.row_factory = Row
        self.cursor: Cursor = self.conn.cursor()
        self.cursor.execute("PRAGMA foreign_keys = ON")
        logger.debug(f"Database connection established to '{self.db_path}'.")
        self.initialize_tables()

    def close_conn(self) -> None:
        """Close the database connection."""
        self.conn.close()
        logger.debug(f"Database connection to '{self.db_path}' closed.")

    @abstractmethod
    def initialize_tables(self) -> None:
        """
        Create tables if they don't exist.
        This method should be implemented by subclasses.
        """
        pass
