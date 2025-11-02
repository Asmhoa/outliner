from fastapi import APIRouter, Depends, HTTPException
from outliner_api_server.userdb import UserDatabase
from outliner_api_server.routers.dependencies import get_db
from outliner_api_server.routers.models import Block, BlockCreate, BlockUpdateContent, BlockUpdateParent
from outliner_api_server.errors import BlockNotFoundError


router = APIRouter()


@router.post(
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
    try:
        block_id = db.add_block(
            block.content, block.position, block.page_id, block.parent_block_id
        )
        block_data = db.get_block_content_by_id(block_id)
        return Block(
            block_id=block_data[0],
            content=block_data[1],
            page_id=block_data[2],
            parent_block_id=block_data[3],
            position=block_data[4],
            created_at=block_data[5],
        )
    except BlockNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get(
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
    try:
        block_data = db.get_block_content_by_id(block_id)
        return Block(
            block_id=block_data[0],
            content=block_data[1],
            page_id=block_data[2],
            parent_block_id=block_data[3],
            position=block_data[4],
            created_at=block_data[5],
        )
    except BlockNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get(
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


@router.put(
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
def update_block_content(
    db_name: str, block: BlockUpdateContent, db: UserDatabase = Depends(get_db)
):
    try:
        db.update_block_content(block.block_id, block.new_content)
        return {"status": "success"}
    except BlockNotFoundError:
        raise HTTPException(status_code=404, detail="Block not found")


@router.put(
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
def update_block_parent(
    db_name: str, block: BlockUpdateParent, db: UserDatabase = Depends(get_db)
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