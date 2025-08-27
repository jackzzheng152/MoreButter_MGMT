from pydantic import BaseModel
from typing import Optional

class FormBase(BaseModel):
    tally_form_id: str
    form_name: str
    form_type: str
    
class FormCreate(FormBase):
    compensation_field_id: Optional[str] = None
    passing_score: Optional[float] = 30.0
    compensation_increase: Optional[float] = None
    bamboo_compensation_field: Optional[str] = "compensation"

class FormUpdate(BaseModel):
    form_name: Optional[str] = None
    form_type: Optional[str] = None
    compensation_field_id: Optional[str] = None
    passing_score: Optional[float] = None
    compensation_increase: Optional[float] = None
    bamboo_compensation_field: Optional[str] = None

class Form(FormBase):
    id: int
    passing_score: float
    compensation_increase: Optional[float] = None
    
    class Config:
        orm_mode = True