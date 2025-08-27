from pydantic import BaseModel
from datetime import date, datetime
from typing import Optional, Dict, Any, List, Literal


class PendingCompensationChangeBase(BaseModel):
    employee_id: int
    new_compensation: float
    effective_date: date
    reason: Optional[str] = None
    title_id: Optional[int] = None


class PendingCompensationChangeCreate(PendingCompensationChangeBase):
    """Schema for manually creating a compensation change"""
    pass


class TallyFieldOption(BaseModel):
    id: str
    text: str


class TallyField(BaseModel):
    key: str
    label: str
    type: str
    value: Any
    options: Optional[List[TallyFieldOption]] = None


class TallyFormData(BaseModel):
    responseId: str
    submissionId: str
    respondentId: str
    formId: str
    formName: str
    createdAt: datetime
    fields: List[TallyField]


class TallyWebhookSchema(BaseModel):
    eventId: str
    eventType: Literal["FORM_RESPONSE"]
    createdAt: datetime
    data: TallyFormData


class PendingCompensationChange(PendingCompensationChangeBase):
    id: int
    created_at: datetime
    processed: bool
    
    # Additional fields for Tally integration
    submission_id: Optional[str] = None
    form_id: Optional[str] = None
    event_id: Optional[str] = None
    submitter_name: Optional[str] = None
    submitter_code: Optional[float] = None
    review_status: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    reviewed_by: Optional[str] = None
    review_notes: Optional[str] = None
    location_id: Optional[str] = None
    location_name: Optional[str] = None
    position_id: Optional[str] = None
    position_name: Optional[str] = None
    status_id: Optional[str] = None
    status_name: Optional[str] = None
    
    class Config:
        from_attributes = True  # For Pydantic v2


class PendingCompensationChangeUpdate(BaseModel):
    new_compensation: Optional[float] = None
    effective_date: Optional[date] = None
    reason: Optional[str] = None
    title_id: Optional[int] = None
    processed: Optional[bool] = None
    review_status: Optional[str] = None
    reviewed_by: Optional[str] = None
    review_notes: Optional[str] = None


class PendingCompensationChangeDetail(PendingCompensationChange):
    """Schema with additional details about employee and job title"""
    employee_name: Optional[str] = None
    employee_email: Optional[str] = None
    employee_code: Optional[float] = None
    title_name: Optional[str] = None


class ReviewRequest(BaseModel):
    """Schema for review request"""
    reviewer: str
    notes: Optional[str] = None