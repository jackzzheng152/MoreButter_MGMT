import base64
import httpx
import requests
from sqlalchemy.orm import Session
from datetime import datetime, date
import xml.etree.ElementTree as ET
from typing import Optional


from app.config import settings, logger
from app.models.bamboo_hr_log import BambooHRLog

def parse_most_recent_rate(xml_text: str) -> Optional[float]:
    """
    Given the full <table>…</table> XML from BambooHR,
    find the <row> with the latest startDate and return its <field id="rate"> as a float.
    """
    try:
        root = ET.fromstring(xml_text)
    except ET.ParseError as e:
        logger.error(f"Unable to parse compensation XML: {e}")
        return None

    latest_date: datetime.date | None = None
    latest_rate: float | None = None

    for row in root.findall("row"):
        sd_elem = row.find("./field[@id='startDate']")
        rate_elem = row.find("./field[@id='rate']")
        if sd_elem is None or rate_elem is None or not sd_elem.text or not rate_elem.text:
            continue

        try:
            date_obj = datetime.strptime(sd_elem.text, "%Y-%m-%d").date()
            rate_val = float(rate_elem.text)
        except (ValueError, TypeError):
            continue

        if latest_date is None or date_obj > latest_date:
            latest_date = date_obj
            latest_rate = rate_val

    return latest_rate

def build_compensation_xml(
    start_date,
    rate,
    rate_currency,
    pay_type,
    exempt=None,
    reason=None,
    comment=None,
    paid_per=None,
    pay_schedule=None,
    overtime_rate=None,
    overtime_currency=None
):
    xml = f"""<compensation>
  <field id="startDate">{start_date}</field>
  <field id="rate" currency="{rate_currency}">{rate}</field>
  <field id="type">{pay_type}</field>"""
    
    if exempt:
        xml += f'\n  <field id="exempt">{exempt}</field>'
    if reason:
        xml += f'\n  <field id="reason">{reason}</field>'
    if comment is not None:
        xml += f'\n  <field id="comment">{comment}</field>'
    if paid_per:
        xml += f'\n  <field id="paidPer">{paid_per}</field>'
    if pay_schedule:
        xml += f'\n  <field id="paySchedule">{pay_schedule}</field>'
    if overtime_rate:
        currency = overtime_currency if overtime_currency else rate_currency
        xml += f'\n  <field id="overtimeRate" currency="{currency}">{overtime_rate}</field>'
    
    xml += "\n</compensation>"
    return xml

def build_jobinfo_xml(
    date: str,
    location: str = None,
    department: str = None,
    division: str = None,
    job_title: str = None,
    reports_to: str = None,
):
    xml = f"""<row>
  <field id="date">{date}</field>"""
    
    if location:
        xml += f'\n  <field id="location">{location}</field>'
    if department:
        xml += f'\n  <field id="department">{department}</field>'
    if division:
        xml += f'\n  <field id="division">{division}</field>'
    if job_title:
        xml += f'\n  <field id="jobTitle">{job_title}</field>'
    if reports_to:
        xml += f'\n  <field id="reportsTo">{reports_to}</field>'
    
    
    xml += "\n</row>"
    return xml

