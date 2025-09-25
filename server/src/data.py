import atexit
import signal
import logging
from sqlite3 import connect, Cursor, Connection

logger = logging.getLogger(__name__)

class Database:

    def __init__(self, db_name: str) -> None:
        self.db_name: str = db_name
        # NOTE: in api.py, we use a separate Database() object for each request
        # So one conn is used by only 1 request, making it safe to not check same thread
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

    def _create_table_pages(self) -> None:
        """
        Creates the 'pages' table in the specified sqlite3 database.
        """
        self.cursor.execute("""
            CREATE TABLE IF NOT EXISTS pages (
                page_id INTEGER PRIMARY KEY AUTOINCREMENT,
                title VARCHAR(255) NOT NULL,
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
                block_id INTEGER PRIMARY KEY AUTOINCREMENT,
                content TEXT NOT NULL,
                page_id INTEGER NULL,
                parent_block_id INTEGER NULL,
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
        self._create_table_pages()
        self._create_table_blocks()

    # CRUD:- pages

    def add_page(self, title: str) -> int:
        """
        Adds a new page to the database.
        Returns the ID of the newly created page.
        """
        self.cursor.execute("INSERT INTO pages (title) VALUES (?)", (title,))
        self.conn.commit()
        new_page_id = self.cursor.lastrowid
        logger.debug(f"Page '{title}' added successfully with ID: {new_page_id}")
        return new_page_id

    def get_page_by_id(self, page_id: int):
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

    def rename_page(self, page_id: int, new_title: str) -> bool:
        """
        Renames an existing page.
        Returns True if successful, False otherwise.
        """
        self.cursor.execute("UPDATE pages SET title = ? WHERE page_id = ?", (new_title, page_id))
        self.conn.commit()
        if self.cursor.rowcount > 0:
            logger.debug(f"Page ID {page_id} renamed to '{new_title}'.")
            return True
        else:
            logger.debug(f"Page ID {page_id} not found or no change in title.")
            return False

    def delete_page(self, page_id: int) -> bool:
        """
        Deletes a page and all its associated blocks.
        Returns True if successful, False otherwise.
        """
        self.cursor.execute("DELETE FROM pages WHERE page_id = ?", (page_id,))
        self.conn.commit()
        if self.cursor.rowcount > 0:
            logger.debug(f"Page ID {page_id} and its blocks deleted successfully.")
            return True
        else:
            logger.debug(f"Page ID {page_id} not found.")
            return False

    # CRUD:- blocks

    def add_block(self, content: str, position: int, page_id: int = None, parent_block_id: int = None) -> int:
        """
        Adds a new block to a page or as a child of another block.
        Returns the ID of the newly created block.
        """
        if page_id is not None and parent_block_id is None:
            self.cursor.execute(
                "INSERT INTO blocks (content, page_id, position) VALUES (?, ?, ?)",
                (content, page_id, position)
            )
            logger.debug(f"Block added to page ID {page_id}: '{content[:50]}...'")
        elif parent_block_id is not None and page_id is None:
            self.cursor.execute(
                "INSERT INTO blocks (content, parent_block_id, position) VALUES (?, ?, ?)",
                (content, parent_block_id, position)
            )
            logger.debug(f"Block added under parent block ID {parent_block_id}: '{content[:50]}...'")
        else:
            logger.error("A block must be associated with either a page_id or a parent_block_id, but not both.")
            return None # Or raise an exception

        self.conn.commit()
        new_block_id = self.cursor.lastrowid
        logger.debug(f"Block with content '{content[:50]}...' added successfully with ID: {new_block_id}")
        return new_block_id

    def get_blocks_by_page(self, page_id: int):
        """
        Retrieves all blocks for a given page ID.
        """
        self.cursor.execute("SELECT * FROM blocks WHERE page_id = ?", (page_id,))
        return self.cursor.fetchall()

    def get_block_content_by_id(self, block_id: int):
        """
        Retrieves a block by its ID.
        """
        self.cursor.execute("SELECT * FROM blocks WHERE block_id = ?", (block_id,))
        return self.cursor.fetchone()

    def update_block_content(self, block_id: int, new_content: str) -> bool:
        """
        Updates the content of an existing block.
        Returns True if successful, False otherwise.
        """
        self.cursor.execute("UPDATE blocks SET content = ? WHERE block_id = ?", (new_content, block_id))
        self.conn.commit()
        if self.cursor.rowcount > 0:
            logger.debug(f"Block ID {block_id} content updated.")
            return True
        else:
            logger.debug(f"Block ID {block_id} not found or no change in content.")
            return False

    def update_block_parent(self, block_id: int, new_page_id: int = None, new_parent_block_id: int = None) -> bool:
        """
        Updates the parent of an existing block. A block can either have a page_id or a parent_block_id, but not both.
        Returns True if successful, False otherwise.
        """
        if new_page_id is not None and new_parent_block_id is None:
            self.cursor.execute(
                "UPDATE blocks SET page_id = ?, parent_block_id = NULL WHERE block_id = ?",
                (new_page_id, block_id)
            )
            logger.debug(f"Block ID {block_id} parent updated to page ID {new_page_id}.")
        elif new_parent_block_id is not None and new_page_id is None:
            self.cursor.execute(
                "UPDATE blocks SET parent_block_id = ?, page_id = NULL WHERE block_id = ?",
                (new_parent_block_id, block_id)
            )
            logger.debug(f"Block ID {block_id} parent updated to parent block ID {new_parent_block_id}.")
        else:
            logger.error("A block must be associated with either a page_id or a parent_block_id, but not both. No update performed for block ID {block_id}.")
            return False

        self.conn.commit()
        if self.cursor.rowcount > 0:
            return True
        else:
            logger.debug(f"Block ID {block_id} not found or no change in parent.")
            return False

    def delete_block(self, block_id: int) -> bool:
        """
        Deletes a block and all its nested child blocks.
        Returns True if successful, False otherwise.
        """
        self.cursor.execute("DELETE FROM blocks WHERE block_id = ?", (block_id,))
        self.conn.commit()
        if self.cursor.rowcount > 0:
            logger.debug(f"Block ID {block_id} and its children deleted successfully.")
            return True
        else:
            logger.debug(f"Block ID {block_id} not found.")
            return False
