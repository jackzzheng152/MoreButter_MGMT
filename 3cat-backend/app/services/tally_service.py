from sqlalchemy.orm import Session
from datetime import datetime, date
from typing import Optional, List, Dict, Any
import json

from app.models.employee import Employee
from app.models.job_title import JobTitle
from app.models.location import Location
from app.models.pending_compensation_change import PendingCompensationChange
from app.schemas.pending_compensation_change import (
    TallyWebhookSchema,
    PendingCompensationChangeCreate,
    PendingCompensationChangeUpdate,
)
from app.config import logger
from app.services.employee import get_compensation


def serialize_datetime(obj):
    """Convert datetime objects to ISO format strings for JSON serialization"""
    if isinstance(obj, datetime):
        return obj.isoformat()
    elif isinstance(obj, date):
        return obj.isoformat()
    raise TypeError(f"Object of type {type(obj)} is not JSON serializable")


async def process_tally_submission(
    webhook_data: TallyWebhookSchema,
    db: Session
) -> PendingCompensationChange:
    """
    Process a Tally form submission for compensation changes
    
    Args:
        webhook_data: The validated webhook data from Tally
        db: Database session
        
    Returns:
        The created PendingCompensationChange record
    """
    try:
        # Extract form data
        form_data = webhook_data.data
        
        # Helper functions for field extraction
        def get_field_value_by_label(label: str) -> Any:
            for field in form_data.fields:
                if field.label == label:
                    return field.value
            return None
        
        def get_option_text(field_label: str, option_id: str) -> Optional[str]:
            for field in form_data.fields:
                if field.label == field_label and field.options:
                    for option in field.options:
                        if option.id == option_id:
                            return option.text
            return None
        
        # Extract employee information
        employee_code = get_field_value_by_label("Employee ID (7Shift)")
        employee_name = get_field_value_by_label("Employee Name")
        
        # Find employee by code
        employee = db.query(Employee).filter(Employee.gusto_id == str(employee_code)).first()
        
        if not employee:
            logger.error(f"Employee with code {employee_code} not found")
            raise ValueError(f"Employee with code {employee_code} not found")
        
        # Extract position/title information
        position_id_list = get_field_value_by_label("Employee New Position")
        position_id = position_id_list[0] if position_id_list else None
        position_name = get_option_text("Employee New Position", position_id)
        
        # Extract location information
        location_id_list = get_field_value_by_label("Employee Location")
        location_id = location_id_list[0] if location_id_list else None
        location_name = get_option_text("Employee Location", location_id)
        
        # Find location by code (assuming location_name is a code like "CH", "KT", etc.)
        location = None
        if location_name:
            location = db.query(Location).filter(
                Location.location_code.ilike(location_name)
            ).first()
        
        # If no location found by code, try by name
        if not location and location_name:
            location = db.query(Location).filter(
                Location.location_name.ilike(f"%{location_name}%")
            ).first()
        
        # Extract status information
        status_id_list = get_field_value_by_label("Employee Status")
        status_id = status_id_list[0] if status_id_list else None
        status_name = get_option_text("Employee Status", status_id)
        
        # Extract new compensation amount from the form
        new_compensation_str = get_field_value_by_label("New Compensation")
        new_compensation = None
        
        if new_compensation_str:
            try:
                # Clean and convert to float if provided in the form
                new_compensation = float(str(new_compensation_str).replace('$', '').replace(',', ''))
            except (ValueError, TypeError):
                logger.warning(f"Invalid compensation amount: {new_compensation_str}")
        
        # If no compensation was provided in the form, calculate it using get_compensation
        if not new_compensation:
            try:
                # Use position_name, location_name, and status_name to calculate compensation
                if position_name and location_name and status_name:
                    new_compensation = await get_compensation(
                        job_title=position_name,
                        location=location_name,
                        employment_status=status_name,
                        db=db
                    )
                    logger.info(f"Calculated compensation using get_compensation: ${new_compensation}/hr")
                else:
                    # If missing required fields, set default compensation (as in original code)
                    logger.warning("Missing required fields for compensation calculation, using default")
                    new_compensation = 17.5
            except Exception as e:
                logger.error(f"Error calculating compensation: {str(e)}")
                # Default to $17.50 if computation fails (based on your existing data)
                new_compensation = 17.5
        
        # Extract effective date
        effective_date_str = get_field_value_by_label("Effective Date")
        effective_date = None
        
        if effective_date_str:
            try:
                # Try various formats
                try:
                    effective_date = date.fromisoformat(str(effective_date_str))
                except (ValueError, TypeError):
                    effective_date = datetime.strptime(str(effective_date_str), "%Y-%m-%d").date()
            except Exception as e:
                logger.warning(f"Failed to parse effective date: {e}, using today")
                effective_date = date.today()
        else:
            # Default to today if not provided
            effective_date = date.today()
            logger.info("this is the effective date: "+str(effective_date))
            
                    
                        # Get current date components
            day = date.today().day
            month = date.today().month
            year = date.today().year
            
            if day <= 15:
                # Quiz is in the first payroll period → next payroll period starts on the 16th
                effective_date = datetime(year, month, 16)
            else:
                # Quiz is in the second payroll period → next payroll period starts on the 1st of next month
                if month == 12:
                    # If it's December, go to January of next year
                    effective_date = datetime(year + 1, 1, 1)
                else:
                    effective_date = datetime(year, month + 1, 1)
                    logger.info("this is the effective date: "+str(effective_date))

       
            
        effective_date_str = effective_date.strftime("%Y-%m-%d")
        
        # Extract other relevant information
        reason = get_field_value_by_label("Reason") or "Compensation change via Tally form"
        submitter_name = get_field_value_by_label("Submitter Name")
        submitter_code = get_field_value_by_label("Submitter Punch Code")
        
        # Find title by name
        title = None
        if position_name:
            title = db.query(JobTitle).filter(JobTitle.title_name == position_name).first()
            
            # If title not found by name directly, try to find by location
            if not title and location:
                title = db.query(JobTitle).filter(
                    JobTitle.title_name == position_name,
                    JobTitle.location_id == location.location_id
                ).first()
        
        # Serialize the webhook data to handle datetime objects
        webhook_dict = webhook_data.dict()
        webhook_json = json.dumps(webhook_dict, default=serialize_datetime)
        webhook_dict_serialized = json.loads(webhook_json)
        
        # Create and save the model
        pending_compensation = PendingCompensationChange(
            employee_id=employee.employee_id,
            new_compensation=new_compensation,
            effective_date=effective_date,
            reason=reason,
            title_id=title.title_id if title else None,
            submission_id=form_data.submissionId,
            form_id=form_data.formId,
            event_id=webhook_data.eventId,
            submitter_name=submitter_name,
            submitter_code=submitter_code,
            review_status="pending",
            location_id=location_id,
            location_name=location_name,
            position_id=position_id,
            position_name=position_name,
            status_id=status_id,
            status_name=status_name,
            raw_data=webhook_dict_serialized
        )
        
        db.add(pending_compensation)
        db.commit()
        db.refresh(pending_compensation)
        
        return pending_compensation
    
    except Exception as e:
        db.rollback()
        logger.error(f"Error processing Tally submission: {str(e)}")
        raise


