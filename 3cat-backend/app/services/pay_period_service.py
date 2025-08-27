# services/pay_period_service.py
from sqlalchemy.orm import Session
from sqlalchemy import and_, desc
from typing import List, Optional
from datetime import date

# Import ONLY the SQLAlchemy model (database model)
from app.schemas.pay_periods import PayPeriod as PayPeriodDB
# Import ONLY the Pydantic input models (API models) - NOT the main PayPeriod model
from app.models.pay_period import PayPeriodCreate, PayPeriodUpdate, StatusType

class PayPeriodService:
    """Service class for pay period operations"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def create_pay_period(self, pay_period_data: PayPeriodCreate) -> PayPeriodDB:
        """Create a new pay period"""
        try:
            # Check if pay period with same ID already exists
            existing = self.db.query(PayPeriodDB).filter(PayPeriodDB.id == pay_period_data.id).first()
            if existing:
                raise ValueError(f"Pay period with ID {pay_period_data.id} already exists")
            
            # Create new pay period
            db_pay_period = PayPeriodDB(
                id=pay_period_data.id,
                start_date=pay_period_data.start_date,
                end_date=pay_period_data.end_date,
                status=pay_period_data.status,
                location=pay_period_data.location,
                location_id=pay_period_data.location_id
            )
            
            self.db.add(db_pay_period)
            self.db.commit()
            self.db.refresh(db_pay_period)
            
            return db_pay_period
            
        except Exception as e:
            self.db.rollback()
            raise Exception(f"Failed to create pay period: {str(e)}")
    
    def get_all_pay_periods(self) -> List[PayPeriodDB]:
        """Get all pay periods ordered by start date (newest first)"""
        try:
            return self.db.query(PayPeriodDB).order_by(
                desc(PayPeriodDB.start_date), 
                desc(PayPeriodDB.created_at)
            ).all()
        except Exception as e:
            raise Exception(f"Failed to fetch pay periods: {str(e)}")
    
    def get_pay_periods_by_location(self, location: str) -> List[PayPeriodDB]:
        """Get pay periods filtered by location"""
        try:
            return self.db.query(PayPeriodDB).filter(
                PayPeriodDB.location == location
            ).order_by(
                desc(PayPeriodDB.start_date), 
                desc(PayPeriodDB.created_at)
            ).all()
        except Exception as e:
            raise Exception(f"Failed to fetch pay periods by location: {str(e)}")
    
    def get_pay_period_by_id(self, pay_period_id: str) -> Optional[PayPeriodDB]:
        """Get a single pay period by ID"""
        try:
            return self.db.query(PayPeriodDB).filter(PayPeriodDB.id == pay_period_id).first()
        except Exception as e:
            raise Exception(f"Failed to fetch pay period: {str(e)}")
    
    def update_pay_period(self, pay_period_id: str, update_data: PayPeriodUpdate) -> Optional[PayPeriodDB]:
        """Update an existing pay period"""
        try:
            db_pay_period = self.db.query(PayPeriodDB).filter(PayPeriodDB.id == pay_period_id).first()
            
            if not db_pay_period:
                raise ValueError(f"Pay period with ID {pay_period_id} not found")
            
            # Update only provided fields
            update_dict = update_data.dict(exclude_unset=True, by_alias=False)
            
            for field, value in update_dict.items():
                if hasattr(db_pay_period, field) and value is not None:
                    # Handle field name mapping
                    if field == 'start_date':
                        db_pay_period.start_date = value
                    elif field == 'end_date':
                        db_pay_period.end_date = value
                    elif field == 'location_id':
                        db_pay_period.location_id = value
                    else:
                        setattr(db_pay_period, field, value)
            
            self.db.commit()
            self.db.refresh(db_pay_period)
            
            return db_pay_period
            
        except Exception as e:
            self.db.rollback()
            raise Exception(f"Failed to update pay period: {str(e)}")
    
    def delete_pay_period(self, pay_period_id: str) -> bool:
        """Delete a pay period"""
        try:
            db_pay_period = self.db.query(PayPeriodDB).filter(PayPeriodDB.id == pay_period_id).first()
            
            if not db_pay_period:
                return False
            
            self.db.delete(db_pay_period)
            self.db.commit()
            
            return True
            
        except Exception as e:
            self.db.rollback()
            raise Exception(f"Failed to delete pay period: {str(e)}")
    
    def get_pay_periods_by_status(self, status: StatusType) -> List[PayPeriodDB]:
        """Get pay periods filtered by status"""
        try:
            return self.db.query(PayPeriodDB).filter(
                PayPeriodDB.status == status
            ).order_by(
                desc(PayPeriodDB.start_date), 
                desc(PayPeriodDB.created_at)
            ).all()
        except Exception as e:
            raise Exception(f"Failed to fetch pay periods by status: {str(e)}")
    
    def get_pay_periods_in_date_range(self, start_date: date, end_date: date) -> List[PayPeriodDB]:
        """Get pay periods within a specific date range"""
        try:
            return self.db.query(PayPeriodDB).filter(
                and_(
                    PayPeriodDB.start_date >= start_date,
                    PayPeriodDB.end_date <= end_date
                )
            ).order_by(
                desc(PayPeriodDB.start_date), 
                desc(PayPeriodDB.created_at)
            ).all()
        except Exception as e:
            raise Exception(f"Failed to fetch pay periods in date range: {str(e)}")
    
    def get_overlapping_pay_periods(self, start_date: date, end_date: date, location: str, exclude_id: Optional[str] = None) -> List[PayPeriodDB]:
        """Check for overlapping pay periods in the same location"""
        try:
            query = self.db.query(PayPeriodDB).filter(
                and_(
                    PayPeriodDB.location == location,
                    PayPeriodDB.start_date <= end_date,
                    PayPeriodDB.end_date >= start_date
                )
            )
            
            if exclude_id:
                query = query.filter(PayPeriodDB.id != exclude_id)
            
            return query.all()
            
        except Exception as e:
            raise Exception(f"Failed to check for overlapping pay periods: {str(e)}")