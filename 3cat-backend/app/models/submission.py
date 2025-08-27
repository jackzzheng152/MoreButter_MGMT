from sqlalchemy import Column, Integer, String, Boolean, Float, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship

from app.database import Base

class Submission(Base):
    __tablename__ = "submissions"
    
    id = Column(Integer, primary_key=True, index=True)
    form_id = Column(Integer, ForeignKey("forms.id", ondelete="CASCADE"))
    employee_id = Column(Integer, ForeignKey("employees.employee_id", ondelete="SET NULL"), nullable=True)
    submission_id = Column(String, unique=True, nullable=False, index=True)
    score = Column(Float, nullable=True)
    passed = Column(Boolean, nullable=True)
    submission_data = Column(JSONB, nullable=False)
    processed = Column(Boolean, default=False)
    bamboo_hr_updated = Column(Boolean, default=False)
    compensation_updated = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    form = relationship("Form", back_populates="submissions")
    employee = relationship("Employee", back_populates="submissions")
    bamboo_logs = relationship("BambooHRLog", back_populates="submission")
    compensation_logs = relationship("CompensationLog", back_populates="submission")