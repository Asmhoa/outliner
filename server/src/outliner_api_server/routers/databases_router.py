from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from outliner_api_server.db.sysdb import SystemDatabase
from outliner_api_server.routers.request_models import DatabaseCreate
from outliner_api_server.db.errors import (
    UserDatabaseAlreadyExistsError,
    UserDatabaseNotFoundError,
)
from outliner_api_server.routers.dependencies import get_sys_db
import os


router = APIRouter()


class DatabaseUpdate(BaseModel):
    name: str


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
        sys_db.add_user_database(db_create.name)
        # Get and return the created database info
        created_db = sys_db.get_user_database_by_name(db_create.name)
        return created_db
    except UserDatabaseAlreadyExistsError as e:
        raise HTTPException(
            status_code=409,
            detail=str(e),
        )


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


@router.put(
    "/databases/{db_id}",
    responses={
        200: {
            "description": "Database updated successfully",
            "content": {
                "application/json": {
                    "example": {
                        "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                        "name": "updated_database",
                        "path": "/path/to/updated_database.db",
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
def update_database(
    db_id: str,
    db_update: DatabaseUpdate,
    sys_db: SystemDatabase = Depends(get_sys_db)
):
    try:
        new_name = db_update.name

        # Let the system DB handle the path calculation and file renaming
        sys_db.update_user_database(db_id, new_name=new_name)
        # Return the updated database info
        updated_db = sys_db.get_user_database_by_id(db_id)
        return updated_db
    except UserDatabaseNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except UserDatabaseAlreadyExistsError as e:
        raise HTTPException(status_code=409, detail=str(e))


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


import os
