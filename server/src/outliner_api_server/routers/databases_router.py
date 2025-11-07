from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from outliner_api_server.db.sysdb import SystemDatabase
from outliner_api_server.routers.request_models import DatabaseCreate
from outliner_api_server.db.errors import (
    UserDatabaseAlreadyExistsError,
    UserDatabaseNotFoundError,
)
from outliner_api_server.routers.dependencies import get_sys_db
import shutil
import os
from pathlib import Path
import uuid


router = APIRouter()


@router.get(
    "/databases",
    response_model=list,
    responses={
        200: {
            "description": "List of databases retrieved successfully",
            "content": {
                "application/json": {
                    "example": [
                        {
                            "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                            "name": "my_database",
                            "path": "/path/to/database.db",
                            "created_at": "2023-01-01T00:00:00",
                        }
                    ]
                }
            },
        }
    },
)
def get_databases(sys_db: SystemDatabase = Depends(get_sys_db)):
    databases = sys_db.get_all_user_databases()
    return databases


@router.post(
    "/databases",
    responses={
        200: {
            "description": "Database created successfully",
            "content": {"application/json": {"example": {"status": "success"}}},
        },
        409: {
            "description": "Conflict - Database with this name already exists",
            "content": {
                "application/json": {
                    "example": {"detail": "Database with name 'mydb' already exists"}
                }
            },
        },
    },
)
def create_database(
    db_create: DatabaseCreate, sys_db: SystemDatabase = Depends(get_sys_db)
):
    try:
        # Add the user database to the system database
        db_info = sys_db.add_user_database(db_create.name)
        
        # Import UserDatabase inside the function to avoid circular import issues
        from outliner_api_server.db.userdb import UserDatabase
        
        # Initialize the user database file by creating a UserDatabase object
        user_db = UserDatabase(db_info["path"])
        user_db.initialize_tables()
    except UserDatabaseAlreadyExistsError as e:
        raise HTTPException(
            status_code=409,
            detail=str(e),
        )
    return {"status": "success"}


@router.get(
    "/databases/{db_id}",
    response_model=dict,
    responses={
        200: {
            "description": "Database retrieved successfully",
            "content": {
                "application/json": {
                    "example": {
                        "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                        "name": "my_database",
                        "path": "/path/to/database.db",
                        "created_at": "2023-01-01T00:00:00",
                    }
                }
            },
        },
        404: {
            "description": "Database not found",
            "content": {
                "application/json": {"example": {"detail": "Database not found"}}
            },
        },
    },
)
def get_database(db_id: str, sys_db: SystemDatabase = Depends(get_sys_db)):
    try:
        db = sys_db.get_user_database_by_id(db_id)
        return db
    except UserDatabaseNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete(
    "/databases/{db_id}",
    responses={
        200: {
            "description": "Database deleted successfully",
            "content": {"application/json": {"example": {"status": "success"}}},
        },
        404: {
            "description": "Database not found",
            "content": {
                "application/json": {"example": {"detail": "Database not found"}}
            },
        },
    },
)
def delete_database(db_id: str, sys_db: SystemDatabase = Depends(get_sys_db)):
    try:
        sys_db.delete_user_database(db_id)
        return {"status": "success"}
    except UserDatabaseNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post(
    "/databases/import",
    responses={
        200: {
            "description": "Database imported successfully",
            "content": {"application/json": {"example": {"status": "success", "database_name": "my_imported_db"}}},
        },
        400: {
            "description": "Invalid file type or bad request",
            "content": {
                "application/json": {"example": {"detail": "Invalid file type. Please upload a .db, .sqlite, or .sqlite3 file"}}
            },
        },
        409: {
            "description": "Conflict - Database with this name already exists",
            "content": {
                "application/json": {
                    "example": {"detail": "Database with name 'mydb' already exists"}
                }
            },
        },
        500: {
            "description": "Internal server error during import",
            "content": {
                "application/json": {"example": {"detail": "Failed to import database: error_message"}}
            },
        },
    },
)
async def import_database(
    file: UploadFile = File(...),
    name: str = None,
    sys_db: SystemDatabase = Depends(get_sys_db)
):
    """
    Import a database file
    """
    # Validate file type
    if not file.filename.endswith(('.db', '.sqlite', '.sqlite3')):
        raise HTTPException(status_code=400, detail="Invalid file type. Please upload a .db, .sqlite, or .sqlite3 file")
    
    # If name is not provided, create one from the filename
    if not name:
        name = Path(file.filename).stem  # Remove file extension
    
    # Check if database with this name already exists
    try:
        existing_db = sys_db.get_user_database_by_name(name)
        if existing_db:
            raise HTTPException(status_code=409, detail=f"Database with name '{name}' already exists")
    except UserDatabaseNotFoundError:
        # Database doesn't exist, which is what we want
        pass
    
    # Create a temporary file
    temp_file_path = f"/tmp/{uuid.uuid4()}.db"
    try:
        with open(temp_file_path, "wb") as f:
            shutil.copyfileobj(file.file, f)
        
        # Add the database to the system database
        sys_db.add_user_database_from_file(name, temp_file_path)
        
        # Clean up the temporary file
        os.remove(temp_file_path)
        
        return {"status": "success", "database_name": name}
    except UserDatabaseAlreadyExistsError as e:
        # Clean up the temporary file in case of error
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)
        raise e
    except Exception as e:
        # Clean up the temporary file in case of error
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)
        raise HTTPException(status_code=500, detail=f"Failed to import database: {str(e)}")
