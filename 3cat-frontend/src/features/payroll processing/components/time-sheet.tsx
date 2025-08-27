// features/payroll-processing/components/time-sheet.tsx
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Download, AlertCircle, RefreshCw, ArrowUpDown } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useSort, sortData } from "@/lib/sortUtils";
import { safeToFixed } from "@/lib/utils";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

// ShiftDisplayResponse type
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
  unpaid_break_hours: number;
  paid_break_hours: number;
  total_break_hours: number;
}

interface TimeSheetProps {
  startDate: string;
  endDate: string;
  locationId?: number;
  displayStartDate?: string; // Optional display start date
  displayEndDate?: string;   // Optional display end date
  onDataLoaded?: (data: ShiftDisplay[]) => void;
}

// // Helper function for date comparison - converts strings to normalized dates
// const isDateInRange = (dateStr: string, startStr: string, endStr: string): boolean => {
//   const date = new Date(dateStr);
//   const start = new Date(startStr);
//   const end = new Date(endStr);
  
//   // Normalize times to midnight for date-only comparison
//   date.setHours(0, 0, 0, 0);
//   start.setHours(0, 0, 0, 0);
//   end.setHours(23, 59, 59, 999);
  
//   return date >= start && date <= end;
// };

// const getPacificMidnightInUTC = (dateStr) => {
//   // For April dates, PDT is in effect (UTC-7)
//   // So midnight PDT = 07:00 UTC
//   return `${dateStr}T07:00:00.000Z`;
// };

// const getPacificEndOfDayInUTC = (dateStr) => {
//   // For April dates, PDT is in effect (UTC-7)
//   // So 11:59:59 PM PDT = 06:59:59 UTC the next day
  
//   // Parse the date string
//   const [year, month, day] = dateStr.split('-').map(num => parseInt(num, 10));
  
//   // Create a Date object for the given date
//   const date = new Date(year, month - 1, day);
  
//   // Add 1 day to get to the next day, then subtract 1 second to get 11:59:59 PM
//   date.setDate(date.getDate() + 1);
//   date.setSeconds(-1); // Trick to get to 23:59:59 of the previous day
  
//   // Format the date as UTC string and return just the YYYY-MM-DDT06:59:59.999Z part
//   return date.toISOString().replace('Z', '').slice(0, -4) + '999Z';
// };


// Get the nearest Monday for a given date
const getCurrentOrPreviousMonday = (date: string | Date) => {
  let inputDate: Date;
  
  // Handle string dates by explicitly parsing year, month, day to avoid timezone issues
  if (typeof date === 'string') {
    const [year, month, day] = date.split('-').map(num => parseInt(num, 10));
    // Note: Month is 0-based in JavaScript Date (0 = January, 11 = December)
    inputDate = new Date(year, month - 1, day);
  } else {
    inputDate = date;
  }
  
  // Get day of week (0 = Sunday, 1 = Monday, etc.)
  const day = inputDate.getDay();
  
  // If it's Monday (1), don't subtract any days
  // Otherwise calculate days to subtract to reach the previous Monday
  const daysToSubtract = day === 1 ? 0 : (day === 0 ? 6 : day - 1);
  
  // Create result date by subtracting the appropriate number of days
  const result = new Date(inputDate);
  result.setDate(inputDate.getDate() - daysToSubtract);
  
  // Format as YYYY-MM-DD
  const resultYear = result.getFullYear();
  // Add 1 to month because getMonth() is 0-based
  const resultMonth = String(result.getMonth() + 1).padStart(2, '0');
  const resultDay = String(result.getDate()).padStart(2, '0');
  
  return `${resultYear}-${resultMonth}-${resultDay}`;
};

