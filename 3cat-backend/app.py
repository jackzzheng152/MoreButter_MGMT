# # app.py
# from fastapi import FastAPI, HTTPException, Depends, Request
# from fastapi.middleware.cors import CORSMiddleware
# from sqlalchemy import create_engine, Column, Integer, String, Boolean, Float, DateTime, ForeignKey, Text, func
# from sqlalchemy.ext.declarative import declarative_base
# from sqlalchemy.orm import sessionmaker, relationship, Session
# from sqlalchemy.dialects.postgresql import JSONB
# from pydantic import BaseModel, EmailStr
# from typing import Optional, List, Dict, Any, Union
# import httpx
# import os
# import json
# import logging
# from datetime import datetime
# import re
# import base64
# from dotenv import load_dotenv

# # Load environment variables
# load_dotenv()

# # Configure logging
# logging.basicConfig(
#     level=logging.INFO,
#     format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
#     handlers=[logging.StreamHandler()]
# )
# logger = logging.getLogger(__name__)

# # Database connection
# DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost/sway_dashboard")
# engine = create_engine(DATABASE_URL)
# SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
# Base = declarative_base()

# # BambooHR configuration
# BAMBOO_HR_API_KEY = os.getenv("BAMBOO_HR_API_KEY")

# BAMBOO_HR_SUBDOMAIN = os.getenv("BAMBOO_HR_SUBDOMAIN")


# # Models
# class Employee(Base):
#     __tablename__ = "employees"
    
#     id = Column(Integer, primary_key=True, index=True)
#     email = Column(String, unique=True, nullable=False, index=True)
#     bamboo_hr_id = Column(String, unique=True, nullable=False, index=True)
#     first_name = Column(String, nullable=True)
#     last_name = Column(String, nullable=True)
#     department = Column(String, nullable=True)
#     created_at = Column(DateTime(timezone=True), server_default=func.now())
#     updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
#     submissions = relationship("Submission", back_populates="employee")
#     bamboo_logs = relationship("BambooHRLog", back_populates="employee")

# class Form(Base):
#     __tablename__ = "forms"
    
#     id = Column(Integer, primary_key=True, index=True)
#     tally_form_id = Column(String, unique=True, nullable=False, index=True)
#     form_name = Column(String, nullable=False)
#     form_type = Column(String, nullable=False)
#     compensation_field_id = Column(String, nullable=True)
#     passing_score = Column(Float, default=30.0)
#     created_at = Column(DateTime(timezone=True), server_default=func.now())
#     updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
#     submissions = relationship("Submission", back_populates="form")

# class Submission(Base):
#     __tablename__ = "submissions"
    
#     id = Column(Integer, primary_key=True, index=True)
#     form_id = Column(Integer, ForeignKey("forms.id", ondelete="CASCADE"))
#     employee_id = Column(Integer, ForeignKey("employees.id", ondelete="SET NULL"), nullable=True)
#     submission_id = Column(String, unique=True, nullable=False, index=True)
#     score = Column(Float, nullable=True)
#     passed = Column(Boolean, nullable=True)
#     submission_data = Column(JSONB, nullable=False)
#     processed = Column(Boolean, default=False)
#     bamboo_hr_updated = Column(Boolean, default=False)
#     created_at = Column(DateTime(timezone=True), server_default=func.now())
#     updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
#     form = relationship("Form", back_populates="submissions")
#     employee = relationship("Employee", back_populates="submissions")
#     bamboo_logs = relationship("BambooHRLog", back_populates="submission")

# class BambooHRLog(Base):
#     __tablename__ = "bamboo_hr_logs"
    
#     id = Column(Integer, primary_key=True, index=True)
#     employee_id = Column(Integer, ForeignKey("employees.id"), nullable=True)
#     submission_id = Column(Integer, ForeignKey("submissions.id"), nullable=True)
#     request_type = Column(String, nullable=False)
#     request_endpoint = Column(String, nullable=False)
#     request_payload = Column(JSONB, nullable=True)
#     response_status = Column(Integer, nullable=True)
#     response_body = Column(JSONB, nullable=True)
#     success = Column(Boolean, nullable=False)
#     created_at = Column(DateTime(timezone=True), server_default=func.now())
    
#     employee = relationship("Employee", back_populates="bamboo_logs")
#     submission = relationship("Submission", back_populates="bamboo_logs")

# # Pydantic models
# class EmployeeCreate(BaseModel):
#     email: EmailStr
#     bamboo_hr_id: str
#     first_name: Optional[str] = None
#     last_name: Optional[str] = None
#     department: Optional[str] = None

# class FormCreate(BaseModel):
#     tally_form_id: str
#     form_name: str
#     form_type: str
#     compensation_field_id: Optional[str] = None
#     passing_score: Optional[float] = 30.0

