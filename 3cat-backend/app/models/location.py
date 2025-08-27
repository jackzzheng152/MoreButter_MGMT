# app/models/job_title.py
from sqlalchemy import Column, Integer, String, Text, Enum
from app.database import Base
import enum

class RateTypeEnum(str, enum.Enum):
    min = "min"
    mid = "mid"
    max = "max"

class Location(Base):
    __tablename__ = "locations"
    
    location_id = Column(Integer, primary_key=True)
    location_code = Column(String(10), nullable=False)
    location_name = Column(String(100), nullable=True)
    rate_type = Column(Enum(RateTypeEnum), nullable=False, default="min") 
    sevenshift_location_id = Column(String, nullable=True)
    sevenshift_store_id = Column(String, nullable=True)
   
    # Add other columns if you need them