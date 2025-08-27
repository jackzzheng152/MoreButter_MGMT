from sqlalchemy import Column, Integer, String, Float, DateTime, func
from sqlalchemy.orm import relationship

from app.database import Base

class Form(Base):
    __tablename__ = "forms"
    
    id = Column(Integer, primary_key=True, index=True)
    tally_form_id = Column(String, unique=True, nullable=False, index=True)
    form_name = Column(String, nullable=False)
    form_type = Column(String, nullable=False)
    compensation_field_id = Column(String, nullable=True)
    passing_score = Column(Float, default=30.0)
    compensation_increase = Column(Float, nullable=True)
    bamboo_compensation_field = Column(String, default="compensation")
    job_level_code = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    submissions = relationship("Submission", back_populates="form")