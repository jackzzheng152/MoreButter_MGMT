import re
from datetime import datetime
from typing import Tuple, Optional, Dict, Any
from app.config import logger
import pytz

from app.schemas.tally import TallyFormData

def extract_email_from_submission(submission_data: TallyFormData) -> Optional[str]:
    """Extract email from Tally.so submission data robustly"""
    if not submission_data or not hasattr(submission_data, "fields"):
        return None

    email_regex = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'

    for field in submission_data.fields:
        # Check by type first
        if field.type.upper() == "EMAIL" and field.value:
            return field.value

        # Check if label looks like email field
        if "email" in field.label.lower() and field.value:
            return field.value

        # Last resort: check for string value that looks like an email
        if field.type in ["INPUT_TEXT", "TEXT", "SHORT_TEXT"] and isinstance(field.value, str):
            if re.match(email_regex, field.value):
                return field.value

    return None

def calculate_score(submission_data: TallyFormData) -> float:
    """Calculate quiz score from Tally.so submission data"""
    if not submission_data or not hasattr(submission_data, "fields"):
        return 0
    
    correct_answers = 0
    total_questions = 0
    
    # Count correct answers in quiz questions
    for field in submission_data.fields:
        if field.type in ["MULTIPLE_CHOICE", "CHECKBOXES"]:
            total_questions += 1
            
            # Check if answer is correct based on metadata
            if hasattr(field, "metadata") and field.metadata and "correct" in field.metadata and field.value:
                correct_value = field.metadata["correct"]
                user_value = field.value
                
                # Handle both single and multiple answers
                if isinstance(user_value, list) and isinstance(correct_value, list):
                    if sorted(user_value) == sorted(correct_value):
                        correct_answers += 1
                elif user_value == correct_value:
                    correct_answers += 1
    
    # Calculate percentage score
    if total_questions == 0:
        return 0
    return (correct_answers / total_questions) * 100

def extract_score_from_submission(submission_data: TallyFormData) -> float:
    """Extract score from Tally.so submission data if available"""
    print("running extract score from submission")
    if not submission_data or not hasattr(submission_data, "fields"):
        print("no submission data or fields")
        return 0
    
    # Look for a score field
    for field in submission_data.fields:
        if "score" in field.label.lower() and field.type == "CALCULATED_FIELDS":
            try:
                print("this is the score from services tally: "+str(field.value))
                return float(field.value)
            except (ValueError, TypeError):
                pass
    
    # If no score field found, calculate it
    print("no score field found, calculating score")
    return calculate_score(submission_data)

def extract_time_and_quiz_name(form_data: TallyFormData) -> Tuple[Optional[datetime], Optional[str]]:
    """
    Extract the submission time and quiz name from Tally.so submission data.
    
    Args:
        submission_data: The complete submission data JSON object
        
    Returns:
        tuple: (datetime object of submission time, quiz name string)
    """
    # Default values in case extraction fails
    submission_time = None
    quiz_name = None
    
    try:
        submission_time = datetime.fromisoformat(form_data.createdAt.replace("Z", "+00:00"))

        # Convert to Pacific Time
        pacific = pytz.timezone("US/Pacific")
        submission_time = submission_time.astimezone(pacific)

        # Format it back to string
        submission_time_str = submission_time.strftime("%Y-%m-%d %H:%M:%S")

        print("this is the submission time: "+str(submission_time))
        print("trying to extract quiz name now")
  
        # Extract quiz name from formName field
        quiz_name = form_data.formName
        print("this is the quiz name: "+str(quiz_name))
        return submission_time, quiz_name
        
    except Exception as e:
        logger.error(f"Error extracting time and quiz name: {str(e)}")
        return datetime.now(), "Unknown Quiz"


