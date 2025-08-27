// import { useState, useCallback, useEffect } from 'react';
// import { BreakPenalty } from '../types/breakPenalty';
// import { TimesheetEntry } from '../types/timePunch';
// import { Employee } from '../types/employees';
// import { usePersistedState } from '../hooks/usePersistedState';

// export const useBreakPenalties = (
//   timesheet: TimesheetEntry[],
//   employees: Employee[]
// ) => {
//     const getPendingPenalties = () => {
//         try {
//         const stored = localStorage.getItem("pendingBreakPenalties(pay-period-detail)");
//         return stored ? JSON.parse(stored) : [];
//         } catch (e) {
//         console.error("Error reading pendingBreakPenalties(pay-period-detail):", e);
//         return [];
//         }
//     };
//     const BREAK_BUFFER = 0.05; // 3 minutes buffer
  
//     // Function to calculate required break hours
//     const calculateBreakHoursRequired = (totalHours: number): number => {
//         return Math.floor(totalHours / 5) * 0.5; // 30 min (0.5 hour) for every 5 hours
//     };
    
//     // Function to round up to nearest 0.5
//     const roundUpToNearest05 = (num: number): number => {
//         return Math.ceil(num / 0.5) * 0.5;
//     };

//     // Helper function to convert 12-hour format time (e.g. "9:29AM") to Date object
//     const parseTimeString = (timeStr: string): Date => {
//         // Default date to use as base (doesn't matter which date, just needs to be consistent)
//         const baseDate = new Date('2025-01-01');
        
//         try {
//         // Handle times like "9:29AM" or "6:20PM"
//         const match = timeStr.match(/(\d+):(\d+)([AP]M)/i);
        
//         if (match) {
//             let [_, hours, minutes, period] = match;
//             let hour = parseInt(hours, 10);
            
//             // Convert to 24-hour format
//             if (period.toUpperCase() === 'PM' && hour < 12) {
//             hour += 12;
//             } else if (period.toUpperCase() === 'AM' && hour === 12) {
//             hour = 0;
//             }
            
//             // Set the time components
//             baseDate.setHours(hour);
//             baseDate.setMinutes(parseInt(minutes, 10));
//             baseDate.setSeconds(0);
//             baseDate.setMilliseconds(0);
            
//             return baseDate;
//         } else {
//             // For times already in 24-hour format like "14:30"
//             const [hours, minutes] = timeStr.split(':').map(p => parseInt(p, 10));
//             baseDate.setHours(hours);
//             baseDate.setMinutes(minutes);
//             baseDate.setSeconds(0);
//             baseDate.setMilliseconds(0);
            
//             return baseDate;
//         }
//         } catch (e) {
//         console.error(`Error parsing time string: ${timeStr}`, e);
//         return baseDate; // Return the base date as fallback
//         }
//     };
    
//     const calculatePenalties = useCallback(() => {
//         console.log("calculatePenalties in useBreakPenalties")
//         if (!timesheet || timesheet.length === 0) {
//         return [];
//         }

//         const penalties: BreakPenalty[] = [];
        
//         // First, group timesheet entries by employee and date
//         const entriesByEmployeeAndDate: Record<string, TimesheetEntry[]> = {};
        
//         timesheet.forEach(entry => {
//         if (!entry.gustoId || !entry.date) return;
        
//         const key = `${entry.gustoId}_${entry.date}`;
//         if (!entriesByEmployeeAndDate[key]) {
//             entriesByEmployeeAndDate[key] = [];
//         }
//         entriesByEmployeeAndDate[key].push(entry);
//         });
        
//         // Process each employee-date group
//         Object.entries(entriesByEmployeeAndDate).forEach(([key, entries]) => {
//         const [gustoId, date] = key.split('_');
        
//         // Try to find employee in provided employees array
//         const employee = employees.find(emp => emp.gustoId === gustoId);
        
