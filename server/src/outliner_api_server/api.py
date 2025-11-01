from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from outliner_api_server.userdb import (
    UserDatabase,
    PageAlreadyExistsError,
    PageNotFoundError,
    WorkspaceNotFoundError,
    BlockNotFoundError,
)
from outliner_api_server.sysdb import SystemDatabase
import os
from datetime import datetime


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    sys_db = SystemDatabase()
    
    # Store the system database in app state
    app.state.sys_db = sys_db
    yield
    # Shutdown
    if hasattr(app.state, 'sys_db'):
        app.state.sys_db.close_conn()


app = FastAPI(lifespan=lifespan)

origins = [
    "http://localhost:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_db(db_name: str, request: Request):
    sys_db = request.app.state.sys_db
    
    # Get the database path from system database
    db_info = sys_db.get_user_database_by_name(db_name)
    if not db_info:
        # If the database doesn't exist, return an error
        # The user should create the database via a separate API first
        raise HTTPException(status_code=404, detail=f"Database '{db_name}' not found. Please create it first.")
    
    db = UserDatabase(db_info['path'])
    try:
        yield db
    finally:
        db.close_conn()


class Page(BaseModel):
    page_id: str
    title: str
    created_at: datetime


class PageCreate(BaseModel):
    title: str


class PageRename(BaseModel):
    page_id: str
    new_title: str


@app.post(
    "/db/{db_name}/pages",
    responses={
        200: {
            "description": "Page created successfully",
            "content": {"application/json": {"example": {"page_id": "abc123"}}},
        },
        409: {
            "description": "Conflict - Page with this title already exists",
            "content": {
                "application/json": {
                    "example": {"detail": "Page with title 'Example' already exists"}
                }
            },
        },
    },
)
def add_page(db_name: str, page: PageCreate, db: UserDatabase = Depends(get_db)):
    try:
        page_id = db.add_page(page.title)
        return {"page_id": page_id}
    except PageAlreadyExistsError as e:
        raise HTTPException(status_code=409, detail=str(e))


@app.get(
    "/db/{db_name}/pages/{page_id}",
    response_model=Page,
    responses={
        200: {
            "description": "Page retrieved successfully",
            "content": {
                "application/json": {
                    "example": {
                        "page_id": "abc123",
                        "title": "Example Page",
                        "created_at": "2023-01-01T00:00:00",
                    }
                }
            },
        },
        404: {
            "description": "Page not found",
            "content": {"application/json": {"example": {"detail": "Page not found"}}},
        },
    },
)
def get_page(db_name: str, page_id: str, db: UserDatabase = Depends(get_db)):
    page_data = db.get_page_by_id(page_id)
    if not page_data:
        raise HTTPException(status_code=404, detail="Page not found")
    return Page(page_id=page_data[0], title=page_data[1], created_at=page_data[2])


@app.get(
    "/db/{db_name}/pages",
    response_model=list[Page],
    responses={
        200: {
            "description": "List of pages retrieved successfully",
            "content": {
                "application/json": {
                    "example": [
                        {
                            "page_id": "abc123",
                            "title": "Example Page",
                            "created_at": "2023-01-01T00:00:00",
                        }
                    ]
                }
            },
        }
    },
)
def get_pages(db_name: str, db: UserDatabase = Depends(get_db)):
    pages_data = db.get_pages()
    return [Page(page_id=p[0], title=p[1], created_at=p[2]) for p in pages_data]


@app.put(
    "/db/{db_name}/pages",
    responses={
        200: {
            "description": "Page renamed successfully",
            "content": {"application/json": {"example": {"status": "success"}}},
        },
        404: {
            "description": "Page not found",
            "content": {"application/json": {"example": {"detail": "Page not found"}}},
        },
        409: {
            "description": "Conflict - Page with this title already exists",
            "content": {
                "application/json": {
                    "example": {"detail": "Page with title 'Example' already exists"}
                }
            },
        },
    },
)
def rename_page(db_name: str, page: PageRename, db: UserDatabase = Depends(get_db)):
    try:
        db.rename_page(page.page_id, page.new_title)
        return {"status": "success"}
    except PageAlreadyExistsError as e:
        raise HTTPException(status_code=409, detail=str(e))
    except PageNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))


