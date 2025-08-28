from fastapi import APIRouter, HTTPException, Depends, Body
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from app.models.job_title import JobTitle
from app.api import deps
from app.models.employee import Employee
from app.models.submission import Submission
from app.schemas.employee import EmployeeCreate, EmployeeUpdate, Employee as EmployeeSchema
from app.schemas.submission import CompensationUpdate
# BambooHR webhook schemas removed
from app.services.compensation import manual_compensation_update
from app.services.employee import update_employee_service, create_employee_service
from app.config import logger
from app.models.location import Location
from app.schemas.employee import EmployeeResponse
from app.services.seven_shifts import update_7shifts_user
from app.schemas.employee import MatchEmployeesRequest
# BambooHR integration removed - direct to 7shifts
router = APIRouter()


@router.post("", response_model=Dict[str, Any])
async def create_employee(
    employee: EmployeeCreate, 
    db: Session = Depends(deps.get_db)
):
    """Create a new employee record"""
    db_employee = await create_employee_service(employee, db)
    return {"id": db_employee.employee_id, "message": "Employee created successfully"}

@router.get("", response_model=List[Dict[str, Any]])
def list_employees(db: Session = Depends(deps.get_db)):
    """List all employees"""
    employees = db.query(Employee).all()
    
    result = []
    for employee in employees:
        result.append({
            "id": employee.employee_id,
            "email": employee.email,
            "first_name": employee.first_name,
            "last_name": employee.last_name,
            "department": employee.department,
            "current_compensation": employee.current_compensation,
            "created_at": employee.created_at,
            "current_title_id": employee.current_title_id,
            "current_level_id": employee.current_level_id,
            "location_id": employee.location_id,
            "department_id": employee.department_id,
            "punch_id": employee.punch_id,
            "sevenshift_id": employee.sevenshift_id,
            "gusto_id": employee.gusto_id,
            "status": employee.status
        })
    
    return result

@router.get("/job-titles", response_model=List[Dict[str, Any]])
def get_job_titles(department_id: int = None, db: Session = Depends(deps.get_db)):
    """
    Get job titles, optionally filtered by department_id
    """
    try:
        # Start with a base query
        query = db.query(JobTitle)
        
        # Apply department filter if provided
        if department_id is not None:
            query = query.filter(JobTitle.department_id == department_id)
        
        # Execute the query
        job_titles = query.all()
        
        result = []
        for title in job_titles:
            result.append({
                "title_id": title.title_id,
                "title_name": title.title_name,
                "description": title.description,
                "department_id": title.department_id
            })
        
        return result
    except Exception as e:
        logger.exception(f"Error fetching job titles: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching job titles: {str(e)}")


@router.get("/locations", response_model=List[Dict[str, Any]])
def get_locations(db: Session = Depends(deps.get_db)):
    """Get all locations"""
    query = db.query(Location)
    locations = query.all() 
    result = []
    for location in locations:
        result.append({
            "location_id": location.location_id,
            "location_name": location.location_name,
            "location_code": location.location_code,
            "sevenshift_location_id": location.sevenshift_location_id
        })
    return result

