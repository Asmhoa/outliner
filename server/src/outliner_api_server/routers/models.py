from pydantic import BaseModel
from datetime import datetime


class Page(BaseModel):
    page_id: str
    title: str
    created_at: datetime


class PageCreate(BaseModel):
    title: str


class PageRename(BaseModel):
    page_id: str
    new_title: str


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


class DatabaseCreate(BaseModel):
    name: str
    path: str | None = None