const filterShiftsByPacificDate = (shifts: ShiftDisplay[], startDate: string, endDate: string) => {
  if (!shifts || !Array.isArray(shifts)) {
    console.error("Invalid shifts data provided for filtering:", shifts);
    return [];
  }
  

  
  // Parse start and end dates with explicit formatting
  const [startYear, startMonth, startDay] = startDate.split('-').map((num : string) => parseInt(num, 10));
  const [endYear, endMonth, endDay] = endDate.split('-').map((num : string) => parseInt(num, 10));
  
  // Create date objects with Pacific time (PDT = UTC-7)
  const startDateObj = new Date(Date.UTC(startYear, startMonth - 1, startDay, 7, 0, 0));
  const endDateObj = new Date(Date.UTC(endYear, endMonth - 1, endDay, 30, 59, 59, 999)); // End of day + 1 day in UTC
  
  return shifts.filter(shift => {
    // Parse the shift date, handling different formats
    let shiftDate;
    
    if (shift.clocked_in_date_pacific.includes('/')) {
      // Parse M/D/YYYY format
      const [month, day, year] = shift.clocked_in_date_pacific.split('/').map((num : string) => parseInt(num, 10));
      shiftDate = new Date(Date.UTC(year, month - 1, day, 7, 0, 0)); // 7 hours offset for PDT
    } else if (shift.clocked_in_date_pacific.includes('-')) {
      // Parse YYYY-MM-DD format
      const [year, month, day] = shift.clocked_in_date_pacific.split('-').map((num : string) => parseInt(num, 10));
      shiftDate = new Date(Date.UTC(year, month - 1, day, 7, 0, 0)); // 7 hours offset for PDT
    } else {
      // Fallback for other formats
      const tempDate = new Date(shift.clocked_in_date_pacific);
      shiftDate = new Date(Date.UTC(
        tempDate.getFullYear(), 
        tempDate.getMonth(), 
        tempDate.getDate(), 
        7, 0, 0
      ));
    }
    
   
    
    // Do the date comparison with normalized Date objects
    return shiftDate >= startDateObj && shiftDate <= endDateObj;
  });
};



// Create a cache to store fetched data
const timeSheetCache = new Map<string, ShiftDisplay[]>();