//         // If we have entries but no employee information, we can still show a penalty
//         // using just the gustoId and employee name from the timesheet
//         const employeeName = employee?.name || entries[0].employeeName || 'Unknown Employee';
        
//         // Sort entries by clock-in time to get earliest and latest
//         entries.sort((a, b) => {
//             const aTime = parseTimeString(a.clockIn);
//             const bTime = parseTimeString(b.clockIn);
//             return aTime.getTime() - bTime.getTime();
//         });
        
//         // Get earliest clock-in and latest clock-out
//         const earliestClockIn = entries[0].clockIn;
        
//         // Sort by clock-out time to find the latest
//         const entriesByClockOut = [...entries].sort((a, b) => {
//             // Parse the time strings to Date objects
//             let aTime = parseTimeString(a.clockOut);
//             let bTime = parseTimeString(b.clockOut);
            
//             // Get clock-in times for comparison
//             const aClockIn = parseTimeString(a.clockIn);
//             const bClockIn = parseTimeString(b.clockIn);
            
//             // If clock-out is earlier than clock-in, assume it's the next day
//             if (aTime < aClockIn) {
//             aTime = new Date(aTime.getTime() + 24 * 60 * 60 * 1000); // Add 24 hours
//             }
//             if (bTime < bClockIn) {
//             bTime = new Date(bTime.getTime() + 24 * 60 * 60 * 1000); // Add 24 hours
//             }
            
//             return bTime.getTime() - aTime.getTime(); // Descending order
//         });
        
//         const latestClockOut = entriesByClockOut[0].clockOut;
        
//         // Sum up the total hours worked
//         const totalHoursWorked = entries.reduce((sum, entry) => sum + entry.totalHours, 0);
        
//         // Sum up break duration (converting from minutes to hours if needed)
//         const totalBreakTaken = entries.reduce((sum, entry) => {
//             // Check if breakDuration is in minutes (common in timesheet data)
//             if (entry.breakDuration > 0 && entry.breakDuration < 10) {
//             // If it's a small number, assume it's already in hours
//             return sum + entry.breakDuration;
//             } else {
//             // Otherwise assume it's in minutes and convert to hours
//             return sum + (entry.breakDuration / 60);
//             }
//         }, 0);
        
//         // Calculate total span of time from earliest clock-in to latest clock-out
//         const clockInTime = parseTimeString(earliestClockIn);
//         const clockOutTime = parseTimeString(latestClockOut);
        
//         // If clock-out is earlier than clock-in, assume it's the next day
//         let totalSpan;
//         if (clockOutTime < clockInTime) {
//             const nextDayClockOut = new Date(clockOutTime.getTime() + 24 * 60 * 60 * 1000);
//             totalSpan = (nextDayClockOut.getTime() - clockInTime.getTime()) / (1000 * 60 * 60); // Convert ms to hours
//         } else {
//             totalSpan = (clockOutTime.getTime() - clockInTime.getTime()) / (1000 * 60 * 60); // Convert ms to hours
//         }
        
//         // Alternative calculation of break: totalSpan - totalHoursWorked
//         // This accounts for gaps between shifts as well as recorded breaks
//         const totalBreakByDifference = totalSpan - totalHoursWorked;
        
//         // Use the larger of the two break calculations
//         const breakTaken = Math.max(totalBreakTaken, totalBreakByDifference);
        
//         // Calculate required break
//         const breakRequired = calculateBreakHoursRequired(totalHoursWorked);
        
//         // Calculate penalty if break taken is less than required (with buffer)
//         if (breakRequired > (breakTaken + BREAK_BUFFER)) {
//             const penaltyHours = roundUpToNearest05(breakRequired - breakTaken) * 2; // Double penalty
            
//             // Use gustoId_date as the consistent key format for penalties
//             const pendingBreakPenalties = getPendingPenalties();
//             // Check if this penalty is already in pendingBreakPenalties
//             const existingPenalty = pendingBreakPenalties.find(
//                 p => p.gustoId === gustoId && p.date === date
//             );
//             // Use the isApplied status from pendingBreakPenalties if available
//             const isApplied = existingPenalty ? existingPenalty.isApplied : false;
//             const penaltyKey = `${gustoId}_${date}`;
            
