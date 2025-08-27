# routes/time_punch.py
from fastapi import APIRouter, Depends, HTTPException
from typing import List, Dict, Any, Optional
import csv
from io import StringIO
from fastapi.responses import StreamingResponse
from datetime import datetime
import pytz
from fastapi import Query


from app.schemas.time_punch import TimePunchFilter, TimePunchResponse, ShiftDisplayResponse
from app.config import settings, logger
from app.services.time_punch_service import (
    get_all_time_punches, 
    annotate_per_shift_overtime, 
    get_user_details,
    get_labor_data_for_week,
    get_hourly_labor_data_for_week,
    get_hourly_labor_data_with_overtime_for_week,
    get_shifts_for_week
)

router = APIRouter()

def format_break_time_to_pacific(iso_time_str: str) -> str:
    """Convert ISO time string to Pacific time format"""
    try:
        # Parse the ISO time string
        dt = datetime.fromisoformat(iso_time_str.replace('Z', '+00:00'))
        
        # Convert to Pacific timezone
        pacific_tz = pytz.timezone('US/Pacific')
        pacific_dt = dt.astimezone(pacific_tz)
        
        # Format as "H:MM AM/PM"
        return pacific_dt.strftime("%-I:%M %p")
    except Exception as e:
        logger.warning(f"Failed to parse break time {iso_time_str}: {e}")
        return iso_time_str

