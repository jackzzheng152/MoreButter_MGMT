# services/time_punch_service.py
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from collections import defaultdict
import requests
from typing import List, Dict, Any, Optional
from app.config import settings, logger
import httpx


# Constants from your original code
DAILY_OT_THRESHOLD = 8.0   # after 8h/day → OT
DAILY_DBL_THRESHOLD = 12.0  # after 12h/day → Double OT
WEEKLY_OT_THRESHOLD = 40.0  # after 40h/week → OT

# Configuration - Move this to a config file later
BASE_URL = "https://api.7shifts.com/v2"
COMPANY_ID = settings.SEVEN_SHIFTS_COMPANY_ID  # Add your company ID
API_KEY = settings.SEVEN_SHIFTS_API_KEY        # Add your API key
HEADERS = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json"
}

def convert_to_pacific_time_display(utc_iso_str: str) -> str:
    if not utc_iso_str:
        return ""
    utc_time = datetime.fromisoformat(utc_iso_str.replace("Z", "+00:00"))
    pacific_time = utc_time.astimezone(ZoneInfo("America/Los_Angeles"))
    return pacific_time.strftime("%I:%M%p").lstrip("0")

def convert_to_iso8601_range(date_str: str) -> tuple:
    """
    Takes a date string in 'YYYY-MM-DD' format and returns a tuple:
    - start of day: 'YYYY-MM-DDT00:00:00'
    - end of day:   'YYYY-MM-DDT23:59:59'
    """
    try:
        date_obj = datetime.strptime(date_str, "%Y-%m-%d")
        start_iso = date_obj.strftime("%Y-%m-%dT00:00:00")
        end_iso = date_obj.strftime("%Y-%m-%dT23:59:59")
        return start_iso, end_iso
    except ValueError:
        raise ValueError("Date string must be in YYYY-MM-DD format")
    
def calculate_break_duration_hours(breaks: list) -> tuple[float, float]:
    """
    Calculates total break duration in hours, separating paid and unpaid breaks.
    
    Returns:
        tuple: (unpaid_break_hours, paid_break_hours)
    """
    unpaid_minutes = 0.0
    paid_minutes = 0.0
    
    for b in breaks:
        break_in = b.get("in")
        break_out = b.get("out")
        is_paid = b.get("paid", False)  # Default to unpaid if not specified
        
        if break_in and break_out:
            in_time = datetime.fromisoformat(break_in)
            out_time = datetime.fromisoformat(break_out)
            duration = (out_time - in_time).total_seconds() / 60  # minutes
            
            if is_paid:
                paid_minutes += duration
            else:
                unpaid_minutes += duration
    
    unpaid_hours = round(unpaid_minutes / 60, 2)
    paid_hours = round(paid_minutes / 60, 2)
    
    return unpaid_hours, paid_hours

def extract_pacific_date(utc_iso_str: str) -> str:
    if not utc_iso_str:
        return ""
    utc_time = datetime.fromisoformat(utc_iso_str.replace("Z", "+00:00"))
    pacific_time = utc_time.astimezone(ZoneInfo("America/Los_Angeles"))
    return pacific_time.strftime("%-m/%-d/%Y")
def to_hours(value) -> float:
    """
    Coerce value to hours as a float.
    Accepts float/int, tuple (first element), timedelta, or strings.
    """
    if value is None:
        return 0.0
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, timedelta):
        return value.total_seconds() / 3600.0
    if isinstance(value, (list, tuple)):
        # many helpers return (hours,) or (hours, minutes, ...)
        if len(value) == 0:
            return 0.0
        # if first element is also timedelta/float/etc., recurse
        return to_hours(value[0])
    # last resort: try to parse string
    try:
        return float(str(value))
    except Exception:
        return 0.0

def calculate_shift_duration_hours(clocked_in_str: str, clocked_out_str: str) -> float:
    if not clocked_in_str or not clocked_out_str:
        return 0.0
    try:
        ci = datetime.fromisoformat(clocked_in_str.replace("Z", "+00:00"))
        co = datetime.fromisoformat(clocked_out_str.replace("Z", "+00:00"))
        return round((co - ci).total_seconds() / 3600.0, 2)
    except Exception:
        return 0.0

