import atexit
from multiprocessing import Value
import signal
import logging
import uuid
from sqlite3 import connect, Cursor, Connection

logger = logging.getLogger(__name__)


class PageAlreadyExistsError(Exception):
    """Raised when trying to create a page with a title that already exists."""

    pass


class PageNotFoundError(Exception):
    """Raised when a page is not found."""

    pass


class WorkspaceNotFoundError(Exception):
    """Raised when a workspace is not found."""

    pass


class BlockNotFoundError(Exception):
    """Raised when a block is not found."""

    pass


class UserDatabase:
    def __init__(self, db_name: str) -> None:
        self.db_name: str = db_name
        # NOTE: in api.py, we use a separate UserDatabase() object for each request
        # So one conn is used by only 1 request, making it safe to not check same thread
        # This is required since the api server thread that creates a UserDatabase object
        # is a different one from the one that executes a query.
        # TODO: add a pytest to ensure each api function has its own Depends()
        self.conn: Connection = connect(self.db_name, check_same_thread=False)
        self.cursor: Cursor = self.conn.cursor()
        self.cursor.execute("PRAGMA foreign_keys = ON")

        # Handle exits gracefully
        # atexit.register(self._close_conn)
        # signal.signal(signal.SIGINT, kill_handler)
        # signal.signal(signal.SIGTERM, kill_handler)
        logger.debug(f"Database connection established to '{self.db_name}'.")

    def close_conn(self) -> None:
        self.conn.close()
        logger.debug(f"Database connection to '{self.db_name}' closed.")

    def _create_table_workspaces(self) -> None:
        """
        Creates the 'workspaces' table in the specified sqlite3 database.
        """
        self.cursor.execute("""
            CREATE TABLE IF NOT EXISTS workspaces (
                workspace_id INTEGER PRIMARY KEY,
                name VARCHAR(255),
                color BLOB(3) NOT NULL
            );
        """)
        self.conn.commit()
        logger.debug(
            f"Table 'workspaces' created or already exists in '{self.db_name}'."
        )
        # Create default workspace if it doesn't exist
        self.cursor.execute("SELECT 1 FROM workspaces WHERE workspace_id = 0")
        if self.cursor.fetchone() is None:
            default_name = "Default"
            default_color = "#4285F4"
            color_bytes = bytes.fromhex(default_color.lstrip("#"))
            self.cursor.execute(
                "INSERT INTO workspaces (workspace_id, name, color) VALUES (?, ?, ?)",
                (0, default_name, color_bytes),
            )
            self.conn.commit()
            logger.debug(f"Default workspace '{default_name}' with ID 0 created.")

    def _create_table_pages(self) -> None:
        """
        Creates the 'pages' table in the specified sqlite3 database.
        """
        self.cursor.execute("""
            CREATE TABLE IF NOT EXISTS pages (
                page_id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
                title VARCHAR(255) NOT NULL UNIQUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        self.conn.commit()
        logger.debug(f"Table 'pages' created or already exists in '{self.db_name}'.")

    def _create_table_blocks(self) -> None:
        """
        Creates the 'blocks' table in the specified sqlite3 database.
        """
        self.cursor.execute("""
            CREATE TABLE IF NOT EXISTS blocks (
                block_id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
                content TEXT NOT NULL,
                page_id TEXT NULL,
                parent_block_id TEXT NULL,
                position INTEGER NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (page_id) REFERENCES pages(page_id) ON DELETE CASCADE,
                FOREIGN KEY (parent_block_id) REFERENCES blocks(block_id) ON DELETE CASCADE,
                CHECK (
                    (page_id IS NOT NULL AND parent_block_id IS NULL)
                    OR
                    (page_id IS NULL AND parent_block_id IS NOT NULL)
                )
            );
        """)
        self.conn.commit()
        logger.debug(f"Table 'blocks' created or already exists in '{self.db_name}'.")

    def create_new_database(self) -> None:
        """
        Initializes the database by creating necessary tables.
        """
        self._create_table_workspaces()
        self._create_table_pages()
        self._create_table_blocks()

    # CRUD:- workspaces

    def add_workspace(self, name: str, color: str) -> int:
        """
        Adds a new workspace to the database.
        Returns the ID of the newly created workspace.
        """
        color_bytes = bytes.fromhex(color.lstrip("#"))
        self.cursor.execute(
            "INSERT INTO workspaces (name, color) VALUES (?, ?)", (name, color_bytes)
        )
        self.conn.commit()
        new_workspace_id = self.cursor.lastrowid
        logger.debug(
            f"Workspace '{name}' added successfully with ID: {new_workspace_id}"
        )
        return new_workspace_id

    def get_workspace_by_id(self, workspace_id: int):
        """
        Retrieves a workspace by its ID.
        """
        self.cursor.execute(
            "SELECT workspace_id, name, color FROM workspaces WHERE workspace_id = ?",
            (workspace_id,),
        )
        row = self.cursor.fetchone()
        if row:
            return row[0], row[1], f"#{row[2].hex().upper()}"
        return None

    def get_workspaces(self):
        """
        Retrieves all workspaces from the database.
        """
        self.cursor.execute("SELECT workspace_id, name, color FROM workspaces")
        rows = self.cursor.fetchall()
        return [(row[0], row[1], f"#{row[2].hex().upper()}") for row in rows]

    def update_workspace(self, workspace_id: int, new_name: str, new_color: str):
        """
        Updates an existing workspace.
        Raises WorkspaceNotFoundError if workspace is not found.
        """
        color_bytes = bytes.fromhex(new_color.lstrip("#"))
        self.cursor.execute(
            "UPDATE workspaces SET name = ?, color = ? WHERE workspace_id = ?",
            (new_name, color_bytes, workspace_id),
        )
        self.conn.commit()
        if self.cursor.rowcount == 0:
            logger.debug(f"Workspace ID {workspace_id} not found or no change.")
            raise WorkspaceNotFoundError(f"Workspace with ID {workspace_id} not found")
        logger.debug(f"Workspace ID {workspace_id} updated.")

    def delete_workspace(self, workspace_id: int):
        """
        Deletes a workspace.
        Raises WorkspaceNotFoundError if workspace is not found.
        """
        self.cursor.execute(
            "DELETE FROM workspaces WHERE workspace_id = ?", (workspace_id,)
        )
        self.conn.commit()
        if self.cursor.rowcount == 0:
            logger.debug(f"Workspace ID {workspace_id} not found.")
            raise WorkspaceNotFoundError(f"Workspace with ID {workspace_id} not found")
        logger.debug(f"Workspace ID {workspace_id} deleted successfully.")

    # CRUD:- pages

    def add_page(self, title: str) -> str:
        """
        Adds a new page to the database.
        Returns the ID of the newly created page.
        """
        # Check if a page with this title already exists
        self.cursor.execute("SELECT page_id FROM pages WHERE title = ?", (title,))
        existing_page = self.cursor.fetchone()
        if existing_page:
            raise PageAlreadyExistsError(f"Page with title '{title}' already exists")

        self.cursor.execute(
            "INSERT INTO pages (title) VALUES (?) RETURNING page_id", (title,)
        )
        new_page_id = self.cursor.fetchone()[0]
        self.conn.commit()
        logger.debug(f"Page '{title}' added successfully with ID: {new_page_id}")
        return new_page_id

    def get_page_by_id(self, page_id: str):
        """
        Retrieves a page by its ID.
        """
        self.cursor.execute("SELECT * FROM pages WHERE page_id = ?", (page_id,))
        return self.cursor.fetchone()

    def get_pages(self):
        """
        Retrieves all pages from the database.
        """
        self.cursor.execute("SELECT * FROM pages")
        return self.cursor.fetchall()

    def rename_page(self, page_id: str, new_title: str):
        """
        Renames an existing page.
        Raises PageNotFoundError if page is not found.
        Raises PageAlreadyExistsError if a page with the new title already exists.
        """
        # Check if a different page with this title already exists
        self.cursor.execute(
            "SELECT page_id FROM pages WHERE title = ? AND page_id != ?",
            (new_title, page_id),
        )
        existing_page = self.cursor.fetchone()
        if existing_page:
            raise PageAlreadyExistsError(
                f"Page with title '{new_title}' already exists"
            )

        self.cursor.execute(
            "UPDATE pages SET title = ? WHERE page_id = ?", (new_title, page_id)
        )
        self.conn.commit()
        if self.cursor.rowcount == 0:
            logger.debug(f"Page ID {page_id} not found or no change in title.")
            raise PageNotFoundError(f"Page with ID {page_id} not found")
        logger.debug(f"Page ID {page_id} renamed to '{new_title}'.")

    def delete_page(self, page_id: str):
        """
        Deletes a page and all its associated blocks.
        Raises PageNotFoundError if page is not found.
        """
        self.cursor.execute("DELETE FROM pages WHERE page_id = ?", (page_id,))
        self.conn.commit()
        if self.cursor.rowcount == 0:
            logger.debug(f"Page ID {page_id} not found.")
            raise PageNotFoundError(f"Page with ID {page_id} not found")
        logger.debug(f"Page ID {page_id} and its blocks deleted successfully.")

    # CRUD:- blocks

    def add_block(
        self,
        content: str,
        position: int,
        page_id: str = None,
        parent_block_id: str = None,
    ) -> str:
        """
        Adds a new block to a page or as a child of another block.
        Returns the ID of the newly created block.
        """
        if page_id is not None and parent_block_id is None:
            self.cursor.execute(
                "INSERT INTO blocks (content, page_id, position) VALUES (?, ?, ?) RETURNING block_id",
                (content, page_id, position),
            )
            new_block_id = self.cursor.fetchone()[0]
            logger.debug(f"Block added to page ID {page_id}: '{content[:50]}...'")
        elif parent_block_id is not None and page_id is None:
            self.cursor.execute(
                "INSERT INTO blocks (content, parent_block_id, position) VALUES (?, ?, ?) RETURNING block_id",
                (content, parent_block_id, position),
            )
            new_block_id = self.cursor.fetchone()[0]
            logger.debug(
                f"Block added under parent block ID {parent_block_id}: '{content[:50]}...'"
            )
        else:
            logger.error(
                "A block must be associated with either a page_id or a parent_block_id, but not both."
            )
            return None  # Or raise an exception

        self.conn.commit()
        logger.debug(
            f"Block with content '{content[:50]}...' added successfully with ID: {new_block_id}"
        )
        return new_block_id

    def get_blocks_by_page(self, page_id: str):
        """
        Retrieves all blocks for a given page ID.
        """
        self.cursor.execute("SELECT * FROM blocks WHERE page_id = ?", (page_id,))
        return self.cursor.fetchall()

    def get_block_content_by_id(self, block_id: str):
        """
        Retrieves a block by its ID.
        """
        self.cursor.execute("SELECT * FROM blocks WHERE block_id = ?", (block_id,))
        return self.cursor.fetchone()

    def update_block_content(self, block_id: str, new_content: str):
        """
        Updates the content of an existing block.
        Raises BlockNotFoundError if block is not found.
        """
        self.cursor.execute(
            "UPDATE blocks SET content = ? WHERE block_id = ?", (new_content, block_id)
        )
        self.conn.commit()
        if self.cursor.rowcount == 0:
            logger.debug(f"Block ID {block_id} not found or no change in content.")
            raise BlockNotFoundError(f"Block with ID {block_id} not found")
        logger.debug(f"Block ID {block_id} content updated.")

    def update_block_parent(
        self, block_id: str, new_page_id: str = None, new_parent_block_id: str = None
    ):
        """
        Updates the parent of an existing block. A block can either have a page_id or a parent_block_id, but not both.
        Raises BlockNotFoundError if block is not found.
        """
        if new_page_id is not None and new_parent_block_id is None:
            self.cursor.execute(
                "UPDATE blocks SET page_id = ?, parent_block_id = NULL WHERE block_id = ?",
                (new_page_id, block_id),
            )
            logger.debug(
                f"Block ID {block_id} parent updated to page ID {new_page_id}."
            )
        elif new_parent_block_id is not None and new_page_id is None:
            self.cursor.execute(
                "UPDATE blocks SET parent_block_id = ?, page_id = NULL WHERE block_id = ?",
                (new_parent_block_id, block_id),
            )
            logger.debug(
                f"Block ID {block_id} parent updated to parent block ID {new_parent_block_id}."
            )
        else:
            logger.error(
                "A block must be associated with either a page_id or a parent_block_id, but not both. No update performed for block ID {block_id}."
            )
            raise ValueError(
                "A block must be associated with either a page_id or a parent_block_id, but not both."
            )

        self.conn.commit()
        if self.cursor.rowcount == 0:
            logger.debug(f"Block ID {block_id} not found or no change in parent.")
            raise BlockNotFoundError(f"Block with ID {block_id} not found")

    def delete_block(self, block_id: str):
        """
        Deletes a block and all its nested child blocks.
        Raises BlockNotFoundError if block is not found.
        """
        self.cursor.execute("DELETE FROM blocks WHERE block_id = ?", (block_id,))
        self.conn.commit()
        if self.cursor.rowcount == 0:
            logger.debug(f"Block ID {block_id} not found.")
            raise BlockNotFoundError(f"Block with ID {block_id} not found")
        logger.debug(f"Block ID {block_id} and its children deleted successfully.")
