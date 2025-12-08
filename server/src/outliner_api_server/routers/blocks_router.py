from fastapi import APIRouter, Depends, HTTPException
from outliner_api_server.db.userdb import UserDatabase
from outliner_api_server.db.models import BlockModel
from outliner_api_server.routers.dependencies import get_db
from outliner_api_server.routers.request_models import (
    BlockCreate,
    BlockUpdateContent,
    BlockUpdateParent,
    BlockUpdatePosition,
)
from outliner_api_server.db.errors import BlockNotFoundError


router = APIRouter()


@router.post(
    "/db/{db_id}/blocks",
    response_model=BlockModel,
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
                        "type": "text",
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
def add_block(db_id: str, block: BlockCreate, db: UserDatabase = Depends(get_db)):
    try:
        block_id = db.add_block(
            block.content, block.position, block.page_id, block.parent_block_id, block.type
        )
        block_data = db.get_block_content_by_id(block_id)
        return BlockModel(
            block_id=block_data.block_id,
            content=block_data.content,
            page_id=block_data.page_id,
            parent_block_id=block_data.parent_block_id,
            position=block_data.position,
            type=block_data.type,
            created_at=block_data.created_at,
        )
    except BlockNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get(
    "/db/{db_id}/block/{block_id}",
    response_model=BlockModel,
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
def get_block(db_id: str, block_id: str, db: UserDatabase = Depends(get_db)):
    try:
        block_data = db.get_block_content_by_id(block_id)
        return BlockModel(
            block_id=block_data.block_id,
            content=block_data.content,
            page_id=block_data.page_id,
            parent_block_id=block_data.parent_block_id,
            position=block_data.position,
            type=block_data.type,
            created_at=block_data.created_at,
        )
    except BlockNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get(
    "/db/{db_id}/blocks/{page_id}",
    response_model=list[BlockModel],
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
                            "type": "text",
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
def get_blocks(db_id: str, page_id: str, db: UserDatabase = Depends(get_db)):
    blocks_data = db.get_blocks_by_page(page_id)
    return [
        BlockModel(
            block_id=b.block_id,
            content=b.content,
            page_id=b.page_id,
            parent_block_id=b.parent_block_id,
            position=b.position,
            type=b.type,
            created_at=b.created_at,
        )
        for b in blocks_data
    ]


@router.put(
    "/db/{db_id}/blocks/content",
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
def update_block_content(
    db_id: str, block: BlockUpdateContent, db: UserDatabase = Depends(get_db)
):
    try:
        db.update_block_content(block.block_id, block.new_content)
        return {"status": "success"}
    except BlockNotFoundError:
        raise HTTPException(status_code=404, detail="Block not found")


@router.put(
    "/db/{db_id}/blocks/position",
    responses={
        200: {
            "description": "Block position updated successfully",
            "content": {"application/json": {"example": {"status": "success"}}},
        },
        404: {
            "description": "Block not found",
            "content": {"application/json": {"example": {"detail": "Block not found"}}},
        },
    },
)
def update_block_position(
    db_id: str, block: BlockUpdatePosition, db: UserDatabase = Depends(get_db)
):
    try:
        db.update_block_position(block.block_id, block.new_position)
        return {"status": "success"}
    except BlockNotFoundError:
        raise HTTPException(status_code=404, detail="Block not found")


@router.put(
    "/db/{db_id}/blocks/parent",
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
def update_block_parent(
    db_id: str, block: BlockUpdateParent, db: UserDatabase = Depends(get_db)
):
    try:
        db.update_block_parent(
            block.block_id, block.new_page_id, block.new_parent_block_id
        )
        return {"status": "success"}
    except BlockNotFoundError:
        raise HTTPException(status_code=404, detail="Block not found")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete(
    "/db/{db_id}/blocks/{block_id}",
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
def delete_block(db_id: str, block_id: str, db: UserDatabase = Depends(get_db)):
    try:
        db.delete_block(block_id)
        return {"status": "success"}
    except BlockNotFoundError:
        raise HTTPException(status_code=404, detail="Block not found")
