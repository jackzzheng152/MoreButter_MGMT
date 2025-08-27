# services/time_off_service.py
import requests
from typing import List, Dict, Any, Optional
import asyncio
from datetime import datetime

from app.config import settings, logger

def get_headers():
    """Get headers for 7shifts API requests"""
    return {
        "Authorization": f"Bearer {settings.SEVEN_SHIFTS_API_KEY}",
        "Content-Type": "application/json"
    }

def get_time_off_entries(
    company_id: int, 
    location_id: Optional[int] = None,
    user_id: Optional[int] = None,
    category: Optional[str] = None,
    status: Optional[int] = None,
    to_date_gte: Optional[str] = None,
    sort_by: str = "created",
    sort_dir: str = "asc",
    cursor: Optional[str] = None,
    limit: Optional[int] = None
) -> List[Dict[str, Any]]:
    """
    Fetch time off entries from 7shifts API with filtering based on documented parameters
    """
    url = f"https://api.7shifts.com/v2/time_off"
    
    # Build query parameters using only the specified parameters in the 7shifts API
    params = {
        "company_id": company_id
    }
    
    # Add optional filters
    if location_id is not None:
        params["location_id"] = location_id
    
    if user_id is not None:
        params["user_id"] = user_id
    
    if category:
        params["category"] = category
    
    if status is not None:
        params["status"] = status
    
    if to_date_gte:
        params["to_date_gte"] = to_date_gte
    
    if sort_by:
        params["sort_by"] = sort_by
    
    if sort_dir:
        params["sort_dir"] = sort_dir
    
    if limit:
        params["limit"] = limit
    
    all_entries = []
    current_cursor = cursor
    
    # Paginate through all results
    while True:
        if current_cursor:
            params["cursor"] = current_cursor
        
        logger.info(f"Fetching time off with params: {params}")
        response = requests.get(
            url,
            params=params,
            headers=get_headers()
        )
        
        if response.status_code != 200:
            logger.error(f"Error fetching time off: {response.status_code} - {response.text}")
            if response.status_code == 403:
                raise Exception(f"Access forbidden: The API key doesn't have permission to access company_id {company_id}. Please check your 7shifts API key permissions.")
            elif response.status_code == 401:
                raise Exception("Unauthorized: Invalid API key. Please check your 7shifts API key.")
            else:
                raise Exception(f"Failed to fetch time off from 7shifts: {response.status_code} - {response.text}")
        
        data = response.json()
        entries = data.get("data", [])
        all_entries.extend(entries)
        
        # Check if there are more pages
        meta = data.get("meta", {})
        current_cursor = meta.get("cursor", {}).get("next")
        
        if not current_cursor:
            break
    
    return all_entries

async def get_user_details(user_ids: List[int]) -> Dict[int, Dict[str, Any]]:
    """
    Fetch user details for multiple users in parallel
    Returns a dictionary mapping user_id to user details
    """
    if not user_ids:
        return {}
    
    # We'll use the batch endpoint if available
    url = f"https://api.7shifts.com/v2/users"
    
    # Handle in batches of 50 to avoid overloading the API
    batch_size = 50
    result = {}
    
    for i in range(0, len(user_ids), batch_size):
        batch = user_ids[i:i+batch_size]
        params = {
            "user_ids": ",".join(map(str, batch)),
            "fields": "id,name,employee_id"  # employee_id is the Gusto ID
        }
        
        response = requests.get(
            url,
            params=params,
            headers=get_headers()
        )

        logger.info(f"params: {params}")
        logger.info(f"User details response: {response.json()}")
        
        if response.status_code != 200:
            logger.error(f"Error fetching user details: {response.status_code} - {response.text}")
            continue
            
        users = response.json().get("data", [])
        
        for user in users:
            result[user["id"]] = {
                "name": user.get("name", "Unknown"),
                "employee_id": user.get("employee_id")
            }
    
    return result