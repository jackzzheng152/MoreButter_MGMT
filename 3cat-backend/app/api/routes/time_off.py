# routes/time_off.py
from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
from datetime import datetime
from pydantic import parse_obj_as

from app.config import settings, logger
from app.services.time_off_service import get_time_off_entries
from app.services.time_punch_service import get_user_details
from app.schemas.time_off import (
    TimeOffFilter,
    TimeOffResponse,
    SickLeaveHourEntry,
    TimeOffCategory,
    TimeOffUpdateRequest
)

router = APIRouter()

@router.post("/", response_model=List[TimeOffResponse])
async def fetch_time_off(filter_params: TimeOffFilter):
    """
    Fetch time off entries based on filter parameters
    """
    try:
        # Fetch time off entries from 7shifts API using the updated parameters
        time_off_entries = get_time_off_entries(
            company_id=filter_params.company_id,
            location_id=filter_params.location_id,
            user_id=filter_params.user_id,
            category=filter_params.category,
            status=filter_params.status,
            to_date_gte=filter_params.to_date_gte,
            sort_by=filter_params.sort_by,
            sort_dir=filter_params.sort_dir,
            cursor=filter_params.cursor,
            limit=filter_params.limit
        )
        
        if not time_off_entries:
            return []
            
        # Extract unique user IDs
        user_ids = list(set(entry['user_id'] for entry in time_off_entries))
        
        # Fetch user details in batch
        user_details = await get_user_details(user_ids)
        
        # Format response for frontend
        formatted_entries = []
        for entry in time_off_entries:
            user_id = entry['user_id']
            user_detail = user_details.get(user_id, {"name": "Unknown User", "employee_id": None})
            
            # Format hours data
            hours_data = []
            for hour_entry in entry.get('hours', []):
                hours_data.append(SickLeaveHourEntry(
                    date=hour_entry['date'],
                    hours=float(hour_entry['hours'])
                ))
            
            formatted_entry = TimeOffResponse(
                id=entry['id'],
                user_id=user_id,
                user_name=user_detail['name'],
                gusto_id=user_detail['employee_id'],  # This is the Gusto ID from 7shifts
                from_date=entry['from_date'],
                to_date=entry['to_date'],
                category=entry['category'],
                status=entry['status'],
                amount_of_hours=float(entry['amount_of_hours']),
                hours=hours_data
            )
            formatted_entries.append(formatted_entry)
            
        return formatted_entries
    except Exception as e:
        logger.error(f"Error fetching time off: {str(e)}")
        error_message = str(e)
        
        # Provide more specific error responses
        if "Access forbidden" in error_message:
            raise HTTPException(status_code=403, detail=error_message)
        elif "Unauthorized" in error_message:
            raise HTTPException(status_code=401, detail=error_message)
        else:
            raise HTTPException(status_code=500, detail=error_message)

@router.patch("/{time_off_id}", response_model=TimeOffResponse)
async def update_time_off_status(time_off_id: int, update_data: TimeOffUpdateRequest):
    """Update the status of a time off request"""
    try:
        # Create the 7shifts API URL
        url = f"{settings.SHIFTS_API_BASE}/v2/time_off/{time_off_id}"
        
        # Make the API request using the time_off_service
        from app.services.time_off_service import get_headers
        import requests
        
        response = requests.patch(
            url,
            json={
                "status": update_data.status,
                "status_action_message": update_data.status_action_message
            },
            headers=get_headers()
        )
        
        if response.status_code != 200:
            logger.error(f"Error updating time off: {response.status_code} - {response.text}")
            raise HTTPException(
                status_code=response.status_code, 
                detail=f"Failed to update time off status: {response.text}"
            )
        
        # Get the updated time off entry
        updated_entry = response.json()
        
        # Format the response
        user_id = updated_entry['user_id']
        user_details = await get_user_details([user_id])
        user_detail = user_details.get(user_id, {"name": "Unknown User", "employee_id": None})
        
        # Format hours data
        hours_data = []
        for hour_entry in updated_entry.get('hours', []):
            hours_data.append(SickLeaveHourEntry(
                date=hour_entry['date'],
                hours=float(hour_entry['hours'])
            ))
        
        return TimeOffResponse(
            id=updated_entry['id'],
            user_id=user_id,
            user_name=user_detail['name'],
            gusto_id=user_detail['employee_id'],
            from_date=updated_entry['from_date'],
            to_date=updated_entry['to_date'],
            category=updated_entry['category'],
            status=updated_entry['status'],
            amount_of_hours=float(updated_entry['amount_of_hours']),
            hours=hours_data
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating time off: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/categories", response_model=List[TimeOffCategory])
async def get_time_off_categories():
    """Get available time off categories"""
    categories = [
        {"id": "paid_sick", "name": "Paid Sick Leave"},
        {"id": "vacation", "name": "Vacation"},
        {"id": "personal_day", "name": "Personal Day"},
        {"id": "bereavement", "name": "Bereavement"},
        {"id": "jury_duty", "name": "Jury Duty"},
        {"id": "unpaid", "name": "Unpaid Time Off"}
    ]
    return categories