async def get_pending_changes(
    db: Session,
    status: Optional[str] = None
) -> List[PendingCompensationChange]:
    """
    Get all pending compensation changes, optionally filtered by status
    
    Args:
        db: Database session
        status: Filter by review status (pending, approved, denied)
        
    Returns:
        List of pending compensation changes
    """
    query = db.query(PendingCompensationChange)
    
    if status:
        query = query.filter(PendingCompensationChange.review_status == status)
        
    return query.order_by(PendingCompensationChange.created_at.desc()).all()


async def get_pending_change(
    change_id: int,
    db: Session
) -> Optional[PendingCompensationChange]:
    """
    Get a specific pending compensation change
    
    Args:
        change_id: The ID of the change to retrieve
        db: Database session
        
    Returns:
        The pending compensation change or None if not found
    """
    return db.query(PendingCompensationChange).filter(
        PendingCompensationChange.id == change_id
    ).first()


async def approve_change(
    change_id: int,
    reviewer: str,
    db: Session
) -> PendingCompensationChange:
    """
    Approve a pending compensation change
    
    Args:
        change_id: The ID of the change to approve
        reviewer: The name/ID of the person approving the change
        db: Database session
        
    Returns:
        The updated PendingCompensationChange record
    """
    change = await get_pending_change(change_id, db)
    
    if not change:
        raise ValueError(f"Pending compensation change with ID {change_id} not found")
    
    if change.review_status and change.review_status != "pending":
        raise ValueError(f"Cannot approve change that is already {change.review_status}")
    
    # Update the record
    change.review_status = "approved"
    change.reviewed_at = datetime.now()
    change.reviewed_by = reviewer
    
    db.commit()
    db.refresh(change)
    
    return change