export const TimeSheet: React.FC<TimeSheetProps> = ({ 
  startDate, 
  endDate, 
  locationId = 442908,
  displayStartDate,  // Optional display start date
  displayEndDate,    // Optional display end date
  onDataLoaded 
}) => {
  // Use the nearest Monday of startDate for fetching data (for OT calculation)
  const fetchStartDate = getCurrentOrPreviousMonday(startDate);
  
  // Set display dates to startDate and endDate if not explicitly provided
  const actualDisplayStartDate = displayStartDate || startDate;
  const actualDisplayEndDate = displayEndDate || endDate;
  
  // Create a cache key from the params
  const cacheKey = `${fetchStartDate}_${endDate}_${locationId}`;
  const filteredShiftsCacheKey = `filteredShifts_${startDate}_${endDate}_${locationId}`;
  const [filteredShifts, setFilteredShifts] = useState<ShiftDisplay[]>(() => {
    try {
      const cached = localStorage.getItem(filteredShiftsCacheKey);
      return cached ? JSON.parse(cached) : [];
    } catch (e) {
      console.error("Error loading cached filtered shifts:", e);
      return [];
    }
  });
  
  const [allShifts, setAllShifts] = useState<ShiftDisplay[]>(() => timeSheetCache.get(cacheKey) || []);
  console.log("this is allShifts", allShifts);
  const [loading, setLoading] = useState<boolean>(() => !timeSheetCache.has(cacheKey));
  const [error, setError] = useState<string | null>(null);
  const [isInitialFetch, setIsInitialFetch] = useState<boolean>(() => !timeSheetCache.has(cacheKey));
  
  useEffect(() => {
    if (filteredShifts.length > 0) {
      localStorage.setItem(filteredShiftsCacheKey, JSON.stringify(filteredShifts));
    }
  }, [filteredShifts, filteredShiftsCacheKey]);
  // Function to fetch data - extracted to be reusable
  const fetchTimeSheetData = useCallback(async (forceRefresh = false) => {
    // If data is in cache and we're not forcing a refresh, use the cached data
    if (timeSheetCache.has(cacheKey) && !forceRefresh) {
      const cachedData = timeSheetCache.get(cacheKey) || [];
      setAllShifts(cachedData);
      const displayFiltered = filterShiftsByPacificDate(cachedData, startDate, endDate);
      setFilteredShifts(displayFiltered);
      localStorage.setItem(filteredShiftsCacheKey, JSON.stringify(displayFiltered));
      
      // Filter data for display dates and pass to parent through onDataLoaded
      if (onDataLoaded) {
        const displayFiltered = filterShiftsByPacificDate(cachedData, startDate, endDate);
        
        onDataLoaded(displayFiltered);
      }

      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      

      
      const response = await axios.post(`${API_BASE_URL}/time-punch/shifts-display`, {
        start_date: fetchStartDate,
        end_date: endDate,
        location_id: locationId,
        approved: true
      });
      
      const data = response.data;

      // Update cache with all data
      timeSheetCache.set(cacheKey, data);
      setAllShifts(data);
      
      // Filter data for display dates and pass to parent through onDataLoaded
      if (onDataLoaded) {
        const displayFiltered = filterShiftsByPacificDate(data, startDate, endDate);
        
        setFilteredShifts(displayFiltered);
       
        // Additional debugging
        if (displayFiltered.length === 0 && data.length > 0) {
          for (let i = 0; i < Math.min(3, data.length); i++) {
            const shift = data[i];
            const shiftDate = new Date(shift.clocked_in_date_pacific);
            const startDate = new Date(actualDisplayStartDate);
            const endDate = new Date(actualDisplayEndDate);
            
            shiftDate.setHours(0, 0, 0, 0);
            startDate.setHours(0, 0, 0, 0);
            endDate.setHours(23, 59, 59, 999);

          }
        }
        onDataLoaded(displayFiltered);
      }
    } catch (err) {
      console.error('Error fetching shift data:', err);
      setError('Failed to fetch shift data');
    } finally {
      setLoading(false);
    }
  }, [fetchStartDate, endDate, locationId, cacheKey, onDataLoaded, actualDisplayStartDate, actualDisplayEndDate]);
  
  // Initial data fetch - only run once
  useEffect(() => {
    if (isInitialFetch) {
      fetchTimeSheetData();
      setIsInitialFetch(false);
    }
  }, [fetchTimeSheetData, isInitialFetch]);

  const handleRefresh = () => {
    fetchTimeSheetData(true);
  };

  const handleExport = async () => {
    try {
      const response = await axios.post(`${API_BASE_URL}/time-punch/shifts-display`, {
        start_date: fetchStartDate,
        end_date: endDate,
        location_id: locationId,
        approved: true
      }, {
      });
      const data = response.data;

      const headers = [
        'User ID',
        'User Name',
        'Employee ID',
        'Clock In',
        'Clock Out',
        'Date',
        'Regular Hours',
        'Overtime Hours',
        'Double OT Hours',
        'Net Worked Hours',
        'Break Duration (Minutes)'
      ];

      const csvRows = data.map((row: ShiftDisplay) => [
        row.user_id,
        row.user_name,
        row.employee_id,
        row.clocked_in_pacific,
        row.clocked_out_pacific,
        row.clocked_in_date_pacific,
        row.regular_hours,
        row.overtime_hours,
        row.double_ot_hours,
        row.net_worked_hours,
        row.unpaid_break_hours
      ]);

      const csvContent = [
        headers.join(','),
        ...csvRows.map((row: any[]) => row.join(','))
      ].join('\n');

      // Create download link
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.setAttribute('download', `time_punches_${actualDisplayStartDate}_to_${actualDisplayEndDate}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error exporting time punches:', error);
      setError('Failed to export shifts');
    }
  };


  // Calculate overtime statistics from the displayed shifts only
  const stats = React.useMemo(() => {
    if (!filteredShifts.length) return {
      totalHours: "0.00",
      totalRegularHours: "0.00",
      totalOvertimeHours: "0.00",
      totalDoubleOtHours: "0.00",
      totalEmployees: 0
    };
    
    const totalHours = filteredShifts.reduce((sum, shift) => sum + shift.net_worked_hours, 0);
    const totalRegularHours = filteredShifts.reduce((sum, shift) => sum + shift.regular_hours, 0);
    const totalOvertimeHours = filteredShifts.reduce((sum, shift) => sum + shift.overtime_hours, 0);
    const totalDoubleOtHours = filteredShifts.reduce((sum, shift) => sum + shift.double_ot_hours, 0);
    
    return {
      totalHours: safeToFixed(totalHours),
      totalRegularHours: safeToFixed(totalRegularHours),
      totalOvertimeHours: safeToFixed(totalOvertimeHours),
      totalDoubleOtHours: safeToFixed(totalDoubleOtHours),
      totalEmployees: new Set(filteredShifts.map(s => s.user_id)).size
    };
  }, [filteredShifts]);

  // Add sorting state
  const { sortConfig, handleSort } = useSort('user_name');

  // Sort the filtered shifts
  const sortedShifts = React.useMemo(() => {
    return sortData(filteredShifts, sortConfig, (shift, key) => {
      switch (key) {
        case 'user_name':
          return shift.user_name;
        case 'employee_id':
          return shift.employee_id;
        case 'clocked_in_date_pacific':
          // Convert MM/DD/YYYY to YYYY-MM-DD for proper date sorting
          const [month, day, year] = shift.clocked_in_date_pacific.split('/');
          return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        case 'clocked_in_pacific':
        case 'clocked_out_pacific':
          // Convert time to 24-hour format for proper sorting
          const time = shift[key].toUpperCase();
          // Extract the period (AM/PM) from the end
          const period = time.slice(-2);
          // Get the time part without AM/PM
          const timeStr = time.slice(0, -2);
          let [hours, minutes] = timeStr.split(':').map(Number);
          
          // Handle AM/PM conversion
          if (period === 'PM' && hours !== 12) {
            hours += 12;
          } else if (period === 'AM' && hours === 12) {
            hours = 0;
          }
          
          // For proper sorting around midnight, we'll use a 24-hour format
          // This ensures 12:00 AM comes before 8:12 PM
          console.log("minutes", minutes);
          return hours * 60 + minutes; // Convert to minutes since midnight for proper sorting
        case 'regular_hours':
        case 'overtime_hours':
        case 'double_ot_hours':
        case 'net_worked_hours':
        case 'unpaid_break_hours':
        case 'paid_break_hours':
        case 'total_break_hours':
          return shift[key];
        default:
          return '';
      }
    });
  }, [filteredShifts, sortConfig]);

  if (loading && !filteredShifts.length) {
    return (
      <div className="flex flex-col items-center justify-center py-8 space-y-4">
        <Progress value={40} className="w-[60%] h-2" />
        <p className="text-sm text-muted-foreground">Loading timesheet data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          {error}. Please try again or contact support if the problem persists.
        </AlertDescription>
        <Button onClick={handleRefresh} className="mt-2">Try Again</Button>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="p-4 bg-muted/50 rounded-lg">
          <div className="text-sm font-medium">Total Hours</div>
          <div className="text-2xl font-bold">{stats.totalHours}</div>
        </div>
        <div className="p-4 bg-muted/50 rounded-lg">
          <div className="text-sm font-medium">Regular Hours</div>
          <div className="text-2xl font-bold">{stats.totalRegularHours}</div>
        </div>
        <div className="p-4 bg-muted/50 rounded-lg">
          <div className="text-sm font-medium">Overtime Hours</div>
          <div className="text-2xl font-bold">{stats.totalOvertimeHours}</div>
        </div>
        <div className="p-4 bg-muted/50 rounded-lg">
          <div className="text-sm font-medium">Double OT</div>
          <div className="text-2xl font-bold">{stats.totalDoubleOtHours}</div>
        </div>
        <div className="p-4 bg-muted/50 rounded-lg">
          <div className="text-sm font-medium">Employees</div>
          <div className="text-2xl font-bold">{stats.totalEmployees}</div>
        </div>
      </div>

      {/* Date range info and buttons */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-2">
        <div className="text-sm text-muted-foreground order-2 sm:order-1">
          <span>
            Showing data from <strong>{actualDisplayStartDate}</strong> to <strong>{actualDisplayEndDate}</strong>
          </span>
          {fetchStartDate !== startDate && (
            <div className="text-xs italic mt-1">
              Using data from {fetchStartDate} for weekly overtime calculations
            </div>
          )}
        </div>
        
        <div className="flex gap-2 order-1 sm:order-2 w-full sm:w-auto justify-end">
          <Button variant="outline" onClick={handleRefresh}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh Data
          </Button>
          
          <Button onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Export to CSV
          </Button>
        </div>
      </div>

      {/* Shifts Table */}
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead 
                className="cursor-pointer hover:bg-gray-200"
                onClick={() => handleSort('user_name')}
              >
                <div className="flex items-center">
                  Employee
                  {sortConfig.key === 'user_name' && (
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  )}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-gray-200"
                onClick={() => handleSort('employee_id')}
              >
                <div className="flex items-center">
                  Employee ID
                  {sortConfig.key === 'employee_id' && (
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  )}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-gray-200"
                onClick={() => handleSort('clocked_in_date_pacific')}
              >
                <div className="flex items-center">
                  Date
                  {sortConfig.key === 'clocked_in_date_pacific' && (
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  )}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-gray-200"
                onClick={() => handleSort('clocked_in_pacific')}
              >
                <div className="flex items-center">
                  Clock In
                  {sortConfig.key === 'clocked_in_pacific' && (
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  )}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-gray-200"
                onClick={() => handleSort('clocked_out_pacific')}
              >
                <div className="flex items-center">
                  Clock Out
                  {sortConfig.key === 'clocked_out_pacific' && (
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  )}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-gray-200 text-right"
                onClick={() => handleSort('regular_hours')}
              >
                <div className="flex items-center justify-end">
                  Regular Hours
                  {sortConfig.key === 'regular_hours' && (
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  )}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-gray-200 text-right"
                onClick={() => handleSort('overtime_hours')}
              >
                <div className="flex items-center justify-end">
                  Overtime
                  {sortConfig.key === 'overtime_hours' && (
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  )}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-gray-200 text-right"
                onClick={() => handleSort('double_ot_hours')}
              >
                <div className="flex items-center justify-end">
                  Double OT
                  {sortConfig.key === 'double_ot_hours' && (
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  )}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-gray-200 text-right"
                onClick={() => handleSort('net_worked_hours')}
              >
                <div className="flex items-center justify-end">
                  Total Hours
                  {sortConfig.key === 'net_worked_hours' && (
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  )}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-gray-200 text-right"
                onClick={() => handleSort('unpaid_break_hours')}
              >
                <div className="flex items-center justify-end">
                  Break Duration
                  {sortConfig.key === 'unpaid_break_hours' && (
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  )}
                </div>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedShifts.length > 0 ? (
              sortedShifts.map((shift, index) => (
                <TableRow key={index} className={
                  (shift.overtime_hours > 0 || shift.double_ot_hours > 0) ? "bg-yellow-50" : ""
                }>
                  <TableCell>{shift.user_name}</TableCell>
                  <TableCell>{shift.employee_id}</TableCell>
                  <TableCell>{shift.clocked_in_date_pacific}</TableCell>
                  <TableCell>{shift.clocked_in_pacific}</TableCell>
                  <TableCell>{shift.clocked_out_pacific}</TableCell>
                  <TableCell className="text-right">{safeToFixed(shift.regular_hours)}</TableCell>
                  <TableCell className="text-right">
                    {shift.overtime_hours > 0 ? (
                      <span className="flex items-center justify-end">
                        {safeToFixed(shift.overtime_hours)}
                        <Badge variant="outline" className="ml-2 bg-yellow-50 text-yellow-700 border-yellow-200">
                          OT
                        </Badge>
                      </span>
                    ) : (
                      "0.00"
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {shift.double_ot_hours > 0 ? (
                      <span className="flex items-center justify-end">
                        {safeToFixed(shift.double_ot_hours)}
                        <Badge variant="outline" className="ml-2 bg-red-50 text-red-700 border-red-200">
                          DBL
                        </Badge>
                      </span>
                    ) : (
                      "0.00"
                    )}
                  </TableCell>
                  <TableCell className="text-right font-medium">{safeToFixed(shift.net_worked_hours)}</TableCell>
                  <TableCell className="text-right font-medium">{safeToFixed(shift.unpaid_break_hours)}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-6 text-muted-foreground">
                  No timesheet data available for this period
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};