async def get_employee_compensation(bamboo_hr_id: str, db: Session, employee_id: int = None):
    """Get current employee compensation from BambooHR"""
    if not settings.BAMBOO_HR_API_KEY or not settings.BAMBOO_HR_SUBDOMAIN:
        logger.error("BambooHR API configuration missing")
        return None
    
    auth_str = f"{settings.BAMBOO_HR_API_KEY}:x"
    auth_bytes = auth_str.encode("utf-8")
    auth_base64 = base64.b64encode(auth_bytes).decode("utf-8")

    table = "compensation"
    endpoint = f"https://api.bamboohr.com/api/gateway.php/{settings.BAMBOO_HR_SUBDOMAIN}/v1/employees/{bamboo_hr_id}/tables/{table}"
    params = {"fields": "compensation"}
    headers = {
        "Accept": "*/*", 
        "authorization": f"Basic {auth_base64}"
    }
    
    # Log the request
    log_entry = BambooHRLog(
        employee_id=employee_id,
        request_type="GET",
        request_endpoint=endpoint,
        request_payload={"fields": "compensation"},
        success=False  # Will update after the request
    )
    db.add(log_entry)
    db.flush()
    
    try:
        response = requests.get(endpoint, headers=headers)
        xml_text = response.text

        # parse out just the most recent rate
        rate = parse_most_recent_rate(xml_text)

        # update and commit log
        log_entry.response_status = response.status_code
        log_entry.response_body = {"raw_xml": xml_text}
        log_entry.success = (response.status_code == 200)
        db.commit()

        if not log_entry.success:
            logger.error(f"BambooHR GET failed ({response.status_code}): {response.text}")
            return None

        return response.text

    except Exception as e:
        logger.exception(f"Exception getting compensation from BambooHR: {e}")
        log_entry.response_body = {"error": str(e)}
        db.commit()
        return None

async def update_test_results(bamboo_hr_id: str, score: float, db: Session, employee_id: int = None, submission_id: int = None, quiz_name: str = None, quiz_date: datetime = None):
    """Update employee test results in BambooHR"""
    if not settings.BAMBOO_HR_API_KEY or not settings.BAMBOO_HR_SUBDOMAIN:
        logger.error("BambooHR API configuration missing")
        return False
    
    auth_str = f"{settings.BAMBOO_HR_API_KEY}:x"
    auth_bytes = auth_str.encode("utf-8")
    auth_base64 = base64.b64encode(auth_bytes).decode("utf-8")

    

    table = "customTestTable"
    
    endpoint = f"https://api.bamboohr.com/api/gateway.php/{settings.BAMBOO_HR_SUBDOMAIN}/v1/employees/{bamboo_hr_id}/tables/{table}"
    headers = {
        "accept": "*/*",
        "authorization": f"Basic {auth_base64}"
    }
    
    pass_fail = "Pass" if score >= 10 else "Fail"

    # Prepare the payload - this structure will need to match your BambooHR setup
    payload = {
        "customDate3": quiz_date.strftime("%Y-%m-%d"),  # You might want to use the current date
        "customScore": score,
        "customPassFail": pass_fail,
        "customQuizName" : quiz_name
    }
    
    # Log the request
    log_entry = BambooHRLog(
        employee_id=employee_id,
        submission_id=submission_id,
        request_type="POST",
        request_endpoint=endpoint,
        request_payload=payload,
        success=False  # Will update after the request
    )
    db.add(log_entry)
    db.flush()
    
    try:
        
        response = requests.post(endpoint, json=payload, headers=headers)

        # Update the log with response data
        log_entry.response_status = response.status_code
        try:
            log_entry.response_body = response.json() if response.status_code == 200 else {"error": response.text}
        except ValueError:
            log_entry.response_body = {"error": "Invalid JSON response from BambooHR", "raw": response.text}
        
        log_entry.success = response.status_code == 200
        db.commit()

        if response.status_code != 200:
            logger.error(f"Error updating BambooHR: {response.text}")
            return False

        return True

    except requests.exceptions.RequestException as e:
        logger.exception(f"Exception updating BambooHR: {str(e)}")
        log_entry.response_body = {"error": str(e)}
        db.commit()
        return False