def get_all_time_punches(start_date: str, end_date: str, location_id: Optional[int] = None, 
                         approved: Optional[bool] = None, deleted: bool = False, limit: int = 100) -> List[Dict[str, Any]]:
    """
    Fetch all time punches for a given date range
    """
    all_punches = []
    start_beg, _ = convert_to_iso8601_range(start_date)
    _, end_end = convert_to_iso8601_range(end_date)
    
    params = {
        "deleted": deleted,
        "limit": limit,                       # max 200
        "clocked_in[gte]": start_beg,
        "clocked_out[lte]": end_end,
        "localize_search_time": True
    }
    
    if location_id is not None:
        params["location_id"] = location_id
    
    if approved is not None:
        params["approved"] = approved
    
    cursor = None
    while True:
        if cursor:
            params["cursor"] = cursor
            
        resp = requests.get(f"{BASE_URL}/company/{COMPANY_ID}/time_punches",
                            headers=HEADERS, params=params)
        resp.raise_for_status()
        body = resp.json()
        
        punches = body.get("data", [])
        meta = body.get("meta", {}).get("cursor", {})
        all_punches.extend(punches)
        
        # get the next cursor; if None, we're done
        cursor = meta.get("next")
        if not cursor:
            break

    # Format each punch with additional calculated fields
    for punch in all_punches:
        ci = punch.get("clocked_in")
        co = punch.get("clocked_out")

        punch["clocked_in_pacific"] = convert_to_pacific_time_display(ci)
        punch["clocked_out_pacific"] = convert_to_pacific_time_display(co)
        punch["clocked_in_date_pacific"] = extract_pacific_date(ci)

        duration = calculate_shift_duration_hours(ci, co)
        punch["shift_duration_minutes"] = duration

        brks = punch.get("breaks", [])
        unpaid_break_hours, paid_break_hours = calculate_break_duration_hours(brks)
        
        # Store break information
        punch["unpaid_break_hours"] = unpaid_break_hours
        punch["paid_break_hours"] = paid_break_hours
        punch["total_break_hours"] = unpaid_break_hours + paid_break_hours
        punch["break_duration_minutes"] = (unpaid_break_hours + paid_break_hours) # Keep for backward compatibility

        # Net worked hours = total shift duration - unpaid breaks only
        # Paid breaks are included in the hours used for pay calculations
        punch["net_worked_hours"] = round(max(0, duration - unpaid_break_hours), 2)

    return all_punches

