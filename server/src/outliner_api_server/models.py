from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class UserDatabaseModel(BaseModel):
    """
    Pydantic model for user database entries in the system database.
    """
    id: int
    name: str
    path: str
    created_at: datetime


class PageModel(BaseModel):
    """
    Pydantic model for page entries in the user database.
    """
    page_id: str
    title: str
    created_at: datetime


class BlockModel(BaseModel):
    """
    Pydantic model for block entries in the user database.
    """
    block_id: str
    content: str
    page_id: Optional[str] = None
    parent_block_id: Optional[str] = None
    position: int
    created_at: datetime


class WorkspaceModel(BaseModel):
    """
    Pydantic model for workspace entries in the user database.
    """
    workspace_id: int
    name: str
    color: str