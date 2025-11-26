from pydantic import BaseModel
from typing import Literal


class PageCreate(BaseModel):
    title: str


class PageRename(BaseModel):
    page_id: str
    new_title: str


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


class WorkspaceCreate(BaseModel):
    name: str
    color: str


class WorkspaceUpdate(BaseModel):
    workspace_id: int
    new_name: str
    new_color: str


class DatabaseCreate(BaseModel):
    name: str


class SearchRequest(BaseModel):
    query: str
    search_type: Literal["pages", "blocks", "all"] = "all"
    limit: int = 10


class SearchResult(BaseModel):
    pages: list[dict]
    blocks: list[dict]
