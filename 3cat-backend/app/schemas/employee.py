from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime
from typing import List

class MatchEmployeesRequest(BaseModel):
    user_ids: List[str]


class EmployeeBase(BaseModel):
    email: Optional[EmailStr] = None
    bamboo_hr_id: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    department: Optional[str] = None
    current_compensation: Optional[float] = None
    gusto_id: Optional[str] = None
    sevenshift_id: Optional[str] = None
    

class EmployeeCreate(EmployeeBase):
    email: EmailStr
    bamboo_hr_id: str
    first_name: str
    last_name: str
    location_id: Optional[int] = None
    department: Optional[str] = None
    current_compensation: Optional[float] = None
    gusto_id: Optional[str] = None
    sevenshift_id: Optional[str] = None
    current_title_id: Optional[int] = None
    current_level_id: Optional[int] = None
    department_id: Optional[int] = None
    punch_id: Optional[int] = None
    status: Optional[str] = None
   

class EmployeeUpdate(EmployeeBase):
    bamboo_hr_id: Optional[str] = None
    sevenshift_id: Optional[str] = None
    current_compensation: Optional[float] = None
    email: Optional[EmailStr] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    department: Optional[str] = None
    current_title_id: Optional[int] = None
    current_level_id: Optional[int] = None
    location_id: Optional[int] = None
    department_id: Optional[int] = None
    pay_rate: Optional[float] = None
    punch_id: Optional[int] = None
    status: Optional[str] = None
    
    class Config:
        orm_mode = True

class Employee(EmployeeBase):
    id: int
    
    class Config:
        orm_mode = True



class EmployeeResponse(BaseModel):
    employee_id: int
    email: EmailStr
    bamboo_hr_id: Optional[str]
    first_name: Optional[str]
    last_name: Optional[str]
    department: Optional[str]
    created_at: Optional[datetime]
    updated_at: Optional[datetime]
    department_id: Optional[int]
    current_level_id: Optional[int]
    current_title_id: Optional[int]
    location_id: Optional[int]
    manager_id: Optional[int]
    phone: Optional[str]
    current_compensation: Optional[float]
    gusto_id: Optional[str]
    sevenshift_id: Optional[str]
    punch_id: Optional[int]

    class Config:
        orm_mode = True


