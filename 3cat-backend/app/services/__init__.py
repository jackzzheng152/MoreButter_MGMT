from app.services.tally import extract_time_and_quiz_name
from app.services.tally import extract_email_from_submission
from app.services.tally import extract_score_from_submission
# BambooHR services removed - direct to 7shifts
from app.services.compensation import process_compensation_update
from app.services.seven_shifts import create_seven_shifts_user
from app.services.seven_shifts import update_7shifts_user
from app.services.tally_service import process_tally_submission