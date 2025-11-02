from fastapi import Depends, HTTPException, Request
from outliner_api_server.db.userdb import UserDatabase
from outliner_api_server.db.sysdb import SystemDatabase
from outliner_api_server.db.errors import UserDatabaseNotFoundError


def get_db(db_name: str, request: Request):
    # TODO: cache this and deal with the cursor
    sys_db = request.app.state.sys_db

    try:
        # Get the database path from system database
        db_info = sys_db.get_user_database_by_name(db_name)
    except UserDatabaseNotFoundError:
        # If the database doesn't exist, return an error
        # The user should create the database via a separate API first
        raise HTTPException(
            status_code=404,
            detail=f"Database '{db_name}' not found. Please create it first.",
        )

    db = UserDatabase(db_info.path)
    try:
        yield db
    finally:
        db.close_conn()
