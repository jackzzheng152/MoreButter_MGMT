# schemas/time_punch.py
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class BreakModel(BaseModel):
    in_time: Optional[str] = None
    out: Optional[str] = None
    paid: Optional[bool] = False

class TimePunchBase(BaseModel):
    user_id: int
    clocked_in: str
    clocked_out: Optional[str] = None
    breaks: List[BreakModel] = []
    approved: bool = True
    deleted: bool = False

class TimePunchResponse(TimePunchBase):
    id: int
    clocked_in_pacific: Optional[str] = None
    clocked_out_pacific: Optional[str] = None
    clocked_in_date_pacific: Optional[str] = None
    shift_duration_minutes: float = 0.0
    break_duration_minutes: float = 0.0
    unpaid_break_hours: float = 0.0
    paid_break_hours: float = 0.0
    total_break_hours: float = 0.0
    net_worked_hours: float = 0.0
    regular_hours: float = 0.0
    overtime_hours: float = 0.0
    double_ot_hours: float = 0.0


class TimePunchFilter(BaseModel):
    start_date: str
    end_date: str 
    location_id: Optional[int] = None
    approved: Optional[bool] = None
    deleted: bool = False

class BreakPeriod(BaseModel):
    id: Optional[int]
    start_time: str  # e.g., "12:30 PM"
    end_time: str    # e.g., "1:00 PM"
    is_unpaid: bool
    duration_minutes: float
    
class ShiftDisplayResponse(BaseModel):
    """Schema for frontend shift display"""
    user_id: int
    user_name: Optional[str] = None
    employee_id: Optional[str] = None
    clocked_in_pacific: str
    clocked_out_pacific: str
    clocked_in_date_pacific: str
    unpaid_break_hours: float
    regular_hours: float
    overtime_hours: float
    double_ot_hours: float
    net_worked_hours: float
    break_duration_minutes: float
    break_periods: List[BreakPeriod]  # NEW: Detailed break timing
    unpaid_break_hours: float
    paid_break_hours: float
    total_break_hours: float
