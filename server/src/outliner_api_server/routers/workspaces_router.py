from fastapi import APIRouter, Depends, HTTPException
from outliner_api_server.userdb import UserDatabase
from outliner_api_server.routers.dependencies import get_db
from outliner_api_server.routers.models import Workspace, WorkspaceCreate, WorkspaceUpdate
from outliner_api_server.errors import WorkspaceNotFoundError


router = APIRouter()


@router.post(
    "/db/{db_name}/workspaces",
    response_model=Workspace,
    responses={
        200: {
            "description": "Workspace created successfully",
            "content": {
                "application/json": {
                    "example": {
                        "workspace_id": 1,
                        "name": "Example Workspace",
                        "color": "#FF0000",
                    }
                }
            },
        },
        404: {
            "description": "Workspace not found",
            "content": {
                "application/json": {"example": {"detail": "Workspace not found"}}
            },
        },
    },
)
def add_workspace(
    db_name: str, workspace: WorkspaceCreate, db: UserDatabase = Depends(get_db)
):
    try:
        workspace_id = db.add_workspace(workspace.name, workspace.color)
        workspace_data = db.get_workspace_by_id(workspace_id)
        return Workspace(
            workspace_id=workspace_data[0],
            name=workspace_data[1],
            color=workspace_data[2],
        )
    except WorkspaceNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get(
    "/db/{db_name}/workspaces/{workspace_id}",
    response_model=Workspace,
    responses={
        200: {
            "description": "Workspace retrieved successfully",
            "content": {
                "application/json": {
                    "example": {
                        "workspace_id": 1,
                        "name": "Example Workspace",
                        "color": "#FF0000",
                    }
                }
            },
        },
        404: {
            "description": "Workspace not found",
            "content": {
                "application/json": {"example": {"detail": "Workspace not found"}}
            },
        },
    },
)
def get_workspace(db_name: str, workspace_id: int, db: UserDatabase = Depends(get_db)):
    try:
        workspace_data = db.get_workspace_by_id(workspace_id)
        return Workspace(
            workspace_id=workspace_data[0],
            name=workspace_data[1],
            color=workspace_data[2],
        )
    except WorkspaceNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get(
    "/db/{db_name}/workspaces",
    response_model=list[Workspace],
    responses={
        200: {
            "description": "List of workspaces retrieved successfully",
            "content": {
                "application/json": {
                    "example": [
                        {
                            "workspace_id": 1,
                            "name": "Example Workspace",
                            "color": "#FF0000",
                        }
                    ]
                }
            },
        }
    },
)
def get_workspaces(db_name: str, db: UserDatabase = Depends(get_db)):
    workspaces_data = db.get_workspaces()
    return [
        Workspace(workspace_id=w[0], name=w[1], color=w[2]) for w in workspaces_data
    ]


@router.put(
    "/db/{db_name}/workspaces",
    responses={
        200: {
            "description": "Workspace updated successfully",
            "content": {"application/json": {"example": {"status": "success"}}},
        },
        404: {
            "description": "Workspace not found",
            "content": {
                "application/json": {"example": {"detail": "Workspace not found"}}
            },
        },
    },
)
def update_workspace(
    db_name: str, workspace: WorkspaceUpdate, db: UserDatabase = Depends(get_db)
):
    try:
        db.update_workspace(
            workspace.workspace_id, workspace.new_name, workspace.new_color
        )
        return {"status": "success"}
    except WorkspaceNotFoundError:
        raise HTTPException(status_code=404, detail="Workspace not found")


@router.delete(
    "/db/{db_name}/workspaces/{workspace_id}",
    responses={
        200: {
            "description": "Workspace deleted successfully",
            "content": {"application/json": {"example": {"status": "success"}}},
        },
        404: {
            "description": "Workspace not found",
            "content": {
                "application/json": {"example": {"detail": "Workspace not found"}}
            },
        },
    },
)
def delete_workspace(
    db_name: str, workspace_id: int, db: UserDatabase = Depends(get_db)
):
    try:
        db.delete_workspace(workspace_id)
        return {"status": "success"}
    except WorkspaceNotFoundError:
        raise HTTPException(status_code=404, detail="Workspace not found")