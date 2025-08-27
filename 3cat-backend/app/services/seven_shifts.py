# app/services/seven_shifts.py
import requests
import random
from datetime import datetime
from typing import List, Dict, Any, Optional, Union
from fastapi import HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.models.location import Location
from app.config import settings, logger
from app.models.employee import Employee
from app.models.job_title import JobTitle
from app.schemas.employee import EmployeeCreate


def log_seven_shifts_creation(
    employee_id: int,
    seven_shifts_id: str,
    response_data: Dict[str, Any],
    db: Session
) -> None:
    """
    Log the 7shifts user creation in the database
    
    Args:
        employee_id: ID of the employee in your system
        seven_shifts_id: ID assigned by 7shifts
        response_data: Response data from 7shifts API
        db: Database session
    """
    log_entry = SevenShiftsLog(
        employee_id=employee_id,
        request_type="CREATE",
        request_endpoint="users",
        request_payload={"user_creation": True},  # Simple payload
        response_status=200,
        response_body=response_data,
        success=True
    )
    db.add(log_entry)
    db.commit()


    


async def map_bamboo_department_to_7shifts(bamboo_department: str, employee_location: str, db: Session) -> List[int]:
    """
    Map BambooHR department to 7shifts department IDs, using store-specific mappings from the database
    """
    default_dept_ids = [668246]
    
    try:
        # Look up the location in the database
        logger.info(f"employee_location: {employee_location}")
        logger.info(f"location_name: {Location.location_name}")
        location = db.query(Location).filter(
            Location.location_name == employee_location
        ).first()
        logger.info(f"location: {location}")
        if not location:
            logger.warning(f"Location '{employee_location}' not found, using default department IDs")
            return default_dept_ids
        logger.info(f"location: {location}")
        # Check if this is a store department
        if bamboo_department.lower() == "store":
            # Use the store-specific department ID
            if location.sevenshift_store_id:
                return [int(location.sevenshift_store_id)]
        logger.info(f"location: {location}")
        # For other departments, could add additional mapping logic here
        # For example, check for management, admin, etc.
        
        # If no specific mapping matched, return the default
        logger.info(f"No specific department mapping for '{bamboo_department}' at '{employee_location}', using default")
        
        return default_dept_ids
        
    except Exception as e:
        logger.error(f"Error mapping department: {str(e)}")
        return default_dept_ids

async def map_bamboo_location_to_7shifts(bamboo_location: str, db: Session) -> List[int]:
    """Map BambooHR location to 7shifts location IDs"""
    default_location_ids = [668246]
    
    try:
        # Look up the location
        location = db.query(Location).filter(
            Location.location_name == bamboo_location  # or `Location.name` if that's your field
        ).first()

        if not location:
            logger.warning(f"BambooHR location '{bamboo_location}' not found in database. Using default 7shifts location IDs.")
            return default_location_ids

        if location.sevenshift_location_id:
            try:
                # Convert to int if it's a string in DB
                return [int(location.sevenshift_location_id)]
            except ValueError:
                logger.warning(f"Invalid sevenshift_location_id '{location.sevenshift_location_id}' for location '{bamboo_location}'. Using default.")
                return default_location_ids

        logger.info(f"No sevenshift_location_id found for '{bamboo_location}'. Using default 7shifts location ID.")
        return default_location_ids

    except Exception as e:
        logger.exception(f"Error mapping bamboo location '{bamboo_location}': {str(e)}")
        return default_location_ids