@router.get("/{employee_id}", response_model=Dict[str, Any])
def get_employee(employee_id: int, db: Session = Depends(deps.get_db)):
    """Get employee details"""
    employee = db.query(Employee).filter(Employee.employee_id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    return {
        "id": employee.employee_id,
        "email": employee.email,
                    # bamboo_hr_id field removed
        "first_name": employee.first_name,
        "last_name": employee.last_name,
        "department": employee.department,
        "current_compensation": employee.current_compensation,
        "created_at": employee.created_at
    }

@router.put("/{employee_id}", response_model=EmployeeResponse)
async def update_employee(
    employee_id: int,
    employee_data: EmployeeUpdate,
    db: Session = Depends(deps.get_db)
):
    """Update an employee's information"""
    # Convert Pydantic model to dict excluding unset values
    # update_data = employee_data.dict(exclude_unset=True)
    # print("🔍 Type of update_data:", type(update_data))
   # Use the service function
    employee = db.query(Employee).filter(Employee.employee_id == employee_id).first()

    employee_update = await update_employee_service(employee_id, employee_data, db)

    if employee.sevenshift_id:
        await update_7shifts_user(user_id = employee.sevenshift_id, employee_id = employee.gusto_id)

    return employee_update


@router.post("/match", response_model=List[dict])
async def match_employees(request: MatchEmployeesRequest, db: Session = Depends(deps.get_db)):

    logger.info(f"🔍 request: {request}")
    try:
        # Convert integers to strings for the query
        string_user_ids = [str(user_id) for user_id in request.user_ids]
        logger.info(f"matching employees with ids: {string_user_ids}")
        # Get all matching employees in one query
        matched_employees = db.query(Employee, JobTitle.title_name.label("job_title"))\
            .join(JobTitle, Employee.current_title_id == JobTitle.title_id)\
            .filter(Employee.gusto_id.in_(string_user_ids))\
            .all()
        
        # Create a dictionary for quick lookup
        employee_dict = {emp.Employee.gusto_id: emp for emp in matched_employees}
        
        # Build final result
        employees_data = []
        logger.info(f"🔍 employee_dict: {employee_dict}")
        for user_id in request.user_ids:
            str_user_id = str(user_id)
            if str_user_id in employee_dict:
                # Employee found in database
                emp = employee_dict[str_user_id]
                employees_data.append({
                    "id": str(emp.Employee.employee_id),
                    "name": emp.Employee.last_name +", " + emp.Employee.first_name,
                    "jobTitle": emp.job_title,
                    "gustoId": emp.Employee.gusto_id or f"EMP-{user_id}",
                    "shiftUserId": user_id,
                    "isEditing": False,
                    "hourlyRate": emp.Employee.current_compensation
                })
            else:
                # Employee not found in database
                employees_data.append({
                    "id": f"new-{user_id}",
                    "name": f"Employee #{user_id}",
                    "jobTitle": "New Employee",
                    "gustoId": f"EMP-{user_id}",
                    "shiftUserId": user_id,
                    "isEditing": False,
                    "hourlyRate": 16.5
                })
        
        return employees_data
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{employee_id}/submissions", response_model=List[Dict[str, Any]])
def get_employee_submissions(employee_id: int, db: Session = Depends(deps.get_db)):
    """Get all submissions for an employee"""
    employee = db.query(Employee).filter(Employee.employee_id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    submissions = db.query(Submission).filter(Submission.employee_id == employee_id).all()
    result = []
    
    for submission in submissions:
        result.append({
            "id": submission.id,
            "form_name": submission.form.form_name,
            "score": submission.score,
            "passed": submission.passed,
            "created_at": submission.created_at,
            "compensation_updated": submission.compensation_updated
        })
    
    return result

@router.post("/compensation-update", response_model=Dict[str, Any])
async def manual_compensation_update_endpoint(update: CompensationUpdate, db: Session = Depends(deps.get_db)):
    """Manually update an employee's compensation"""
    result = await manual_compensation_update(
        update.employee_id,
        update.new_compensation,
        db,
        update.reason
    )
    
    if result:
        employee = db.query(Employee).filter(Employee.employee_id == update.employee_id).first()
        return {
            "success": True,
            "message": "Compensation updated successfully",
            "employee_id": update.employee_id,
            "new_compensation": update.new_compensation
        }
    else:
        raise HTTPException(status_code=500, detail="Failed to update compensation")


@router.get("/employees")
async def get_employees(db: Session = Depends(deps.get_db)):
    employees = db.query(Employee).all()
    print("🔥 USING HARDCODED RESPONSE 🔥")
    return [{
        "employee_id": 999,
        "email": "test@example.com",
        "first_name": "Test",
        "last_name": "User",
        "department": "Test Dept",
        "current_compensation": 20.0,
        # bamboo_hr_id field removed
        "sevenshift_id": "7S-456",
        "gusto_id": "GUS-789",
        "punch_id": "PUNCH-321",
        "created_at": "2025-01-01T12:00:00Z"
    }
        
    ]

# BambooHR job info update route removed - direct to 7shifts

# BambooHR employment status update route removed - direct to 7shifts
# @router.post("/employees/{employee_id}/employment-status")
# async def update_employee_employment_status(
#     employee_id: int,
#     employment_status: EmploymentStatusUpdateRequest = Body(...),
#     db: Session = Depends(deps.get_db)
# ):
    # """Update employee employment status in BambooHR"""
    
    # # Fetch employee to get bamboo_hr_id
    # employee = db.query(Employee).filter(Employee.employee_id == employee_id).first()
    # if not employee:
    #     raise HTTPException(status_code=404, detail="Employee not found")
    
    # if not employee.bamboo_hr_id:
    #     raise HTTPException(status_code=400, detail="Employee does not have a BambooHR ID")
    
    # # Set status date to today if not provided
    # status_date_str = employment_status.status_date
    
    # # Call the update_employment_status function
    # success = await update_employment_status(
    #     bamboo_hr_id=employee.bamboo_hr_id,
    #     db=db,
    #     employee_id=employee_id,
    #     submission_id=employment_status.submission_id,
    #     status_date=status_date_str,
    #     employment_status=employment_status.employment_status,
    #     comment=employment_status.comment,
    #     termination_reason=employment_status.termination_reason,
    #     termination_type=employment_status.termination_type,
    #     eligible_for_rehire=employment_status.eligible_for_rehire,
    #     termination_regrettable=employment_status.termination_regrettable
    # )
    
    # if not success:
    #     raise HTTPException(status_code=500, detail="Failed to update employment status in BambooHR")
    
    # return {"message": "Employment status updated successfully"}