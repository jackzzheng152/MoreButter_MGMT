// 1. First, let's create a custom hook for break penalties using React Query

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { TimesheetEntry } from '../types/timePunch';
import { Employee } from '../types/employees';

// Type for storing pending penalties
export interface PendingPenalty {
  gustoId: string;
  date: string;
  penaltyHours: number;
  employeeName: string;
  isApplied: boolean;
}

// Constants
const BREAK_BUFFER = 0.05; // 3 minutes buffer
const BREAK_PENALTIES_STORAGE_KEY = "pendingBreakPenalties(pay-period-detail)";

// Helper functions
const calculateBreakHoursRequired = (totalHours: number): number => {
  return Math.floor(totalHours / 5) * 0.5; // 30 min (0.5 hour) for every 5 hours
};

const roundUpToNearest05 = (num: number): number => {
  return Math.ceil(num / 0.5) * 0.5;
};

// Parse time strings to Date objects
const parseTimeString = (timeStr: string): Date => {
  const baseDate = new Date('2025-01-01');
  
  try {
    const match = timeStr.match(/(\d+):(\d+)([AP]M)/i);
    
    if (match) {
      let [_, hours, minutes, period] = match;
      let hour = parseInt(hours, 10);
      
      if (period.toUpperCase() === 'PM' && hour < 12) {
        hour += 12;
      } else if (period.toUpperCase() === 'AM' && hour === 12) {
        hour = 0;
      }
      
      baseDate.setHours(hour);
      baseDate.setMinutes(parseInt(minutes, 10));
      baseDate.setSeconds(0);
      baseDate.setMilliseconds(0);
      
      return baseDate;
    } else {
      const [hours, minutes] = timeStr.split(':').map(p => parseInt(p, 10));
      baseDate.setHours(hours);
      baseDate.setMinutes(minutes);
      baseDate.setSeconds(0);
      baseDate.setMilliseconds(0);
      
      return baseDate;
    }
  } catch (e) {
    console.error(`Error parsing time string: ${timeStr}`, e);
    return baseDate;
  }
};

