import logging

from outliner_api_server.db.base_db import BaseDatabase
from outliner_api_server.db.errors import (
    BlockNotFoundError,
    PageAlreadyExistsError,
    PageNotFoundError,
    WorkspaceNotFoundError,
)
from outliner_api_server.db.models import BlockModel, PageModel, WorkspaceModel

logger = logging.getLogger(__name__)


class UserDatabase(BaseDatabase):
    def __init__(self, db_path: str) -> None:
        # NOTE: in api.py, we use a separate UserDatabase() object for each request
        # So one conn is used by only 1 request, making it safe to not check same thread
        # This is required since the api server thread that creates a UserDatabase object
        # is a different one from the one that executes a query.
        # TODO: add a pytest to ensure each api function has its own Depends()
        super().__init__(db_path, init_singleton_cursor=True)
        # shared singleton cursor is fine since this entire object is recreated for each api call

        # Handle exits gracefully
        # atexit.register(self._close_conn)
        # signal.signal(signal.SIGINT, kill_handler)
        # signal.signal(signal.SIGTERM, kill_handler)

    def _create_table_workspaces(self) -> None:
        """
        Creates the 'workspaces' table in the specified sqlite3 database.
        """
        self.cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS workspaces (
                workspace_id INTEGER PRIMARY KEY,
                name VARCHAR(255),
                color BLOB(3) NOT NULL
            );
        """
        )
        self.conn.commit()
        logger.debug(
            f"Table 'workspaces' created or already exists in '{self.db_path}'."
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
        Creates the 'pages' table and 'pages_fts' FTS table in the specified sqlite3 database.
        """
        self.cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS pages (
                page_id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
                title VARCHAR(255) NOT NULL UNIQUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """
        )
        # Create FTS5 virtual table for full-text search
        self.cursor.execute(
            """
            CREATE VIRTUAL TABLE IF NOT EXISTS pages_fts USING fts5(
                title,
                page_id UNINDEXED,
                content='pages'
            );
        """
        )
        self.conn.commit()
        logger.debug(
            f"Table 'pages' and 'pages_fts' created or already exists in '{self.db_path}'."
        )

    def _create_table_blocks(self) -> None:
        """
        Creates the 'blocks' table and 'blocks_fts' FTS table in the specified sqlite3 database.
        """
        self.cursor.execute(
            """
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
        """
        )
        # Create FTS5 virtual table for full-text search of blocks
        # content='' prevents data duplication - the content text is used for indexing but then discarded
        # We will still need to join with the original blocks table on block_id during retrieval
        self.cursor.execute(
            """
            CREATE VIRTUAL TABLE IF NOT EXISTS blocks_fts USING fts5(
                content,
                block_id UNINDEXED,
                page_id UNINDEXED,
                parent_block_id UNINDEXED,
                content='blocks'
            );
        """
        )
        self.conn.commit()
        logger.debug(
            f"Table 'blocks' and 'blocks_fts' created or already exists in '{self.db_path}'."
        )

    def initialize_tables(self) -> None:
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

    def get_workspace_by_id(self, workspace_id: int) -> WorkspaceModel:
        """
        Retrieves a workspace by its ID.
        """
        self.cursor.execute(
            "SELECT workspace_id, name, color FROM workspaces WHERE workspace_id = ?",
            (workspace_id,),
        )
        row = self.cursor.fetchone()
        if row:
            return WorkspaceModel(**row)
        raise WorkspaceNotFoundError(f"Workspace with ID {workspace_id} not found")

    def get_workspaces(self) -> list[WorkspaceModel]:
        """
        Retrieves all workspaces from the database.
        """
        self.cursor.execute("SELECT workspace_id, name, color FROM workspaces")
        rows = self.cursor.fetchall()
        return [WorkspaceModel(**row) for row in rows]

    def update_workspace(
        self, workspace_id: int, new_name: str, new_color: str
    ) -> None:
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

    def delete_workspace(self, workspace_id: int) -> None:
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

        # Create a temporary cursor without row_factory to handle RETURNING values
        temp_cursor = self.conn.cursor()
        temp_cursor.execute(
            "INSERT INTO pages (title) VALUES (?) RETURNING page_id", (title,)
        )
        new_page_id = temp_cursor.fetchone()[0]

        # Insert the title and page_id into FTS table
        temp_cursor.execute(
            "INSERT INTO pages_fts (title, page_id) VALUES (?, ?)", (title, new_page_id)
        )

        self.conn.commit()
        logger.debug(f"Page '{title}' added successfully with ID: {new_page_id}")
        return new_page_id

    def get_page_by_id(self, page_id: str) -> PageModel:
        """
        Retrieves a page by its ID.
        """
        self.cursor.execute(
            "SELECT page_id, title, created_at FROM pages WHERE page_id = ?", (page_id,)
        )
        row = self.cursor.fetchone()
        if row:
            return PageModel(**row)
        raise PageNotFoundError(f"Page with ID {page_id} not found")

    def get_pages(self) -> list[PageModel]:
        """
        Retrieves all pages from the database.
        """
        self.cursor.execute("SELECT page_id, title, created_at FROM pages")
        rows = self.cursor.fetchall()
        return [PageModel(**row) for row in rows]

    def rename_page(self, page_id: str, new_title: str) -> None:
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

        # Get the old title to verify the page exists
        self.cursor.execute("SELECT title FROM pages WHERE page_id = ?", (page_id,))
        old_page = self.cursor.fetchone()
        if old_page is None:
            logger.debug(f"Page ID {page_id} not found.")
            raise PageNotFoundError(f"Page with ID {page_id} not found")

        # For FTS5 external content tables, we need to delete and re-insert
        # instead of directly updating the FTS table
        # Use temp cursor for consistency with add_page method
        temp_cursor = self.conn.cursor()

        # Delete from FTS first to clear the old content
        temp_cursor.execute("DELETE FROM pages_fts WHERE page_id = ?", (page_id,))

        # Update the main table
        temp_cursor.execute(
            "UPDATE pages SET title = ? WHERE page_id = ?", (new_title, page_id)
        )

        # Re-insert into FTS table with the new title
        temp_cursor.execute(
            "INSERT INTO pages_fts (title, page_id) VALUES (?, ?)", (new_title, page_id)
        )

        self.conn.commit()
        logger.debug(f"Page ID {page_id} renamed to '{new_title}'.")

    def delete_page(self, page_id: str) -> None:
        """
        Deletes a page and all its associated blocks.
        Raises PageNotFoundError if page is not found.
        """
        # Delete from FTS table first
        self.cursor.execute("DELETE FROM pages_fts WHERE page_id = ?", (page_id,))
        # Then delete from the main table
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
            temp_cursor = self.conn.cursor()
            temp_cursor.execute(
                "INSERT INTO blocks (content, page_id, position) VALUES (?, ?, ?) RETURNING block_id",
                (content, page_id, position),
            )
            new_block_id = temp_cursor.fetchone()[0]
            # Insert the block into the FTS table as well
            temp_cursor.execute(
                "INSERT INTO blocks_fts (content, block_id, page_id, parent_block_id) VALUES (?, ?, ?, ?)",
                (content, new_block_id, page_id, None),
            )
            logger.debug(f"Block added to page ID {page_id}: '{content[:50]}...'")
        elif parent_block_id is not None and page_id is None:
            temp_cursor = self.conn.cursor()
            temp_cursor.execute(
                "INSERT INTO blocks (content, parent_block_id, position) VALUES (?, ?, ?) RETURNING block_id",
                (content, parent_block_id, position),
            )
            new_block_id = temp_cursor.fetchone()[0]
            # Insert the block into the FTS table as well
            temp_cursor.execute(
                "INSERT INTO blocks_fts (content, block_id, page_id, parent_block_id) VALUES (?, ?, ?, ?)",
                (content, new_block_id, None, parent_block_id),
            )
            logger.debug(
                f"Block added under parent block ID {parent_block_id}: '{content[:50]}...'"
            )
        else:
            logger.error(
                "A block must be associated with either a page_id or a parent_block_id, but not both."
            )
            raise ValueError(
                "A block must be associated with either a page_id or a parent_block_id, but not both."
            )

        self.conn.commit()
        logger.debug(
            f"Block with content '{content[:50]}...' added successfully with ID: {new_block_id}"
        )
        return new_block_id

    def get_blocks_by_page(self, page_id: str) -> list[BlockModel]:
        """
        Retrieves all blocks for a given page ID.
        """
        self.cursor.execute(
            "SELECT block_id, content, page_id, parent_block_id, position, created_at FROM blocks WHERE page_id = ?",
            (page_id,),
        )
        rows = self.cursor.fetchall()
        return [BlockModel(**row) for row in rows]

    def get_block_content_by_id(self, block_id: str) -> BlockModel:
        """
        Retrieves a block by its ID.
        """
        self.cursor.execute(
            "SELECT block_id, content, page_id, parent_block_id, position, created_at FROM blocks WHERE block_id = ?",
            (block_id,),
        )
        row = self.cursor.fetchone()
        if row:
            return BlockModel(**row)
        raise BlockNotFoundError(f"Block with ID {block_id} not found")

    def update_block_content(self, block_id: str, new_content: str) -> None:
        """
        Updates the content of an existing block.
        Raises BlockNotFoundError if block is not found.
        """
        # Get the current block to verify it exists and get related info for FTS
        self.cursor.execute(
            "SELECT page_id, parent_block_id FROM blocks WHERE block_id = ?",
            (block_id,),
        )
        current_block = self.cursor.fetchone()
        if current_block is None:
            logger.debug(f"Block ID {block_id} not found.")
            raise BlockNotFoundError(f"Block with ID {block_id} not found")

        # For FTS5 external content tables, we need to delete and re-insert
        # instead of directly updating the FTS table
        temp_cursor = self.conn.cursor()

        # Delete from FTS first to clear the old content
        temp_cursor.execute("DELETE FROM blocks_fts WHERE block_id = ?", (block_id,))

        # Update the main table
        temp_cursor.execute(
            "UPDATE blocks SET content = ? WHERE block_id = ?", (new_content, block_id)
        )

        # Reinsert into FTS with updated content
        temp_cursor.execute(
            "INSERT INTO blocks_fts (content, block_id, page_id, parent_block_id) VALUES (?, ?, ?, ?)",
            (
                new_content,
                block_id,
                current_block["page_id"],
                current_block["parent_block_id"],
            ),
        )

        self.conn.commit()
        logger.debug(f"Block ID {block_id} content updated.")

    def update_block_parent(
        self, block_id: str, new_page_id: str = None, new_parent_block_id: str = None
    ) -> None:
        """
        Updates the parent of an existing block. A block can either have a page_id or a parent_block_id, but not both.
        Raises BlockNotFoundError if block is not found.
        """
        if new_page_id is not None and new_parent_block_id is None:
            self.cursor.execute(
                "UPDATE blocks SET page_id = ?, parent_block_id = NULL WHERE block_id = ?",
                (new_page_id, block_id),
            )
            # Update the FTS table as well
            self.cursor.execute(
                "UPDATE blocks_fts SET page_id = ?, parent_block_id = NULL WHERE block_id = ?",
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
            # Update the FTS table as well
            self.cursor.execute(
                "UPDATE blocks_fts SET parent_block_id = ?, page_id = NULL WHERE block_id = ?",
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

    def delete_block(self, block_id: str) -> None:
        """
        Deletes a block and all its nested child blocks.
        Raises BlockNotFoundError if block is not found.
        """
        # Delete from FTS table first
        self.cursor.execute("DELETE FROM blocks_fts WHERE block_id = ?", (block_id,))
        # Then delete from the main table
        self.cursor.execute("DELETE FROM blocks WHERE block_id = ?", (block_id,))
        self.conn.commit()
        if self.cursor.rowcount == 0:
            logger.debug(f"Block ID {block_id} not found.")
            raise BlockNotFoundError(f"Block with ID {block_id} not found")
        logger.debug(f"Block ID {block_id} and its children deleted successfully.")

    def _fts_escape_tokens(self, text: str) -> str:
        """
        Escape a whole string and split it into safe literal tokens
        for an FTS MATCH expression.
        Note: This uses text.split() which works for space-separated languages.
        For languages like Chinese/Japanese/Korean without spaces between words,
        a more sophisticated tokenization approach would be needed.
        """
        tokens = text.split()
        escaped_tokens = [f'"{t.replace('"', '""')}"*' for t in tokens]
        return " ".join(escaped_tokens)

    def search_pages(
        self, query: str, limit: int = 10, escape_special_chars: bool = True
    ) -> list[PageModel]:
        """
        Search for pages by title using FTS.
        Returns a list of PageModel objects that match the search query.

        Args:
            query: The search query string
            limit: Maximum number of results to return
            escape_special_chars: Whether to escape special characters in the query.
                                 Default is True for safety, but can be set to False
                                 to allow FTS operators like AND, OR, NOT, etc.
        """
        # Handle empty query gracefully by returning an empty list
        if not query or query.strip() == "":
            return []

        # Sanitize the query to prevent FTS syntax errors if requested
        if escape_special_chars:
            query = self._fts_escape_tokens(query)

        # Use FTS MATCH to search in the pages_fts table
        # Join with main pages table using the page_id stored in the FTS table
        self.cursor.execute(
            """
            SELECT p.page_id, p.title, p.created_at
            FROM pages p
            JOIN pages_fts pf ON p.page_id = pf.page_id
            WHERE pages_fts MATCH ?
            ORDER BY rank
            LIMIT ?
            """,
            (query, limit),
        )
        rows = self.cursor.fetchall()
        return [PageModel(**row) for row in rows]

    def search_blocks(
        self, query: str, limit: int = 10, escape_special_chars: bool = True
    ) -> list[BlockModel]:
        """
        Search for blocks by content using FTS.
        Returns a list of BlockModel objects that match the search query.

        Args:
            query: The search query string
            limit: Maximum number of results to return
            escape_special_chars: Whether to escape special characters in the query.
                                 Default is True for safety, but can be set to False
                                 to allow FTS operators like AND, OR, NOT, etc.
        """
        # Handle empty query gracefully by returning an empty list
        if not query or query.strip() == "":
            return []

        # Sanitize the query to prevent FTS syntax errors if requested
        if escape_special_chars:
            query = self._fts_escape_tokens(query)

        # Use FTS MATCH to search in the blocks_fts table
        self.cursor.execute(
            """
            SELECT b.block_id, b.content, b.page_id, b.parent_block_id, b.position, b.created_at
            FROM blocks b
            JOIN blocks_fts bf ON b.block_id = bf.block_id
            WHERE blocks_fts MATCH ?
            ORDER BY rank
            LIMIT ?
            """,
            (query, limit),
        )
        rows = self.cursor.fetchall()
        return [BlockModel(**row) for row in rows]

    def search_all(
        self, query: str, *args, **kwargs
    ) -> tuple[list[PageModel], list[BlockModel]]:
        """
        Search for both pages and blocks using FTS.
        Returns a tuple of (pages, blocks) that match the search query.
        """
        # Handle empty query gracefully by returning empty lists
        if not query or query.strip() == "":
            return [], []

        pages = self.search_pages(query, *args, **kwargs)
        blocks = self.search_blocks(query, *args, **kwargs)
        return pages, blocks

    def rebuild_search(self) -> None:
        """
        Rebuilds the full-text search indexes by clearing the FTS tables and
        repopulating them with current data from the main tables.
        This is useful when the FTS tables get out of sync with the main tables.
        """
        # For FTS5 external content tables, use the special 'rebuild' command
        # This repopulates the FTS index from the content table automatically
        self.cursor.execute("INSERT INTO pages_fts(pages_fts) VALUES('rebuild')")
        self.cursor.execute("INSERT INTO blocks_fts(blocks_fts) VALUES('rebuild')")

        self.conn.commit()
        logger.debug("FTS tables rebuilt successfully.")