@app.delete(
    "/db/{db_name}/pages/{page_id}",
    responses={
        200: {
            "description": "Page deleted successfully",
            "content": {"application/json": {"example": {"status": "success"}}},
        },
        404: {
            "description": "Page not found",
            "content": {"application/json": {"example": {"detail": "Page not found"}}},
        },
    },
)
def delete_page(db_name: str, page_id: str, db: UserDatabase = Depends(get_db)):
    try:
        db.delete_page(page_id)
        return {"status": "success"}
    except PageNotFoundError:
        raise HTTPException(status_code=404, detail="Page not found")


# Route for blocks
class Block(BaseModel):
    block_id: str
    content: str
    page_id: str | None = None
    parent_block_id: str | None = None
    position: int
    created_at: datetime


class BlockCreate(BaseModel):
    content: str
    position: int
    page_id: str | None = None
    parent_block_id: str | None = None


class BlockUpdateContent(BaseModel):
    block_id: str
    new_content: str


class BlockUpdateParent(BaseModel):
    block_id: str
    new_page_id: str | None = None
    new_parent_block_id: str | None = None


@app.post(
    "/db/{db_name}/blocks",
    response_model=Block,
    responses={
        200: {
            "description": "Block created successfully",
            "content": {
                "application/json": {
                    "example": {
                        "block_id": "def456",
                        "content": "Example block content",
                        "page_id": "abc123",
                        "parent_block_id": None,
                        "position": 0,
                        "created_at": "2023-01-01T00:00:00",
                    }
                }
            },
        },
        404: {
            "description": "Block not found",
            "content": {"application/json": {"example": {"detail": "Block not found"}}},
        },
    },
)
def add_block(db_name: str, block: BlockCreate, db: UserDatabase = Depends(get_db)):
    block_id = db.add_block(
        block.content, block.position, block.page_id, block.parent_block_id
    )
    block_data = db.get_block_content_by_id(block_id)
    if not block_data:
        raise HTTPException(status_code=404, detail="Block not found")
    return Block(
        block_id=block_data[0],
        content=block_data[1],
        page_id=block_data[2],
        parent_block_id=block_data[3],
        position=block_data[4],
        created_at=block_data[5],
    )


@app.get(
    "/db/{db_name}/block/{block_id}",
    response_model=Block,
    responses={
        200: {
            "description": "Block retrieved successfully",
            "content": {
                "application/json": {
                    "example": {
                        "block_id": "def456",
                        "content": "Example block content",
                        "page_id": "abc123",
                        "parent_block_id": None,
                        "position": 0,
                        "created_at": "2023-01-01T00:00:00",
                    }
                }
            },
        },
        404: {
            "description": "Block not found",
            "content": {"application/json": {"example": {"detail": "Block not found"}}},
        },
    },
)
def get_block(db_name: str, block_id: str, db: UserDatabase = Depends(get_db)):
    block_data = db.get_block_content_by_id(block_id)
    if not block_data:
        raise HTTPException(status_code=404, detail="Block not found")
    return Block(
        block_id=block_data[0],
        content=block_data[1],
        page_id=block_data[2],
        parent_block_id=block_data[3],
        position=block_data[4],
        created_at=block_data[5],
    )


@app.get(
    "/db/{db_name}/blocks/{page_id}",
    response_model=list[Block],
    responses={
        200: {
            "description": "List of blocks retrieved successfully",
            "content": {
                "application/json": {
                    "example": [
                        {
                            "block_id": "def456",
                            "content": "Example block content",
                            "page_id": "abc123",
                            "parent_block_id": None,
                            "position": 0,
                            "created_at": "2023-01-01T00:00:00",
                        }
                    ]
                }
            },
        },
        404: {
            "description": "Page not found",
            "content": {"application/json": {"example": {"detail": "Page not found"}}},
        },
    },
)
def get_blocks(db_name: str, page_id: str, db: UserDatabase = Depends(get_db)):
    blocks_data = db.get_blocks_by_page(page_id)
    return [
        Block(
            block_id=b[0],
            content=b[1],
            page_id=b[2],
            parent_block_id=b[3],
            position=b[4],
            created_at=b[5],
        )
        for b in blocks_data
    ]


