from fastapi import APIRouter, Depends, HTTPException
from outliner_api_server.db.userdb import UserDatabase
from outliner_api_server.routers.dependencies import get_db
from outliner_api_server.routers.models import Page, PageCreate, PageRename
from outliner_api_server.db.errors import PageAlreadyExistsError, PageNotFoundError


router = APIRouter()


@router.post(
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


@router.get(
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
    try:
        page_data = db.get_page_by_id(page_id)
        return Page(
            page_id=page_data.page_id,
            title=page_data.title,
            created_at=page_data.created_at,
        )
    except PageNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get(
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
    return [
        Page(page_id=p.page_id, title=p.title, created_at=p.created_at)
        for p in pages_data
    ]


@router.put(
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


@router.delete(
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
        raise HTTPException(status_code=404, detail=f"Page with ID {page_id} not found")
