from sqlalchemy import Column, Integer, String, Float, DateTime, func
from sqlalchemy.orm import relationship

from app.database import Base

class Employee(Base):
    __tablename__ = "employees"
    
    employee_id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, nullable=False, index=True)
    first_name = Column(String, nullable=True)
    last_name = Column(String, nullable=True)
    department = Column(String, nullable=True)
    current_compensation = Column(Float, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    gusto_id = Column(String, nullable=True)
    sevenshift_id = Column(String, nullable=True)
    current_title_id = Column(Integer, nullable=True)
    current_level_id = Column(Integer, nullable=True)
    location_id = Column(Integer, nullable=True)
    department_id = Column(Integer, nullable=True)
    punch_id = Column(Integer, nullable=True)
    status = Column(String, nullable=True)
    manager_id = Column(Integer, nullable=True)
    phone = Column(String, nullable=True)


    #relationships
    submissions = relationship("Submission", back_populates="employee")
    compensation_logs = relationship("CompensationLog", back_populates="employee")
    seven_shifts_logs = relationship("SevenShiftsLog", back_populates="employee")
    pending_changes = relationship("PendingCompensationChange", back_populates="employee")