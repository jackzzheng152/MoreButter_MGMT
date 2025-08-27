// Updated useSickLeaveQuery with improved persistence and caching

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { usePersistedState } from '../hooks/usePersistedState'; // Import your persisted state hook

// Types for sick leave data (keep all your existing type definitions)
export interface SickLeaveHourEntry {
  date: string;
  hours: number;
}

export interface SickLeaveEntry {
  id: number;
  user_id: number;
  user_name: string;
  gusto_id: string | null;
  from_date: string;
  to_date: string;
  category: string;
  status: number;
  amount_of_hours: number;
  hours: SickLeaveHourEntry[];
}

export interface StoredSickLeaveEntry {
  id: number;
  userId: number;
  employeeId: string;
  employeeName: string;
  gustoId: string;
  date: string;
  hours: number;
  category: string;
  status: number;
  isApplied: boolean; // Track if it's been applied to payroll
}

export interface Employee {
  id: string;
  name: string;
  gustoId: string;
  jobTitle: string;
  [key: string]: any;
}

// Helper function to check if a date falls within a date range
const isDateInRange = (date: string, startDate: string, endDate: string): boolean => {
  const checkDate = new Date(date);
  const rangeStart = new Date(startDate);
  const rangeEnd = new Date(endDate);
  
  return checkDate >= rangeStart && checkDate <= rangeEnd;
};

// Generate a stable, deterministic cache key for this pay period
const generateCacheKey = (companyId: number, locationId: number, start: string, end: string) => {
  return `sickLeave-${companyId}-${locationId}-${start}-${end}`;
};