@app.put(
    "/db/{db_name}/blocks/content",
    responses={
        200: {
            "description": "Block content updated successfully",
            "content": {"application/json": {"example": {"status": "success"}}},
        },
        404: {
            "description": "Block not found",
            "content": {"application/json": {"example": {"detail": "Block not found"}}},
        },
    },
)
def update_block_content(db_name: str, block: BlockUpdateContent, db: UserDatabase = Depends(get_db)):
    try:
        db.update_block_content(block.block_id, block.new_content)
        return {"status": "success"}
    except BlockNotFoundError:
        raise HTTPException(status_code=404, detail="Block not found")


@app.put(
    "/db/{db_name}/blocks/parent",
    responses={
        200: {
            "description": "Block parent updated successfully",
            "content": {"application/json": {"example": {"status": "success"}}},
        },
        400: {
            "description": "Bad request - Invalid parent relationship",
            "content": {
                "application/json": {
                    "example": {"detail": "Invalid parent relationship"}
                }
            },
        },
        404: {
            "description": "Block not found",
            "content": {"application/json": {"example": {"detail": "Block not found"}}},
        },
    },
)
def update_block_parent(db_name: str, block: BlockUpdateParent, db: UserDatabase = Depends(get_db)):
    try:
        db.update_block_parent(
            block.block_id, block.new_page_id, block.new_parent_block_id
        )
        return {"status": "success"}
    except BlockNotFoundError:
        raise HTTPException(status_code=404, detail="Block not found")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.delete(
    "/db/{db_name}/blocks/{block_id}",
    responses={
        200: {
            "description": "Block deleted successfully",
            "content": {"application/json": {"example": {"status": "success"}}},
        },
        404: {
            "description": "Block not found",
            "content": {"application/json": {"example": {"detail": "Block not found"}}},
        },
    },
)
def delete_block(db_name: str, block_id: str, db: UserDatabase = Depends(get_db)):
    try:
        db.delete_block(block_id)
        return {"status": "success"}
    except BlockNotFoundError:
        raise HTTPException(status_code=404, detail="Block not found")


# Route for workspaces
class Workspace(BaseModel):
    workspace_id: int
    name: str
    color: str


class WorkspaceCreate(BaseModel):
    name: str
    color: str


class WorkspaceUpdate(BaseModel):
    workspace_id: int
    new_name: str
    new_color: str


@app.post(
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
def add_workspace(db_name: str, workspace: WorkspaceCreate, db: UserDatabase = Depends(get_db)):
    workspace_id = db.add_workspace(workspace.name, workspace.color)
    workspace_data = db.get_workspace_by_id(workspace_id)
    if not workspace_data:
        raise HTTPException(status_code=404, detail="Workspace not found")
    return Workspace(
        workspace_id=workspace_data[0],
        name=workspace_data[1],
        color=workspace_data[2],
    )


@app.get(
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
    workspace_data = db.get_workspace_by_id(workspace_id)
    if not workspace_data:
        raise HTTPException(status_code=404, detail="Workspace not found")
    return Workspace(
        workspace_id=workspace_data[0],
        name=workspace_data[1],
        color=workspace_data[2],
    )


@app.get(
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


@app.put(
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
def update_workspace(db_name: str, workspace: WorkspaceUpdate, db: UserDatabase = Depends(get_db)):
    try:
        db.update_workspace(
            workspace.workspace_id, workspace.new_name, workspace.new_color
        )
        return {"status": "success"}
    except WorkspaceNotFoundError:
        raise HTTPException(status_code=404, detail="Workspace not found")


@app.delete(
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
def delete_workspace(db_name: str, workspace_id: int, db: UserDatabase = Depends(get_db)):
    try:
        db.delete_workspace(workspace_id)
        return {"status": "success"}
    except WorkspaceNotFoundError:
        raise HTTPException(status_code=404, detail="Workspace not found")


# Database management endpoints
class DatabaseCreate(BaseModel):
    name: str
    path: str


@app.get(
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
                            "created_at": "2023-01-01T00:00:00"
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


@app.post(
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
    success = sys_db.add_user_database(db_create.name, db_create.path)
    if not success:
        raise HTTPException(status_code=409, detail=f"Database with name '{db_create.name}' already exists")
    return {"status": "success"}
