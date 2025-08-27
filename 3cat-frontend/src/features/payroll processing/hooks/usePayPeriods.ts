// hooks/usePayPeriods.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { usePersistedState } from '../hooks/usePersistedState';
import type { PayPeriod } from '../types/payroll-types';

// // Types for API responses
// interface PayPeriodApiResponse {
//   success: boolean;
//   data: PayPeriod | PayPeriod[];
//   total?: number;
//   message?: string;
// }

// interface PayPeriodErrorResponse {
//   success: false;
//   detail: string;
//   message?: string;
// }

// Helper function to generate a stable cache key
const generateCacheKey = (location?: string, status?: string) => {
  const parts = ['payPeriods'];
  if (location) parts.push(`location-${location}`);
  if (status) parts.push(`status-${status}`);
  return parts.join('-');
};

// API client functions with proper error handling
export const payPeriodApi = {
  // Get all pay periods (with optional filters)
  getPayPeriods: async (location?: string, status?: string): Promise<PayPeriod[]> => {
    try {
      const params = new URLSearchParams();
      if (location) params.append('location', location);
      if (status) params.append('status', status);
      
      console.log(`Fetching pay periods${location ? ` for location: ${location}` : ''}${status ? ` with status: ${status}` : ''}`);
      
      const url = params.toString() ? `/pay-periods?${params}` : '/pay-periods';
      const response = await api.get(url);
      
      console.log(`Received ${response.data.data?.length || 0} pay periods from API`);
      return response.data.data || [];
    } catch (error) {
      console.error('Error fetching pay periods:', error);
      throw new Error('Failed to fetch pay periods');
    }
  },

  // Get single pay period
  getPayPeriod: async (id: string): Promise<PayPeriod> => {
    try {
      console.log(`Fetching pay period: ${id}`);
      const response = await api.get(`/pay-periods/${id}`);
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to fetch pay period');
      }
      
      return response.data.data;
    } catch (error) {
      console.error('Error fetching pay period:', error);
      throw new Error('Failed to fetch pay period');
    }
  },

  // Create new pay period
  createPayPeriod: async (payPeriod: PayPeriod): Promise<PayPeriod> => {
    try {
      console.log('Creating pay period:', payPeriod);
      const response = await api.post('/pay-periods', payPeriod);
      
      if (!response.data.success) {
        throw new Error(response.data.detail || 'Failed to create pay period');
      }
      
      console.log('Pay period created successfully:', response.data.data);
      return response.data.data;
    } catch (error: any) {
      console.error('Error creating pay period:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to create pay period';
      throw new Error(errorMessage);
    }
  },

  // Update pay period
  updatePayPeriod: async (id: string, updates: Partial<PayPeriod>): Promise<PayPeriod> => {
    try {
      console.log(`Updating pay period ${id}:`, updates);
      const response = await api.put(`/pay-periods/${id}`, updates);
      
      if (!response.data.success) {
        throw new Error(response.data.detail || 'Failed to update pay period');
      }
      
      console.log('Pay period updated successfully:', response.data.data);
      return response.data.data;
    } catch (error: any) {
      console.error('Error updating pay period:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to update pay period';
      throw new Error(errorMessage);
    }
  },

  // Delete pay period
  deletePayPeriod: async (id: string): Promise<void> => {
    try {
      console.log(`Deleting pay period: ${id}`);
      const response = await api.delete(`/pay-periods/${id}`);
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to delete pay period');
      }
      
      console.log('Pay period deleted successfully');
    } catch (error: any) {
      console.error('Error deleting pay period:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to delete pay period';
      throw new Error(errorMessage);
    }
  },
};

// Main hook for managing pay periods with improved caching and persistence
export function usePayPeriods(location?: string, status?: string) {
  const queryClient = useQueryClient();
  const cacheKey = generateCacheKey(location, status);
  
  // Use persisted state to store pay periods locally
  const [storedPayPeriods, setStoredPayPeriods] = usePersistedState<PayPeriod[]>(
    `storedPayPeriods-${cacheKey}`,
    []
  );

  // Check if we have cached data in the query cache
  const cachedData = queryClient.getQueryData<PayPeriod[]>(['payPeriods', cacheKey]);

  // Main query for fetching pay periods with improved caching
  const payPeriodsQuery = useQuery({
    queryKey: ['payPeriods', cacheKey],
    queryFn: async () => {
      const data = await payPeriodApi.getPayPeriods(location, status);
      
      // Update persisted state when fresh data is fetched
      if (data && data.length >= 0) {
        setStoredPayPeriods(data);
      }
      
      return data;
    },
    enabled: !cachedData, // Don't fetch if we already have cached data
    staleTime: 1000 * 60 * 10, // Consider data fresh for 10 minutes
    gcTime: 1000 * 60 * 60, // Keep in cache for 1 hour
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: true, // Refetch when reconnecting to internet
  });

  // Create pay period mutation with optimistic updates
  const createPayPeriodMutation = useMutation({
    mutationFn: payPeriodApi.createPayPeriod,
    onMutate: async (newPayPeriod: PayPeriod) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['payPeriods', cacheKey] });
      
      // Snapshot the previous value
      const previousPayPeriods = queryClient.getQueryData<PayPeriod[]>(['payPeriods', cacheKey]) || storedPayPeriods;
      
      // Optimistically update the cache
      const optimisticPayPeriods = [newPayPeriod, ...previousPayPeriods];
      queryClient.setQueryData(['payPeriods', cacheKey], optimisticPayPeriods);
      setStoredPayPeriods(optimisticPayPeriods);
      
      return { previousPayPeriods };
    },
    onError: (err, newPayPeriod, context) => {
      console.error("Error creating pay period:", err);
      console.log("this is the newPayPeriod", newPayPeriod)
      // If the mutation fails, revert to the previous value
      if (context?.previousPayPeriods) {
        queryClient.setQueryData(['payPeriods', cacheKey], context.previousPayPeriods);
        setStoredPayPeriods(context.previousPayPeriods);
      }
    },
    onSuccess: (data, variables) => {
      console.log("Pay period created successfully:", data);
      console.log("this is the variables", variables)
      // Update the cache with the actual server response
      const currentData = queryClient.getQueryData<PayPeriod[]>(['payPeriods', cacheKey]) || [];
      const updatedData = currentData.map(pp => pp.id === variables.id ? data : pp);
      
      // If it's not found, add it (shouldn't happen with optimistic updates, but safety first)
      if (!updatedData.find(pp => pp.id === data.id)) {
        updatedData.unshift(data);
      }
      
      queryClient.setQueryData(['payPeriods', cacheKey], updatedData);
      setStoredPayPeriods(updatedData);
    },
  });

  // Update pay period mutation with optimistic updates
  const updatePayPeriodMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<PayPeriod> }) =>
      payPeriodApi.updatePayPeriod(id, updates),
    onMutate: async ({ id, updates }) => {
      await queryClient.cancelQueries({ queryKey: ['payPeriods', cacheKey] });
      
      const previousPayPeriods = queryClient.getQueryData<PayPeriod[]>(['payPeriods', cacheKey]) || storedPayPeriods;
      
      // Optimistically update the pay period
      const optimisticPayPeriods = previousPayPeriods.map(pp =>
        pp.id === id ? { ...pp, ...updates } : pp
      );
      
      queryClient.setQueryData(['payPeriods', cacheKey], optimisticPayPeriods);
      setStoredPayPeriods(optimisticPayPeriods);
      
      return { previousPayPeriods };
    },
    onError: (err, variables, context) => {
      console.error("Error updating pay period:", err);
      if (context?.previousPayPeriods) {
        queryClient.setQueryData(['payPeriods', cacheKey], context.previousPayPeriods);
        setStoredPayPeriods(context.previousPayPeriods);
      }
      variables = variables
    },
    onSuccess: (data) => {
      console.log("Pay period updated successfully:", data);
      // Update the cache with the actual server response
      const currentData = queryClient.getQueryData<PayPeriod[]>(['payPeriods', cacheKey]) || [];
      const updatedData = currentData.map(pp => pp.id === data.id ? data : pp);
      
      queryClient.setQueryData(['payPeriods', cacheKey], updatedData);
      setStoredPayPeriods(updatedData);
    },
  });

  // Delete pay period mutation with optimistic updates
  const deletePayPeriodMutation = useMutation({
    mutationFn: payPeriodApi.deletePayPeriod,
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: ['payPeriods', cacheKey] });
      
      const previousPayPeriods = queryClient.getQueryData<PayPeriod[]>(['payPeriods', cacheKey]) || storedPayPeriods;
      
      // Optimistically remove the pay period
      const optimisticPayPeriods = previousPayPeriods.filter(pp => pp.id !== id);
      
      queryClient.setQueryData(['payPeriods', cacheKey], optimisticPayPeriods);
      setStoredPayPeriods(optimisticPayPeriods);
      
      return { previousPayPeriods, deletedId: id };
    },
    onError: (err, id, context) => {
      console.error("Error deleting pay period:", err);
      console.log("this is the id", id)
      if (context?.previousPayPeriods) {
        queryClient.setQueryData(['payPeriods', cacheKey], context.previousPayPeriods);
        setStoredPayPeriods(context.previousPayPeriods);
      }
    },
    onSuccess: (_, deletedId) => {
      console.log("Pay period deleted successfully:", deletedId);
      // The optimistic update already removed it, so we're good
    },
  });

  // Function to manually refresh data when needed
  const refreshPayPeriods = () => {
    console.log("Manually refreshing pay periods...");
    queryClient.invalidateQueries({ queryKey: ['payPeriods', cacheKey] });
  };

  // Helper function to get a specific pay period by ID
  const getPayPeriodById = (id: string): PayPeriod | undefined => {
    const allPayPeriods = queryClient.getQueryData<PayPeriod[]>(['payPeriods', cacheKey]) || storedPayPeriods;
    return allPayPeriods.find(pp => pp.id === id);
  };

  // Helper function to get pay periods by status
  const getPayPeriodsByStatus = (targetStatus: string): PayPeriod[] => {
    const allPayPeriods = queryClient.getQueryData<PayPeriod[]>(['payPeriods', cacheKey]) || storedPayPeriods;
    return allPayPeriods.filter(pp => pp.status === targetStatus);
  };

  // Debug function to log current state
  const debugState = () => {
    console.log("=== PAY PERIODS DEBUG STATE ===");
    console.log("Cache key:", cacheKey);
    console.log("Query data:", payPeriodsQuery.data?.length || 0, "entries");
    console.log("Stored pay periods:", storedPayPeriods.length);
    console.log("Query status:", payPeriodsQuery.status);
    console.log("Is data fetched:", payPeriodsQuery.isFetched);
    console.log("Is data stale:", payPeriodsQuery.isStale);
    console.log("Location filter:", location || 'none');
    console.log("Status filter:", status || 'none');
    
    try {
      const storageValue = localStorage.getItem(`storedPayPeriods-${cacheKey}`);
      console.log("localStorage pay periods:", 
        storageValue ? JSON.parse(storageValue).length : 0);
      if (storageValue) {
        const parsed = JSON.parse(storageValue);
        console.log("First few entries:", parsed.slice(0, 3));
      }
    } catch (e) {
      console.error("Error debugging localStorage:", e);
    }
    
    console.log("===========================");
  };

  // Get the current data source (prefer query data, fallback to stored)
  const currentPayPeriods = payPeriodsQuery.data || storedPayPeriods;

  // Filter pay periods by location (client-side if needed)
  const filteredPayPeriods = location 
    ? currentPayPeriods.filter(period => period.location === location)
    : currentPayPeriods;

  return {
    // Data
    payPeriods: filteredPayPeriods,
    allPayPeriods: currentPayPeriods,
    isLoading: payPeriodsQuery.isLoading,
    isError: payPeriodsQuery.isError,
    error: payPeriodsQuery.error,
    isFetched: payPeriodsQuery.isFetched,
    
    // Mutations
    addPayPeriod: createPayPeriodMutation.mutate,
    updatePayPeriod: (id: string, updates: Partial<PayPeriod>) => 
      updatePayPeriodMutation.mutate({ id, updates }),
    deletePayPeriod: deletePayPeriodMutation.mutate,
    
    // Mutation states
    isCreating: createPayPeriodMutation.isPending,
    isUpdating: updatePayPeriodMutation.isPending,
    isDeleting: deletePayPeriodMutation.isPending,
    
    // Helper functions
    getPayPeriodById,
    getPayPeriodsByStatus,
    refreshPayPeriods,
    debugState,
  };
}

// Hook for a single pay period with caching
export function usePayPeriod(id: string) {
//   const queryClient = useQueryClient();
  
  // Use persisted state for single pay period
  const [storedPayPeriod, setStoredPayPeriod] = usePersistedState<PayPeriod | null>(
    `payPeriod-${id}`,
    null
  );

  const payPeriodQuery = useQuery({
    queryKey: ['payPeriod', id],
    queryFn: async () => {
      const data = await payPeriodApi.getPayPeriod(id);
      setStoredPayPeriod(data);
      return data;
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 10, // Consider data fresh for 10 minutes
    gcTime: 1000 * 60 * 30, // Keep in cache for 30 minutes
  });

  return {
    payPeriod: payPeriodQuery.data || storedPayPeriod,
    isLoading: payPeriodQuery.isLoading,
    isError: payPeriodQuery.isError,
    error: payPeriodQuery.error,
    refetch: payPeriodQuery.refetch,
  };
}