async def map_bamboo_title_to_7shifts(bamboo_title: str, location_ids: Union[int, List[int]], db: Session) -> List[int]:
    """Map BambooHR job title to 7shifts role ID(s) based on location"""

    from typing import Union
    default_job_title_ids = []

    try:
        bamboo_title = bamboo_title.strip()

        # Handle if location_ids is a list or a single int
        if isinstance(location_ids, list):
            query = db.query(JobTitle).filter(
                JobTitle.title_name.ilike(f"%{bamboo_title}%"),
                JobTitle.location_id.in_(location_ids)
            )
            titles_by_location = db.query(JobTitle).filter(JobTitle.location_id.in_(location_ids)).all()
            logger.info(f"Titles by location only: {[t.title_name for t in titles_by_location]}")

            titles_by_name = db.query(JobTitle).filter(JobTitle.title_name.ilike(f"%{bamboo_title}%")).all()
            logger.info(f"Titles by title only: {[t.title_name for t in titles_by_name]}")
            logger.info(f"query: {query.all()}")

            logger.info(f"location_ids: {location_ids}")
            logger.info(f"bamboo_title: {bamboo_title}")
        else:
            query = db.query(JobTitle).filter(
                JobTitle.title_name.ilike(f"%{bamboo_title}%"),
                JobTitle.location_id == location_ids
            )

        job_title_object = query.first()
        logger.info(f"job_title_object: {job_title_object}")
        logger.info(f"job_title_object.sevenshifts_role_id: {job_title_object.sevenshifts_role_id}")
        if not job_title_object:
            logger.warning(f"BambooHR job title '{bamboo_title}' not found in job_titles table. Using default.")
            return default_job_title_ids

        if job_title_object.sevenshifts_role_id:
            try:
                return [int(job_title_object.sevenshifts_role_id)]
            except (ValueError, TypeError):
                logger.warning(f"Invalid sevenshifts_role_id '{job_title_object.sevenshifts_role_id}' for title '{bamboo_title}'. Using default.")
                return default_job_title_ids

        logger.info(f"No sevenshifts_role_id found for title '{bamboo_title}'. Using default.")
        return default_job_title_ids

    except Exception as e:
        logger.exception(f"Error mapping BambooHR job title '{bamboo_title}': {str(e)}")
        return default_job_title_ids
        
        
async def get_internal_location_ids(bamboo_location: str, db: Session) -> Optional[int]:
    """
    Get internal location_id from a BambooHR location name
    """
    try:
        location = db.query(Location).filter(Location.location_name == bamboo_location).first()
        if location:
            return [location.location_id]
        logger.warning(f"No internal location_id found for '{bamboo_location}'")
        return []
    except Exception as e:
        logger.exception(f"Error fetching internal location_id for '{bamboo_location}': {str(e)}")
        return []

def generate_unique_punch_id(db: Session) -> int:
    """
    Generate a unique 4-digit punch ID not already in the Employee table.
    """
    all_ids = set(range(1000, 10000))
    used_ids = set(
        id[0] for id in db.query(Employee.punch_id).filter(Employee.punch_id.isnot(None)).all()
    )
    available_ids = list(all_ids - used_ids)
    if not available_ids:
        raise ValueError("No available punch IDs left")
    return random.choice(available_ids)

def get_existing_7shifts_user_by_email(email: str, location_id: int = None) -> dict:
    """
    Search for a 7shifts user by email, optionally filtering by location.

    Args:
        email (str): The email address to match
        location_id (int, optional): 7shifts location_id to reduce result set

    Returns:
        dict: Matching user data if found, else None
    """
    headers = {
        "Authorization": f"Bearer {settings.SEVEN_SHIFTS_API_KEY}"
    }

    params = {
        "status": "active",
        "limit": 100
    }

    if location_id:
        params["location_id"] = location_id

    url = f"https://api.7shifts.com/v2/company/{settings.SEVEN_SHIFTS_COMPANY_ID}/users"
    logger.info(f"🔍 Fetching 7shifts users in location {location_id} to match email: {email}")

    try:
        response = requests.get(url, headers=headers, params=params)

        if response.status_code == 200:
            users = response.json().get("data", [])
            for user in users:
                if user.get("email", "").strip().lower() == email.strip().lower():
                    logger.info(f"✅ Found 7shifts user ID {user['id']} for {email}")
                    return user

            logger.warning(f"⚠️ No user found with email {email} in location {location_id}")
        else:
            logger.error(f"❌ Failed to fetch 7shifts users: {response.status_code} - {response.text}")
    except requests.RequestException as e:
        logger.error(f"❌ Request error while fetching users: {str(e)}")

    return None