def update_job_info(
    bamboo_hr_id: str,
    db: Session,
    employee_id: int = None,
    submission_id: int = None,
    job_date: str = None,
    location: str = None,
    department: str = None,
    division: str = None,
    job_title: str = None,
    reports_to: str = None,
):
    """Update employee job information in BambooHR"""
    if not settings.BAMBOO_HR_API_KEY or not settings.BAMBOO_HR_SUBDOMAIN:
        logger.error("BambooHR API configuration missing")
        return False

    auth_str = f"{settings.BAMBOO_HR_API_KEY}:x"
    auth_bytes = auth_str.encode("utf-8")
    auth_base64 = base64.b64encode(auth_bytes).decode("utf-8")

    table = "jobInfo"
    endpoint = f"https://api.bamboohr.com/api/gateway.php/{settings.BAMBOO_HR_SUBDOMAIN}/v1/employees/{bamboo_hr_id}/tables/{table}"

    headers = {
        "accept": "*/*",
        "authorization": f"Basic {auth_base64}"
    }

    payload = {
        "date": job_date.strftime("%Y-%m-%d"),
        "location": location,
        "department": department,
        "division": division,
        "jobTitle": job_title,
        "reportsTo": reports_to
    }

    # Remove any None values from the payload
    payload = {k: v for k, v in payload.items() if v is not None}
    logger.info("this is the payload: "+str(payload))
    # Log the request
    log_entry = BambooHRLog(
        employee_id=employee_id,
        submission_id=submission_id,
        request_type="POST",
        request_endpoint=endpoint,
        request_payload=payload,
        success=False  # Will update after the request
    )
    db.add(log_entry)
    db.flush()

    try:
        response = requests.post(endpoint, json=payload, headers=headers)
        logger.info("this is the response: "+str(response.text))
        log_entry.response_status = response.status_code
        try:
            log_entry.response_body = response.json() if response.status_code == 200 else {"error": response.text}
        except ValueError:
            log_entry.response_body = {"error": "Invalid JSON response from BambooHR", "raw": response.text}
        logger.info("this is the log entry: "+str(log_entry))
        log_entry.success = response.status_code == 200
        db.commit()

        if response.status_code != 200:
            logger.error(f"Error updating BambooHR job info: {response.text}")
            return False

        return True

    except requests.exceptions.RequestException as e:
        logger.exception(f"Exception updating BambooHR job info: {str(e)}")
        log_entry.response_body = {"error": str(e)}
        db.commit()
        return False

async def update_compensation(
    bamboo_hr_id: str, 
    rate_amount: float, 
    job_title: str,
    db: Session, 
    employee_id: int = None, 
    submission_id: int = None,
    quiz_date: datetime = None,
    quiz_name: str = None,
    matching_row_id: int = None,
    effective_date_str: str = None,
    reason: str = None
    ):
    """Update employee compensation in BambooHR"""
    if not settings.BAMBOO_HR_API_KEY or not settings.BAMBOO_HR_SUBDOMAIN:
        logger.error("BambooHR API configuration missing")
        return False
    
    logger.info(f"this is bamboo_hr_id: {bamboo_hr_id}")
    if isinstance(quiz_date, str):
        quiz_date = datetime.fromisoformat(quiz_date.replace("Z", "+00:00"))
        

    auth_str = f"{settings.BAMBOO_HR_API_KEY}:x"
    auth_bytes = auth_str.encode("utf-8")
    auth_base64 = base64.b64encode(auth_bytes).decode("utf-8")
    
    table = "compensation"
    add_endpoint = f"https://api.bamboohr.com/api/gateway.php/{settings.BAMBOO_HR_SUBDOMAIN}/v1/employees/{bamboo_hr_id}/tables/{table}"
    update_endpoint = f"https://api.bamboohr.com/api/gateway.php/{settings.BAMBOO_HR_SUBDOMAIN}/v1/employees/{bamboo_hr_id}/tables/{table}/{matching_row_id}"
    headers = {
        "accept": "*/*",
        "content-type": "application/xml",
        "authorization": f"Basic {auth_base64}"
    }
    

    notes = ""
    if quiz_name:
        notes = f"Passed {quiz_name} quiz on {quiz_date.strftime('%Y-%m-%d')}"
    else:
        notes = "Compensation update"
    

    # Update the compensation
    payload = {
        "compensation": str(rate_amount),
        "jobTitle": job_title
    }
    
     # or some fallback default

    logger.info(f"this is effective date str: {effective_date_str}")
    logger.info(f"this is new compensation in update compensation: {rate_amount}")
    xml_data = build_compensation_xml(
        start_date=effective_date_str,
        rate=str(rate_amount),
        rate_currency="USD",
        pay_type="Hourly",
        exempt="Non-exempt",
        reason=reason,
        comment=notes,
        paid_per="PayPeriod",
        pay_schedule="Bi-Monthly",
        overtime_rate=str(rate_amount*1.5)
    )

    
    
    # Log the request
    log_entry = BambooHRLog(
        employee_id=employee_id,
        submission_id=submission_id,
        request_type="POST",
        request_endpoint=add_endpoint if not matching_row_id else update_endpoint,
        request_payload=payload,
        success=False, # Will update after the request
    )
    db.add(log_entry)
    db.flush()
    
    try:
        if matching_row_id:
            response = requests.post(update_endpoint, data=xml_data, headers=headers)
            
        else:
            response = requests.post(add_endpoint, data=xml_data, headers=headers)
            
        print("this is the response: "+str(response.text))
        # Update the log with response data
        log_entry.response_status = response.status_code
        try:
            log_entry.response_body = response.json() if response.status_code == 200 else {"error": response.text}
        except ValueError:
            log_entry.response_body = {"error": "Invalid JSON response from BambooHR", "raw": response.text}
        
        log_entry.success = response.status_code == 200
        db.commit()

        if response.status_code != 200:
            logger.error(f"Error updating BambooHR: {response.text}")
            return False

        return True

    except requests.exceptions.RequestException as e:
        logger.exception(f"Exception updating BambooHR: {str(e)}")
        log_entry.response_body = {"error": str(e)}
        db.commit()
        return False

