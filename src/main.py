import logging

from data import Database

# Configure logging
logging.basicConfig(level=logging.WARN, format='%(asctime)s - %(levelname)s - %(message)s')

if __name__ == '__main__':
    db = Database("data.db")
    db.create_new_database()
    db.close_conn()
