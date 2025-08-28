# app/services/employee.py
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from typing import Dict, Any
from datetime import datetime
from app.models.employee import Employee
from app.config import logger
from app.schemas.employee import EmployeeCreate, EmployeeUpdate
from app.models.compensation_log import CompensationLog

async def update_employee_service(
    employee_id: int,
    employee_data: EmployeeUpdate,
    db: Session
) -> Employee:
    """
    Update an employee's information directly (no BambooHR integration)
    
    Args:
        employee_id: The ID of the employee to update
        employee_data: Employee data to update
        db: Database session
        
    Returns:
        Updated employee object
        
    Raises:
        HTTPException: If employee not found or update fails
    """
    # Find the employee
    employee = db.query(Employee).filter(Employee.employee_id == employee_id).first()
    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Employee with ID {employee_id} not found"
        )
    
    # Track changes for logging
    changes = {}
    
    # Update basic employee fields
    for field, value in employee_data.dict(exclude_unset=True).items():
        if hasattr(employee, field) and value is not None:
            old_value = getattr(employee, field)
            if old_value != value:
                changes[field] = {"old": old_value, "new": value}
                setattr(employee, field, value)
    
    # Handle compensation updates
    if employee_data.current_compensation and employee_data.current_compensation != employee.current_compensation:
        changes["current_compensation"] = {
            "old": employee.current_compensation,
            "new": employee_data.current_compensation
        }
        employee.current_compensation = employee_data.current_compensation
        
        # Create compensation log entry
        compensation_log = CompensationLog(
            employee_id=employee.employee_id,
            effective_date=datetime.now().strftime("%Y-%m-%d"),
            rate_amount=employee_data.current_compensation,
            change_reason="Employee Update",
            location_id=employee.location_id,
            # bamboo_hr_updated field removed
            new_title_id=employee.current_title_id,
        )
        db.add(compensation_log)
    
    # Commit changes if any
    if changes:
        try:
            db.commit()
            logger.info(f"Updated employee {employee_id}: {changes}")
        except Exception as e:
            db.rollback()
            logger.error(f"Error updating employee {employee_id}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error updating employee: {str(e)}"
            )
    
    return employee

async def create_employee_service(
    employee_data: EmployeeCreate,
    db: Session
) -> Employee:
    """
    Create a new employee record directly (no BambooHR integration)
    
    Args:
        employee_data: Employee data from the application
        db: Database session
        
    Returns:
        The created employee object
        
    Raises:
        HTTPException: If creation fails
    """
    logger.info(f"Creating new employee directly: {employee_data.email}")
    
    # Set default values
    current_level_id = employee_data.current_level_id or 1
    current_title_id = employee_data.current_title_id or 1
    department_id = employee_data.department_id or 1
    department = employee_data.department or "Store"
    current_compensation = employee_data.current_compensation

    # Create the employee record
    db_employee = Employee(
        email=employee_data.email,
        first_name=employee_data.first_name,
        last_name=employee_data.last_name,
        location_id=employee_data.location_id,
        department=department,
        current_level_id=current_level_id,
        current_title_id=current_title_id,
        department_id=department_id,
        current_compensation=current_compensation,
        status=employee_data.status,
        gusto_id=employee_data.gusto_id,
        sevenshift_id=employee_data.sevenshift_id,
        punch_id=employee_data.punch_id
    )
    
    db.add(db_employee)
    
    try:
        db.commit()
        db.refresh(db_employee)
        logger.info(f"Created employee with ID {db_employee.employee_id}")
        
        # Create compensation log entry
        if current_compensation:
            compensation_log = CompensationLog(
                employee_id=db_employee.employee_id,
                effective_date=datetime.now().strftime("%Y-%m-%d"),
                rate_amount=current_compensation,
                location_id=employee_data.location_id,
                change_reason="Employee Creation",
                # bamboo_hr_updated field removed
                new_title_id=current_title_id,
            )
            db.add(compensation_log)
            db.commit()
        
        return db_employee
        
    except Exception as e:
        db.rollback()
        logger.exception(f"Error creating employee: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Error creating employee: {str(e)}")

async def get_compensation(
    job_title: str, 
    location: str, 
    employment_status: str,
    db: Session
) -> float:
    """
    Get the appropriate compensation rate based on job title, location, and employment status.
    
    Args:
        job_title: The job title
        location: The location name
        employment_status: The employment status (full-time, part-time, etc.)
        db: Database session
        
    Returns:
        float: The calculated compensation rate
        
    Raises:
        ValueError: If job level or required information cannot be found
    """
    try:
        # Clean up and validate inputs
        job_title = job_title.strip() if job_title else ""
        employment_status = employment_status.strip() if employment_status else ""
        status = employment_status.strip().lower()
        
        if not job_title or not employment_status:
            raise ValueError("Job title and employment status are required")
        
        # For now, return a default rate since we're not using complex job level logic
        # This can be enhanced later with direct database queries
        return 15.0  # Default hourly rate
        
    except Exception as e:
        logger.exception(f"Error getting compensation: {str(e)}")
        raise ValueError(f"Error getting compensation: {str(e)}")
