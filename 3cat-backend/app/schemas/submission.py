from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime

class SubmissionBase(BaseModel):
    form_id: int
    submission_id: str

class SubmissionCreate(SubmissionBase):
    employee_id: Optional[int] = None
    score: Optional[float] = None
    passed: Optional[bool] = None
    submission_data: Dict[str, Any]

class Submission(SubmissionBase):
    id: int
    score: Optional[float]
    passed: Optional[bool]
    processed: bool
    bamboo_hr_updated: bool
    compensation_updated: bool
    created_at: datetime
    
    class Config:
        orm_mode = True

class CompensationUpdate(BaseModel):
    employee_id: int
    new_compensation: float
    reason: Optional[str] = "Test passed"