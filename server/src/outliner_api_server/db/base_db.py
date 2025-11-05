import logging
from sqlite3 import connect, Cursor, Connection, Row
from abc import ABC, abstractmethod
from contextlib import contextmanager

logger = logging.getLogger(__name__)


class BaseDatabase(ABC):
    """
    Base class for database operations.
    Handles connection and cursor management for a sqlite3 database.
    """

    def __init__(self, db_path: str, init_singleton_cursor: bool = False) -> None:
        """
        Initialize the BaseDatabase.

        Args:
            db_path: The path to the database file.
            init_singleton_cursor: Whether to init a shared self.cursor to use for all functions.
                If False (default), every function should create its own cursor.
        """
        self.db_path: str = db_path
        self.conn = self.new_connection()
        if init_singleton_cursor:
            self.cursor = self.get_cursor()
        logger.debug(f"Database connection established to '{self.db_path}'.")
        self.initialize_tables()

    def new_connection(self) -> Connection:
        # Use check_same_thread=False since we'll have different threads accessing
        # the database in a web server context
        conn: Connection = connect(self.db_path, check_same_thread=False)
        conn.row_factory = Row
        return conn

    def get_cursor(self) -> Cursor:
        # Some classes like SystemDatabase need to call this for every function
        # UserDatabase currently doesn't becase we create a whole new object for every request
        # TODO: see if that's adding latency
        if not hasattr(self, "conn"):
            raise ValueError(
                "A connection needs to be made with new_connection() before new_cursor()"
            )
        cursor = self.conn.cursor()
        cursor.execute("PRAGMA foreign_keys = ON")
        return cursor

    def close_conn(self) -> None:
        """Close the database connection."""
        self.conn.close()
        logger.debug(f"Database connection to '{self.db_path}' closed.")

    @contextmanager
    def single_use_cursor(self) -> Cursor:
        """A context manager for database cursors."""
        cursor = self.get_cursor()
        try:
            yield cursor
        finally:
            cursor.close()

    @abstractmethod
    def initialize_tables(self) -> None:
        """
        Create tables if they don't exist.
        This method should be implemented by subclasses.
        """
        raise NotImplementedError
