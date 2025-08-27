# services/file_upload_service.py
import os
import azure.storage.blob as azure_blob
from datetime import datetime
from app.config import logger
from fastapi import HTTPException
from sqlalchemy.orm import Session
from app.models.location import Location

class FileUploadService:
    
    @staticmethod
    def get_location_code(location_id: int, db: Session) -> str:
        """Get location code from location ID"""
        location = db.query(Location).filter(Location.location_id == location_id).first()
        if location and location.location_code:
            return location.location_code
        return f"location_{location_id}"  # Fallback to ID if no code found
    
    @staticmethod
    async def upload_file_to_blob(
        file_content: bytes,
        filename: str,
        container_name: str,
        location_id: int,
        db: Session
    ) -> dict:
        """
        Upload a file to Azure blob storage
        """
        try:
            # Azure Blob Storage configuration
            connection_string = os.getenv("AZURE_STORAGE_CONNECTION_STRING")
            if not connection_string:
                logger.error("Azure Storage connection string not configured")
                raise HTTPException(status_code=500, detail="Azure Storage not configured")
            
            # Create blob service client
            blob_service_client = azure_blob.BlobServiceClient.from_connection_string(connection_string)
            
            # Get container client
            container_client = blob_service_client.get_container_client(container_name)
            
            # Create container if it doesn't exist
            try:
                container_client.get_container_properties()
            except Exception:
                container_client.create_container()
                logger.info(f"Created container: {container_name}")
            
            # Create location-based folder structure using location code
            location_code = FileUploadService.get_location_code(location_id, db)
            location_folder = f"{location_code}/"
            full_blob_name = f"{location_folder}{filename}"
            
            # Get blob client
            blob_client = container_client.get_blob_client(full_blob_name)
            
            # Upload file to blob storage
            blob_client.upload_blob(file_content, overwrite=True)
            
            logger.info(f"Successfully uploaded {filename} to {container_name}/{full_blob_name}")
            
            return {
                "success": True,
                "message": f"File uploaded successfully to {container_name}/{full_blob_name}",
                "container": container_name,
                "blob_name": full_blob_name,
                "location_id": location_id,
                "file_size": len(file_content),
                "upload_time": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error uploading file to Azure: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}") 