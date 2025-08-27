import axios from 'axios';
import type { TimesheetEntry } from "../types/timesheet";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

// Define the BreakPeriod type to match backend schema
interface BreakPeriod {
  id?: number;
  start_time: string;  // e.g., "12:30 PM"
  end_time: string;    // e.g., "1:00 PM"
  is_unpaid: boolean;
  duration_minutes: number;
}

// Define the ShiftDisplay type (this is what your 7shifts API returns)
interface ShiftDisplay {
  employee_id: string;
  user_id: number;
  user_name: string;
  clocked_in_pacific: string;
  clocked_out_pacific: string;
  clocked_in_date_pacific: string;
  regular_hours: number;
  overtime_hours: number;
  double_ot_hours: number;
  net_worked_hours: number;
  break_duration_minutes: number;
  // Make break fields optional to handle backend inconsistency
  unpaid_break_hours?: number;
  paid_break_hours?: number;
  total_break_hours?: number;
  break_periods?: BreakPeriod[]; // NEW: Detailed break timing
}

// Shift split configuration interface
interface ShiftSplitConfig {
  splitMethod: "time-based" | "custom";
  morningHours: string; // e.g., "06:00-14:00"
  nightHours: string;   // e.g., "14:00-23:00"
  customSplitTime: string; // e.g., "14:00"
}

// Get the nearest Monday for a given date (for OT calculations)
const getCurrentOrPreviousMonday = (date: string | Date): string => {
  let inputDate: Date;
  
  if (typeof date === 'string') {
    const [year, month, day] = date.split('-').map(num => parseInt(num, 10));
    inputDate = new Date(year, month - 1, day);
  } else {
    inputDate = date;
  }
  
  const day = inputDate.getDay();
  const daysToSubtract = day === 1 ? 0 : (day === 0 ? 6 : day - 1);
  
  const result = new Date(inputDate);
  result.setDate(inputDate.getDate() - daysToSubtract);
  
  const resultYear = result.getFullYear();
  const resultMonth = String(result.getMonth() + 1).padStart(2, '0');
  const resultDay = String(result.getDate()).padStart(2, '0');
  
  return `${resultYear}-${resultMonth}-${resultDay}`;
};

// Parse time string to minutes from midnight
const parseTimeToMinutes = (timeStr: string): number => {
  const timeUpper = timeStr.toUpperCase();
  const isPM = timeUpper.includes('PM');
  const timeOnly = timeUpper.replace(/[AP]M/g, '').trim();
  const [hours, minutes] = timeOnly.split(':').map(num => parseInt(num, 10));
  
  let hour24 = hours;
  if (isPM && hours !== 12) {
    hour24 += 12;
  } else if (!isPM && hours === 12) {
    hour24 = 0;
  }
  
  return hour24 * 60 + minutes;
};

// Convert minutes to time string
const minutesToTimeString = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
};

const getBreakMinutesRelativeToCutoff = (
    breakPeriods: BreakPeriod[] = [],
    _shiftDate: string,
    cutoffMinutes: number
  ): { morningBreakMinutes: number; nightBreakMinutes: number } => {
    let morningBreakMinutes = 0;
    let nightBreakMinutes = 0;
  
    for (const brk of breakPeriods) {
      const startMin = parseTimeToMinutes(brk.start_time);
      const endMin = parseTimeToMinutes(brk.end_time);
  
      if (!brk.is_unpaid) continue; // Only count unpaid breaks
  
      if (endMin <= cutoffMinutes) {
        // Entire break before cutoff
        morningBreakMinutes += brk.duration_minutes;
      } else if (startMin >= cutoffMinutes) {
        // Entire break after cutoff
        nightBreakMinutes += brk.duration_minutes;
      } else {
        // Break spans cutoff
        morningBreakMinutes += cutoffMinutes - startMin;
        nightBreakMinutes += endMin - cutoffMinutes;
      }
    }
  
    return { morningBreakMinutes, nightBreakMinutes };
  };
  

