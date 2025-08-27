# app/models/seven_shifts_log.py
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship

from app.database import Base

class SevenShiftsLog(Base):
    __tablename__ = "seven_shifts_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.employee_id"), nullable=True)
    request_type = Column(String, nullable=False)
    request_endpoint = Column(String, nullable=False)
    request_payload = Column(JSONB, nullable=True)
    response_status = Column(Integer, nullable=True)
    response_body = Column(JSONB, nullable=True)
    success = Column(Boolean, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationship to the Employee model
    employee = relationship("Employee", back_populates="seven_shifts_logs")