async def create_seven_shifts_user(
    employee_data: EmployeeCreate,
    wage_cents: int,
    location_ids: Optional[List[int]] = None,
    department_ids: Optional[List[int]] = None,
    role_ids: Optional[List[int]] = None,
    db: Session = None  # Make db required since we need it for mapping
) -> Dict[str, Any]:
    """
    Create a new user in 7shifts
    
    Args:
        employee_data: Employee data (can be dict or Pydantic model)
        location_ids: List of location IDs (defaults to settings if not provided)
        department_ids: List of department IDs (defaults to settings if not provided)
        db: Database session for looking up mappings and logging
        
    Returns:
        Dict containing the 7shifts response data
        
    Raises:
        HTTPException: If the API call fails
    """
    if not settings.SEVEN_SHIFTS_API_KEY or not settings.SEVEN_SHIFTS_COMPANY_ID:
        logger.error("7shifts API configuration missing")
        raise HTTPException(status_code=500, detail="7shifts API configuration missing")
    
    # Extract employee fields (handle both dict and Pydantic model)
    if isinstance(employee_data, BaseModel):
        data = employee_data.dict()
        logger.info(f"data: {data}")
    else:
        data = employee_data
    
    # Extract required fields with fallbacks
    first_name = data["fields"].get("first_name") or ""
    last_name = data["fields"].get("last_name") or ""
    email = data["fields"].get("home_email")
    logger.info(f"printing data: {data}")
    logger.info(f"printing email: {email}") 
    logger.info(f"printing first_name: {first_name}")
    logger.info(f"printing last_name: {last_name}")
    
    if not email:
        # Try to find email in various possible field names
        email = (data["fields"].get("work_email") or 
                data["fields"].get("home_email") or 
                data["fields"].get("Home Email") or 
                data["fields"].get("Work Email"))
        
    if not email:
        raise ValueError("No email address found for 7shifts user creation")
    
    # Extract location and department information
    employee_location = (data["fields"].get("location") or 
                         data["fields"].get("Location") or 
                         "3CAT")  # Default location if not specified
    
    employee_department = (data["fields"].get("department") or 
                           data["fields"].get("Department") or 
                           "Store")  # Default department if not specified
    employee_job_title = data["fields"].get("job_title")

    # Map BambooHR location to 7shifts location_ids if needed
    if not location_ids:
        location_ids = await map_bamboo_location_to_7shifts(employee_location, db)
        internal_ids = await get_internal_location_ids(employee_location, db)
    logger.info(f"location_ids: {location_ids}")
    logger.info(f"internal_ids: {internal_ids}")

    if not role_ids:
        role_ids = await map_bamboo_title_to_7shifts(employee_job_title, internal_ids, db)
    logger.info(f"role_ids: {role_ids}")

    # Map BambooHR department to 7shifts department_ids if needed
    if not department_ids:
        department_ids = await map_bamboo_department_to_7shifts(
            employee_department, 
            employee_location, 
            db
        )
    logger.info(f"department_ids: {department_ids}")
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {settings.SEVEN_SHIFTS_API_KEY}"
    }
    
    # Map BambooHR location to 7shifts location_ids if needed
    
    
    punch_id = generate_unique_punch_id(db)
    logger.info(f"punch_id: {punch_id}")

    payload = {
        "type": "employee",
        "language": "en",
        "skill_level": 2,
        "first_name": first_name,
        "last_name": last_name,
        "location_ids": location_ids,
        "department_ids": department_ids,
        "role_ids": role_ids,
        "invite_user": True,
        "email": email,
        "hire_date": datetime.now().strftime("%Y-%m-%d"),
        "punch_id": punch_id,
        "wages": [
        {
            "role_id": role_ids[0],
            "wage_cents": int(wage_cents*100),
            "effective_date": datetime.now().strftime("%Y-%m-%d")
        }
    ]
    }

    print(payload)

    create_user_url = f"https://api.7shifts.com/v2/company/{settings.SEVEN_SHIFTS_COMPANY_ID}/users" #add back the s
    logger.info(f"create_user_url: {create_user_url}")
    try:
        logger.info(f"Creating 7shifts user for {email} with payload: {payload}")

        response = requests.post(create_user_url, headers=headers, json=payload)
        
        # Check for successful response
        if response.status_code in (200, 201):
            response_data = response.json()
            logger.info(f"Successfully created 7shifts user with ID: {response_data.get('data', {}).get('id')}")
            
            # Log to database if session provided
            # if db and "id" in response_data.get("data", {}):
            #     log_seven_shifts_creation(
            #         employee_id=data.get("employee_id"),
            #         seven_shifts_id=response_data["data"]["id"],
            #         response_data=response_data,
            #         db=db
            #     )
            employee = db.query(Employee).filter(Employee.bamboo_hr_id == data.get("id")).first()
            logger.info(f"employee: {employee}")
            logger.info(f"this is the current employee.sevenshift_id: {employee.sevenshift_id}")
            employee.sevenshift_id = str(response_data.get('data', {}).get('id'))
            employee.punch_id = str(response_data.get('data', {}).get('punch_id'))
            logger.info(f"this is the new employee.sevenshift_id: {employee.sevenshift_id}")
            logger.info(f"this is the new employee.punch_id: {employee.punch_id}")
            db.commit()
            return response_data

        elif response.status_code == 422 and "already exists" in response.text:
            logger.warning(f"7shifts user already exists for {email}. Attempting to fetch existing user.")
            existing_user = get_existing_7shifts_user_by_email(email, location_ids[0])

            if existing_user:
                employee = db.query(Employee).filter(Employee.bamboo_hr_id == data.get("id")).first()
                employee.sevenshift_id = str(existing_user["id"])
                employee.punch_id = str(existing_user.get("punch_id", ""))
                db.commit()
                return {"data": existing_user}
            else:
                logger.error(f"Failed to fetch existing user from 7shifts for email: {email}")
                raise HTTPException(status_code=500, detail="User exists but could not be retrieved.")
        
        else:
            error_msg = f"Failed to create 7shifts user: {response.status_code} - {response.text}"
            logger.error(error_msg)
            raise HTTPException(status_code=500, detail=error_msg)
            
    except requests.RequestException as e:
        error_msg = f"Request error creating 7shifts user: {str(e)}"
        logger.error(error_msg)
        raise HTTPException(status_code=500, detail=error_msg)
    

