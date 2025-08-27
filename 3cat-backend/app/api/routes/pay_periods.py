# routes/pay_periods.py
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date

from app.models.pay_period import (
    PayPeriodCreate, 
    PayPeriodUpdate, 
    PayPeriodResponse, 
    PayPeriodListResponse,
    PayPeriodSingleResponse,
    ErrorResponse,
    StatusType,
    db_to_response  # Import the helper function
)
from app.services.pay_period_service import PayPeriodService
from app.api import deps  # Using your existing deps pattern

router = APIRouter()

def get_pay_period_service(db: Session = Depends(deps.get_db)) -> PayPeriodService:
    """Dependency to get PayPeriodService instance"""
    return PayPeriodService(db)

@router.get("", response_model=PayPeriodListResponse)
async def get_pay_periods(
    location: Optional[str] = Query(None, description="Filter by location"),
    status: Optional[StatusType] = Query(None, description="Filter by status"),
    service: PayPeriodService = Depends(get_pay_period_service)
):
    """Get all pay periods with optional filters"""
    try:
        if location:
            pay_periods = service.get_pay_periods_by_location(location)
        elif status:
            pay_periods = service.get_pay_periods_by_status(status)
        else:
            pay_periods = service.get_all_pay_periods()
        
        # Convert to response format using helper function
        pay_period_responses = [
            db_to_response(pp) for pp in pay_periods
        ]
        
        return PayPeriodListResponse(
            success=True,
            data=pay_period_responses,
            total=len(pay_period_responses)
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch pay periods: {str(e)}")

@router.get("/{pay_period_id}", response_model=PayPeriodSingleResponse)
async def get_pay_period(
    pay_period_id: str,
    service: PayPeriodService = Depends(get_pay_period_service)
):
    """Get a single pay period by ID"""
    try:
        pay_period = service.get_pay_period_by_id(pay_period_id)
        
        if not pay_period:
            raise HTTPException(status_code=404, detail="Pay period not found")
        
        return PayPeriodSingleResponse(
            success=True,
            data=db_to_response(pay_period)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch pay period: {str(e)}")

@router.post("", response_model=PayPeriodSingleResponse, status_code=201)
async def create_pay_period(
    pay_period_data: PayPeriodCreate,
    service: PayPeriodService = Depends(get_pay_period_service)
):
    """Create a new pay period"""
    try:
        # Check for overlapping pay periods in the same location
        overlapping = service.get_overlapping_pay_periods(
            pay_period_data.start_date,
            pay_period_data.end_date,
            pay_period_data.location
        )
        
        if overlapping:
            raise HTTPException(
                status_code=400, 
                detail=f"Pay period overlaps with existing period(s): {[pp.id for pp in overlapping]}"
            )
        
        created_pay_period = service.create_pay_period(pay_period_data)
        
        return PayPeriodSingleResponse(
            success=True,
            data=db_to_response(created_pay_period)
        )
        
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create pay period: {str(e)}")

@router.put("/{pay_period_id}", response_model=PayPeriodSingleResponse)
async def update_pay_period(
    pay_period_id: str,
    update_data: PayPeriodUpdate,
    service: PayPeriodService = Depends(get_pay_period_service)
):
    """Update an existing pay period"""
    try:
        # Get current pay period
        current_pay_period = service.get_pay_period_by_id(pay_period_id)
        if not current_pay_period:
            raise HTTPException(status_code=404, detail="Pay period not found")
        
        # Check for overlapping pay periods if dates are being updated
        if update_data.start_date or update_data.end_date:
            start_date = update_data.start_date or current_pay_period.start_date
            end_date = update_data.end_date or current_pay_period.end_date
            location = update_data.location or current_pay_period.location
            
            overlapping = service.get_overlapping_pay_periods(
                start_date, end_date, location, exclude_id=pay_period_id
            )
            
            if overlapping:
                raise HTTPException(
                    status_code=400,
                    detail=f"Pay period would overlap with existing period(s): {[pp.id for pp in overlapping]}"
                )
        
        updated_pay_period = service.update_pay_period(pay_period_id, update_data)
        
        return PayPeriodSingleResponse(
            success=True,
            data=db_to_response(updated_pay_period)
        )
        
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update pay period: {str(e)}")

@router.delete("/{pay_period_id}")
async def delete_pay_period(
    pay_period_id: str,
    service: PayPeriodService = Depends(get_pay_period_service)
):
    """Delete a pay period"""
    try:
        deleted = service.delete_pay_period(pay_period_id)
        
        if not deleted:
            raise HTTPException(status_code=404, detail="Pay period not found")
        
        return {"success": True, "message": "Pay period deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete pay period: {str(e)}")

@router.get("/date-range", response_model=PayPeriodListResponse)
async def get_pay_periods_in_date_range(
    start_date: date = Query(..., description="Start date (YYYY-MM-DD)"),
    end_date: date = Query(..., description="End date (YYYY-MM-DD)"),
    service: PayPeriodService = Depends(get_pay_period_service)
):
    """Get pay periods within a specific date range"""
    try:
        if start_date > end_date:
            raise HTTPException(status_code=400, detail="Start date must be before or equal to end date")
        
        pay_periods = service.get_pay_periods_in_date_range(start_date, end_date)
        
        pay_period_responses = [
            db_to_response(pp) for pp in pay_periods
        ]
        
        return PayPeriodListResponse(
            success=True,
            data=pay_period_responses,
            total=len(pay_period_responses)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch pay periods by date range: {str(e)}")

# Include this router in your main FastAPI app:
# from app.routes.pay_periods import router as pay_period_router
# app.include_router(pay_period_router, prefix="/api/pay-periods", tags=["pay-periods"])