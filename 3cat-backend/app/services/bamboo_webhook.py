import requests
import json
from datetime import datetime
from sqlalchemy.orm import Session
from typing import Dict, Any, List
import re

from app.config import settings, logger
from app.models.employee import Employee
from app.models.job_level import JobLevel
from app.models.job_title import JobTitle
from app.models.bamboo_hr_log import BambooHRLog
from app.models.seven_shifts_log import SevenShiftsLog
from app.models.compensation_log import CompensationLog
from app.services.seven_shifts import deactivate_7shifts_user



async def process_bamboo_webhook(webhook_data: Dict[str, Any], db: Session):
    """
    Process BambooHR webhook data for pay rate changes and update 7shifts.
    
    Args:
        webhook_data: The webhook payload from BambooHR
        db: Database session
    
    Returns:
        Dict with processing results
    """
    results = {
        "processed": 0,
        "errors": 0,
        "details": []
    }
    
    try:
       
        employees_data = webhook_data.get("employees", [])
      
        for employee_data in employees_data:
            employee_result = {
                "bamboo_id": employee_data.get("id"),
                "status": "skipped",
                "message": ""
            }

            bamboo_id = employee_data.get("id")
            
            # Check if "Pay Rate" is in the changed fields
            logger.info("this is the employee data: "+str(employee_data))
            changed_fields = employee_data.get("changed_fields", [])
            logger.info("this is the changed fields: "+str(changed_fields))
            
            if "Pay Rate" not in changed_fields:
                employee_result["message"] = "Pay Rate not changed"
                results["details"].append(employee_result)
                logger.info("pay rate not changed")
                continue
            
            logger.info("pay rate changed found")
            # Get employee fields
            fields = employee_data.get("fields", {})
            
            email = fields.get("work_email") or fields.get("home_email")
            pay_rate = fields.get("pay_rate")
            effective_date = fields.get("effective_date")

          
            
            if not email or not pay_rate or not effective_date:
                employee_result["status"] = "error"
                employee_result["message"] = "Missing required fields"
                results["errors"] += 1
                results["details"].append(employee_result)
                continue
                
            # Find employee by email
            employee = db.query(Employee).filter(Employee.bamboo_hr_id == bamboo_id).first()
            if not employee:
                employee_result["status"] = "error"
                employee_result["message"] = f"Employee with ID {bamboo_id} not found"
                results["errors"] += 1
                results["details"].append(employee_result)
                continue

            logger.info("employee found" + str(employee))
            # Extract pay rate value

            pay_rate_match = re.match(r"(\d+\.?\d*)\s*USD", pay_rate)
            logger.info("pay rate match found" + str(pay_rate_match))
            if not pay_rate_match:
                employee_result["status"] = "error"
                employee_result["message"] = f"Could not parse pay rate: {pay_rate}"
                results["errors"] += 1
                results["details"].append(employee_result)
                continue
            
            pay_rate_value = float(pay_rate_match.group(1))
            if employee.current_compensation != pay_rate_value:
                employee.current_compensation = pay_rate_value
                
                # Create compensation log entry
                compensation_log = CompensationLog(
                    employee_id=employee.employee_id,
                    rate_amount=pay_rate_value,
                    location_id=employee.location_id,
                    effective_date=datetime.strptime(effective_date, "%Y-%m-%d") if effective_date else datetime.now(),
                    change_reason="Pay Rate Update",
                    bamboo_hr_updated=True,
                    new_title_id=employee.current_title_id,
                )
                db.add(compensation_log)
                db.commit()
            
            logger.info("pay rate value found" + str(pay_rate_value))
            # Find job level for this pay rate

            job_title = fields.get("Job Information - Job Title")
            logger.info("job title found" + str(job_title))
            location = fields.get("location")
            
            # job_level = find_job_level_for_pay_rate(pay_rate_value, db)
            # if not job_level:
            #     employee_result["status"] = "error"
            #     employee_result["message"] = f"Could not determine job level for pay rate: {pay_rate_value}"
            #     results["errors"] += 1
            #     results["details"].append(employee_result)
            #     continue
            
            # logger.info("job level found" + str(job_level.level_name))
            
            # Get 7shifts role ID
            location_id = employee.location_id
            logger.info("location id found" + str(location_id))
            # Look up the 7shifts role ID from job_titles based on level_name and location_id
            job_title_record = db.query(JobTitle).filter(
                JobTitle.title_name.ilike(f"%{job_title}%"),
                JobTitle.location_id == location_id
            ).first()

            logger.info("job title record found" + str(job_title_record))
            if not job_title_record or not job_title_record.sevenshifts_role_id:
                logger.info("no 7shifts role id found")
                employee_result["status"] = "error"
                employee_result["message"] = f"No 7shifts role ID found for job level: {job_title} at location {location_id}"
                results["errors"] += 1
                results["details"].append(employee_result)
                continue

            # Use the found role ID
            role_id = job_title_record.sevenshifts_role_id
            
            logger.info("role id found" + str(role_id))
            # Convert pay rate to cents for 7shifts
            wage_cents = int(pay_rate_value * 100)
            
            # Update 7shifts
            logger.info("employee seven shift id: "+str(employee.sevenshift_id))
            seven_shifts_result = update_seven_shifts(
                employee.sevenshift_id, 
                role_id, 
                wage_cents, 
                effective_date,
                employee.employee_id,  # Pass the employee_id
                db                     # Pass the db session
            )
            
            if seven_shifts_result.get("success"):
                employee_result["status"] = "success"
                employee_result["message"] = f"Updated in 7shifts: ${pay_rate_value}/hour, role: {job_title}"
                employee_result["seven_shifts_data"] = seven_shifts_result.get("data")
                results["processed"] += 1
            else:
                employee_result["status"] = "error"
                employee_result["message"] = seven_shifts_result.get("error", "Unknown error")
                results["errors"] += 1
                
            results["details"].append(employee_result)
            
            # --- 7shifts auto-termination logic ---
            if "employmentStatus" in changed_fields:
                new_status = fields.get("employmentStatus")
                if new_status and new_status.lower() == "terminated":
                    employee = db.query(Employee).filter(Employee.bamboo_hr_id == bamboo_id).first()
                    if employee and employee.sevenshift_id:
                        try:
                            await deactivate_7shifts_user(int(employee.sevenshift_id))
                            logger.info(f"Deactivated 7shifts user {employee.sevenshift_id} due to BambooHR termination.")
                        except Exception as e:
                            logger.error(f"Failed to deactivate 7shifts user: {e}")
            
        return results
        
    except Exception as e:
        logger.exception(f"Error processing BambooHR webhook: {str(e)}")
        db.rollback()
        results["errors"] += 1
        results["details"].append({
            "status": "error",
            "message": f"Server error: {str(e)}"
        })
        return results


