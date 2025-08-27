# routes/file_upload.py
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from sqlalchemy.orm import Session
from app.api import deps
from app.services.file_upload_service import FileUploadService
import azure.storage.blob as azure_blob


router = APIRouter()

@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    container_name: str = Form(...),
    location_id: int = Form(...),
    db: Session = Depends(deps.get_db)
):
    """
    Upload a file to Azure blob storage
    """
    try:
        # Validate file type (optional - you can customize this)
        if not file.filename:
            raise HTTPException(status_code=400, detail="No file provided")
        
        # Read file content
        file_content = await file.read()
        
        # Upload to blob storage
        result = await FileUploadService.upload_file_to_blob(
            file_content=file_content,
            filename=file.filename,
            container_name=container_name,
            location_id=location_id,
            db=db
        )
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}") 