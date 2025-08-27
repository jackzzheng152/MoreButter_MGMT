from fastapi import APIRouter, Depends, HTTPException, status, Query, Path, Body
from typing import List, Optional
from sqlalchemy.orm import Session

from app.schemas.pending_compensation_change import (
    TallyWebhookSchema,
    PendingCompensationChange as PendingCompensationChangeSchema,
    PendingCompensationChangeDetail,
    ReviewRequest
)
from app.services import tally_service
from app.database import get_db
from app.config import logger


router = APIRouter()

# Webhook endpoint for Tally submissions
@router.post("/webhooks/tally/compensation", status_code=status.HTTP_200_OK)
async def process_tally_webhook(
    webhook_data: TallyWebhookSchema,
    db: Session = Depends(get_db)
):
    """
    Process Tally form submissions for compensation changes
    """
    try:
        result = await tally_service.process_tally_submission(webhook_data, db)
        return {"status": "success", "change_id": result.id}
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error processing Tally webhook: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process webhook: {str(e)}"
        )

# CRUD endpoints for pending compensation changes
@router.get("/compensation/pending", response_model=List[PendingCompensationChangeSchema])
async def list_pending_compensation(
    status: Optional[str] = Query(None, description="Filter by review status (pending, approved, denied)"),
    db: Session = Depends(get_db)
):
    """
    Get a list of pending compensation changes with optional filtering by status
    """
    try:
        return await tally_service.get_pending_changes(db, status)
    except Exception as e:
        logger.error(f"Error fetching pending compensation: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch pending compensation: {str(e)}"
        )

@router.get("/compensation/pending/{change_id}", response_model=PendingCompensationChangeDetail)
async def get_pending_compensation(
    change_id: int = Path(..., description="The ID of the pending compensation change to retrieve"),
    db: Session = Depends(get_db)
):
    """
    Get details for a specific pending compensation change
    """
    change = await tally_service.get_pending_change(change_id, db)
    
    if not change:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Pending compensation change with ID {change_id} not found"
        )
    
    # Create response with additional employee and job title info
    result = PendingCompensationChangeDetail.from_orm(change)
    
    # Add additional fields if employee relationship exists
    if hasattr(change, 'employee') and change.employee:
        result.employee_name = change.employee.name if hasattr(change.employee, 'name') else None
        result.employee_email = change.employee.email if hasattr(change.employee, 'email') else None
        result.employee_code = change.employee.punch_id if hasattr(change.employee, 'punch_id') else None
    
    # Add job title name if available
    if hasattr(change, 'job_title') and change.job_title:
        result.title_name = change.job_title.title_name if hasattr(change.job_title, 'title_name') else None
    
    return result

@router.post("/compensation/pending/{change_id}/approve", response_model=PendingCompensationChangeSchema)
async def approve_pending_compensation(
    change_id: int = Path(..., description="The ID of the pending compensation change to approve"),
    review_data: ReviewRequest = Body(...),
    db: Session = Depends(get_db)
):
    """
    Approve a pending compensation change
    """
    try:
        result = await tally_service.approve_change(change_id, review_data.reviewer, db)
        return result
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error approving compensation: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to approve compensation: {str(e)}"
        )

@router.post("/compensation/pending/{change_id}/deny", response_model=PendingCompensationChangeSchema)
async def deny_pending_compensation(
    change_id: int = Path(..., description="The ID of the pending compensation change to deny"),
    review_data: ReviewRequest = Body(...),
    db: Session = Depends(get_db)
):
    """
    Deny a pending compensation change
    """
    if not review_data.notes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Denial reason is required"
        )
        
    try:
        result = await tally_service.deny_change(change_id, review_data.reviewer, review_data.notes, db)
        return result
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error denying compensation: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to deny compensation: {str(e)}"
        )

@router.post("/compensation/pending/process", status_code=status.HTTP_200_OK)
async def process_approved_compensation(
    db: Session = Depends(get_db)
):
    """
    Process all approved but unprocessed compensation changes
    """
    try:
        count = await tally_service.process_approved_changes(db)
        return {"status": "success", "processed_count": count}
    except Exception as e:
        logger.error(f"Error processing approved compensation: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process approved compensation: {str(e)}"
        )