def find_job_level_for_pay_rate(pay_rate: float, db: Session):
    """
    Find the appropriate job level for a given pay rate.
    
    Strategy: Find all job levels where the pay rate falls within min_rate and max_rate,
    then choose the one with the highest min_rate (most senior position).
    
    Args:
        pay_rate: The hourly pay rate
        db: Database session
    
    Returns:
        JobLevel object or None if no match
    """
    # Find job levels where pay rate is within range
    matching_levels = db.query(JobLevel).filter(
        JobLevel.min_rate <= pay_rate,
        JobLevel.max_rate >= pay_rate
    ).order_by(JobLevel.min_rate.desc()).all()
    
    if matching_levels:
        return matching_levels[0]  # Return the highest level that matches
    
    # Fallback: Find the closest job level
    all_levels = db.query(JobLevel).order_by(JobLevel.min_rate).all()
    
    closest_level = None
    min_difference = float('inf')
    
    for level in all_levels:
        # Calculate distance to the level's pay range
        if pay_rate < level.min_rate:
            difference = level.min_rate - pay_rate
        elif pay_rate > level.max_rate:
            difference = pay_rate - level.max_rate
        else:
            difference = 0  # Should not happen due to earlier query
            
        if difference < min_difference:
            min_difference = difference
            closest_level = level
    
    return closest_level


# Update your update_seven_shifts function to include logging:
def update_seven_shifts(user_id: str, role_id: str, wage_cents: int, effective_date: str, employee_id: int, db: Session):
    """
    Update employee wage in 7shifts.
    
    Args:
        user_id: 7shifts user ID
        role_id: 7shifts role ID
        wage_cents: Hourly wage in cents
        effective_date: Effective date (YYYY-MM-DD)
    
    Returns:
        Dict with update results
    """
    if not settings.SEVEN_SHIFTS_API_KEY or not settings.SEVEN_SHIFTS_COMPANY_ID:
        return {
            "success": False,
            "error": "7shifts API configuration missing"
        }
    
    
    company_id = settings.SEVEN_SHIFTS_COMPANY_ID
    create_wage_url = f"https://api.7shifts.com/v2/company/{company_id}/users/{user_id}/wages"
    create_role_url = f"https://api.7shifts.com/v2/company/{company_id}/users/{user_id}/role_assignments"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {settings.SEVEN_SHIFTS_API_KEY}"
    }
    logger.info("this is the role id: "+str(role_id))
    payload_role = {
        "primary": True,
        "role_id": role_id,
    }
    payload_wage = {
        "effective_date": effective_date,
        "role_id": role_id,
        "wage_type": "hourly",
        "wage_cents": wage_cents
    }
    
    # Create the log entry
    log_entry = SevenShiftsLog(
        employee_id=employee_id,
        request_type="POST",
        request_endpoint=create_wage_url,
        request_payload={
            "role_id": role_id,
            "wage_cents": wage_cents,
            "effective_date": effective_date,
            "wage_type": "hourly"
        },
        response_status=None,  # Will be updated after the API call
        response_body=None,    # Will be updated after the API call
        success=False          # Will be updated after the API call
    )
    db.add(log_entry)
    db.flush()  # This gives the log entry an ID
    
    try:
        response_role = requests.post(create_role_url, headers=headers, json=payload_role)
        response_wage = requests.post(create_wage_url, headers=headers, json=payload_wage)
        
        # Update the log entry with the response
        log_entry.response_status = response_role.status_code
        try:
            log_entry.response_body = response_role.json()
        except:
            log_entry.response_body = {"text": response_role.text}
        
        log_entry.success = response_role.status_code in (200, 201)
        
        if response_wage.status_code in (200, 201):
            result = {
                "success": True,
                "data": response_wage.json()
            }
        else:
            result = {
                "success": False,
                "error": f"7shifts API error: {response_wage.status_code} - {response_wage.text}"
            }
        
        db.commit()  # Commit the log entry
        return result
    except Exception as e:
        logger.exception(f"Error calling 7shifts API: {str(e)}")
        
        # Update the log entry with the error
        log_entry.response_body = {"error": str(e)}
        db.commit()
        
        return {
            "success": False,
            "error": f"Exception during 7shifts API call: {str(e)}"
        }