def update_jobinfo(
    bamboo_hr_id: str,
    db: Session,
    employee_id: int = None,
    submission_id: int = None,
    matching_row_id: int = None,
    effective_date_str: str = None,
    location: str = None,
    department: str = None,
    division: str = None,
    job_title: str = None,
    reports_to: str = None,
    reason: str = None
    ):
    """Update employee job information in BambooHR"""
    if not settings.BAMBOO_HR_API_KEY or not settings.BAMBOO_HR_SUBDOMAIN:
        logger.error("BambooHR API configuration missing")
        return False
    
    logger.info(f"this is bamboo_hr_id: {bamboo_hr_id}")

    auth_str = f"{settings.BAMBOO_HR_API_KEY}:x"
    auth_bytes = auth_str.encode("utf-8")
    auth_base64 = base64.b64encode(auth_bytes).decode("utf-8")
    
    table = "jobInfo"
    add_endpoint = f"https://api.bamboohr.com/api/gateway.php/{settings.BAMBOO_HR_SUBDOMAIN}/v1/employees/{bamboo_hr_id}/tables/{table}"
    update_endpoint = f"https://api.bamboohr.com/api/gateway.php/{settings.BAMBOO_HR_SUBDOMAIN}/v1/employees/{bamboo_hr_id}/tables/{table}/{matching_row_id}"
    headers = {
        "accept": "*/*",
        "content-type": "application/xml",
        "authorization": f"Basic {auth_base64}"
    }
    
    notes = "Job information update"
    if reason:
        notes = reason

    logger.info(f"this is effective date str: {effective_date_str}")
    logger.info(f"this is matching row id: {matching_row_id}")
    
    # Build XML for job information
    xml_data = build_jobinfo_xml(
        date=effective_date_str,
        location=location,
        department=department,
        division=division,
        job_title=job_title,
        reports_to=reports_to
    )

    logger.info(f"this is xml data: {xml_data}")
    
    # Prepare payload for logging
    payload = {
        "date": effective_date_str,
        "location": location,
        "department": department,
        "division": division, 
        "jobTitle": job_title,
        "reportsTo": reports_to
    }

    logger.info(f"this is payload: {payload}")
    
    # Log the request
    log_entry = BambooHRLog(
        employee_id=employee_id,
        submission_id=submission_id,
        request_type="POST",
        request_endpoint=add_endpoint if not matching_row_id else update_endpoint,
        request_payload=payload,
        success=False, # Will update after the request
    )
    db.add(log_entry)
    db.flush()
    
    try:
        if matching_row_id:
            response = requests.post(update_endpoint, data=xml_data, headers=headers)
        else:
            logger.info(f"this is add endpoint: {add_endpoint}")
            response = requests.post(add_endpoint, data=xml_data, headers=headers)
            
        print("this is the response: "+str(response.text))
        # Update the log with response data
        log_entry.response_status = response.status_code
        try:
            log_entry.response_body = response.json() if response.status_code == 200 else {"error": response.text}
        except ValueError:
            log_entry.response_body = {"error": "Invalid JSON response from BambooHR", "raw": response.text}
        
        log_entry.success = response.status_code == 200
        db.commit()

        if response.status_code != 200:
            logger.error(f"Error updating BambooHR job info: {response.text}")
            return False

        return True

    except requests.exceptions.RequestException as e:
        logger.exception(f"Exception updating BambooHR job info: {str(e)}")
        log_entry.response_body = {"error": str(e)}
        db.commit()
        return False

