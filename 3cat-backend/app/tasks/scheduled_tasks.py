from datetime import datetime
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.employee import Employee
from app.models.pending_compensation_change import PendingCompensationChange
from app.models.compensation_log import CompensationLog
from app.models.job_level import JobLevel
from app.models.job_title import JobTitle
from app.models.location import Location
from app.config import logger
# BambooHR integration removed - direct to 7shifts
from app.tasks.celery_app import celery_app  # Add this import



@celery_app.task
def process_pending_compensation_changes_task():
    print("this is the celery task")
    process_pending_compensation_changes()
    

def process_pending_compensation_changes():
    """Apply pending compensation changes whose effective date has arrived"""
    today = datetime.now().date()
    logger.info(f"Processing pending compensation changes for {today}")
    
    try:
        with SessionLocal() as db:

            # Mark all denied changes as processed (so they don't linger)
            denied_changes = db.query(PendingCompensationChange).filter(
                PendingCompensationChange.effective_date <= today,
                PendingCompensationChange.processed   == False,
                PendingCompensationChange.review_status == 'denied'
            ).all()

            for d in denied_changes:
                d.processed = True
                logger.info(f"Marked denied change {d.id} for emp {d.employee_id} as processed")
            # Find pending changes due today or earlier
            logger.info("this is the query")
            eligible_changes = db.query(PendingCompensationChange).filter(
                PendingCompensationChange.effective_date <= today,
                PendingCompensationChange.processed == False,
                PendingCompensationChange.review_status == 'approved'
            ).all()
            
            logger.info(f"Found {len(eligible_changes)} pending changes to process")

            # Group changes by employee_id
            employee_changes = {}
            for change in eligible_changes:
                if change.employee_id not in employee_changes:
                    employee_changes[change.employee_id] = []
                employee_changes[change.employee_id].append(change)

            
            for employee_id, changes in employee_changes.items():
                try:
                    # Sort changes by title_id (descending) to get highest first
                    # Null title_ids will go last
                    sorted_changes = sorted(
                        changes, 
                        key=lambda x: (x.title_id is not None, x.title_id or 0),
                        reverse=True
                    )
                    
                    # The first change now has the highest title_id
                    primary_change = sorted_changes[0]
                    
                    # Get the employee
                    employee = db.query(Employee).filter(
                        Employee.employee_id == employee_id
                    ).first()
                    
                    if not employee:
                        logger.warning(f"Employee {employee_id} not found for pending changes")
                        continue
                    logger.info("this is the employee in celery task: "+str(employee))
                    # Log the previous values
                    previous_compensation = employee.current_compensation
                    previous_title_id = employee.current_title_id
                    logger.info("this is the previous compensation: "+str(previous_compensation))

                    # Update employee with the primary change
                    employee.current_compensation = primary_change.new_compensation
                    job_title_object = db.query(JobTitle).filter(
                        JobTitle.title_id == primary_change.title_id
                    ).first()
                    job_level_object = db.query(JobLevel).filter(JobLevel.level_name == job_title_object.title_name).first()
                    location_object = db.query(Location).filter(Location.location_id == employee.location_id).first()
                    logger.info("this is the location object: "+str(location_object))
                    logger.info("this is the new compensation: "+str(employee.current_compensation))
                    if primary_change.title_id:
                        employee.current_title_id = primary_change.title_id
                        
                        # Update level_id if applicable
                        if hasattr(employee, 'current_level_id') and job_level_object.level_id:
                            employee.current_level_id = job_level_object.level_id

                    
                    # Create a log entry
                    log_entry = CompensationLog(
                        employee_id=employee.employee_id,
                        previous_compensation=previous_compensation,
                        new_compensation=primary_change.new_compensation,
                        rate_amount=primary_change.new_compensation,
                        title_id=previous_title_id,
                        level_id=employee.current_level_id,
                        location_id=employee.location_id,
                        new_title_id=primary_change.title_id,
                        change_reason=primary_change.reason,
                        effective_date=primary_change.effective_date,
                        created_at=datetime.now(),
                        increase_amount=primary_change.new_compensation - previous_compensation
                    )
                    logger.info("this is the primary change: "+str(primary_change))
                    
                    # Update the employee's compensation in BambooHR
                    logger.info("this is the job title object: "+str(job_title_object))
                    logger.info("this is the effective date: "+str(primary_change.effective_date))
                    bamboo_updated_job_info = update_jobinfo(
                        bamboo_hr_id=employee.bamboo_hr_id,
                        db=db,
                        employee_id=employee.employee_id,
                        effective_date_str=primary_change.effective_date.strftime("%Y-%m-%d"),
                        location=location_object.location_name,
                        department="Store",
                        division="Operations",
                        job_title=job_title_object.title_name,
                        reports_to="3Cat Inc"
                    )
                    # Then, conditionally update them if the status is "Terminated"
                    termination_reason = None
                    termination_type = None
                    eligible_for_rehire = None
                    if primary_change.status_name == "Terminated":
                        termination_reason = "Terminated"
                        termination_type = "Resignation (Voluntary)"
                        eligible_for_rehire = "Upon review"
                    
                    bamboo_updated_employment_status = update_employment_status(
                        bamboo_hr_id=employee.bamboo_hr_id,
                        db=db,
                        employee_id=employee.employee_id,
                        status_date=primary_change.effective_date,
                        employment_status=primary_change.status_name,
                        comment=primary_change.reason,
                        termination_reason=termination_reason,
                        termination_type=termination_type,
                        eligible_for_rehire=eligible_for_rehire,
                    )
                    
                    logger.info("this is the bamboo updated job info: "+str(bamboo_updated_job_info))
                    logger.info("this is the bamboo updated employment status: "+str(bamboo_updated_employment_status))
                    db.add(log_entry)
                    logger.info(f"this is the log entry: {log_entry}")

                    for change in changes:
                        change.processed = True
                        # Only log detailed info for the primary change
                        if change == primary_change:
                            logger.info(f"Processed primary compensation change for employee {employee_id}: " 
                                f"${previous_compensation} -> ${change.new_compensation}, "
                                f"Title ID: {previous_title_id or 'None'} -> {change.title_id or 'None'}")
                        else:
                            logger.info(f"Marked secondary change {change.id} as processed for employee {employee_id}")
                    # Mark the change as processed
                    change.processed = True
                    logger.info(f"Processed compensation change for employee {employee.employee_id}: " 
                            f"${previous_compensation} -> ${change.new_compensation}")
                except Exception as e:
                    logger.error(f"Error processing changes for employee {employee_id}: {str(e)}")
                    # Continue with other employees even if one fails  
            db.commit()
            logger.info("Successfully processed all pending compensation changes")
    except Exception as e:
        logger.error(f"Error processing compensation changes: {str(e)}")