// Split a shift into AM and PM segments based on cutoff time
const splitShiftByTime = (
  shift: ShiftDisplay, 
  cutoffTime: string, // e.g., "14:00"
  shiftDate: string
): { morningSegment: TimesheetEntry | null; nightSegment: TimesheetEntry | null } => {
  console.log(`🔧 splitShiftByTime called for ${shift.user_name}:`, {
    shiftData: shift,
    cutoffTime,
    shiftDate,
    hasBreakPeriods: !!shift.break_periods,
    breakPeriodsLength: shift.break_periods?.length || 0
  });

  const clockInMinutes = parseTimeToMinutes(shift.clocked_in_pacific);
  const clockOutMinutes = parseTimeToMinutes(shift.clocked_out_pacific);
  const cutoffMinutes = parseTimeToMinutes(cutoffTime + ":00"); // Ensure format
  
  // Handle shifts that cross midnight (clock out is next day)
  let adjustedClockOutMinutes = clockOutMinutes;
  if (clockOutMinutes < clockInMinutes) {
    adjustedClockOutMinutes += 24 * 60; // Add 24 hours
  }
  
  // Determine which segments exist
  const hasmorningSegment = clockInMinutes < cutoffMinutes;
  const hasNightSegment = adjustedClockOutMinutes > cutoffMinutes;
  

  
  let morningSegment: TimesheetEntry | null = null;
  let nightSegment: TimesheetEntry | null = null;
  
  if (hasmorningSegment && hasNightSegment) {
    // Swing shift - split the hours
    const morningMinutes = cutoffMinutes - clockInMinutes;
    const nightMinutes = adjustedClockOutMinutes - cutoffMinutes;
    

    
    // Allocate unpaid break minutes based on actual break timing
    const { morningBreakMinutes: morningUnpaidBreakMinutes, nightBreakMinutes: nightUnpaidBreakMinutes } =
        getBreakMinutesRelativeToCutoff(shift.break_periods, shiftDate, cutoffMinutes);

    console.log(`   💤 Break allocation - Morning: ${morningUnpaidBreakMinutes} min, Night: ${nightUnpaidBreakMinutes} min`);

    
    // Calculate net worked hours for each segment
    const morningWorkedMinutes = (morningMinutes - morningUnpaidBreakMinutes);
    const nightWorkedMinutes = (nightMinutes - nightUnpaidBreakMinutes);
    
    // Morning segment
    morningSegment = createTimesheetEntry(
      shift,
      "morning",
      shift.clocked_in_pacific,
      minutesToTimeString(cutoffMinutes) + ":00",
      Math.round(Math.max(0, morningWorkedMinutes / 60) * 100) / 100, // Convert back to hours and round to 2 decimals
      shiftDate,
      Math.round(morningUnpaidBreakMinutes / 60 * 100) / 100 // unpaid break hours for this segment, rounded to 2 decimals
    );
    
    // Night segment  
    nightSegment = createTimesheetEntry(
      shift,
      "night", 
      minutesToTimeString(cutoffMinutes) + ":00",
      shift.clocked_out_pacific,
      Math.round(Math.max(0, nightWorkedMinutes / 60) * 100) / 100, // Convert back to hours and round to 2 decimals
      shiftDate,
      Math.round(nightUnpaidBreakMinutes / 60 * 100) / 100 // unpaid break hours for this segment, rounded to 2 decimals
    );
    
  } else if (hasmorningSegment) {
    // Pure morning shift
    morningSegment = createTimesheetEntry(
      shift,
      "morning",
      shift.clocked_in_pacific,
      shift.clocked_out_pacific,
      Math.round(shift.net_worked_hours * 100) / 100, // Use net worked hours and round to 2 decimals
      shiftDate,
      Math.round((shift.unpaid_break_hours || 0) * 100) / 100 // Fallback to 0 if not provided, rounded to 2 decimals
    );
    
  } else if (hasNightSegment) {
    // Pure night shift
    nightSegment = createTimesheetEntry(
      shift,
      "night",
      shift.clocked_in_pacific, 
      shift.clocked_out_pacific,
      Math.round(shift.net_worked_hours * 100) / 100, // Use net worked hours and round to 2 decimals
      shiftDate,
      Math.round((shift.unpaid_break_hours || 0) * 100) / 100 // Fallback to 0 if not provided, rounded to 2 decimals
    );
  }
  
  return { morningSegment, nightSegment };
};

// Helper function to create a timesheet entry
const createTimesheetEntry = (
  shift: ShiftDisplay,
  shiftType: "morning" | "night",
  clockIn: string,
  clockOut: string,
  hoursWorked: number,
  shiftDate: string,
  unpaidBreakHours: number
): TimesheetEntry => {
  return {
    id: `${shift.clocked_in_date_pacific}-${shift.employee_id}-${shiftType}`,
    employeeId: shift.employee_id,
    employeeName: shift.user_name,
    date: shift.clocked_in_date_pacific,
    shiftType,
    clockIn: convertToISOString(clockIn, shiftDate),
    clockOut: convertToISOString(clockOut, shiftDate),
    hoursWorked, // This is already net hours (excluding unpaid breaks)
    unpaidBreakHours, // Track unpaid break hours separately
    role: "Unknown", // You might need to map this from employee data
    isShiftLead: false, // You might need to determine this from role/permissions
    isTrainee: false, // You might need to determine this from role
    department: "Front of House", // Default or map from employee data
    hourlyRate: 0, // You'll need to fetch this from employee records
    totalPay: 0, // Calculate if needed: hoursWorked * hourlyRate
    status: "approved" as const,
  };
};

