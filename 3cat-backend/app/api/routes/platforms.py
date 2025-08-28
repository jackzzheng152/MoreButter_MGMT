from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from datetime import datetime
from pydantic import BaseModel

from app.database import get_db
from app.models.employee import Employee
from app.services import seven_shifts

router = APIRouter()

class SevenShiftsRemoveRequest(BaseModel):
    seven_shift_id: str

# BambooHR removal route removed - direct to 7shifts

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