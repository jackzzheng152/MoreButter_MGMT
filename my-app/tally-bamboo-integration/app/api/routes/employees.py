from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from app.models.job_title import JobTitle
from app.api import deps
from app.models.employee import Employee
from app.models.submission import Submission
from app.schemas.employee import EmployeeCreate, EmployeeUpdate, Employee as EmployeeSchema
from app.schemas.submission import CompensationUpdate
from app.services.compensation import manual_compensation_update
from app.services.employee import update_employee_service, create_employee_service
from app.config import logger


router = APIRouter()

@router.post("", response_model=Dict[str, Any])
async def create_employee(
    employee: EmployeeCreate, 
    db: Session = Depends(deps.get_db)
):
    """Create a new employee record"""
    db_employee = await create_employee_service(employee.dict(), db)
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
            "current_title_id": employee.current_title_id
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

@router.get("/{employee_id}", response_model=Dict[str, Any])
def get_employee(employee_id: int, db: Session = Depends(deps.get_db)):
    """Get employee details"""
    employee = db.query(Employee).filter(Employee.employee_id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    return {
        "id": employee.employee_id,
        "email": employee.email,
        "bamboo_hr_id": employee.bamboo_hr_id,
        "first_name": employee.first_name,
        "last_name": employee.last_name,
        "department": employee.department,
        "current_compensation": employee.current_compensation,
        "created_at": employee.created_at
    }

@router.put("/{employee_id}", response_model=EmployeeSchema)
async def update_employee(
    employee_id: int,
    employee_data: EmployeeUpdate,
    db: Session = Depends(deps.get_db)
):
    """Update an employee's information"""
    # Convert Pydantic model to dict excluding unset values
    update_data = employee_data.dict(exclude_unset=True)
   # Use the service function
    return await update_employee_service(employee_id, update_data, db)


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
    return [
        {
            "employee_id": emp.employee_id,
            "email": emp.email,
            "first_name": emp.first_name,
            "last_name": emp.last_name,
            "department": emp.department,
            "current_compensation": emp.current_compensation,
            "bamboo_hr_id": emp.bamboo_hr_id
        } for emp in employees
    ]