# class TallyField(BaseModel):
#     key: str
#     label: str
#     type: str
#     value: Any
#     options: Optional[List[Dict[str, Any]]] = None

# class TallyFormData(BaseModel):
#     responseId: str
#     submissionId: str
#     respondentId: str
#     formId: str
#     formName: str
#     createdAt: str
#     fields: List[TallyField]


# class TallySubmission(BaseModel):
#     eventId: str
#     eventType: str
#     createdAt: str
#     data: TallyFormData

# # Utility functions
# def get_db():
#     db = SessionLocal()
#     try:
#         yield db
#     finally:
#         db.close()

# def extract_email_from_submission(submission_data):
#     """Extract email from Tally.so submission data"""
#     if not submission_data or "fields" not in submission_data:
#         return None
    
#     # Look for email fields in the submission
#     for field in submission_data.get("fields", []):
#         # Check for email type fields
#         if field.get("type") == "EMAIL" and field.get("value"):
#             return field["value"]
        
#         # Check for text fields that may contain emails
#         if field.get("type") == "TEXT" and field.get("value"):
#             value = field["value"]
#             if "@" in value:
#                 # Basic email validation
#                 email_regex = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
#                 if re.match(email_regex, value):
#                     return value
    
#     return None

# def calculate_score(submission_data):
#     """Calculate quiz score from Tally.so submission data"""
#     if not submission_data or "fields" not in submission_data:
#         return 0
    
#     correct_answers = 0
#     total_questions = 0
    
#     # Count correct answers in quiz questions
#     for field in submission_data.get("fields", []):
#         if field.get("type") in ["MULTIPLE_CHOICE", "CHECKBOXES"]:
#             total_questions += 1
            
#             # Check if answer is correct based on metadata
#             if field.get("metadata") and "correct" in field.get("metadata", {}) and field.get("value"):
#                 correct_value = field["metadata"]["correct"]
#                 user_value = field["value"]
                
#                 # Handle both single and multiple answers
#                 if isinstance(user_value, list) and isinstance(correct_value, list):
#                     if sorted(user_value) == sorted(correct_value):
#                         correct_answers += 1
#                 elif user_value == correct_value:
#                     correct_answers += 1
    
#     # Calculate percentage score
#     if total_questions == 0:
#         return 0
#     return (correct_answers / total_questions) * 100

# async def update_bamboo_hr(bamboo_hr_id, score, db, employee_id=None, submission_id=None):
#     """Update employee compensation field in BambooHR"""
#     if not BAMBOO_HR_API_KEY or not BAMBOO_HR_SUBDOMAIN:
#         logger.error("BambooHR API configuration missing")
#         return False
    
#     auth_str = f"{BAMBOO_HR_API_KEY}:x"
#     auth_bytes = auth_str.encode("utf-8")
#     auth_base64 = base64.b64encode(auth_bytes).decode("utf-8")

#     table = "customTestTable"
    
#     endpoint = f"https://api.bamboohr.com/api/gateway.php/{BAMBOO_HR_SUBDOMAIN}/v1/employees/{bamboo_hr_id}/tables/{table}"
#     headers = {
#         "accept": "application/json",
#         "authorization": f"Basic {auth_base64}"
#     }
    
#     print(f"Score: {score}")
#     if score >= 10:
#         pass_fail = "Pass"
#     else:
#         pass_fail = "Fail"

#     # Prepare the payload - this structure will need to match your BambooHR setup
#     payload = {
#         "customDate3": "2025-03-08",
#         "customScore": score,
#         "customPassFail": pass_fail
#         }
    
    
#     # Log the request
#     log_entry = BambooHRLog(
#         employee_id=employee_id,
#         submission_id=submission_id,
#         request_type="POST",
#         request_endpoint=endpoint,
#         request_payload=payload,
#         success=False  # Will update after the request
#     )
#     db.add(log_entry)
#     db.flush()
    
#     try:
#         async with httpx.AsyncClient() as client:
#             response = await client.post(endpoint, json=payload, headers=headers)
            
#             # Update the log with response data
#             log_entry.response_status = response.status_code
#             log_entry.response_body = response.json() if response.status_code == 200 else {"error": response.text}
#             log_entry.success = response.status_code == 200
            
#             db.commit()
            
#             if response.status_code != 200:
#                 logger.error(f"Error updating BambooHR: {response.text}")
#                 return False
            
#             return True
#     except Exception as e:
#         logger.exception(f"Exception updating BambooHR: {str(e)}")
#         log_entry.response_body = {"error": str(e)}
#         db.commit()
#         return False

# # Create FastAPI app FIRST
# app = FastAPI(title="Tally.so BambooHR Integration")

# # Then add middleware
# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["*"],
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )

