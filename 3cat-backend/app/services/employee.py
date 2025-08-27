# app/services/employee.py
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from typing import Dict, Any
from datetime import datetime
import xml.etree.ElementTree as ET
from app.models.employee import Employee
from app.config import logger
from app.schemas.employee import EmployeeCreate,EmployeeUpdate
from app.models.job_level import JobLevel
from app.models.location import Location
from app.models.department import Department
from app.models.job_title import JobTitle
from app.services.bamboo_hr import update_compensation, get_employee_compensation, parse_most_recent_rate
from app.models.compensation_log import CompensationLog

async def update_employee_service(
    employee_id: int,
    employee_data: EmployeeUpdate,
    db: Session
) -> Employee:
    """
    Update an employee's information
    
    Args:
        employee_id: The ID of the employee to update
        employee_data: Dictionary containing fields to update
        db: Database session
        
    Returns:
        Updated employee object
        
    Raises:
        HTTPException: If employee not found or update fails
    """
    print("🔍 Type of employee_data:", type(employee_data))
    # Find the employee
    employee = db.query(Employee).filter(Employee.employee_id == employee_id).first()
    logger.info(f"this is employee: {employee}")
    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Employee with ID {employee_id} not found"
        )
    
    # Track changes for logging
    changes = {}
    logger.info(f"this is employee data: {employee.first_name}")
    try:
        logger.info(f"this is email: {employee_data.get('email')}")
    except:
        pass
    # Handle preferred email logic
    try:
        preferred_email = employee_data.work_email or employee_data.home_email
        if preferred_email and preferred_email != employee.email:
            changes["email"] = {"old": employee.email, "new": preferred_email}
            employee.email = preferred_email
    except:
        pass
   

    logger.info(f"this is employee data: {employee_data.dict()}")

    # Add this before the for loop that updates employee data
    mapped_employee_data = employee_data.dict(exclude_unset=True)

    # Define your payload→DB field mappings in one place
    field_map = {
        'Employment Status - Employment Status':    'status',
        'Job Information - Effective Date':        'job_info_effective_date',
        # add more mappings here as needed…
    }

    # Loop through and remap any fields present
    for payload_key, db_key in field_map.items():
        if payload_key in mapped_employee_data:
            mapped_employee_data[db_key] = mapped_employee_data.pop(payload_key)
    
    raw = mapped_employee_data.pop('job_info_effective_date', None)

    # 2) If it exists, parse & reformat to "yyyy-mm-dd"
    if raw:
        try:
            # if it’s already ISO-ish this will work
            dt = datetime.fromisoformat(raw)
        except ValueError:
            # fallback for other common patterns (e.g. "m/d/yyyy")
            dt = datetime.strptime(raw, "%m/%d/%Y")
        job_info_effective_date = dt.strftime("%Y-%m-%d")
    else:
        job_info_effective_date = None
    
    logger.info(f"this is job info effective date: {job_info_effective_date}")
        
    # Update employee data
    for field, value in mapped_employee_data.items():
        if hasattr(employee, field):
            old_value = getattr(employee, field)
            logger.info(f"this is old value {field}: {old_value}")
            if old_value != value:
                changes[field] = {"old": old_value, "new": value}
                setattr(employee, field, value)
                logger.info(f"this is changes: {changes}")

    # Update compensation if job_title is present
    current_compensation_bamboo_text = await get_employee_compensation(employee.bamboo_hr_id, db, employee.employee_id)
    current_compensation_bamboo = parse_most_recent_rate(current_compensation_bamboo_text)
    logger.info(f"this is current compensation in bamboo: {current_compensation_bamboo}")
    
    try:
        job_title = employee_data.job_title.strip() if employee_data.job_title else ""
        employee_status = employee_data.status.strip() if employee_data.status else ""
        status = employee_status.strip().lower()
        if job_title and employee_status:
            job_level = db.query(JobLevel).filter(
                JobLevel.level_name.ilike(f"{job_title}"),
                JobLevel.employment_type.ilike(f"%{status}%")
                ).first()
            job_title_object = db.query(JobTitle).filter(
                JobTitle.title_name.ilike(f"{job_title}")
            ).first()
            if job_level:
                rate_type = "min"  # default
                if employee_data.location:
                    location = db.query(Location).filter(Location.location_name == employee_data.location).first()
                    if location and location.rate_type:
                        rate_type = location.rate_type
                    
                # Determine rate
                department_id = getattr(job_level, "department_id", None)
                department_object = db.query(Department).filter(Department.department_id == department_id).first()
                department = department_object.department_name
                rate_column = f"{rate_type.value}_rate"
                new_compensation = getattr(job_level, rate_column, None)
                logger.info(f"this is new compensation: {new_compensation}")
                logger.info(f"this is employee current compensation: {employee.current_compensation}")
                if new_compensation != employee.current_compensation:
                    changes["current_compensation"] = {
                        "old": employee.current_compensation,
                        "new": new_compensation
                    }
                    employee.current_compensation = new_compensation
                    compensation_log = CompensationLog(
                        employee_id=employee.employee_id,
                        effective_date=job_info_effective_date,
                        rate_amount=new_compensation,
                        change_reason="Employee Update",
                        location_id=location.location_id,
                        bamboo_hr_updated=True,
                        new_title_id=job_title_object.title_id,
                    )
                    db.add(compensation_log)
                    db.commit()

                if employee.current_level_id != job_level.level_id:
                    changes["current_level_id"] = {
                        "old": employee.current_level_id,
                        "new": job_level.level_id
                    }
                    employee.current_level_id = job_level.level_id
                if employee.current_title_id != job_title_object.title_id:
                    changes["current_title_id"] = {
                        "old": employee.current_title_id,
                        "new": job_title_object.title_id
                    }
                    employee.current_title_id = job_title_object.title_id
                if employee.department_id != department_id:
                    changes["department_id"] = {
                        "old": employee.department_id,
                        "new": department_id
                    }
                    employee.department_id = department_id
                if employee.location_id != location.location_id:
                    changes["location_id"] = {
                        "old": employee.location_id,
                        "new": location.location_id
                    }
                    employee.location_id = location.location_id
                if new_compensation != current_compensation_bamboo:
                    logger.info(f"this is job_info_effective_date: {job_info_effective_date}")
                    matching_row_id = None
                    root = ET.fromstring(current_compensation_bamboo_text)
                    
                    logger.info(f"this is root: {root}")
                    # Iterate and search
                    for row in root.findall('row'):
                        logger.info(f"this is row: {row}")
                        for field in row.findall('field'):
                            logger.info(f"this is field: {field}")
                            if field.attrib.get('id') == 'startDate' and field.text == job_info_effective_date:
                                matching_row_id = row.attrib.get('id')
                                break
                        if matching_row_id:
                            break

                    logger.info(f"this is matching row id: {matching_row_id}")

                    await update_compensation(
                        bamboo_hr_id=employee.bamboo_hr_id,
                        rate_amount=new_compensation,
                        location_id=location.location_id,
                        db=db,
                        employee_id=employee.employee_id,
                        submission_id=None,
                        quiz_date=None,
                        quiz_name=None,
                        matching_row_id=matching_row_id,
                        effective_date_str=job_info_effective_date,
                        reason="Employee Update"
                    )
            else:
                logger.warning(f"No job level match found for job_title: '{job_title}'")
    except:
        logger.info(f"this is error")
        pass
    # Only commit if there were changes
    if changes:
        logger.info(f"this is commit changes: {changes}")
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
    logger.info(f"this is employee: {employee}")
    return employee

