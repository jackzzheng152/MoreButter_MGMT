from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import List, Dict, Any

from app.api import deps
from app.models.compensation_log import CompensationLog
from app.models.employee import Employee
from app.models.form import Form

router = APIRouter()

@router.get("/logs", response_model=List[Dict[str, Any]])
def get_compensation_logs(db: Session = Depends(deps.get_db)):
    """Get all compensation logs"""
    logs = db.query(CompensationLog).all()
    result = []
    
    for log in logs:
        # Get employee and form information
        employee = db.query(Employee).filter(Employee.id == log.employee_id).first()
        form = None
        if log.form_id:
            form = db.query(Form).filter(Form.id == log.form_id).first()
        
        result.append({
            "id": log.id,
            "employee_name": f"{employee.first_name} {employee.last_name}" if employee else "Unknown",
            "form_name": form.form_name if form else "Manual Update",
            "previous_compensation": log.previous_compensation,
            "new_compensation": log.new_compensation,
            "increase_amount": log.increase_amount,
            "bamboo_hr_updated": log.bamboo_hr_updated,
            "created_at": log.created_at
        })
    
    return result

@router.get("/logs/employee/{employee_id}", response_model=List[Dict[str, Any]])
def get_employee_compensation_logs(employee_id: int, db: Session = Depends(deps.get_db)):
    """Get compensation logs for a specific employee"""
    employee = db.query(Employee).filter(Employee.employee_id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    logs = db.query(CompensationLog).filter(CompensationLog.employee_id == employee_id).all()
    result = []
    
    for log in logs:
        # Get form information if available
        form = None
        if log.form_id:
            form = db.query(Form).filter(Form.id == log.form_id).first()
        
        result.append({
            "id": log.id,
            "employee_id": log.employee_id,
            "form_name": form.form_name if form else "Manual Update",
            "previous_compensation": log.previous_compensation,
            "new_compensation": log.new_compensation,
            "bamboo_hr_updated": log.bamboo_hr_updated,
            "created_at": log.created_at,
            "effective_date": log.effective_date,
            "rate_amount": log.rate_amount,
            "change_reason": log.change_reason,
            "location_id": log.location_id,
            "level_id": log.level_id,
            "title_id": log.title_id,
            "new_title_id": log.new_title_id,
            "increase_amount": log.increase_amount,
            "location_id": log.location_id,
        })
    return result

@router.get("/statistics", response_model=Dict[str, Any])
def get_compensation_statistics(db: Session = Depends(deps.get_db)):
    """Get overall compensation statistics"""
    logs = db.query(CompensationLog).all()
    
    total_increases = len(logs)
    total_amount = sum(log.increase_amount or 0 for log in logs)
    avg_increase = total_amount / total_increases if total_increases > 0 else 0
    
    # Get top forms that led to increases
    form_stats = {}
    for log in logs:
        if log.form_id:
            form = db.query(Form).filter(Form.id == log.form_id).first()
            if form:
                form_name = form.form_name
                if form_name not in form_stats:
                    form_stats[form_name] = {"count": 0, "total": 0}
                form_stats[form_name]["count"] += 1
                form_stats[form_name]["total"] += log.increase_amount or 0
    
    top_forms = [
        {
            "form_name": k,
            "count": v["count"],
            "total_increase": v["total"],
            "average_increase": v["total"] / v["count"]
        }
        for k, v in sorted(form_stats.items(), key=lambda item: item[1]["count"], reverse=True)
    ][:5]  # Top 5 forms
    
    return {
        "total_compensation_increases": total_increases,
        "total_amount_increased": total_amount,
        "average_increase": avg_increase,
        "top_forms": top_forms
    }