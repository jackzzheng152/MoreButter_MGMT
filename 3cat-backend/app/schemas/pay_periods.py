# app/schemas/pay_periods.py
from sqlalchemy import Column, String, Date, DateTime, CheckConstraint
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func

Base = declarative_base()

class PayPeriod(Base):
    __tablename__ = 'pay_periods'
    
    id = Column(String(255), primary_key=True)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    status = Column(String(50), nullable=False)
    location = Column(String(50), nullable=False)
    location_id = Column(String(20), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    __table_args__ = (
        CheckConstraint("status IN ('pending', 'in-progress', 'completed')", name='check_status'),
    )