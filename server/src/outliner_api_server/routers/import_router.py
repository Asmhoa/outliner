from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from outliner_api_server.db.sysdb import SystemDatabase
from outliner_api_server.routers.dependencies import get_sys_db
import shutil
import os
from pathlib import Path
import uuid

router = APIRouter()

@router.post("/databases/import")
async def import_database(
    file: UploadFile = File(...),
    name: str = None,
    sys_db: SystemDatabase = Depends(get_sys_db)
):
    """
    Import a database file
    """
    # Validate file type
    if not file.filename.endswith(('.db', '.sqlite', '.sqlite3')):
        raise HTTPException(status_code=400, detail="Invalid file type. Please upload a .db, .sqlite, or .sqlite3 file")
    
    # If name is not provided, create one from the filename
    if not name:
        name = Path(file.filename).stem  # Remove file extension
    
    # Check if database with this name already exists
    try:
        existing_db = sys_db.get_user_database(name)
        if existing_db:
            raise HTTPException(status_code=409, detail=f"Database with name '{name}' already exists")
    except:
        # Database doesn't exist, which is what we want
        pass
    
    # Create a temporary file
    temp_file_path = f"/tmp/{uuid.uuid4()}.db"
    try:
        with open(temp_file_path, "wb") as f:
            shutil.copyfileobj(file.file, f)
        
        # Add the database to the system database
        sys_db.add_user_database_from_file(name, temp_file_path)
        
        # Clean up the temporary file
        os.remove(temp_file_path)
        
        return {"status": "success", "database_name": name}
    except Exception as e:
        # Clean up the temporary file in case of error
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)
        raise HTTPException(status_code=500, detail=f"Failed to import database: {str(e)}")