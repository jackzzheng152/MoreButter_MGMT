# app/models/job_level.py
from sqlalchemy import Column, Integer, String, Float, Boolean
from app.database import Base

class JobLevel(Base):
    __tablename__ = "job_levels"
    
    level_id = Column(Integer, primary_key=True)
    level_code = Column(String, nullable=False, unique=True, index=True)
    level_name = Column(String, nullable=False)
    department_id = Column(Integer, nullable=True)
    is_hourly = Column(Boolean, default=True)
    min_rate = Column(Float, nullable=True)
    mid_rate = Column(Float, nullable=True)
    max_rate = Column(Float, nullable=True)
    employment_type = Column(String, nullable=True)