// Filter shifts by Pacific date range
const filterShiftsByPacificDate = (shifts: ShiftDisplay[], startDate: string, endDate: string): ShiftDisplay[] => {
  if (!shifts || !Array.isArray(shifts)) {
    console.error("Invalid shifts data provided for filtering:", shifts);
    return [];
  }

  const [startYear, startMonth, startDay] = startDate.split('-').map(num => parseInt(num, 10));
  const [endYear, endMonth, endDay] = endDate.split('-').map(num => parseInt(num, 10));
  
  const startDateObj = new Date(Date.UTC(startYear, startMonth - 1, startDay, 7, 0, 0));
  const endDateObj = new Date(Date.UTC(endYear, endMonth - 1, endDay, 30, 59, 59, 999));
  
  return shifts.filter(shift => {
    let shiftDate;
    
    if (shift.clocked_in_date_pacific.includes('/')) {
      const [month, day, year] = shift.clocked_in_date_pacific.split('/').map(num => parseInt(num, 10));
      shiftDate = new Date(Date.UTC(year, month - 1, day, 7, 0, 0));
    } else if (shift.clocked_in_date_pacific.includes('-')) {
      const [year, month, day] = shift.clocked_in_date_pacific.split('-').map(num => parseInt(num, 10));
      shiftDate = new Date(Date.UTC(year, month - 1, day, 7, 0, 0));
    } else {
      const tempDate = new Date(shift.clocked_in_date_pacific);
      shiftDate = new Date(Date.UTC(
        tempDate.getFullYear(), 
        tempDate.getMonth(), 
        tempDate.getDate(), 
        7, 0, 0
      ));
    }
    
    return shiftDate >= startDateObj && shiftDate <= endDateObj;
  });
};

// Convert time string to ISO format
const convertToISOString = (timeStr: string, dateStr: string): string => {
  // Handle different date formats
  let month: number, day: number, year: number;
  
  if (dateStr.includes('/')) {
    [month, day, year] = dateStr.split('/').map(num => parseInt(num, 10));
  } else if (dateStr.includes('-')) {
    [year, month, day] = dateStr.split('-').map(num => parseInt(num, 10));
  } else {
    // Fallback for other formats
    const tempDate = new Date(dateStr);
    year = tempDate.getFullYear();
    month = tempDate.getMonth() + 1;
    day = tempDate.getDate();
  }
  
  const timeUpper = timeStr.toUpperCase();
  const isPM = timeUpper.includes('PM');
  const timeOnly = timeUpper.replace(/[AP]M/g, '').trim();
  const [hours, minutes] = timeOnly.split(':').map(num => parseInt(num, 10));
  
  let hour24 = hours;
  if (isPM && hours !== 12) {
    hour24 += 12;
  } else if (!isPM && hours === 12) {
    hour24 = 0;
  }
  
  // Create ISO string (month is 0-based in Date constructor)
  const date = new Date(year, month - 1, day, hour24, minutes);
  return date.toISOString();
};

// Convert ShiftDisplay to TimesheetEntry with shift splitting
const convertShiftDisplayToTimesheetEntry = (
  shifts: ShiftDisplay[], 
  shiftSplitConfig: ShiftSplitConfig
): TimesheetEntry[] => {
  console.log(`🔄 Starting shift conversion and splitting for ${shifts.length} shifts`);
  
  const timesheetEntries: TimesheetEntry[] = [];
  
  // Determine cutoff time based on configuration
  let cutoffTime: string;
  if (shiftSplitConfig.splitMethod === "custom") {
    cutoffTime = shiftSplitConfig.customSplitTime;
  } else {
    // Extract cutoff from morning hours end time
    const morningEnd = shiftSplitConfig.morningHours.split('-')[1];
    cutoffTime = morningEnd;
  }
  
  console.log(`⚙️ Using cutoff time: ${cutoffTime}`);
  
  shifts.forEach((shift, index) => {
    console.log(`\n🔍 Processing shift ${index + 1}/${shifts.length} for ${shift.user_name}`);
    console.log(`   ⏰ Shift time: ${shift.clocked_in_pacific} - ${shift.clocked_out_pacific}`);
    console.log(`   📊 Net worked hours: ${shift.net_worked_hours}, Unpaid break hours: ${shift.unpaid_break_hours}`);
    
    const { morningSegment, nightSegment } = splitShiftByTime(
      shift, 
      cutoffTime, 
      shift.clocked_in_date_pacific
    );
    
    if (morningSegment) {
      console.log(`   🌅 Created morning segment: ${morningSegment.hoursWorked} hours`);
      timesheetEntries.push(morningSegment);
    }
    
    if (nightSegment) {
      console.log(`   🌙 Created night segment: ${nightSegment.hoursWorked} hours`);
      timesheetEntries.push(nightSegment);
    }
    
    if (!morningSegment && !nightSegment) {
      console.warn(`   ⚠️ No segments created for ${shift.user_name} - this shouldn't happen!`);
    }
  });
  
  console.log(`✅ Conversion complete: ${timesheetEntries.length} timesheet entries created from ${shifts.length} shifts`);
  
  return timesheetEntries;
};

