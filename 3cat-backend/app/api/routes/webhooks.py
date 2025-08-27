from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session

from app.api import deps
from app.schemas.tally import TallySubmission
from app.models.employee import Employee
from app.models.form import Form
from app.models.submission import Submission
from app.services.tally import extract_email_from_submission, extract_score_from_submission
from app.services.bamboo_hr import update_test_results
from app.services.compensation import process_compensation_update
from app.services.bamboo_hr import get_employee_compensation
from app.services.tally import extract_time_and_quiz_name
from app.models.job_level import JobLevel
from app.config import logger
from datetime import datetime 
import xml.etree.ElementTree as ET


router = APIRouter()

@router.post("/tally-submission")
async def process_tally_submission(submission: TallySubmission, db: Session = Depends(deps.get_db)):
    """Process a Tally.so form submission webhook with compensation updates"""
    try:
        logger.info(f"Received submission for form: {submission.data.formName}")

        location_code = "CH"  # Default location
        for field in submission.data.fields:
            if "location" in field.label.lower() and field.type == "DROPDOWN":
                # Get the selected option ID (first element in the value array)
                if field.value and isinstance(field.value, list) and len(field.value) > 0:
                    selected_id = field.value[0]
                    
                    # Find the matching option to get the location text
                    for option in field.options:
                        if option.get("id") == selected_id:
                            location_code = option.get("text")
                            break
                break
        
        
        # Extract email from submission
        email = extract_email_from_submission(submission.data)
        if not email:
            logger.error("Email not found in submission")
            raise HTTPException(status_code=400, detail="Email not found in submission")
        

        
        # Look up form in database
        form = db.query(Form).filter(Form.tally_form_id == submission.data.formId).first()
       
        if not form:
            # Form not found, create it
            form = Form(
                tally_form_id=submission.data.formId,
                form_name=submission.data.formName,
                form_type="quiz"
            )
            db.add(form)
            db.flush()
        
        # Look up employee by email
        employee = db.query(Employee).filter(Employee.email == email).first()
        
        if not employee:
            logger.error(f"Employee not found with email: {email}")
            raise HTTPException(status_code=404, detail=f"Employee not found with email: {email}")
        
        # Get score from submission
        score = extract_score_from_submission(submission.data)
        
        # Determine if passed
        passed = score >= form.passing_score if form.passing_score else score >= 10.0
        
        print("this is the passed: "+str(passed))
        already_passed = False
        if passed:
            existing_passed = db.query(Submission).filter(
                Submission.employee_id == employee.employee_id,
                Submission.form_id == form.id,
                Submission.passed == True
            ).first()
            already_passed = existing_passed is not None
            logger.info(f"Employee {employee.employee_id} has already passed this test. No compensation change.")
            
        most_recent_passed = db.query(Submission).join(Form).filter(
                    Submission.employee_id == employee.employee_id,
                    Submission.passed == True
                ).order_by(Submission.created_at.desc()).first()    

        # Store submission in database
        new_submission = Submission(
            form_id=form.id,
            employee_id=employee.employee_id,
            submission_id=submission.data.submissionId,
            score=score,
            passed=passed,
            submission_data=submission.dict(),
            processed=False,
            bamboo_hr_updated=False,
            compensation_updated=False
        )
        db.add(new_submission)
        db.flush()
        
        # Initialize response data
        bamboo_updated = False
        compensation_updated = False

        quiz_date, quiz_name = extract_time_and_quiz_name(submission.data)
        
        # Always update test results in BambooHR
        try:
            
            bamboo_get_compensation = await get_employee_compensation(
                employee.bamboo_hr_id,
                db,
                employee.employee_id
            )
            
            bamboo_updated = await update_test_results(
                employee.bamboo_hr_id,
                score,
                db,
                employee.employee_id,
                new_submission.id,
                quiz_name=form.form_name,
                quiz_date=quiz_date
            )
        except Exception as e:
            logger.exception(f"Error updating test results in BambooHR: {str(e)}")
            
        #update compensation if the employee passed
        if employee and passed and form.job_level_code and not already_passed:
            try:
                # Check if this is a higher level test
                
                
                update_needed = True
                if most_recent_passed:
                    current_form = db.query(Form).filter(Form.id == most_recent_passed.form_id).first()
                    if current_form and current_form.job_level_code:
                        current_level = db.query(JobLevel).filter(JobLevel.level_code == current_form.job_level_code).first()
                        new_level = db.query(JobLevel).filter(JobLevel.level_code == form.job_level_code).first()
                        
                        if current_level and new_level and current_level.min_rate >= new_level.min_rate:
                            logger.info(f"Test passed but not a higher level than current. No change needed.")
                            update_needed = False

                if update_needed:
                    

                    #convert quiz_date to effective_date datetime object
                    # quiz_date = datetime.fromisoformat(quiz_date.replace("Z", "+00:00"))
                    effective_date = None
                    if quiz_date:
                        # Get current date components
                        day = quiz_date.day
                        month = quiz_date.month
                        year = quiz_date.year
                        
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
                    else:
                        # Default to current date if quiz_date is None
                        effective_date = datetime.now()

                    # Format date as YYYY-MM-DD
                    effective_date_str = effective_date.strftime("%Y-%m-%d")

                    matching_row_id = None
                    root = ET.fromstring(bamboo_get_compensation)
                    # Iterate and search
                    for row in root.findall('row'):
                        for field in row.findall('field'):
                            if field.attrib.get('id') == 'startDate' and field.text == effective_date_str:
                                matching_row_id = row.attrib.get('id')
                                break
                        if matching_row_id:
                            break
                    
                        
                    compensation_updated = await process_compensation_update(
                        employee.employee_id,
                        form.id,
                        new_submission.id,
                        location_code,  # Pass the location
                        db,
                        quiz_date,
                        quiz_name,
                        matching_row_id,
                        effective_date_str
                    )
            except Exception as e:
                logger.exception(f"Error updating compensation: {str(e)}")


        # Update submission to mark as processed
        new_submission.processed = True
        new_submission.bamboo_hr_updated = bamboo_updated
        new_submission.compensation_updated = compensation_updated
        db.commit()
        
        return {
            "success": True,
            "message": "Submission processed successfully",
            "submission_id": new_submission.id,
            "passed": passed,
            "bamboo_updated": bamboo_updated,
            "compensation_updated": compensation_updated
        }
    
    except Exception as e:
        db.rollback()
        logger.exception(f"Error processing submission: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processing submission: {str(e)}")