async def update_7shifts_user(
    user_id: int,
    *,
    employee_id: Optional[str] = None,
    punch_id: Optional[str] = None,
    first_name: Optional[str] = None,
    last_name: Optional[str] = None,
    email: Optional[str] = None,
    mobile_number: Optional[str] = None
) -> Dict[str, Any]:
    """
    Update a 7shifts user via the PUT /company/{company_id}/users/{identifier} endpoint.

    :param company_id: your 7shifts company ID
    :param user_id: the 7shifts user ID (identifier)
    :param employee_id: payroll/provider employee ID
    :param punch_id: punch clock ID
    :param first_name, last_name, email, mobile_number, etc: other optional fields
    :param extra_fields: any other supported body params
    :returns: JSON response from 7shifts
    :raises: requests.HTTPError on non-2xx
    """
    url = f"https://api.7shifts.com/v2/company/{settings.SEVEN_SHIFTS_COMPANY_ID}/users/{user_id}"
    headers = {
        "Authorization": f"Bearer {settings.SEVEN_SHIFTS_API_KEY}",
        "Content-Type": "application/json",
    }

    # build a payload with only the fields provided
    payload: Dict[str, Any] = {}
    if employee_id is not None:
        payload["employee_id"] = employee_id
    if punch_id is not None:
        payload["punch_id"] = punch_id
    if first_name is not None:
        payload["first_name"] = first_name
    if last_name is not None:
        payload["last_name"] = last_name
    if email is not None:
        payload["email"] = email
    if mobile_number is not None:
        payload["mobile_number"] = mobile_number


    logger.info(f"payload: {payload}")
    response = requests.put(url, headers=headers, json=payload, timeout=10)
    response.raise_for_status()
    return response.json()

async def deactivate_7shifts_user(
    user_id: int,
    inactive_reason: str = "terminated_or_let_go",
    inactive_comments: str = "Employee terminated from system"
) -> bool:
    """
    Deactivate a 7shifts user via the DELETE /company/{company_id}/users/{identifier} endpoint.
    This is a soft delete that marks the user as inactive.

    Args:
        user_id: the 7shifts user ID
        inactive_reason: reason for deactivation (must be one of the valid reasons from /inactive_reasons)
        inactive_comments: additional comments about the deactivation

    Returns:
        bool: True if deactivation was successful

    Raises:
        HTTPException: If the API call fails
    """
    url = f"https://api.7shifts.com/v2/company/{settings.SEVEN_SHIFTS_COMPANY_ID}/users/{user_id}"
    headers = {
        "Authorization": f"Bearer {settings.SEVEN_SHIFTS_API_KEY}",
        "Content-Type": "application/json",
    }

    payload = {
        "inactive_reason": inactive_reason,
        "inactive_comments": inactive_comments
    }

    try:
        response = requests.delete(url, headers=headers, json=payload, timeout=10)
        
        # Check if the response was successful (2xx status code)
        if response.status_code in (200, 201, 204):
            return True
            
        # If we get here, something went wrong
        error_msg = f"Failed to deactivate 7shifts user. Status code: {response.status_code}"
        if response.text:
            error_msg += f", Response: {response.text}"
        logger.error(error_msg)
        raise HTTPException(status_code=500, detail=error_msg)
        
    except requests.exceptions.RequestException as e:
        logger.error(f"Error deactivating 7shifts user: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to deactivate 7shifts user: {str(e)}")

    
