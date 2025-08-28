from sqlalchemy import Column, Integer, Float, Boolean, DateTime, ForeignKey, func, String
from sqlalchemy.orm import relationship

from app.database import Base

class CompensationLog(Base):
    __tablename__ = "compensation_history"

    id = Column(Integer, primary_key=True, index=True)  # Renamed from history_id
    employee_id = Column(Integer, ForeignKey("employees.employee_id"), nullable=False)
    submission_id = Column(Integer, ForeignKey("submissions.id"), nullable=True)
    form_id = Column(Integer, ForeignKey("forms.id"), nullable=True)
    level_id = Column(Integer, ForeignKey("job_levels.level_id"), nullable=True)
    location_id = Column(Integer, ForeignKey("locations.location_id"), nullable=True)
    previous_compensation = Column(Float, nullable=True)
    new_compensation = Column(Float, nullable=True)
    rate_amount = Column(Float, nullable=True)
    increase_amount = Column(Float, nullable=True)
    # bamboo_hr_updated field removed - no longer updating BambooHR
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    effective_date = Column(DateTime(timezone=True), nullable=True)
    employee = relationship("Employee", back_populates="compensation_logs")
    submission = relationship("Submission", back_populates="compensation_logs")
    change_reason = Column(String, nullable=True)
    new_title_id = Column(Integer, nullable=True)
    title_id = Column(Integer, nullable=True)