async def create_employee_service(
    bamboo_id: str,
    employee_data: EmployeeCreate,
    db: Session
) -> Employee:
    """
    Create a new employee record
    
    Args:
        employee_data: Dictionary containing employee data
        db: Database session
        
    Returns:
        The created employee object
        
    Raises:
        HTTPException: If creation fails
    """
    logger.info(f"Creating new in employee service: {bamboo_id}")
    preferred_email = employee_data.work_email or employee_data.home_email
    logger.info(f"Preferred email: {preferred_email}")

    current_level_id = 1
    current_title_id = 1
    department_id = 1
    department = "Store"
    current_compensation = None

    # ✅ Check if job_title is not empty and try to match job level
    job_title = employee_data.job_title.strip() if employee_data.job_title else ""
    employee_status = employee_data.status.strip() if employee_data.status else ""
    status = employee_status.strip().lower()
    logger.info(f"this is Job title: {job_title}")
    if job_title:
        job_level = db.query(JobLevel).filter(
            JobLevel.level_name.ilike(f"{job_title}"),
            JobLevel.employment_type.ilike(f"%{status}%")
        ).first()
        job_title_object = db.query(JobTitle).filter(
            JobTitle.title_name.ilike(f"{job_title}")
        ).first()
        # Fetch location object

        logger.info(f"this is employee data location: {employee_data.location}")
        location = db.query(Location).filter(Location.location_name == employee_data.location).first()
        logger.info(f"this is location: {location.rate_type}")
        rate_column = f"{location.rate_type.value}_rate"
        logger.info(f"this is rate column: {rate_column}")
        logger.info(f"this is job level: {job_level.level_id}")
        current_compensation = getattr(job_level, rate_column, None)
        logger.info(f"this is current compensation: {current_compensation}")
        department_id = getattr(job_level, "department_id", None)
        department_object = db.query(Department).filter(Department.department_id == department_id).first()
        department = department_object.department_name
        current_level_id = job_level.level_id
        current_title_id = job_title_object.title_id
        logger.info(f"this is current compensation: {current_compensation}")
        logger.info(f"this is department: {department}")
        logger.info(f"this is department id: {department_id}")
        logger.info(f"this is job level: {current_level_id}")
        logger.info(f"this is job title: {current_title_id}")
        

    employee_create_data = EmployeeCreate(
        email=preferred_email,
        first_name=employee_data.first_name,
        last_name=employee_data.last_name,
        location_id=location.location_id,
        department=department,
        bamboo_hr_id=bamboo_id,
        current_level_id=current_level_id,
        current_title_id=current_title_id,
        department_id=department_id,
        current_compensation=current_compensation,
        status = employee_status
    )

    logger.info(f"Employee create data: {employee_create_data.dict()}")
    db_employee = Employee(**employee_create_data.dict())
    db.add(db_employee)
    logger.info(f"this is db employee: {db_employee}")
    try:
        db.commit()
        db.refresh(db_employee)
        logger.info(f"Created employee with ID {db_employee.employee_id}")
        logger.info(f"employee pay rate: {employee_data.pay_rate}")
        compensation_log = CompensationLog(
            employee_id=db_employee.employee_id,
            effective_date=datetime.now().strftime("%Y-%m-%d"),
            rate_amount=current_compensation,
            location_id=location.location_id,
            change_reason="Employee Creation",
            bamboo_hr_updated=True,
            new_title_id=current_title_id,
            )
        db.add(compensation_log)
        db.commit()
        if employee_data.pay_rate == None:
            bamboo_updated = await update_compensation(
                bamboo_hr_id=bamboo_id,
                rate_amount=current_compensation,
                job_title=employee_data.job_title,
                db=db,
                employee_id=db_employee.employee_id,
                submission_id=None,
                quiz_date=None,
                quiz_name=None,
                matching_row_id=None,
                effective_date_str=datetime.now().strftime("%Y-%m-%d")
            )
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
        
        # Find matching job level
        job_level = db.query(JobLevel).filter(
            JobLevel.level_name.ilike(f"{job_title}"),
            JobLevel.employment_type.ilike(f"%{status}%")
        ).first()
        
        # Find job title object
        job_title_object = db.query(JobTitle).filter(
            JobTitle.title_name.ilike(f"{job_title}")
        ).first()
        
        if not job_level:
            raise ValueError(f"No job level found for title '{job_title}' with status '{employment_status}'")
        
        # Determine rate type based on location
        rate_type = "min"  # default rate type
        
        if location:
            location_obj = db.query(Location).filter(Location.location_name == location).first()
            if location_obj and location_obj.rate_type:
                rate_type = location_obj.rate_type
        
        # Get department information if needed
        department_id = getattr(job_level, "department_id", None)
        department_name = None
        
        if department_id:
            department_object = db.query(Department).filter(Department.department_id == department_id).first()
            if department_object:
                department_name = department_object.department_name
        
        # Get the compensation rate from the appropriate column
        rate_column = f"{rate_type}_rate"
        new_compensation = getattr(job_level, rate_column, None)
        
        if new_compensation is None:
            raise ValueError(f"Could not determine compensation rate for '{job_title}' at '{location}'")
        
        logger.info(f"Calculated compensation: {new_compensation} for {job_title} ({status}) at {location} using {rate_type} rate")
        
        return new_compensation
        
    except Exception as e:
        logger.error(f"Error calculating compensation: {str(e)}")
        raise ValueError(f"Failed to calculate compensation: {str(e)}")