// Main API function to fetch timesheet data from 7shifts
export async function fetchTimesheetData(
  _apiKey: string,
  locationId: string,
  startDate: string,
  endDate: string,
  shiftSplitConfig: ShiftSplitConfig = {
    splitMethod: "time-based",
    morningHours: "06:00-14:00",
    nightHours: "14:00-23:00",
    customSplitTime: "14:00"
  }
): Promise<TimesheetEntry[]> {
  try {
    console.log(`🔍 Fetching timesheet data from ${startDate} to ${endDate} for location ${locationId}`);
    
    // For single-day requests, don't fetch from Monday to reduce API load
    const isLongDateRange = new Date(endDate).getTime() - new Date(startDate).getTime() > 7 * 24 * 60 * 60 * 1000; // More than 7 days
    
    // Use the nearest Monday for fetching only if it's a longer date range (for proper OT calculations)
    const fetchStartDate = isLongDateRange ? getCurrentOrPreviousMonday(startDate) : startDate;
    
    if (fetchStartDate !== startDate) {
      console.log(`📅 Adjusted fetch start date to ${fetchStartDate} (nearest Monday for OT calculations)`);
    } else {
      console.log(`📅 Using exact date range for single/short-term request`);
    }
    
    const requestPayload = {
      start_date: fetchStartDate,
      end_date: endDate,
      location_id: parseInt(locationId),
    };
    
    console.log(`📤 API Request payload:`, requestPayload);
    
    // Make the API call to your backend
    const response = await axios.post(`${API_BASE_URL}/time-punch/shifts-display`, requestPayload, {
      timeout: 120000, // Increase to 2 minutes for 7shifts API calls
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    console.log(`✅ API Response status: ${response.status}`);
    console.log(`📥 Received ${response.data?.length || 0} shifts from API`);
    
    const allShifts: ShiftDisplay[] = response.data;
    
    if (!Array.isArray(allShifts)) {
      throw new Error(`Expected array of shifts, got: ${typeof allShifts}`);
    }
    
    // Log a sample shift for debugging
    if (allShifts.length > 0) {
      console.log(`📋 Sample shift data:`, allShifts[0]);
    }
    
    // Filter to the requested date range
    const filteredShifts = filterShiftsByPacificDate(allShifts, startDate, endDate);
    console.log(`🔽 Filtered to ${filteredShifts.length} shifts in date range ${startDate} to ${endDate}`);
    
    // Convert to TimesheetEntry format with shift splitting
    const timesheetEntries = convertShiftDisplayToTimesheetEntry(filteredShifts, shiftSplitConfig);
    
    console.log(`✨ Generated ${timesheetEntries.length} timesheet entries from 7shifts API (with shift splitting)`);
    console.log(`⚙️ Split configuration: ${shiftSplitConfig.splitMethod} - cutoff at ${shiftSplitConfig.splitMethod === 'custom' ? shiftSplitConfig.customSplitTime : shiftSplitConfig.morningHours.split('-')[1]}`);
    
    return timesheetEntries;
    
  } catch (error) {
    console.error('❌ Error fetching timesheet data from 7shifts:', error);
    
    // Enhanced error logging
    if (axios.isAxiosError(error)) {
      console.error('🔥 Axios Error Details:');
      console.error('- Status:', error.response?.status);
      console.error('- Status Text:', error.response?.statusText);
      console.error('- Response Data:', error.response?.data);
      console.error('- Request URL:', error.config?.url);
      console.error('- Request Method:', error.config?.method);
      console.error('- Request Data:', error.config?.data);
      
      // Provide more specific error messages
      if (error.response?.status === 500) {
        throw new Error(`Server error (500): ${error.response?.data?.detail || 'Internal server error occurred'}`);
      } else if (error.response?.status === 404) {
        throw new Error(`API endpoint not found (404). Check if your backend server is running.`);
      } else if (error.code === 'ECONNREFUSED') {
        throw new Error(`Cannot connect to server. Is your backend running on http://localhost:8000?`);
      } else if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        throw new Error(`Request timed out. The 7shifts API is taking too long to respond. Try a smaller date range or try again later.`);
      } else {
        throw new Error(`API request failed (${error.response?.status}): ${error.response?.data?.detail || error.message}`);
      }
    } else {
      throw new Error(`Failed to fetch timesheet data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Export the ShiftDisplay type in case you need it elsewhere
export type { ShiftDisplay, ShiftSplitConfig, BreakPeriod };