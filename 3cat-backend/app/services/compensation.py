from sqlalchemy.orm import Session
from datetime import datetime

from app.models.employee import Employee
from app.models.form import Form
from app.models.submission import Submission
from app.models.compensation_log import CompensationLog
from app.models.job_level import JobLevel
from app.services.bamboo_hr import get_employee_compensation, update_compensation
from app.config import logger
from app.models.job_title import JobTitle
from app.models.location import Location
from app.models.pending_compensation_change import PendingCompensationChange
async def process_compensation_update(
    employee_id: int,
    form_id: int,
    submission_id: int,
    location_code: str,  # Add location parameter
    db: Session,
    quiz_date: datetime = None,
    quiz_name: str = None,
    matching_row_id: int = None,
    effective_date_str: str = None
) -> bool:
    """Process compensation update for an employee who passed a quiz"""
    employee = db.query(Employee).filter(Employee.employee_id == employee_id).first()
    
    form = db.query(Form).filter(Form.id == form_id).first()
 
    submission = db.query(Submission).filter(Submission.id == submission_id).first()
   
    
    if not employee or not form or not submission:
        logger.error(f"Missing data for compensation update")
        return False
    
    # Only update if passed and form has a job level code
    if not submission.passed or not form.job_level_code:
        logger.error(f"Did not pass or no job level code")
        return False
    
    try:
        # Look up the job level based on the form's job_level_code
        current_compensation = await get_employee_compensation(
                    employee.bamboo_hr_id,
                    db,
                    employee.employee_id
                )
        
        
        job_level = db.query(JobLevel).filter(JobLevel.level_code == form.job_level_code).first()
        
        if not job_level:
            logger.error(f"Job level not found for code: {form.job_level_code}")
            return False
        
        #look up the level title mapping
        location = db.query(Location).filter(
            Location.location_code.ilike(location_code.upper())
        ).first()

        job_title = db.query(JobTitle).filter(JobTitle.title_name == job_level.level_name,JobTitle.location_id == location.location_id).first()
        if job_title:
            # Update employee's title
            # employee.current_title_id = job_title.title_id
            print("this is the job title: "+str(job_title))
        else:
            logger.warning(f"No matching job title found for level name: {job_level.level_name}")


        # Determine the appropriate rate based on the rate_type in locations table
        rate_type = "min"  # Default to 'min'

       

        if not location:
            logger.warning(f"Unrecognized location code: {location_code}, defaulting to min_rate")
        else:
            rate_type = location.rate_type or "min"  # Fallback to 'min' if rate_type is None

        # Get the correct rate from job_level using the rate_type
        new_rate = None
        if rate_type == "min":
            new_rate = job_level.min_rate
        elif rate_type == "mid":
            new_rate = job_level.mid_rate
        elif rate_type == "max":
            new_rate = job_level.max_rate
        else:
            logger.warning(f"Unknown rate_type '{rate_type}' for location '{location_code}', defaulting to min_rate")
            new_rate = job_level.min_rate

        logger.info("this is the new rate: "+str(new_rate))
   
        if new_rate != current_compensation:
            # Update compensation in BambooHR
            bamboo_updated = await update_compensation(
                employee.bamboo_hr_id,
                new_rate,
                job_level.level_name,
                db,
                employee.employee_id,
                submission.id,
                quiz_date,
                quiz_name,
                matching_row_id,
                effective_date_str
            )

        variable = True
   
        if variable:
       
            # Get current compensation for logging
           
            current_compensation = employee.current_compensation
   
            if current_compensation is None:
                current_compensation = await get_employee_compensation(
                    employee.bamboo_hr_id,
                    db,
                    employee.employee_id
                )
    
            # Update employee record
            pending_change = PendingCompensationChange(
                employee_id=employee.employee_id,
                new_compensation=new_rate,
                effective_date=datetime.strptime(effective_date_str, "%Y-%m-%d").date(),  # The next pay period date
                reason=f"Passed {quiz_name}",
                title_id=job_title.title_id
            )
            db.add(pending_change)
            db.commit()

            
            # Update submission record
            submission.compensation_updated = True
            
            db.commit()
            return True
        return False
    
    except Exception as e:
        logger.exception(f"Error processing compensation update: {str(e)}")
        db.rollback()
        return False

async def manual_compensation_update(
    employee_id: int,
    new_compensation: float,
    db: Session,
    reason: str = "Manual update"
) -> bool:
    """Manually update an employee's compensation"""
    employee = db.query(Employee).filter(employee.employee_id == employee_id).first()
    
    if not employee:
        logger.error(f"Employee {employee_id} not found for manual compensation update")
        return False
    
    try:
        # Get current compensation from record or BambooHR
        current_compensation = employee.current_compensation
        if current_compensation is None:
            current_compensation = await get_employee_compensation(
                employee.bamboo_hr_id,
                db,
                employee.employee_id
            )
        
        # Update compensation in BambooHR
        bamboo_updated = await update_compensation(
            employee.bamboo_hr_id,
            new_compensation,
            db,
            employee.employee_id
        )
        
        if bamboo_updated:
            # Update employee record
            employee.current_compensation = new_compensation
            
            # Create compensation log entry
            compensation_log = CompensationLog(
                employee_id=employee.employee_id,
                previous_compensation=current_compensation,
                new_compensation=new_compensation,
                increase_amount=new_compensation - (current_compensation or 0),
                bamboo_hr_updated=True
            )
            db.add(compensation_log)
            
            db.commit()
            return True
        return False
    
    except Exception as e:
        logger.exception(f"Error processing manual compensation update: {str(e)}")
        db.rollback()
        return False