async def deny_change(
    change_id: int,
    reviewer: str,
    notes: str,
    db: Session
) -> PendingCompensationChange:
    """
    Deny a pending compensation change
    
    Args:
        change_id: The ID of the change to deny
        reviewer: The name/ID of the person denying the change
        notes: The reason for denial
        db: Database session
        
    Returns:
        The updated PendingCompensationChange record
    """
    change = await get_pending_change(change_id, db)
    
    if not change:
        raise ValueError(f"Pending compensation change with ID {change_id} not found")
    
    if change.review_status and change.review_status != "pending":
        raise ValueError(f"Cannot deny change that is already {change.review_status}")
    
    # Update the record
    change.review_status = "denied"
    change.reviewed_at = datetime.now()
    change.reviewed_by = reviewer
    change.review_notes = notes
    
    db.commit()
    db.refresh(change)
    
    return change


async def process_approved_changes(db: Session) -> int:
    """
    Process all approved but unprocessed compensation changes by calling your existing functions
    
    Args:
        db: Database session
        
    Returns:
        Number of changes processed
    """
    # BambooHR integration removed - direct to 7shifts
    from app.models.compensation_log import CompensationLog
    
    changes = db.query(PendingCompensationChange).filter(
        PendingCompensationChange.review_status == "approved",
        PendingCompensationChange.processed == False
    ).all()
    
    processed_count = 0
    
    for change in changes:
        try:
            employee = db.query(Employee).filter(Employee.employee_id == change.employee_id).first()
            
            if not employee:
                logger.error(f"Employee with ID {change.employee_id} not found when processing approved change")
                continue
            
            # Store previous values for logging
            previous_compensation = employee.current_compensation
            previous_title_id = employee.current_title_id
            
            # Update employee record in database
            employee.current_compensation = change.new_compensation
            if change.title_id:
                employee.current_title_id = change.title_id
            
            # BambooHR integration removed - direct database update only
            bamboo_updated = True  # No longer updating BambooHR
            
            # Create compensation log entry
            log_entry = CompensationLog(
                employee_id=employee.employee_id,
                previous_compensation=previous_compensation,
                new_compensation=change.new_compensation,
                rate_amount=change.new_compensation,
                title_id=previous_title_id,
                level_id=employee.current_level_id,
                location_id=employee.location_id,
                new_title_id=change.title_id,
                change_reason=change.reason,
                effective_date=change.effective_date,
                created_at=datetime.now(),
                increase_amount=change.new_compensation - (previous_compensation or 0)
            )
            db.add(log_entry)
            
            # Mark as processed
            change.processed = True
            processed_count += 1
            
            logger.info(f"Processed compensation change for employee {employee.employee_id}: " 
                       f"${previous_compensation} -> ${change.new_compensation}")
            
        except Exception as e:
            logger.error(f"Error processing change {change.id}: {str(e)}")
    
    db.commit()
    return processed_count