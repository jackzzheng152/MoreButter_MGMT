// hooks/useLaborData.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { addDays, format } from 'date-fns';
import { laborApi } from '../api/laborApi';
import type { SalesUploadResponse } from '../types/labor';
import type { WeeklySalesResponse } from "../types/labor";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

// Query keys factory
export const laborKeys = {
  all: ['labor'] as const,
  weekData: (weekStart: string, locationId?: number) => 
    ['labor', 'week', weekStart, locationId] as const,
  hourlyData: (weekStart: string, locationId?: number) => 
    ['labor', 'hourly', weekStart, locationId] as const,
  hourlyOvertimeData: (weekStart: string, locationId?: number) => 
    ['labor', 'hourly-overtime', weekStart, locationId] as const,
  weekAnalysis: (weekStart: string, targetPercent: number, includePayroll: boolean, locationId?: number) => 
    ['labor', 'analysis', weekStart, targetPercent, includePayroll, locationId] as const,
  rawShifts: (weekStart: string, locationId?: number) => 
    ['labor', 'raw-shifts', weekStart, locationId] as const,
  salesData: (weekStart: string) => ['labor', 'sales', weekStart] as const,
};

// Individual query hooks
export const useWeekLaborData = (weekStart: string, locationId?: number, enabled: boolean = true) => {
  return useQuery({
    queryKey: laborKeys.weekData(weekStart, locationId),
    queryFn: () => laborApi.getWeekLaborData(weekStart, locationId),
    enabled: enabled && !!weekStart,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
};

export const useHourlyLaborData = (weekStart: string, locationId?: number, enabled: boolean = true) => {
  return useQuery({
    queryKey: laborKeys.hourlyData(weekStart, locationId),
    queryFn: () => laborApi.getHourlyLaborData(weekStart, locationId),
    enabled: enabled && !!weekStart,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
};

export const useHourlyLaborWithOvertimeData = (weekStart: string, locationId?: number, enabled: boolean = true) => {
  return useQuery({
    queryKey: laborKeys.hourlyOvertimeData(weekStart, locationId),
    queryFn: () => laborApi.getHourlyLaborWithOvertimeData(weekStart, locationId),
    enabled: enabled && !!weekStart,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
};

export const useWeekAnalysis = (
  weekStart: string,
  targetLaborPercent: number = 25.0,
  includePayrollTax: boolean = true,
  locationId?: number,
  enabled: boolean = true
) => {
  return useQuery({
    queryKey: laborKeys.weekAnalysis(weekStart, targetLaborPercent, includePayrollTax, locationId),
    queryFn: () => laborApi.getWeekAnalysis(weekStart, targetLaborPercent, includePayrollTax, locationId),
    enabled: enabled && !!weekStart,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
};

export const useRawShifts = (weekStart: string, locationId?: number, enabled: boolean = true) => {
  return useQuery({
    queryKey: laborKeys.rawShifts(weekStart, locationId),
    queryFn: () => laborApi.getRawShifts(weekStart, locationId),
    enabled: enabled && !!weekStart,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
};

export const useTestConnection = (enabled: boolean = false) => {
  return useQuery({
    queryKey: ['labor', 'test-connection'],
    queryFn: () => laborApi.testConnection(),
    enabled,
    staleTime: 0, // Always refetch for test
    gcTime: 0,
  });
};

// Mutation hooks
export const useUploadSnackpassData = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ file, weekStart }: { file: File; weekStart?: string }) =>
      laborApi.uploadSnackpassData(file, weekStart),
    onSuccess: (data: SalesUploadResponse, variables) => {
      // Invalidate related queries when sales data is uploaded
      if (variables.weekStart) {
        queryClient.invalidateQueries({ queryKey: laborKeys.salesData(variables.weekStart) });
        queryClient.invalidateQueries({ queryKey: laborKeys.weekAnalysis(variables.weekStart, 25, true) });
      }
      
      // Store sales data in cache
      if (data.success && variables.weekStart) {
        queryClient.setQueryData(laborKeys.salesData(variables.weekStart), data.data.sales);
      }
    },
  });
};

export const useAnalyzeCsvDates = () => {
  return useMutation({
    mutationFn: (file: File) => laborApi.analyzeCsvDates(file),
  });
};

// Combined dashboard hook
export const useLaborDashboardData = (
  weekStart: string,
  targetLaborPercent: number = 25.0,
  includePayrollTax: boolean = true,
  locationId?: number,
  useOvertimeBreakdown: boolean = false
) => {
  const weekLaborQuery = useWeekLaborData(weekStart, locationId);
  
  const hourlyLaborQuery = useHourlyLaborData(weekStart, locationId, !useOvertimeBreakdown);
  
  const hourlyOvertimeQuery = useHourlyLaborWithOvertimeData(weekStart, locationId, useOvertimeBreakdown);
  
  const weekAnalysisQuery = useWeekAnalysis(weekStart, targetLaborPercent, includePayrollTax, locationId);

  
  return {
    // Individual queries
    weekLaborQuery,
    hourlyLaborQuery,
    hourlyOvertimeQuery,
    weekAnalysisQuery,
    
    // Combined loading state
    isLoading: weekLaborQuery.isLoading || 
               (useOvertimeBreakdown ? hourlyOvertimeQuery.isLoading : hourlyLaborQuery.isLoading) ||
               weekAnalysisQuery.isLoading,
    
    // Combined error state
    error: weekLaborQuery.error || 
           (useOvertimeBreakdown ? hourlyOvertimeQuery.error : hourlyLaborQuery.error) ||
           weekAnalysisQuery.error,
    
    // Combined data
    data: {
      weekLabor: weekLaborQuery.data?.data,
      hourlyLabor: useOvertimeBreakdown ? hourlyOvertimeQuery.data?.data : hourlyLaborQuery.data?.data,
      weekAnalysis: weekAnalysisQuery.data?.data,
    },
    
    // Refetch function
    refetch: () => {
      weekLaborQuery.refetch();
      if (useOvertimeBreakdown) {
        hourlyOvertimeQuery.refetch();
      } else {
        hourlyLaborQuery.refetch();
      }
      weekAnalysisQuery.refetch();
    },
  };
};




export function useWeeklyNetSalesHourly(
  weekStart: string,
  locationId?: number,
  tz = "America/Los_Angeles"
) {
  return useQuery({
    queryKey: ["weeklyNetSalesHourly", weekStart, locationId, tz],
    enabled: Boolean(weekStart && locationId),
    queryFn: async () => {
      const { data } = await axios.get(`${API_BASE_URL}/orders/sales/hourly-weekly`, {
        params: { 
          location_id: locationId, 
          start_date: weekStart, 
          end_date: format(addDays(new Date(weekStart), 7), "yyyy-MM-dd"), 
          tz 
        },
      });

      return data as WeeklySalesResponse;
    },
  });
}



  export const useSalesDataManager = () => {
    const queryClient = useQueryClient();
    const uploadMutation = useUploadSnackpassData();
    const analyzeMutation = useAnalyzeCsvDates();
    
    const getSalesData = (weekStart: string) => {
      return queryClient.getQueryData(laborKeys.salesData(weekStart));
    };
    
    const setSalesData = (weekStart: string, data: any) => {
      queryClient.setQueryData(laborKeys.salesData(weekStart), data);
    };
    
    const invalidateSalesData = (weekStart: string) => {
      queryClient.invalidateQueries({ queryKey: laborKeys.salesData(weekStart) });
    };
    
    return {
      uploadMutation,
      analyzeMutation,
      getSalesData,
      setSalesData,
      invalidateSalesData,
      isUploading: uploadMutation.isPending,
      isAnalyzing: analyzeMutation.isPending,
    };
  };