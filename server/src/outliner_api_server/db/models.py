from datetime import datetime
from typing import Any
from pydantic import BaseModel, model_validator


class UserDatabaseModel(BaseModel):
    """
    Pydantic model for user database entries in the system database.
    """

    id: str
    name: str
    path: str
    created_at: datetime


class WorkspaceModel(BaseModel):
    """
    Pydantic model for workspace entries in the user database.
    """

    workspace_id: int
    name: str
    color: str

    @model_validator(mode="before")
    @classmethod
    def validate_color(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if "color" in data and isinstance(data["color"], (bytes, bytearray)):
                data["color"] = f"#{data['color'].hex().upper()}"
        return data


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
    page_id: str | None = None
    parent_block_id: str | None = None
    position: int
    type: str = "text"  # default to "text"
    created_at: datetime
