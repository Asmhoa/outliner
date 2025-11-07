from fastapi import Depends, HTTPException
from outliner_api_server.db.userdb import UserDatabase
from outliner_api_server.db.sysdb import SystemDatabase
from outliner_api_server.db.errors import UserDatabaseNotFoundError


def get_sys_db():
    sys_db = SystemDatabase()
    try:
        yield sys_db
    finally:
        sys_db.close_conn()


def get_db(db_id: str, sys_db: SystemDatabase = Depends(get_sys_db)):
    # TODO: cache this and deal with the cursor
    try:
        # Get the database path from system database
        db_info = sys_db.get_user_database_by_id(db_id)
    except UserDatabaseNotFoundError:
        # If the database doesn't exist, return an error
        # The user should create the database via a separate API first
        raise HTTPException(
            status_code=404,
            detail=f"Database with id '{db_id}' not found. Please create it first.",
        )

    import logging

    logger = logging.getLogger("uvicorn.error")
    logger.setLevel(logging.DEBUG)

    logger.info(db_info)
    db = UserDatabase(db_info.path)
    try:
        yield db
    finally:
        db.close_conn()
