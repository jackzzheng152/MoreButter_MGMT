# models/pay_period.py
from pydantic import BaseModel, Field, validator
from typing import Optional, Literal
from datetime import date, datetime

StatusType = Literal['pending', 'in-progress', 'completed']

class PayPeriodBase(BaseModel):
    """Base pay period model with common fields"""
    start_date: date = Field(..., alias='startDate', description="Pay period start date")
    end_date: date = Field(..., alias='endDate', description="Pay period end date")
    status: StatusType = Field(default='pending', description="Pay period status")
    location: str = Field(..., min_length=1, max_length=50, description="Location identifier")
    location_id: str = Field(..., alias='locationId', min_length=1, max_length=20, description="Numeric location ID")
    
    class Config:
        allow_population_by_field_name = True
        use_enum_values = True

class PayPeriod(PayPeriodBase):
    """Main PayPeriod model that matches frontend TypeScript interface"""
    id: str = Field(..., min_length=1, max_length=255, description="Unique pay period identifier")
    
    @validator('end_date')
    def validate_end_date(cls, v, values):
        if 'start_date' in values and v < values['start_date']:
            raise ValueError('End date must be after or equal to start date')
        return v

class PayPeriodCreate(PayPeriodBase):
    """Model for creating a new pay period"""
    id: str = Field(..., min_length=1, max_length=255, description="Unique pay period identifier")
    
    @validator('end_date')
    def validate_end_date(cls, v, values):
        if 'start_date' in values and v < values['start_date']:
            raise ValueError('End date must be after or equal to start date')
        return v

class PayPeriodUpdate(BaseModel):
    """Model for updating an existing pay period"""
    start_date: Optional[date] = Field(None, alias='startDate')
    end_date: Optional[date] = Field(None, alias='endDate')
    status: Optional[StatusType] = None
    location: Optional[str] = Field(None, min_length=1, max_length=50)
    location_id: Optional[str] = Field(None, alias='locationId', min_length=1, max_length=20)
    
    class Config:
        allow_population_by_field_name = True
        use_enum_values = True
    
    @validator('end_date')
    def validate_end_date(cls, v, values):
        if v and 'start_date' in values and values['start_date'] and v < values['start_date']:
            raise ValueError('End date must be after or equal to start date')
        return v

class PayPeriodResponse(BaseModel):
    """Model for pay period responses"""
    id: str
    start_date: date = Field(..., alias='startDate', description="Pay period start date")
    end_date: date = Field(..., alias='endDate', description="Pay period end date")
    status: StatusType = Field(..., description="Pay period status")
    location: str = Field(..., min_length=1, max_length=50, description="Location identifier")
    location_id: str = Field(..., alias='locationId', min_length=1, max_length=20, description="Numeric location ID")
    created_at: Optional[datetime] = Field(None, alias='createdAt')
    updated_at: Optional[datetime] = Field(None, alias='updatedAt')
    
    class Config:
        allow_population_by_field_name = True
        use_enum_values = True
        from_attributes = True  # This is the new name for orm_mode in Pydantic v2

class PayPeriodListResponse(BaseModel):
    """Model for pay period list responses"""
    success: bool = True
    data: list[PayPeriodResponse]
    total: Optional[int] = None

class PayPeriodSingleResponse(BaseModel):
    """Model for single pay period responses"""
    success: bool = True
    data: PayPeriodResponse

class ErrorResponse(BaseModel):
    """Model for error responses"""
    success: bool = False
    message: str
    details: Optional[str] = None

# Helper functions for converting between different model types
def create_to_pay_period(create_data: PayPeriodCreate) -> PayPeriod:
    """Convert PayPeriodCreate to PayPeriod"""
    return PayPeriod(**create_data.dict())

def db_to_response(db_pay_period) -> PayPeriodResponse:
    """Convert SQLAlchemy PayPeriod to PayPeriodResponse"""
    return PayPeriodResponse(
        id=db_pay_period.id,
        startDate=db_pay_period.start_date,
        endDate=db_pay_period.end_date,
        status=db_pay_period.status,
        location=db_pay_period.location,
        locationId=db_pay_period.location_id,
        createdAt=db_pay_period.created_at,
        updatedAt=db_pay_period.updated_at
    )