def annotate_per_shift_overtime(punches: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Calculate overtime for each shift based on daily and weekly thresholds
    and consecutive day rules - resetting consecutive count when a new work week begins
    """
    # sort by employee → clock-in time
    punches.sort(key=lambda p: (
        p['user_id'],
        datetime.fromisoformat(p['clocked_in']).timestamp()
    ))

    # trackers: how many hrs each emp has worked this day & this week so far
    day_totals = defaultdict(lambda: defaultdict(float))  # emp → date → hrs
    week_reg_totals = defaultdict(lambda: defaultdict(float))  # emp → week_start → regular_hrs
    
    # First group shifts by employee and work week
    employee_workweeks = defaultdict(lambda: defaultdict(list))  # emp → work_week_start → list of workdays
    
    # Collect all working days for each employee by work week
    for p in punches:
        emp = p['user_id']
        day = datetime.strptime(p['clocked_in_date_pacific'], "%m/%d/%Y").date()
        # Get Monday of the work week
        week_start = day - timedelta(days=day.weekday())
        
        if day not in employee_workweeks[emp][week_start]:
            employee_workweeks[emp][week_start].append(day)
    
    # Sort dates within each work week
    for emp in employee_workweeks:
        for week in employee_workweeks[emp]:
            employee_workweeks[emp][week].sort()
    
    # Identify 7th consecutive days - now respecting work week boundaries
    seventh_day = {}  # emp → set of dates that are 7th consecutive days
    for emp, work_weeks in employee_workweeks.items():
        seventh_day[emp] = set()
        
        for week_start, days in work_weeks.items():
            # Calculate consecutive day count within this work week
            consecutive_count = 1  # Start with the first day
            
            for i in range(1, len(days)):
                # If this day is exactly 1 day after the previous, increment the counter
                if days[i] == days[i-1] + timedelta(days=1):
                    consecutive_count += 1
                else:
                    # Break in consecutive sequence, reset counter
                    consecutive_count = 1
                
                # If we've reached 7 consecutive days, mark this as a 7th day
                if consecutive_count == 7:
                    seventh_day[emp].add(days[i])

    # Now process the actual overtime calculations
    for p in punches:
        emp = p['user_id']
        day = datetime.strptime(p['clocked_in_date_pacific'], "%m/%d/%Y").date()
        week_start = day - timedelta(days=day.weekday())
        worked = p['net_worked_hours']

        # how many hours already "in the bank" before this shift
        prev_day = day_totals[emp][day]
        prev_week_reg = week_reg_totals[emp][week_start]

        # Check if this shift is on a 7th consecutive day
        is_seventh_day = day in seventh_day.get(emp, set())

        if is_seventh_day:
            # On 7th consecutive day: 
            # - First 8 hours are overtime (1.5x)
            # - Hours beyond 8 are double overtime (2x)
            
            # Calculate how many hours were already worked on this 7th day
            hours_already_on_seventh = prev_day
            
            # How much more can be worked at 1.5x rate (up to 8 hours total)
            avail_ot_on_seventh = max(0.0, 8.0 - hours_already_on_seventh)
            
            # Assign hours accordingly
            reg = 0  # No regular hours on 7th consecutive day
            ot = min(avail_ot_on_seventh, worked)  # OT for first 8 hours
            dbl = max(0.0, worked - ot)  # Double OT for hours beyond 8
        else:
            # Normal calculation for non-7th days
            # --- DAILY SPLIT ---
            # 1) regular up to (8h − prev_day)
            avail_reg = max(0.0, DAILY_OT_THRESHOLD - prev_day)
            reg = min(avail_reg, worked)

            # 2) OT up to (12h − max(prev_day,8h))
            avail_ot = max(
                0.0,
                DAILY_DBL_THRESHOLD - max(prev_day, DAILY_OT_THRESHOLD)
            )
            ot = min(avail_ot, worked - reg)

            # 3) remainder is double OT
            dbl = max(0.0, worked - reg - ot)

            # --- WEEKLY OT ADJUSTMENT ---
            # Check if adding these regular hours would exceed the weekly threshold
            week_reg_after = prev_week_reg + reg
            weekly_excess = max(0.0, week_reg_after - WEEKLY_OT_THRESHOLD)

            # Convert excess regular hours to overtime
            if weekly_excess > 0:
                reg -= weekly_excess
                ot += weekly_excess

        # --- store buckets back on punch ---
        p['regular_hours'] = round(reg, 2)
        p['overtime_hours'] = round(ot, 2)
        p['double_ot_hours'] = round(dbl, 2)

        # --- update trackers for next shifts ---
        day_totals[emp][day] += worked
        # Only count regular hours toward weekly total
        week_reg_totals[emp][week_start] += reg

    return punches

async def get_user_details(user_ids: List[int]) -> Dict[int, Dict[str, any]]:
    """
    Fetch user names and employee IDs from 7shifts API for the given user IDs
    Returns a dictionary mapping user_id to details including name and employee_id
    """
    user_details = {}
    
    # Batch fetch to avoid too many requests
    for user_id in user_ids:
        try:
            resp = requests.get(
                f"{BASE_URL}/company/{COMPANY_ID}/users/{user_id}",
                headers=HEADERS,
                params={
                    "include_inactive": "true"
                }
            )
            if resp.status_code == 200:
                user_data = resp.json().get("data", {})
                user_details[user_id] = {
                    "name": f"{user_data.get('first_name', '')} {user_data.get('last_name', '')}",
                    "employee_id": user_data.get('employee_id', None)
                }
            else:
                user_details[user_id] = {
                    "name": "Unknown User",
                    "employee_id": None
                }
        except Exception:
            user_details[user_id] = {
                "name": "Unknown User",
                "employee_id": None
            }
    
    return user_details

# ===== NEW LABOR FORECASTING FUNCTIONS =====

async def get_shifts_for_week(week_start_date: datetime, location_id: Optional[int] = None) -> List[Dict]:
    """
    Fetch scheduled shifts for a specific week from 7shifts API
    Handles Pacific time conversion properly
    """
    # Ensure we're working with Pacific time
    pacific_tz = ZoneInfo("America/Los_Angeles")
    
    # If the input date is naive (no timezone), assume it's Pacific time
    if week_start_date.tzinfo is None:
        week_start_pacific = week_start_date.replace(tzinfo=pacific_tz)
    else:
        week_start_pacific = week_start_date.astimezone(pacific_tz)
    
    # Set to start of day in Pacific time (12:00 AM)
    week_start_pacific = week_start_pacific.replace(hour=0, minute=0, second=0, microsecond=0)
    
    # Calculate week end (end of Sunday in Pacific time - 11:59:59 PM)
    week_end_pacific = week_start_pacific + timedelta(days=6, hours=23, minutes=59, seconds=59)
    
    # Convert to UTC for the API call
    week_start_utc = week_start_pacific.astimezone(ZoneInfo("UTC"))
    week_end_utc = week_end_pacific.astimezone(ZoneInfo("UTC"))
    
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json",
        "x-api-version": "2025-03-01"
    }
    
    params = {
        "start[gte]": week_start_utc.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "start[lte]": week_end_utc.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "limit": 500,
        "include_deleted": False,
        "draft": False
    }
    
    # Only add location_id if it has a valid value
    if location_id:
        params["location_id"] = location_id
    elif settings.SEVEN_SHIFTS_LOCATION_ID:
        params["location_id"] = settings.SEVEN_SHIFTS_LOCATION_ID
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{BASE_URL}/company/{COMPANY_ID}/shifts",
                headers=headers,
                params=params,
                timeout=30.0
            )
            response.raise_for_status()
            
            data = response.json()
            return data.get("data", [])
            
    except httpx.HTTPStatusError as e:
        logger.error(f"7shifts API error: {e.response.status_code} - {e.response.text}")
        raise HTTPException(
            status_code=e.response.status_code,
            detail=f"7shifts API error: {e.response.text}"
        )
    except Exception as e:
        logger.error(f"Error fetching 7shifts data: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching shift data: {str(e)}"
        )

def process_shifts_to_hourly_labor_data_with_overtime(
    shifts: List[Dict],
    business_hour_start: int = 7,   # 7 AM
    business_hour_end: int = 24,    # 9 PM
) -> Dict:
    """
    Build hourly labor cost buckets with OT and double-OT using pre-annotated shift OT hours.
    Expects each shift dict to have: start, end (ISO8601, usually with 'Z'), hourly_wage (cents or dollars),
    and annotate_per_shift_overtime() to add: regular_hours, overtime_hours, double_ot_hours, net_worked_hours.
    """

    days_map = {0: "Monday", 1: "Tuesday", 2: "Wednesday",
                3: "Thursday", 4: "Friday", 5: "Saturday", 6: "Sunday"}

    # Initialize hourly structure
    hourly_labor_data: Dict[str, Dict[int, Dict[str, float]]] = {}

    for day in days_map.values():
        hourly_labor_data[day] = {}
        for hour in range(business_hour_start, business_hour_end + 1):
            hourly_labor_data[day][hour] = {
                "regular_cost": 0.0,
                "overtime_cost": 0.0,
                "double_ot_cost": 0.0,
                "total_cost": 0.0,
            }

    pacific_tz = ZoneInfo("America/Los_Angeles")

    # 1) Convert raw shifts to "time punches" your annotator expects
    time_punches = []
    for shift in shifts:
        logger.info("shift", shift)
        try:
            raw_duration = 0.0
            raw_break_dur = 0.0
            # Parse times (accept trailing 'Z')
            start_str = shift["start"].replace("Z", "+00:00")
            end_str = shift["end"].replace("Z", "+00:00")
            start_time_utc = datetime.fromisoformat(start_str)
            end_time_utc = datetime.fromisoformat(end_str)

            # Build punch skeleton
            time_punch = {
                "user_id": shift.get("user_id"),
                "clocked_in": start_str,   # keep ISO string for downstream
                "clocked_out": end_str,
                "hourly_wage": shift.get("hourly_wage", 0),  # cents or dollars
                "breaks": shift.get("breaks", []),
            }

            # Optional helpers (assuming you have these)
            if "convert_to_pacific_time_display" in globals():
                time_punch["clocked_in_pacific"] = convert_to_pacific_time_display(shift["start"])
                time_punch["clocked_out_pacific"] = convert_to_pacific_time_display(shift["end"])
            if "extract_pacific_date" in globals():
                time_punch["clocked_in_date_pacific"] = extract_pacific_date(shift["start"])
            logger.info("time_punch", time_punch)
            # Durations (names say minutes but look like hours in your code—keeping your vars)
            if "calculate_shift_duration_hours" in globals():
                raw_duration = calculate_shift_duration_hours(shift["start"], shift["end"])

            else:
                duration = (end_time_utc - start_time_utc).total_seconds() / 3600.0

            if "calculate_break_duration_hours" in globals():
                raw_break_dur = calculate_break_duration_hours(shift.get("breaks", []))

            else:
                break_dur = 0.0
            
            duration_hours = to_hours(raw_duration)
            logger.info("duration raw=%r -> %s h", raw_duration, duration_hours)
            break_hours = to_hours(raw_break_dur)

            time_punch["shift_duration_minutes"] = duration_hours  # (naming kept from your code)
            time_punch["break_duration_minutes"] = break_hours
            time_punch["net_worked_hours"] = round(max(0.0, duration_hours - break_hours), 2)

            time_punches.append(time_punch)

            logger.info("duration raw=%r -> %s h, breaks raw=%r -> %s h",
            raw_duration, duration_hours, raw_break_dur, break_hours)

        except Exception as e:
            logger.warning(f"Error converting shift {shift.get('id')} to time punch: {str(e)}")
            continue

    # 2) Use your existing overtime annotator
    annotated_punches = annotate_per_shift_overtime(time_punches)

    # 3) Distribute annotated cost across hours, sequentially (regular -> OT -> double OT)
    for punch in annotated_punches:
        try:
            # Parse again (this time from the punch, which still might have 'Z')
            start_time_utc = datetime.fromisoformat(punch["clocked_in"].replace("Z", "+00:00"))
            end_time_utc = datetime.fromisoformat(punch["clocked_out"].replace("Z", "+00:00"))

            start_time_pacific = start_time_utc.astimezone(pacific_tz)
            end_time_pacific = end_time_utc.astimezone(pacific_tz)

            # Wage normalization: try to detect cents vs. dollars
            wage_raw = punch.get("hourly_wage", 0)
            if wage_raw is None:
                wage_raw = 0
            # Heuristic: if >= 100, likely cents (e.g., 1850 == $18.50)
            hourly_wage_dollars = wage_raw / 100.0 if wage_raw >= 100 else float(wage_raw)

            overtime_rate = hourly_wage_dollars * 1.5
            double_ot_rate = hourly_wage_dollars * 2.0

            # OT annotation fields (be robust to naming)
            regular_hours = float(punch.get("regular_hours") or 0.0)
            overtime_hours = float(punch.get("overtime_hours") or 0.0)
            double_ot_hours = float(punch.get("double_ot_hours") or 0.0)
            total_worked_hours = float(punch.get("net_worked_hours") or (regular_hours + overtime_hours + double_ot_hours))

            hours_allocated = 0.0
            current_time = start_time_pacific

            while current_time < end_time_pacific and hours_allocated < total_worked_hours:
                day_name = days_map[current_time.weekday()]
                hour = current_time.hour

                # Only bucket into business hours
                if business_hour_start <= hour <= business_hour_end:
                    hour_start = current_time.replace(minute=0, second=0, microsecond=0)
                    hour_end = hour_start + timedelta(hours=1)

                    overlap_start = max(current_time, hour_start)
                    overlap_end = min(end_time_pacific, hour_end)

                    if overlap_end > overlap_start:
                        overlap_duration = (overlap_end - overlap_start).total_seconds() / 3600.0
                        # Don't exceed annotated worked hours
                        overlap_duration = min(overlap_duration, total_worked_hours - hours_allocated)

                        if overlap_duration > 0:
                            hour_regular_cost = 0.0
                            hour_overtime_cost = 0.0
                            hour_double_ot_cost = 0.0

                            remaining = overlap_duration

                            # Regular portion
                            if hours_allocated < regular_hours and remaining > 0:
                                reg_portion = min(remaining, regular_hours - hours_allocated)
                                hour_regular_cost += reg_portion * hourly_wage_dollars
                                hours_allocated += reg_portion
                                remaining -= reg_portion

                            # Overtime portion
                            if hours_allocated < (regular_hours + overtime_hours) and remaining > 0:
                                ot_cap = (regular_hours + overtime_hours) - hours_allocated
                                ot_portion = min(remaining, ot_cap)
                                hour_overtime_cost += ot_portion * overtime_rate
                                hours_allocated += ot_portion
                                remaining -= ot_portion

                            # Double OT portion
                            if remaining > 0:
                                hour_double_ot_cost += remaining * double_ot_rate
                                hours_allocated += remaining
                                remaining = 0.0

                            hour_total_cost = hour_regular_cost + hour_overtime_cost + hour_double_ot_cost

                            bkt = hourly_labor_data[day_name][hour]
                            bkt["regular_cost"] += hour_regular_cost
                            bkt["overtime_cost"] += hour_overtime_cost
                            bkt["double_ot_cost"] += hour_double_ot_cost
                            bkt["total_cost"] += hour_total_cost

                # bump to next wall clock hour
                current_time = current_time.replace(minute=0, second=0, microsecond=0) + timedelta(hours=1)

        except Exception as e:
            logger.warning(f"Error processing overtime for punch {punch.get('user_id')}: {str(e)}")
            continue

    # 4) Round for display
    for day in hourly_labor_data:
        for hour in hourly_labor_data[day]:
            for k in ("regular_cost", "overtime_cost", "double_ot_cost", "total_cost"):
                hourly_labor_data[day][hour][k] = round(hourly_labor_data[day][hour][k], 2)

    return hourly_labor_data

def process_shifts_to_hourly_labor_data(shifts: List[Dict]) -> Dict:
    """
    Process raw 7shifts shift data into hourly labor cost structure expected by dashboard
    Distributes labor costs across hours based on actual shift times (without overtime breakdown)
    """
    days_map = {
        0: "Monday", 1: "Tuesday", 2: "Wednesday", 
        3: "Thursday", 4: "Friday", 5: "Saturday", 6: "Sunday"
    }
    
    # Initialize hourly structure (7 AM to 9 PM = hours 7-21)
    hourly_labor_data = {}
    for day in days_map.values():
        hourly_labor_data[day] = {}
        for hour in range(7, 22):  # 7 AM to 9 PM
            hourly_labor_data[day][hour] = 0.0
    
    pacific_tz = ZoneInfo("America/Los_Angeles")
    
    for shift in shifts:
        try:
            # Parse shift times (they come in UTC from 7shifts)
            start_time_utc = datetime.fromisoformat(shift["start"].replace("Z", "+00:00"))
            end_time_utc = datetime.fromisoformat(shift["end"].replace("Z", "+00:00"))
            
            # Convert to Pacific time
            start_time_pacific = start_time_utc.astimezone(pacific_tz)
            end_time_pacific = end_time_utc.astimezone(pacific_tz)
            
            # Get hourly wage in dollars
            hourly_wage_dollars = shift.get("hourly_wage", 0) / 100
            
            # Handle shifts that span multiple days
            current_time = start_time_pacific
            
            while current_time < end_time_pacific:
                # Get the day and hour for current time
                day_of_week = current_time.weekday()
                day_name = days_map[day_of_week]
                hour = current_time.hour
                
                # Only process business hours (7 AM to 9 PM)
                if 7 <= hour <= 21:
                    # Calculate how much of this hour is worked
                    hour_start = current_time.replace(minute=0, second=0, microsecond=0)
                    hour_end = hour_start + timedelta(hours=1)
                    
                    # Find the overlap between shift time and this hour
                    overlap_start = max(current_time, hour_start)
                    overlap_end = min(end_time_pacific, hour_end)
                    
                    if overlap_end > overlap_start:
                        # Calculate fraction of hour worked
                        overlap_duration = (overlap_end - overlap_start).total_seconds() / 3600
                        hour_labor_cost = overlap_duration * hourly_wage_dollars
                        
                        # Add to hourly labor data
                        hourly_labor_data[day_name][hour] += hour_labor_cost
                
                # Move to next hour
                current_time = current_time.replace(minute=0, second=0, microsecond=0) + timedelta(hours=1)
                
        except Exception as e:
            logger.warning(f"Error processing shift {shift.get('id')}: {str(e)}")
            continue
    
    # Round all values to 2 decimal places
    for day in hourly_labor_data:
        for hour in hourly_labor_data[day]:
            hourly_labor_data[day][hour] = round(hourly_labor_data[day][hour], 2)
    
    return hourly_labor_data

def process_shifts_to_labor_data(shifts: List[Dict]) -> Dict:
    """
    Process raw 7shifts shift data into daily labor cost structure
    This now uses the hourly data and sums it up by day
    """
    # Get hourly labor data
    hourly_data = process_shifts_to_hourly_labor_data(shifts)
    
    # Sum up to daily totals
    daily_labor_data = {}
    for day, hours in hourly_data.items():
        total_cost = sum(hours.values())
        # Calculate total hours by dividing total cost by average hourly wage
        # For now, we'll estimate hours based on cost (this is approximate)
        daily_labor_data[day] = {
            "cost": round(total_cost, 2),
            "hours": 0  # We'll calculate this separately if needed
        }
    
    # Calculate actual hours from original shifts for accuracy
    days_map = {
        0: "Monday", 1: "Tuesday", 2: "Wednesday", 
        3: "Thursday", 4: "Friday", 5: "Saturday", 6: "Sunday"
    }
    pacific_tz = ZoneInfo("America/Los_Angeles")
    
    # Reset hours to 0
    for day in daily_labor_data:
        daily_labor_data[day]["hours"] = 0.0
    
    # Calculate actual hours
    for shift in shifts:
        try:
            start_time_utc = datetime.fromisoformat(shift["start"].replace("Z", "+00:00"))
            end_time_utc = datetime.fromisoformat(shift["end"].replace("Z", "+00:00"))
            
            start_time_pacific = start_time_utc.astimezone(pacific_tz)
            end_time_pacific = end_time_utc.astimezone(pacific_tz)
            
            duration = (end_time_pacific - start_time_pacific).total_seconds() / 3600
            day_of_week = start_time_pacific.weekday()
            day_name = days_map[day_of_week]
            
            daily_labor_data[day_name]["hours"] += duration
            
        except Exception as e:
            logger.warning(f"Error calculating hours for shift {shift.get('id')}: {str(e)}")
            continue
    
    # Round hours
    for day in daily_labor_data:
        daily_labor_data[day]["hours"] = round(daily_labor_data[day]["hours"], 1)
    
    return daily_labor_data

async def get_labor_data_for_week(week_start_date: datetime, location_id: Optional[int] = None) -> Dict:
    """
    Get processed labor data for a week (daily totals)
    """
    shifts = await get_shifts_for_week(week_start_date, location_id)
    return process_shifts_to_labor_data(shifts)

async def get_hourly_labor_data_for_week(week_start_date: datetime, location_id: Optional[int] = None) -> Dict:
    """
    Get processed hourly labor data for a week (simple version without overtime breakdown)
    Returns labor costs broken down by day and hour
    """
    shifts = await get_shifts_for_week(week_start_date, location_id)
    return process_shifts_to_hourly_labor_data(shifts)

async def get_hourly_labor_data_with_overtime_for_week(week_start_date: datetime, location_id: Optional[int] = None) -> Dict:
    """
    Get processed hourly labor data for a week with overtime calculations
    Returns labor costs broken down by day, hour, and overtime type
    """
    shifts = await get_shifts_for_week(week_start_date, location_id)
    return process_shifts_to_hourly_labor_data_with_overtime(shifts)
