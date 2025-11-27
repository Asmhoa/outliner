from fastapi import APIRouter, Depends, HTTPException
from outliner_api_server.db.userdb import UserDatabase
from outliner_api_server.routers.dependencies import get_db
from outliner_api_server.db.models import PageModel, BlockModel
from outliner_api_server.routers.request_models import SearchRequest
from outliner_api_server.db.errors import PageNotFoundError, BlockNotFoundError


router = APIRouter()


@router.post(
    "/db/{db_id}/search",
    responses={
        200: {
            "description": "Search results returned successfully",
            "content": {
                "application/json": {
                    "example": {
                        "pages": [
                            {
                                "page_id": "abc123",
                                "title": "Example Page",
                                "created_at": "2023-01-01T00:00:00"
                            }
                        ],
                        "blocks": [
                            {
                                "block_id": "def456",
                                "content": "Example block content",
                                "page_id": "abc123",
                                "parent_block_id": None,
                                "position": 0,
                                "created_at": "2023-01-01T00:00:00"
                            }
                        ]
                    }
                }
            },
        },
    },
)
def search(db_id: str, search_request: SearchRequest, db: UserDatabase = Depends(get_db)):
    """
    Search for pages and/or blocks based on the provided query.
    """
    try:
        # Determine whether to escape special characters based on advanced mode
        escape_special_chars = not search_request.advanced

        # Perform search based on the search_type parameter
        if search_request.search_type == "pages":
            pages = db.search_pages(search_request.query, search_request.limit, escape_special_chars=escape_special_chars)
            blocks = []
        elif search_request.search_type == "blocks":
            pages = []
            blocks = db.search_blocks(search_request.query, search_request.limit, escape_special_chars=escape_special_chars)
        elif search_request.search_type == "all":
            pages, blocks = db.search_all(search_request.query, search_request.limit, escape_special_chars=escape_special_chars)
        else:
            raise HTTPException(status_code=400, detail="Invalid search_type. Must be 'pages', 'blocks', or 'all'")

        # Convert PageModel and BlockModel objects to dictionaries
        pages_data = [page.model_dump() for page in pages]
        blocks_data = [block.model_dump() for block in blocks]

        return {"pages": pages_data, "blocks": blocks_data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")