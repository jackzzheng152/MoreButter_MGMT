from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from datetime import datetime
from pydantic import BaseModel

from app.database import get_db
from app.models.employee import Employee
from app.services import bamboo_hr, seven_shifts

router = APIRouter()

class BambooHRRemoveRequest(BaseModel):
    bamboo_hr_id: str

class SevenShiftsRemoveRequest(BaseModel):
    seven_shift_id: str

@router.post("/bamboohr/remove")
async def remove_from_bamboohr(request: BambooHRRemoveRequest, db: Session = Depends(get_db)):
    """Remove an employee from BambooHR"""
    try:
        # Update employment status to Terminated
        result = bamboo_hr.update_employment_status(
            bamboo_hr_id=request.bamboo_hr_id,
            db=db,
            status_date=datetime.now().strftime("%Y-%m-%d"),
            employment_status="Terminated",
            termination_type="Termination (Involuntary)",
            termination_reason="Other employment",
            eligible_for_rehire="No",
            termination_regrettable="No"
        )
        
        if not result:
            raise HTTPException(status_code=400, detail="Failed to remove employee from BambooHR")
            
        return {"message": "Successfully removed employee from BambooHR"}
    except Exception as e:
        print("ERROR: ", e)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/7shifts/remove")
async def remove_from_7shifts(request: SevenShiftsRemoveRequest, db: Session = Depends(get_db)):
    """Remove an employee from 7shifts by deactivating their account"""
    try:
        # Get the employee from our database
        employee = db.query(Employee).filter(Employee.sevenshift_id == request.seven_shift_id).first()
        if not employee:
            raise HTTPException(status_code=404, detail="Employee not found")
            
        # Deactivate the employee in 7shifts
        success = await seven_shifts.deactivate_7shifts_user(
            user_id=request.seven_shift_id,
            inactive_reason="terminated_or_let_go",
            inactive_comments="Employee terminated from system"
        )
        
        if not success:
            raise HTTPException(status_code=400, detail="Failed to remove employee from 7shifts")
            
        return {"message": "Successfully removed employee from 7shifts"}
    except Exception as e:
        print("ERROR: ", e)
        raise HTTPException(status_code=500, detail=str(e)) 