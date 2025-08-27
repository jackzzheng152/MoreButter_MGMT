# app/schemas/bamboo_webhook.py
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from datetime import date

# Base classes for common structure
class BambooBaseFields(BaseModel):
    """Base fields that might be common across different webhooks"""
    home_email: Optional[str] = Field(None, alias="Home Email")
    work_email: Optional[str] = Field(None, alias="Work Email")
    
    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        extra = "allow"

class BambooBaseEmployeeData(BaseModel):
    """Base structure for employee data in BambooHR webhooks"""
    changed_fields: List[str] = Field(..., alias="changedFields")
    id: str
    
    class Config:
        populate_by_name = True

class BambooBaseWebhook(BaseModel):
    """Base structure for BambooHR webhooks"""
    
    class Config:
        populate_by_name = True

# Webhook 1: Compensation webhook
class CompensationFields(BambooBaseFields):
    """Fields for compensation data in BambooHR webhook"""
    effective_date: Optional[str] = Field(None, alias="Effective Date")
    pay_rate: Optional[str] = Field(None, alias="Pay Rate")

class CompensationEmployeeData(BambooBaseEmployeeData):
    """Employee data for compensation webhook"""
    fields: CompensationFields

class CompensationWebhook(BambooBaseWebhook):
    """Schema for BambooHR compensation webhook payload"""
    employees: List[CompensationEmployeeData]

# Webhook 2: Employee details webhook
class EmployeeDetailsFields(BambooBaseFields):
    """Fields for employee details in BambooHR webhook"""
    first_name: Optional[str] = Field(None, alias="First Name")
    last_name: Optional[str] = Field(None, alias="Last Name")
    location: Optional[str] = Field(None, alias="Location")
    department: Optional[str] = Field(None, alias="Department")
    job_title: Optional[str] = Field(None, alias="Job Title")
    pay_rate: Optional[float] = Field(None, alias="Pay Rate")
    status: Optional[str] = Field(None, alias="Employment Status - Employment Status")

class EmployeeDetailsData(BambooBaseEmployeeData):
    """Employee data for details webhook"""
    fields: EmployeeDetailsFields

class EmployeeDetailsWebhook(BambooBaseWebhook):
    """Schema for BambooHR employee details webhook payload"""
    employees: List[EmployeeDetailsData]

class JobInfoUpdateRequest(BaseModel):
    employee_id: int
    effective_date: str  # YYYY-MM-DD format
    location: Optional[str] = None
    department: Optional[str] = None
    division: Optional[str] = None
    job_title: Optional[str] = None
    reports_to: Optional[str] = None
    reason: Optional[str] = None
    submission_id: Optional[int] = None
    matching_row_id: Optional[int] = None

class EmploymentStatusUpdateRequest(BaseModel):
    submission_id: Optional[int] = None
    status_date: Optional[str] = None
    employment_status: Optional[str] = None  # Terminated, Contractor, Full-Time, etc.
    comment: Optional[str] = None
    termination_reason: Optional[str] = None  # Attendance, End of Season, etc.
    termination_type: Optional[str] = None  # Death, Resignation, Termination
    eligible_for_rehire: Optional[str] = None  # No, Upon review, Yes
    termination_regrettable: Optional[str] = None
    
    class Config:
        schema_extra = {
            "example": {
                "submission_id": 123,
                "status_date": "2025-05-17",
                "employment_status": "Terminated",
                "comment": "Employee relocated to another state",
                "termination_reason": "Relocation",
                "termination_type": "Resignation (Voluntary)",
                "eligible_for_rehire": "Yes",
                "termination_regrettable": "Regrettable"
            }
        }