// Storage functions
const getStoredPenalties = (): PendingPenalty[] => {
  try {
    const stored = localStorage.getItem(BREAK_PENALTIES_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.error(`Error reading from localStorage: ${e}`);
    return [];
  }
};

const storeBreakPenalties = (penalties: PendingPenalty[]): void => {
  try {
    localStorage.setItem(BREAK_PENALTIES_STORAGE_KEY, JSON.stringify(penalties));
  } catch (e) {
    console.error(`Error writing to localStorage: ${e}`);
  }
};

// Main hook for managing break penalties
export function useBreakPenaltiesQuery(timesheet: TimesheetEntry[], employees: Employee[]) {
  const queryClient = useQueryClient();
  
  // Calculate penalties from timesheet data
  const calculatePenalties = () => {
    if (!timesheet || timesheet.length === 0) return [];

    const penalties: any[] = [];
    const entriesByEmployeeAndDate: Record<string, TimesheetEntry[]> = {};
    
    // Group timesheet entries by employee and date
    timesheet.forEach(entry => {
      if (!entry.gustoId || !entry.date) return;
      
      const key = `${entry.gustoId}_${entry.date}`;
      if (!entriesByEmployeeAndDate[key]) {
        entriesByEmployeeAndDate[key] = [];
      }
      entriesByEmployeeAndDate[key].push(entry);
    });
    
    // Process each employee-date group
    Object.entries(entriesByEmployeeAndDate).forEach(([key, entries]) => {
      const [gustoId, date] = key.split('_');
      
      // Find employee in provided employees array
      const employee = employees.find(emp => emp.gustoId === gustoId);
      const employeeName = employee?.name || entries[0].employeeName || 'Unknown Employee';
      
      // Sort entries by clock-in time
      entries.sort((a, b) => {
        const aTime = parseTimeString(a.clockIn);
        const bTime = parseTimeString(b.clockIn);
        return aTime.getTime() - bTime.getTime();
      });
      
      // Get earliest clock-in
      const earliestClockIn = entries[0].clockIn;
      
      // Sort by clock-out time to find the latest
      const entriesByClockOut = [...entries].sort((a, b) => {
        let aTime = parseTimeString(a.clockOut);
        let bTime = parseTimeString(b.clockOut);
        
        const aClockIn = parseTimeString(a.clockIn);
        const bClockIn = parseTimeString(b.clockIn);
        
        if (aTime < aClockIn) {
          aTime = new Date(aTime.getTime() + 24 * 60 * 60 * 1000);
        }
        if (bTime < bClockIn) {
          bTime = new Date(bTime.getTime() + 24 * 60 * 60 * 1000);
        }
        
        return bTime.getTime() - aTime.getTime();
      });
      
      const latestClockOut = entriesByClockOut[0].clockOut;
      
      // Calculate total hours worked
      const totalHoursWorked = entries.reduce((sum, entry) => sum + entry.totalHours, 0);
      
      // Calculate total break taken
      const totalBreakTaken = entries.reduce((sum, entry) => {
        if (entry.breakDuration > 0 && entry.breakDuration < 10) {
          return sum + entry.breakDuration;
        } else {
          return sum + (entry.breakDuration / 60);
        }
      }, 0);
      
      // Calculate time span
      const clockInTime = parseTimeString(earliestClockIn);
      const clockOutTime = parseTimeString(latestClockOut);
      
      let totalSpan;
      if (clockOutTime < clockInTime) {
        const nextDayClockOut = new Date(clockOutTime.getTime() + 24 * 60 * 60 * 1000);
        totalSpan = (nextDayClockOut.getTime() - clockInTime.getTime()) / (1000 * 60 * 60);
      } else {
        totalSpan = (clockOutTime.getTime() - clockInTime.getTime()) / (1000 * 60 * 60);
      }
      
      // Calculate break by difference between span and worked hours
      const totalBreakByDifference = totalSpan - totalHoursWorked;
      
      // Use the larger of the two break calculations
      const breakTaken = Math.max(totalBreakTaken, totalBreakByDifference);
      
      // Calculate required break and penalty
      const breakRequired = calculateBreakHoursRequired(totalHoursWorked);
      
      if (breakRequired > (breakTaken + BREAK_BUFFER)) {
        const penaltyHours = roundUpToNearest05(breakRequired - breakTaken) * 2;
        
        // Get stored penalties to check if this one is already applied
        const storedPenalties = getStoredPenalties();
        const existingPenalty = storedPenalties.find(
          p => p.gustoId === gustoId && p.date === date
        );
        
        penalties.push({
          employeeId: employee?.id || '',
          employeeName,
          gustoId,
          date,
          clockIn: earliestClockIn,
          clockOut: latestClockOut,
          totalHours: totalHoursWorked,
          breakRequired,
          breakTaken,
          penaltyHours,
          isApplied: existingPenalty ? existingPenalty.isApplied : false
        });
      }
    });
    
    return penalties;
  };
  
  // React Query hook to fetch calculated penalties
  const penaltiesQuery = useQuery({
    queryKey: ['breakPenalties', timesheet, employees],
    queryFn: calculatePenalties,
    // Ensure we don't refetch too often - only when dependencies change
    staleTime: Infinity,
  });
  
  // React Query hook to fetch stored penalties
  const storedPenaltiesQuery = useQuery({
    queryKey: ['storedBreakPenalties'],
    queryFn: getStoredPenalties,
    // Refresh this periodically to catch external changes to localStorage
    staleTime: 60000, // 1 minute
  });
  
  // Mutation to apply a penalty
  const applyPenaltyMutation = useMutation({
    mutationFn: (penalty: any) => {
      console.log("=== applyPenalty mutation called with penalty:", penalty);
      
      const updatedPenalties = [...getStoredPenalties()];

      
      // Find if this penalty already exists
      const existingIndex = updatedPenalties.findIndex(p => 
        p.gustoId === penalty.gustoId && p.date === penalty.date
      );
      
      // Either update or add the penalty
      if (existingIndex >= 0) {
        updatedPenalties[existingIndex] = {
          ...updatedPenalties[existingIndex],
          isApplied: true
        };
      } else {
        updatedPenalties.push({
          gustoId: penalty.gustoId,
          date: penalty.date,
          penaltyHours: penalty.penaltyHours,
          employeeName: penalty.employeeName,
          isApplied: true
        });
      }
      
      // Store the updated penalties
      storeBreakPenalties(updatedPenalties);
      
      // Calculate total penalty hours for this employee
      const totalPenaltyHours = updatedPenalties
        .filter(p => p.gustoId === penalty.gustoId && p.isApplied)
        .reduce((sum, p) => sum + p.penaltyHours, 0);
      
      return Promise.resolve({
        penalties: updatedPenalties,
        employeeUpdate: {
          gustoId: penalty.gustoId,
          totalPenaltyHours
        }
      });
    },
    onSuccess: (result) => {
      // Invalidate and refetch penalties queries to update UI
      console.log("=== applyPenalty mutation success called with result:", result);
      queryClient.invalidateQueries({ queryKey: ['storedBreakPenalties'] });
      queryClient.invalidateQueries({ queryKey: ['breakPenalties'] });
    }
  });
  
  // Mutation to unapply a penalty
  const unapplyPenaltyMutation = useMutation({
    mutationFn: (penalty: any) => {
      console.log("=== unapplyPenalty mutation called with penalty:", penalty);
      
      const updatedPenalties = [...getStoredPenalties()];
      
      // Find the penalty in stored penalties
      const existingIndex = updatedPenalties.findIndex(p => 
        p.gustoId === penalty.gustoId && p.date === penalty.date
      );
      
      // Update or add the penalty as unapplied
      if (existingIndex >= 0) {
        updatedPenalties[existingIndex] = {
          ...updatedPenalties[existingIndex],
          isApplied: false
        };
      } else {
        updatedPenalties.push({
          gustoId: penalty.gustoId,
          date: penalty.date,
          penaltyHours: penalty.penaltyHours,
          employeeName: penalty.employeeName,
          isApplied: false
        });
      }
      
      // Store the updated penalties
      storeBreakPenalties(updatedPenalties);
      
      // Calculate remaining penalty hours for this employee
      const totalPenaltyHours = updatedPenalties
        .filter(p => p.gustoId === penalty.gustoId && p.isApplied)
        .reduce((sum, p) => sum + p.penaltyHours, 0);
      
      return Promise.resolve({
        penalties: updatedPenalties,
        employeeUpdate: {
          gustoId: penalty.gustoId,
          totalPenaltyHours
        }
      });
    },
    onSuccess: (result) => {
      // Invalidate and refetch penalties queries to update UI
      console.log("=== unapplyPenalty mutation success called with result:", result);
      queryClient.invalidateQueries({ queryKey: ['storedBreakPenalties'] });
      queryClient.invalidateQueries({ queryKey: ['breakPenalties'] });
    }
  });
  
  // Mutation to reset all penalties
  const resetAllPenaltiesMutation = useMutation({
    mutationFn: () => {
      localStorage.removeItem(BREAK_PENALTIES_STORAGE_KEY);
      return Promise.resolve(true);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['storedBreakPenalties'] });
      queryClient.invalidateQueries({ queryKey: ['breakPenalties'] });
    }
  });

  return {
    // Queries
    penalties: penaltiesQuery.data || [],
    storedPenalties: storedPenaltiesQuery.data || [],
    isLoading: penaltiesQuery.isLoading || storedPenaltiesQuery.isLoading,
    
    // Mutations
    applyPenalty: applyPenaltyMutation.mutate,
    unapplyPenalty: unapplyPenaltyMutation.mutate,
    resetAllPenalties: resetAllPenaltiesMutation.mutate,
    
    // Mutation states
    isApplying: applyPenaltyMutation.isPending,
    isUnapplying: unapplyPenaltyMutation.isPending,
    isResetting: resetAllPenaltiesMutation.isPending
  };
}