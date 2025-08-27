# app/models/job_title.py
from sqlalchemy import Column, Integer, String, Text
from app.database import Base

class JobTitle(Base):
    __tablename__ = "job_titles"
    
    title_id = Column(Integer, primary_key=True)
    title_name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    department_id = Column(Integer, nullable=True)
    location_id = Column(Integer, nullable=True)
    sevenshifts_role_id = Column(Integer, nullable=True)
    # Add other columns if you need them