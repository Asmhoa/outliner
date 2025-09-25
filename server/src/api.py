from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from data import Database
import os
from datetime import datetime

# Construct the absolute path to the database file
current_dir = os.path.dirname(os.path.realpath(__file__))
DATABASE_PATH = os.path.join(current_dir, "data.db")

app = FastAPI()

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

def get_db():
    db = Database(DATABASE_PATH)
    try:
        yield db
    finally:
        db.close_conn()

@app.on_event("startup")
def startup_event():
    db = Database(DATABASE_PATH)
    db.create_new_database() # no-op if already exists
    db.close_conn()

class Page(BaseModel):
    page_id: int
    title: str
    created_at: datetime

class PageCreate(BaseModel):
    title: str

class PageRename(BaseModel):
    page_id: int
    new_title: str

class PageDelete(BaseModel):
    page_id: int

@app.post("/pages")
def add_page(page: PageCreate, db: Database = Depends(get_db)):
    page_id = db.add_page(page.title)
    return {"page_id": page_id}

@app.get("/pages/{page_id}", response_model=Page)
def get_page(page_id: int, db: Database = Depends(get_db)):
    page_data = db.get_page_by_id(page_id)
    if not page_data:
        raise HTTPException(status_code=404, detail="Page not found")
    return Page(page_id=page_data[0], title=page_data[1], created_at=page_data[2])

@app.get("/pages", response_model=list[Page])
def get_pages(db: Database = Depends(get_db)):
    pages_data = db.get_pages()
    return [Page(page_id=p[0], title=p[1], created_at=p[2]) for p in pages_data]

@app.put("/pages")
def rename_page(page: PageRename, db: Database = Depends(get_db)):
    if not db.rename_page(page.page_id, page.new_title):
        raise HTTPException(status_code=404, detail="Page not found")
    return {"status": "success"}

@app.delete("/pages")
def delete_page(page: PageDelete, db: Database = Depends(get_db)):
    if not db.delete_page(page.page_id):
        raise HTTPException(status_code=404, detail="Page not found")
    return {"status": "success"}


# Route for blocks
class Block(BaseModel):
    block_id: int
    content: str
    page_id: int | None = None
    parent_block_id: int | None = None
    position: int
    created_at: datetime


class BlockCreate(BaseModel):
    content: str
    position: int
    page_id: int | None = None
    parent_block_id: int | None = None

class BlockUpdateContent(BaseModel):
    block_id: int
    new_content: str


class BlockUpdateParent(BaseModel):
    block_id: int
    new_page_id: int | None = None
    new_parent_block_id: int | None = None

class BlockDelete(BaseModel):
    block_id: int

@app.post("/blocks")
def add_block(block: BlockCreate, db: Database = Depends(get_db)):
    block_id = db.add_block(
        block.content, block.position, block.page_id, block.parent_block_id
    )
    return {"block_id": block_id}

@app.get("/block/{block_id}", response_model=Block)
def get_block(block_id: int, db: Database = Depends(get_db)):
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

@app.get("/blocks/{page_id}", response_model=list[Block])
def get_blocks(page_id: int, db: Database = Depends(get_db)):
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


@app.put("/blocks/content")
def update_block_content(block: BlockUpdateContent, db: Database = Depends(get_db)):
    if not db.update_block_content(block.block_id, block.new_content):
        raise HTTPException(status_code=404, detail="Block not found")
    return {"status": "success"}


@app.put("/blocks/parent")
def update_block_parent(block: BlockUpdateParent, db: Database = Depends(get_db)):
    if not db.update_block_parent(
        block.block_id, block.new_page_id, block.new_parent_block_id
    ):
        raise HTTPException(status_code=404, detail="Block not found or invalid parent update")
    return {"status": "success"}


@app.delete("/blocks")
def delete_block(block: BlockDelete, db: Database = Depends(get_db)):
    if not db.delete_block(block.block_id):
        raise HTTPException(status_code=404, detail="Block not found")
    return {"status": "success"}
