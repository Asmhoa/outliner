from data import Database

if __name__ == '__main__':
    db = Database("data.db")
    db.create_new_database()
    db.close_conn()
