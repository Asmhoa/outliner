import atexit
import signal
from sqlite3 import connect, Cursor, Connection

class Database:

    def __init__(self, db_name: str) -> None:
        self.db_name: str = db_name
        self.conn: Connection = connect(self.db_name)
        self.cursor: Cursor = self.conn.cursor()

        # Handle exits gracefully
        # atexit.register(self._close_conn)
        # signal.signal(signal.SIGINT, kill_handler)
        # signal.signal(signal.SIGTERM, kill_handler)

    def close_conn(self) -> None:
        self.conn.close()

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

    def create_new_database(self) -> None:
        self._create_table_pages()
        self._create_table_blocks()