// Main hook for fetching and managing sick leave data
export function useSickLeaveQuery(
  companyId: number, 
  locationId: number, 
  payPeriodStart: string, 
  payPeriodEnd: string,
  employees: Employee[]
) {
  const queryClient = useQueryClient();
  const cacheKey = generateCacheKey(companyId, locationId, payPeriodStart, payPeriodEnd);

  // Use persisted state to store sick leave entries
  const [storedSickLeaveEntries, setStoredSickLeaveEntries] = usePersistedState<StoredSickLeaveEntry[]>(
    `storedSickLeaveEntries-${cacheKey}`,
    []
  );



  // Function to fetch time off data from our backend API
  const fetchSickLeave = async (): Promise<SickLeaveEntry[]> => {
    try {
      console.log(`Fetching sick leave for company: ${companyId}, location: ${locationId}`);
      console.log(`Pay period: ${payPeriodStart} to ${payPeriodEnd}`);
      
      const response = await api.post('/time-off/', {
        company_id: companyId,
        location_id: locationId,
        category: 'paid_sick',
        to_date_gte: payPeriodStart,
        sort_by: 'from_date',
        sort_dir: 'asc'
      });
      
      console.log(`Received ${response.data.length} sick leave entries from API`);
      return response.data;
    } catch (error) {
      console.error('Error fetching sick leave data:', error);
      throw error;
    }
  };

  // Helper function to convert status codes to human-readable labels
  const getStatusLabel = (status: number): string => {
    switch (status) {
      case 0: return 'Pending';
      case 1: return 'Approved';
      case 2: return 'Denied';
      case 3: return 'Canceled';
      default: return 'Unknown';
    }
  };
  
  // Calculate total sick leave hours by employee
  const calculateTotalHoursByEmployee = (sickLeaveData: StoredSickLeaveEntry[]): Record<string, number> => {
    const totalHours: Record<string, number> = {};
    
    // Only count entries that are both approved (status=1) and have been applied
    sickLeaveData.forEach(entry => {
      if (entry.status === 1 && entry.isApplied) {
        if (!totalHours[entry.gustoId]) {
          totalHours[entry.gustoId] = 0;
        }
        totalHours[entry.gustoId] += entry.hours;
      }
    });
    
    return totalHours;
  };

  // Check if we have cached data in the query cache
  const cachedData = queryClient.getQueryData<SickLeaveEntry[]>(['sickLeave', cacheKey]);

  const processSickLeaveData = (
    data: SickLeaveEntry[],
    employees: Employee[],
    payPeriodStart: string,
    payPeriodEnd: string,
    storedEntries: StoredSickLeaveEntry[]
  ): StoredSickLeaveEntry[] => {
    const processedEntries: StoredSickLeaveEntry[] = [];
    
    data.forEach(entry => {
      const employee = employees.find(emp => emp.gustoId === entry.gusto_id);
      if (!employee && entry.gusto_id) {
        console.log(`No matching employee found for gusto_id: ${entry.gusto_id}`);
      }
      
      entry.hours.forEach(dayEntry => {
        if (isDateInRange(dayEntry.date, payPeriodStart, payPeriodEnd)) {
          const existingEntry = storedEntries.find(
            stored => stored.id === entry.id && stored.date === dayEntry.date
          );
          
          processedEntries.push({
            id: entry.id,
            userId: entry.user_id,
            employeeId: employee?.id || '',
            employeeName: employee?.name || entry.user_name,
            gustoId: entry.gusto_id || '',
            date: dayEntry.date,
            hours: dayEntry.hours,
            category: entry.category,
            status: entry.status,
            isApplied: existingEntry?.isApplied || false
          });
        }
      });
    });
    
    return processedEntries;
  };

  // Main query for fetching sick leave data with improved caching
  const sickLeaveQuery = useQuery({
    queryKey: ['sickLeave', cacheKey],
    queryFn: async () => {
      const data = await fetchSickLeave();
      if (!data || data.length === 0) return data;
      
      // Move your processing logic here
      const processedEntries = processSickLeaveData(data, employees, payPeriodStart, payPeriodEnd, storedSickLeaveEntries);
      setStoredSickLeaveEntries(processedEntries);
      return data;
    },
    enabled: !!(companyId && locationId && payPeriodStart && payPeriodEnd) && !cachedData,
    staleTime: 1000 * 60 * 60,
    gcTime: 1000 * 60 * 60 * 24,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false
  });
  
  // Total hours by employee
  const totalHoursByEmployee = calculateTotalHoursByEmployee(storedSickLeaveEntries);
  
  // Mutation for updating sick leave status with optimistic updates
  const updateSickLeaveMutation = useMutation({
    mutationFn: async (params: { timeOffId: number, status: number, message?: string }) => {
      const { timeOffId, status, message = '' } = params;
      
      console.log(`Updating sick leave ${timeOffId} status to ${status}`);
      
      const response = await api.patch(
        `/time-off/${timeOffId}`,
        { status, status_action_message: message }
      );
      
      return response.data;
    },
    // Optimistic update - update the UI immediately, then confirm with server
    onMutate: async ({ timeOffId, status }) => {
      await queryClient.cancelQueries({ queryKey: ['sickLeave', cacheKey] });
      const previousData = queryClient.getQueryData<SickLeaveEntry[]>(['sickLeave', cacheKey]) || [];
      
      if (previousData) {
        queryClient.setQueryData(['sickLeave', cacheKey], 
          previousData.map(entry => 
            entry.id === timeOffId ? { ...entry, status } : entry
          )
        );
        
        const updatedEntries = [...storedSickLeaveEntries];
        updatedEntries.forEach(entry => {
          if (entry.id === timeOffId) {
            entry.status = status;
          }
        });
        setStoredSickLeaveEntries(updatedEntries);
      }
      
      return { previousData };
    },
    onError: (err, variables, context: { previousData: SickLeaveEntry[] } | undefined) => {
      console.log("=== updateSickLeaveMutation onError called with variables:", variables);
      // If the mutation fails, revert to the previous value
      if (context?.previousData) {
        queryClient.setQueryData(['sickLeave', cacheKey], context.previousData);
      }
      console.error("Error updating sick leave status:", err);
    },
    onSuccess: () => {
      // No need to immediately invalidate, we've already updated the cache
      // Only refresh after some time to ensure data consistency
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['sickLeave', cacheKey] });
      }, 5000);
    }
  });

  // Function to apply a sick leave entry to payroll
  const applySickLeave = (entryId: number, date: string) => {
    console.log(`Applying sick leave entry ${entryId} for date ${date}`);
    
    // Get the current stored entries
    const updatedEntries = [...storedSickLeaveEntries];
    
    // Find the entry to update
    const entryIndex = updatedEntries.findIndex(
      entry => entry.id === entryId && entry.date === date
    );
    
    if (entryIndex >= 0) {
      // Update the entry
      updatedEntries[entryIndex] = {
        ...updatedEntries[entryIndex],
        isApplied: true
      };
      
      console.log(`Found and marked entry at index ${entryIndex} as applied`);
      
      // Save to storage
      setStoredSickLeaveEntries(updatedEntries);
      
      // Debug log
      console.log(`Updated storage with ${updatedEntries.length} entries`);
    } else {
      console.warn(`Could not find entry ${entryId} for date ${date} to apply`);
    }
  };
  
  // Function to unapply a sick leave entry
  const unapplySickLeave = (entryId: number, date: string) => {
    console.log(`Unapplying sick leave entry ${entryId} for date ${date}`);
    
    // Get the current stored entries
    const updatedEntries = [...storedSickLeaveEntries];
    
    // Find the entry to update
    const entryIndex = updatedEntries.findIndex(
      entry => entry.id === entryId && entry.date === date
    );
    
    if (entryIndex >= 0) {
      // Update the entry
      updatedEntries[entryIndex] = {
        ...updatedEntries[entryIndex],
        isApplied: false
      };
      
      console.log(`Found and marked entry at index ${entryIndex} as not applied`);
      
      // Save to storage
      setStoredSickLeaveEntries(updatedEntries);
      
      // Debug log
      console.log(`Updated storage with ${updatedEntries.length} entries`);
    } else {
      console.warn(`Could not find entry ${entryId} for date ${date} to unapply`);
    }
  };
  
  // Function to apply all sick leave entries for an employee
  const applyAllForEmployee = (gustoId: string) => {
    console.log(`Applying all sick leave entries for employee with Gusto ID ${gustoId}`);
    
    // Get the current stored entries
    const updatedEntries = storedSickLeaveEntries.map(entry => {
      if (entry.gustoId === gustoId && entry.status === 1) {
        return {
          ...entry,
          isApplied: true
        };
      }
      return entry;
    });
    
    // Save to storage
    setStoredSickLeaveEntries(updatedEntries);
    
    // Debug log
    const countApplied = updatedEntries.filter(
      e => e.gustoId === gustoId && e.isApplied
    ).length;
    
    console.log(`Applied ${countApplied} entries for employee ${gustoId}`);
  };
  
  // Function to manually refresh data when needed
  const refreshSickLeaveData = () => {
    console.log("Manually refreshing sick leave data...");
    queryClient.invalidateQueries({ queryKey: ['sickLeave', cacheKey] });
  };
  
  // Debug function to log current state
  const debugState = () => {
    console.log("=== SICK LEAVE DEBUG STATE ===");
    console.log("Query key:", cacheKey);
    console.log("Query data:", sickLeaveQuery.data?.length || 0, "entries");
    console.log("Stored entries:", storedSickLeaveEntries.length);
    console.log("Query status:", sickLeaveQuery.status);
    console.log("Is data fetched:", sickLeaveQuery.isFetched);
    console.log("Is data stale:", sickLeaveQuery.isStale);
    
    try {
      const storageValue = localStorage.getItem(`storedSickLeaveEntries-${cacheKey}`);
      console.log("localStorage sick leave entries:", 
        storageValue ? JSON.parse(storageValue).length : 0);
      if (storageValue) {
        const parsed = JSON.parse(storageValue);
        console.log("First few entries:", parsed.slice(0, 3));
      }
    } catch (e) {
      console.error("Error debugging localStorage:", e);
    }
    
    console.log("Total hours by employee:", totalHoursByEmployee);
  };

  return {
    // Data
    sickLeaveEntries: storedSickLeaveEntries,
    totalHoursByEmployee,
    isLoading: sickLeaveQuery.isLoading,
    isError: sickLeaveQuery.isError,
    error: sickLeaveQuery.error,
    
    // Actions for applying/unapplying entries
    applySickLeave,
    unapplySickLeave,
    applyAllForEmployee,
    refreshSickLeaveData,
    
    // Mutations
    updateSickLeaveStatus: updateSickLeaveMutation.mutate,
    isUpdating: updateSickLeaveMutation.isPending,
    
    // Debug helpers
    debugState,
    
    // Helper methods
    getStatusLabel
  };
}