# # Routes
# @app.post("/webhook/tally-submission")
# async def process_tally_submission(submission: TallySubmission, db: Session = Depends(get_db)):
#     """Process a Tally.so form submission webhook"""
#     try:
#         logger.info(f"Received submission for form: {submission.data.formName}")
        
#         # Extract email from submission
#         email = None
#         for field in submission.data.fields:
#             # Look for fields labeled "Email" or type that might contain email
#             if "email" in field.label.lower() or field.type == "INPUT_EMAIL":
#                 email = field.value
#                 break
                
#         if not email:
#             # Also check for text fields that might contain an email
#             for field in submission.data.fields:
#                 if field.type == "INPUT_TEXT" and isinstance(field.value, str) and "@" in field.value:
#                     # Basic email validation
#                     email_regex = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
#                     if re.match(email_regex, field.value):
#                         email = field.value
#                         break
        
#         if not email:
#             logger.error("Email not found in submission")
#             raise HTTPException(status_code=400, detail="Email not found in submission")
        
#         # Look up form in database
#         form = db.query(Form).filter(Form.tally_form_id == submission.data.formId).first()
       
#         if not form:
#             # Form not found, create it
#             form = Form(
#                 tally_form_id=submission.data.formId,
#                 form_name=submission.data.formName,
#                 form_type="quiz"
#             )
#             db.add(form)
#             db.flush()
        
#         # Look up employee by email
#         employee = db.query(Employee).filter(Employee.email == email).first()

        
#         # Find the score field if any
#         score = 0
#         for field in submission.data.fields:
#             if "score" in field.label.lower() and field.type == "CALCULATED_FIELDS":
#                 score = float(field.value)
#                 break
        
#         passed = score >= form.passing_score if form.passing_score else score >= 30.0
        
#         # Store submission in database
#         new_submission = Submission(
#             form_id=form.id,
#             employee_id=employee.id if employee else None,
#             submission_id=submission.data.submissionId,
#             score=score,
#             passed=passed,
#             submission_data=submission.dict(),
#             processed=False,
#             bamboo_hr_updated=False
#         )
#         db.add(new_submission)
#         db.flush()
        
#         # If we have a BambooHR ID and a compensation field ID, update BambooHR
#         bamboo_updated = False
#         if employee:
#             try:

#                 bamboo_updated = await update_bamboo_hr(
#                     employee.bamboo_hr_id,
#                     score,
#                     db,
#                     employee.id,
#                     new_submission.id
#                 )
#             except Exception as e:
#                 logger.exception(f"Error updating BambooHR: {str(e)}")
        
#         # Update submission to mark as processed
#         new_submission.processed = True
#         new_submission.bamboo_hr_updated = bamboo_updated
#         db.commit()
        
#         return {
#             "success": True,
#             "message": "Submission processed successfully",
#             "submission_id": new_submission.id,
#             "bamboo_updated": bamboo_updated
#         }
    
#     except Exception as e:
#         db.rollback()
#         logger.exception(f"Error processing submission: {str(e)}")
#         raise HTTPException(status_code=500, detail=f"Error processing submission: {str(e)}")

# @app.post("/employees", response_model=dict)
# def create_employee(employee: EmployeeCreate, db: Session = Depends(get_db)):
#     """Create a new employee record"""
#     db_employee = Employee(**employee.dict())
#     db.add(db_employee)
#     try:
#         db.commit()
#         db.refresh(db_employee)
#         return {"id": db_employee.id, "message": "Employee created successfully"}
#     except Exception as e:
#         db.rollback()
#         raise HTTPException(status_code=400, detail=f"Error creating employee: {str(e)}")

# @app.post("/forms", response_model=dict)
# def create_form(form: FormCreate, db: Session = Depends(get_db)):
#     """Create a new form record"""
#     db_form = Form(**form.dict())
#     db.add(db_form)
#     try:
#         db.commit()
#         db.refresh(db_form)
#         return {"id": db_form.id, "message": "Form created successfully"}
#     except Exception as e:
#         db.rollback()
#         raise HTTPException(status_code=400, detail=f"Error creating form: {str(e)}")

# # Health check endpoint
# @app.get("/health")
# def health_check():
#     return {"status": "ok"}

# @app.post("/test-write")
# async def test_write_to_db(employee: EmployeeCreate, db: Session = Depends(get_db)):
#     try:
#         new_employee = Employee(
#             email=employee.email,
#             bamboo_hr_id=employee.bamboo_hr_id,
#             first_name=employee.first_name,
#             last_name=employee.last_name
#         )
#         db.add(new_employee)
#         db.commit()
#         return {"message": "Employee created successfully!", "employee": employee.dict()}
#     except Exception as e:
#         db.rollback()
#         raise HTTPException(status_code=500, detail=f"Failed to write to database: {str(e)}")

# # Run with: uvicorn app:app --reload
# if __name__ == "__main__":
#     import uvicorn
#     uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)