//             penalties.push({
//             employeeId: employee?.id || '', // May be empty if employee not matched yet
//             employeeName,
//             gustoId, // This is the primary identifier now
//             date,
//             clockIn: earliestClockIn,
//             clockOut: latestClockOut,
//             totalHours: totalHoursWorked,
//             breakRequired,
//             breakTaken,
//             penaltyHours,
//             isApplied
//             });
//         }
//         });
        
//         return penalties;
//     }, [timesheet, employees]);
    
//     // Function to apply a penalty
//     const applyPenalty = useCallback((employeeId: string, date: string, penaltyHours: number, gustoId: string) => {
//         // Find the employee's gustoId if we have an employeeId but no gustoId
//         console.log("applyPenalty in useBreakPenalties", employeeId, date, penaltyHours, gustoId)
//         let actualGustoId = gustoId;
        
//         if (!actualGustoId && employeeId) {
//         const employee = employees.find(emp => emp.id === employeeId);
//         if (employee) {
//             actualGustoId = employee.gustoId;
//         }
//         }
        
//         if (!actualGustoId) {
//         console.error("Cannot apply penalty: No Gusto ID found for employee", employeeId);
//         return { id: employeeId, breakHourPay: 0 };
//         }
        
//         // Use gustoId_date as the key format
//         const penaltyKey = `${actualGustoId}_${date}`;

//         const pendingBreakPenalties = getPendingPenalties();
        
//         const totalBreakHours = pendingBreakPenalties
//         .filter(p => p.gustoId === actualGustoId && p.isApplied)
//         .reduce((sum, p) => sum + p.penaltyHours, 0);
    
//         // Add the current penalty
//         const newTotalBreakHours = totalBreakHours + penaltyHours;
        
//         return {
//             id: employeeId,
//             breakHourPay: newTotalBreakHours
//         };
//         }, [employees]);

//     // Function to unapply a penalty
//     const unapplyPenalty = useCallback((employeeId: string, date: string, penaltyHours: number, gustoId: string) => {
//         // Find the employee's gustoId if we have an employeeId but no gustoId
//         console.log("unapplyPenalty in useBreakPenalties", employeeId, date, penaltyHours, gustoId)
//         let actualGustoId = gustoId;
        
//         if (!actualGustoId && employeeId) {
//         const employee = employees.find(emp => emp.id === employeeId);
//         if (employee) {
//             actualGustoId = employee.gustoId;
//         }
//         }
        
//         if (!actualGustoId) {
//         console.error("Cannot unapply penalty: No Gusto ID found for employee", employeeId);
//         return { id: employeeId, breakHourPay: 0 };
//         }
        
//         // Get all pending penalties
//         const pendingBreakPenalties = getPendingPenalties();
        
//         // Calculate the total of all OTHER penalties (excluding the one being unapplied)
//         const totalRemainingBreakHours = pendingBreakPenalties
//         .filter(p => p.gustoId === actualGustoId && p.isApplied && 
//                 !(p.date === date && p.penaltyHours === penaltyHours)) // Exclude this specific penalty
//         .reduce((sum, p) => sum + p.penaltyHours, 0);
        
//         console.log(`After unapplying penalty, remaining total is ${totalRemainingBreakHours} hours`);
        
//         return {
//         id: employeeId,
//         breakHourPay: totalRemainingBreakHours // Return the total of all remaining penalties
//         };
//     }, [employees]);

//     const resetAllPenalties = useCallback(() => {
//         localStorage.removeItem("pendingBreakPenalties");
//         return true;
//     }, []);
    
//     return {
//         calculatePenalties,
//         applyPenalty,
//         unapplyPenalty,
//         resetAllPenalties
//     };
//     };