def extract_break_periods(punch_data: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Extract and format break periods from 7shifts punch data"""
    break_periods = []
    
    if "breaks" in punch_data and isinstance(punch_data["breaks"], list):
        for break_item in punch_data["breaks"]:
            if isinstance(break_item, dict):
                # Check if break has both in and out times
                if "in" in break_item and "out" in break_item:
                    break_period = {
                        "id": break_item.get("id"),
                        "start_time": format_break_time_to_pacific(break_item["in"]),
                        "end_time": format_break_time_to_pacific(break_item["out"]),
                        "is_unpaid": not break_item.get("paid", False),  # Default to unpaid if not specified
                        "duration_minutes": 0  # Will be calculated
                    }
                    
                    # Calculate duration in minutes
                    try:
                        start_dt = datetime.fromisoformat(break_item["in"].replace('Z', '+00:00'))
                        end_dt = datetime.fromisoformat(break_item["out"].replace('Z', '+00:00'))
                        duration = (end_dt - start_dt).total_seconds() / 60
                        break_period["duration_minutes"] = round(duration, 2)
                    except Exception as e:
                        logger.warning(f"Failed to calculate break duration: {e}")
                    
                    break_periods.append(break_period)
    
    return break_periods

@router.post("/", response_model=List[TimePunchResponse])
async def fetch_time_punches(filter_params: TimePunchFilter):
    """
    Fetch time punches based on filter parameters and annotate with overtime calculations
    """
    try:
        # Fetch time punches from 7shifts API
        punches = get_all_time_punches(
            start_date=filter_params.start_date,
            end_date=filter_params.end_date,
            location_id=filter_params.location_id,
            approved=filter_params.approved,
            deleted=filter_params.deleted
        )
        
        # Annotate with overtime calculations
        annotated_punches = annotate_per_shift_overtime(punches)
        
        return annotated_punches
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/export")
async def export_time_punches_csv(filter_params: TimePunchFilter):
    """
    Export time punches to CSV file
    """
    try:
        # Fetch and annotate time punches
        punches = get_all_time_punches(
            start_date=filter_params.start_date,
            end_date=filter_params.end_date,
            location_id=filter_params.location_id,
            approved=filter_params.approved,
            deleted=filter_params.deleted
        )
        
        annotated_punches = annotate_per_shift_overtime(punches)
        
        if not annotated_punches:
            raise HTTPException(status_code=404, detail="No time punches found")
            
        # Create CSV in memory
        output = StringIO()
        fieldnames = list(annotated_punches[0].keys())
        
        writer = csv.DictWriter(output, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(annotated_punches)
        
        # Reset the pointer to the beginning
        output.seek(0)
        
        # Return as downloadable CSV
        filename = f"time_punches_{filter_params.start_date}_to_{filter_params.end_date}.csv"
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/shifts-display", response_model=List[ShiftDisplayResponse])
async def get_shifts_for_display(filter_params: TimePunchFilter):
    """
    Get simplified shift information for frontend display including:
    - User name and ID
    - Clock in/out times
    - Regular, overtime, and double overtime hours
    - Detailed break periods with exact timing
    """
    try:
        # Fetch time punches from 7shifts API (raw data before annotation)
        raw_punches = get_all_time_punches(
            start_date=filter_params.start_date,
            end_date=filter_params.end_date,
            location_id=filter_params.location_id,
            approved=filter_params.approved,
            deleted=filter_params.deleted
        )

        # Annotate with overtime calculations
        annotated_punches = annotate_per_shift_overtime(raw_punches)
        
        # Create a mapping from punch to raw data for break extraction
        punch_to_raw = {}
        for raw_punch in raw_punches:
            # Create a key to match annotated punches with raw punches
            key = f"{raw_punch.get('user_id')}_{raw_punch.get('clocked_in')}"
            punch_to_raw[key] = raw_punch
        
        # Extract unique user IDs
        user_ids = list(set(punch['user_id'] for punch in annotated_punches))
        
        # Fetch user details in batch
        user_details = await get_user_details(user_ids)
        
        # Format response for frontend display
        display_shifts = []
        for punch in annotated_punches:
            user_id = punch['user_id']
            user_detail = user_details.get(user_id, {"name": "Unknown User", "employee_id": None})
            
            # Find corresponding raw punch data for break extraction
            punch_key = f"{punch['user_id']}_{punch.get('clocked_in', '')}"
            raw_punch_data = punch_to_raw.get(punch_key, {})
            
            # Extract break periods from raw 7shifts data
            break_periods = extract_break_periods(raw_punch_data)
            
            display_shift = {
                "user_id": user_id,
                "user_name": user_detail["name"],
                "employee_id": user_detail["employee_id"],  # Add the employee_id (Gusto ID)
                "clocked_in_pacific": punch["clocked_in_pacific"],
                "clocked_out_pacific": punch["clocked_out_pacific"],
                "clocked_in_date_pacific": punch["clocked_in_date_pacific"],
                "regular_hours": punch["regular_hours"],
                "overtime_hours": punch["overtime_hours"],
                "double_ot_hours": punch["double_ot_hours"],
                "break_duration_minutes": punch["break_duration_minutes"],
                "unpaid_break_hours": punch["unpaid_break_hours"],
                "paid_break_hours": punch["paid_break_hours"],
                "total_break_hours": punch["total_break_hours"],
                "net_worked_hours": punch["net_worked_hours"],
                "break_periods": break_periods  # NEW: Detailed break timing

            }
            display_shifts.append(display_shift)
            
        return display_shifts
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ===== NEW LABOR FORECASTING ROUTES =====

# Initialize services


@router.get("/labor/shifts/week")
async def get_week_labor_data(
    week_start: str = Query(..., description="Week start date in YYYY-MM-DD format"),
    location_id: Optional[int] = Query(None, description="Location ID (optional)")
):
    """
    Get labor data for a specific week from 7shifts scheduled shifts
    """
    try:
        # Parse the week start date
        week_start_date = datetime.strptime(week_start, "%Y-%m-%d")
        
        # Fetch labor data from 7shifts
        labor_data = await get_labor_data_for_week(week_start_date, location_id)
        
        return {
            "success": True,
            "data": {
                "week_start": week_start,
                "labor": labor_data
            }
        }
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid date format: {str(e)}")
    except Exception as e:
        logger.error(f"Error fetching week labor data: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))



@router.get("/labor/analysis/week")
async def get_week_analysis(
    week_start: str = Query(..., description="Week start date in YYYY-MM-DD format"),
    target_labor_percent: float = Query(25.0, description="Target labor percentage"),
    include_payroll_tax: bool = Query(True, description="Include payroll taxes in calculation"),
    location_id: Optional[int] = Query(None, description="Location ID (optional)")
):
    """
    Get labor analysis for a week
    """
    try:
        # Parse the week start date
        week_start_date = datetime.strptime(week_start, "%Y-%m-%d")
        
        # Fetch labor data from 7shifts
        labor_data = await get_labor_data_for_week(week_start_date, location_id)
        
        # Calculate payroll tax multiplier
        payroll_tax_multiplier = 1.12 if include_payroll_tax else 1.0
        
        # Process labor data with payroll taxes
        processed_labor = {}
        total_labor_cost = 0
        total_labor_hours = 0
        
        for day, data in labor_data.items():
            adjusted_cost = data["cost"] * payroll_tax_multiplier
            processed_labor[day] = {
                "hours": data["hours"],
                "base_cost": data["cost"],
                "adjusted_cost": round(adjusted_cost, 2)
            }
            total_labor_cost += adjusted_cost
            total_labor_hours += data["hours"]
        
        return {
            "success": True,
            "data": {
                "week_start": week_start,
                "labor": processed_labor,
                "summary": {
                    "total_labor_cost": round(total_labor_cost, 2),
                    "total_labor_hours": round(total_labor_hours, 1),
                    "target_labor_percent": target_labor_percent,
                    "include_payroll_tax": include_payroll_tax,
                    "payroll_tax_multiplier": payroll_tax_multiplier
                }
            }
        }
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid date format: {str(e)}")
    except Exception as e:
        logger.error(f"Error getting week analysis: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/labor/shifts/raw")
async def get_raw_shifts_for_week(
    week_start: str = Query(..., description="Week start date in YYYY-MM-DD format"),
    location_id: Optional[int] = Query(None, description="Location ID (optional)")
):
    """
    Get raw shift data from 7shifts API for a specific week
    Returns the unprocessed shift objects directly from 7shifts
    """
    try:
        # Parse the week start date
        week_start_date = datetime.strptime(week_start, "%Y-%m-%d")
        
        # Import the function here to avoid circular imports
        from app.services.time_punch_service import get_shifts_for_week
        
        # Fetch raw shifts from 7shifts
        shifts = await get_shifts_for_week(week_start_date, location_id)
        
        return {
            "success": True,
            "data": {
                "week_start": week_start,
                "location_id": location_id,
                "shifts_count": len(shifts),
                "shifts": shifts
            }
        }
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid date format: {str(e)}")
    except Exception as e:
        logger.error(f"Error fetching raw shifts: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/labor/shifts/week/hourly")
async def get_week_hourly_labor_data(
    week_start: str = Query(..., description="Week start date in YYYY-MM-DD format"),
    location_id: Optional[int] = Query(None, description="Location ID (optional)")
):
    """
    Get hourly labor data for a specific week from 7shifts scheduled shifts
    Returns labor costs broken down by day and hour (7 AM - 9 PM) - simple version
    """
    try:
        # Parse the week start date
        week_start_date = datetime.strptime(week_start, "%Y-%m-%d")
        
        # Fetch hourly labor data from 7shifts
        hourly_labor_data = await get_hourly_labor_data_for_week(week_start_date, location_id)
        
        # Calculate daily totals for summary
        daily_totals = {}
        total_week_cost = 0
        
        for day, hours in hourly_labor_data.items():
            daily_total = sum(hours.values())
            daily_totals[day] = round(daily_total, 2)
            total_week_cost += daily_total
        
        return {
            "success": True,
            "data": {
                "week_start": week_start,
                "hourly_labor": hourly_labor_data,
                "daily_totals": daily_totals,
                "total_week_cost": round(total_week_cost, 2)
            }
        }
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid date format: {str(e)}")
    except Exception as e:
        logger.error(f"Error fetching hourly labor data: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/labor/shifts/week/hourly/overtime")
async def get_week_hourly_labor_data_with_overtime(
    week_start: str = Query(..., description="Week start date in YYYY-MM-DD format"),
    location_id: Optional[int] = Query(None, description="Location ID (optional)")
):
    """
    Get hourly labor data with overtime calculations for a specific week
    Returns labor costs broken down by day, hour, and overtime type (regular, OT, double OT)
    Uses the existing overtime annotation system for accurate calculations
    """
    try:
        # Parse the week start date
        week_start_date = datetime.strptime(week_start, "%Y-%m-%d")
        
        # Fetch hourly labor data with overtime from 7shifts
        hourly_labor_data = await get_hourly_labor_data_with_overtime_for_week(week_start_date, location_id)
        
        # Calculate daily and weekly totals
        daily_totals = {}
        weekly_totals = {
            "regular_cost": 0.0,
            "overtime_cost": 0.0,
            "double_ot_cost": 0.0,
            "total_cost": 0.0
        }
        
        for day, hours in hourly_labor_data.items():
            daily_totals[day] = {
                "regular_cost": 0.0,
                "overtime_cost": 0.0,
                "double_ot_cost": 0.0,
                "total_cost": 0.0
            }
            
            for hour, costs in hours.items():
                for cost_type in costs:
                    daily_totals[day][cost_type] += costs[cost_type]
                    weekly_totals[cost_type] += costs[cost_type]
            
            # Round daily totals
            for cost_type in daily_totals[day]:
                daily_totals[day][cost_type] = round(daily_totals[day][cost_type], 2)
        
        # Round weekly totals
        for cost_type in weekly_totals:
            weekly_totals[cost_type] = round(weekly_totals[cost_type], 2)
        
        return {
            "success": True,
            "data": {
                "week_start": week_start,
                "hourly_labor": hourly_labor_data,
                "daily_totals": daily_totals,
                "weekly_totals": weekly_totals
            }
        }
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid date format: {str(e)}")
    except Exception as e:
        logger.error(f"Error fetching hourly labor data with overtime: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/labor/test/sevenshifts")
async def test_sevenshifts_connection():
    """
    Test endpoint to verify 7shifts API connection for labor data
    """
    try:
        # Test with current week
        today = datetime.now()
        week_start = today - timedelta(days=today.weekday())
        
        labor_data = await get_labor_data_for_week(week_start)
        
        # Calculate some basic stats
        total_hours = sum(day["hours"] for day in labor_data.values())
        total_cost = sum(day["cost"] for day in labor_data.values())
        
        return {
            "success": True,
            "message": "7shifts API connection successful",
            "test_week_start": week_start.strftime("%Y-%m-%d"),
            "total_scheduled_hours": round(total_hours, 1),
            "total_labor_cost": round(total_cost, 2),
            "days_with_shifts": len([day for day in labor_data.values() if day["hours"] > 0])
        }
        
    except Exception as e:
        logger.error(f"7shifts connection test failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"7shifts API connection failed: {str(e)}")