def update_employment_status(
    bamboo_hr_id: str,
    db: Session,
    employee_id: int = None,
    submission_id: int = None,
    status_date: str = None,
    employment_status: str = None,  # Terminated, Contractor, Full-Time, Furloughed, Part-Time
    comment: str = None,
    termination_reason: str = None,  # Attendance, End of Season, Other employment, Performance, Relocation
    termination_type: str = None,    # Death, Resignation (Voluntary), Termination (Involuntary)
    eligible_for_rehire: str = None, # No, Upon review, Yes
    termination_regrettable: str = None,
):
    """Update employee employment status in BambooHR"""
    if not settings.BAMBOO_HR_API_KEY or not settings.BAMBOO_HR_SUBDOMAIN:
        logger.error("BambooHR API configuration missing")
        return False

    auth_str = f"{settings.BAMBOO_HR_API_KEY}:x"
    auth_bytes = auth_str.encode("utf-8")
    auth_base64 = base64.b64encode(auth_bytes).decode("utf-8")

    table = "employmentStatus"
    endpoint = f"https://api.bamboohr.com/api/gateway.php/{settings.BAMBOO_HR_SUBDOMAIN}/v1/employees/{bamboo_hr_id}/tables/{table}"

    headers = {
        "accept": "*/*",
        "authorization": f"Basic {auth_base64}"
    }
    # Convert date object to string if it's a date object
    formatted_status_date = None
    if status_date:
        if isinstance(status_date, datetime) or isinstance(status_date, date):
            formatted_status_date = status_date.strftime("%Y-%m-%d")
        else:
            formatted_status_date = status_date

    # Map function parameters to BambooHR field aliases
    payload = {
        "date": formatted_status_date,
        "employmentStatus": employment_status,
        "comment": comment,
        "terminationReasonId": termination_reason,
        "terminationTypeId": termination_type,
        "terminationRehireId": eligible_for_rehire,
        "terminationRegrettableId": termination_regrettable
    }

    # Remove any None values from the payload
    payload = {k: v for k, v in payload.items() if v is not None}
    logger.info("this is the payload: "+str(payload))
    
    # Log the request
    log_entry = BambooHRLog(
        employee_id=employee_id,
        submission_id=submission_id,
        request_type="POST",
        request_endpoint=endpoint,
        request_payload=payload,
        success=False  # Will update after the request
    )
    db.add(log_entry)
    db.flush()

    try:
        response = requests.post(endpoint, json=payload, headers=headers)
        logger.info("this is the response: "+str(response.text))
        log_entry.response_status = response.status_code
        try:
            log_entry.response_body = response.json() if response.status_code == 200 else {"error": response.text}
        except ValueError:
            log_entry.response_body = {"error": "Invalid JSON response from BambooHR", "raw": response.text}
        logger.info("this is the log entry: "+str(log_entry))
        log_entry.success = response.status_code == 200
        db.commit()

        if response.status_code != 200:
            logger.error(f"Error updating BambooHR employment status: {response.text}")
            return False

        return True

    except requests.exceptions.RequestException as e:
        logger.exception(f"Exception updating BambooHR employment status: {str(e)}")
        log_entry.response_body = {"error": str(e)}
        db.commit()
        return False

