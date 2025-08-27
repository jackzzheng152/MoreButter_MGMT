from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import List, Dict, Any

from app.api import deps
from app.models.form import Form
from app.schemas.form import FormCreate, FormUpdate
from app.config import logger

router = APIRouter()

@router.post("", response_model=Dict[str, Any])
def create_form(form: FormCreate, db: Session = Depends(deps.get_db)):
    """Create a new form record"""
    db_form = Form(**form.dict())
    db.add(db_form)
    try:
        db.commit()
        db.refresh(db_form)
        return {"id": db_form.id, "message": "Form created successfully"}
    except Exception as e:
        db.rollback()
        logger.exception(f"Error creating form: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Error creating form: {str(e)}")

@router.get("", response_model=List[Dict[str, Any]])
def list_forms(db: Session = Depends(deps.get_db)):
    """List all forms with their settings"""
    forms = db.query(Form).all()
    result = []
    
    for form in forms:
        result.append({
            "id": form.id,
            "tally_form_id": form.tally_form_id,
            "form_name": form.form_name,
            "form_type": form.form_type,
            "passing_score": form.passing_score,
            "compensation_increase": form.compensation_increase,
            "bamboo_compensation_field": form.bamboo_compensation_field,
            "created_at": form.created_at
        })
    
    return result

@router.get("/{form_id}", response_model=Dict[str, Any])
def get_form(form_id: int, db: Session = Depends(deps.get_db)):
    """Get a specific form's details"""
    form = db.query(Form).filter(Form.id == form_id).first()
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")
    
    return {
        "id": form.id,
        "tally_form_id": form.tally_form_id,
        "form_name": form.form_name,
        "form_type": form.form_type,
        "passing_score": form.passing_score,
        "compensation_increase": form.compensation_increase,
        "bamboo_compensation_field": form.bamboo_compensation_field,
        "created_at": form.created_at
    }

@router.put("/{form_id}", response_model=Dict[str, Any])
def update_form(form_id: int, form_data: FormUpdate, db: Session = Depends(deps.get_db)):
    """Update form settings including compensation increase"""
    form = db.query(Form).filter(Form.id == form_id).first()
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")
    
    # Update only the fields that are provided
    for key, value in form_data.dict(exclude_unset=True).items():
        setattr(form, key, value)
    
    try:
        db.commit()
        return {
            "success": True,
            "message": "Form updated successfully",
            "form_id": form.id
        }
    except Exception as e:
        db.rollback()
        logger.exception(f"Error updating form: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error updating form: {str(e)}")