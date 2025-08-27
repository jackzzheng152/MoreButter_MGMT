# app/api/routes/bamboo_webhooks.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Dict, Any

from app.api import deps
from app.config import logger
from app.services.bamboo_webhook import process_bamboo_webhook
from app.schemas.bamboo_webhook import CompensationWebhook, EmployeeDetailsWebhook
from app.services.employee import update_employee_service, create_employee_service
from app.models.employee import Employee
from app.services.seven_shifts import create_seven_shifts_user
router = APIRouter()

@router.post("/bamboo-webhook")
async def bamboo_hr_webhook(webhook_data: CompensationWebhook, db: Session = Depends(deps.get_db)):
    """
    Handle webhooks from BambooHR for pay rate changes.
    Updates employee wages in 7shifts based on the new pay rate.
    """
    try:
        logger.info(f"Received BambooHR webhook with {len(webhook_data.employees)} employee changes")
        
        # Process the webhook data
        result = await process_bamboo_webhook(webhook_data.dict(), db)
        
        return {
            "success": True,
            "processed": result["processed"],
            "errors": result["errors"],
            "message": f"Processed {result['processed']} pay rate changes with {result['errors']} errors"
        }
    except Exception as e:
        logger.exception(f"Error processing BambooHR webhook: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processing webhook: {str(e)}")


@router.post("/employee-details-webhook")
async def process_employee_details_webhook(
    webhook_data: EmployeeDetailsWebhook,
    db: Session = Depends(deps.get_db)
):
    """Process BambooHR employee details webhook"""
    results = []
    
    for employee_data in webhook_data.employees:
        try:
            bamboo_id = employee_data.id
            fields = employee_data.fields
            logger.info(f'fields: {fields}')
            # Check if employee already exists
            existing_employee = db.query(Employee).filter(
                Employee.bamboo_hr_id == bamboo_id
            ).first()
            
            if existing_employee:
                # Update existing employee
                logger.info(f"Updating employee with bamboo_id: {bamboo_id}")
                result = await update_employee_service(existing_employee.employee_id, fields, db)
                results.append({
                    "bamboo_id": bamboo_id,
                    "action": "updated",
                    "status": "success",
                    "details": result
                })
            else:
                # Create new employee
                logger.info(f"Creating new employee with bamboo_id: {bamboo_id}")
                result = await create_employee_service(bamboo_id, fields, db)
                logger.info(f"this is the result: {result.current_compensation}")
                results.append({
                    "bamboo_id": bamboo_id,
                    "action": "created",
                    "status": "success",
                    "details": result
                })

                #Create shifts user
                seven_shifts_user = await create_seven_shifts_user(
                    employee_data,
                    result.current_compensation,
                    db=db
                )

                
                
        except Exception as e:
            logger.error(f"Error processing employee {employee_data.id}: {str(e)}")
            results.append({
                "bamboo_id": employee_data.id,
                "status": "error",
                "error": str(e)
            })
    
    return {
        "success": True,
        "processed": len(results),
        "results": results
    }



