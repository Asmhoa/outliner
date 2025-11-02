from fastapi import APIRouter, Depends, HTTPException, Request
from outliner_api_server.sysdb import SystemDatabase
from outliner_api_server.routers.models import DatabaseCreate
from outliner_api_server.errors import UserDatabaseAlreadyExistsError, UserDatabaseNotFoundError


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
                            "id": 1,
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
def get_databases(request: Request):
    sys_db = request.app.state.sys_db
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
def create_database(request: Request, db_create: DatabaseCreate):
    sys_db = request.app.state.sys_db

    # Generate path from name if not provided
    if db_create.path is None:
        generated_path = db_create.name.lower().replace(" ", "_") + ".db"
    else:
        generated_path = db_create.path

    try:
        sys_db.add_user_database(db_create.name, generated_path)
    except UserDatabaseAlreadyExistsError as e:
        raise HTTPException(
            status_code=409,
            detail=str(e),
        )
    return {"status": "success"}


@router.get(
    "/databases/{db_name}",
    response_model=dict,
    responses={
        200: {
            "description": "Database retrieved successfully",
            "content": {
                "application/json": {
                    "example": {
                        "id": 1,
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
def get_database(request: Request, db_name: str):
    sys_db = request.app.state.sys_db
    try:
        db = sys_db.get_user_database_by_name(db_name)
        return db
    except UserDatabaseNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete(
    "/databases/{db_name}",
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
def delete_database(request: Request, db_name: str):
    sys_db = request.app.state.sys_db
    try:
        sys_db.delete_user_database(db_name)
        return {"status": "success"}
    except UserDatabaseNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))