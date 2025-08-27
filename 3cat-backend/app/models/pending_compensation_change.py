from sqlalchemy import Column, Integer, Float, String, Boolean, Date, DateTime, ForeignKey, Text, JSON, func
from sqlalchemy.orm import relationship

from app.database import Base

class PendingCompensationChange(Base):
    __tablename__ = "pending_compensation_changes"
    
    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.employee_id"), nullable=False)
    new_compensation = Column(Float, nullable=False)
    effective_date = Column(Date, nullable=False)
    reason = Column(Text, nullable=True)
    title_id = Column(Integer, ForeignKey("job_titles.title_id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    processed = Column(Boolean, default=False)
    
    # New fields for Tally integration
    submission_id = Column(String, nullable=True, index=True)
    form_id = Column(String, nullable=True)
    event_id = Column(String, nullable=True)
    submitter_name = Column(String, nullable=True)
    submitter_code = Column(String, nullable=True)
    review_status = Column(String, nullable=True, default="pending")
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    reviewed_by = Column(String, nullable=True)
    review_notes = Column(Text, nullable=True)
    location_id = Column(String, nullable=True)
    location_name = Column(String, nullable=True)
    position_id = Column(String, nullable=True)
    position_name = Column(String, nullable=True)
    status_id = Column(String, nullable=True)
    status_name = Column(String, nullable=True)
    raw_data = Column(JSON, nullable=True)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)
    
    # Relationships
    employee = relationship("Employee", back_populates="pending_changes")
    job_title = relationship("JobTitle")
    
    def __repr__(self):
        return f"<PendingCompensationChange(id={self.id}, employee_id={self.employee_id}, status={self.review_status or 'pending'})>"