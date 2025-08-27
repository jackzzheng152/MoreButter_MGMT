from pydantic import BaseModel, Field
from typing import List, Optional, Any
from datetime import datetime, date

class SickLeaveHourEntry(BaseModel):
    """Hours for a specific date"""
    date: str
    hours: float

class TimeOffHoursRequest(BaseModel):
    """Hours for a specific date in request format"""
    date: str
    hours: float

class TimeOffFilter(BaseModel):
    """Filter parameters for time off requests based on 7shifts API parameters"""
    company_id: int
    location_id: Optional[int] = None
    user_id: Optional[int] = None
    status: Optional[int] = None  # 0=pending, 1=approved, 2=denied, 3=canceled
    category: Optional[str] = None  # paid_sick, vacation, etc.
    to_date_gte: Optional[str] = None  # Return time offs that end after a specified date
    sort_by: Optional[str] = "created"  # Sort by column
    sort_dir: Optional[str] = "asc"  # Sort direction (asc, desc)
    cursor: Optional[str] = None  # Cursor for pagination
    limit: Optional[int] = None  # Number of results per page

class TimeOffResponse(BaseModel):
    """Simplified time off response for the frontend"""
    id: int
    user_id: int
    user_name: Optional[str] = None
    gusto_id: Optional[str] = None
    from_date: str
    to_date: str
    category: str
    status: int
    amount_of_hours: float
    hours: List[SickLeaveHourEntry]

class TimeOffUpdateRequest(BaseModel):
    """Request body for updating time off status"""
    status: int
    status_action_message: Optional[str] = ""

class TimeOffCategory(BaseModel):
    """Time off category model"""
    id: str
    name: str

class TimeOffRequest(BaseModel):
    """Request body for creating a time off request"""
    user_id: int
    from_date: str
    to_date: str
    category: str
    partial: bool = False
    partial_from: Optional[str] = None
    partial_to: Optional[str] = None
    comments: Optional[str] = ""
    hours: Optional[List[TimeOffHoursRequest]] = None

class TimeOffCursorMeta(BaseModel):
    """Cursor metadata for pagination"""
    current: Optional[str] = None
    prev: Optional[str] = None
    next: Optional[str] = None
    count: int

class TimeOffMetadata(BaseModel):
    """Metadata for time off response"""
    cursor: TimeOffCursorMeta

class TimeOffListResponse(BaseModel):
    """List response for time off"""
    data: List[TimeOffResponse]
    meta: TimeOffMetadata