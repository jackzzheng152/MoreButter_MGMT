// api/laborApi.ts
import api from '@/lib/axios'; // Using your existing axios instance
import type {
  WeekLaborResponse,
  HourlyLaborResponse,
  HourlyLaborWithOvertimeResponse,
  WeekAnalysisResponse,
  RawShiftsResponse,
  SalesUploadResponse,
  DateRangeInfo,
  TestConnectionResponse,
} from '../types/labor';

export const laborApi = {
  // Labor data endpoints
  getWeekLaborData: async (
    weekStart: string, 
    locationId?: number
  ): Promise<WeekLaborResponse> => {
    const params = new URLSearchParams({ week_start: weekStart });
    if (locationId) params.append('location_id', locationId.toString());
    
    const response = await api.get(`/time-punch/labor/shifts/week?${params}`);
    return response.data;
  },

  getHourlyLaborData: async (
    weekStart: string, 
    locationId?: number
  ): Promise<HourlyLaborResponse> => {
    const params = new URLSearchParams({ week_start: weekStart });
    if (locationId) params.append('location_id', locationId.toString());
    
    const response = await api.get(`/time-punch/labor/shifts/week/hourly?${params}`);
    return response.data;
  },

  getHourlyLaborWithOvertimeData: async (
    weekStart: string, 
    locationId?: number
  ): Promise<HourlyLaborWithOvertimeResponse> => {
    const params = new URLSearchParams({ week_start: weekStart });
    if (locationId) params.append('location_id', locationId.toString());
    
    const response = await api.get(`/time-punch/labor/shifts/week/hourly/overtime?${params}`);
    return response.data;
  },

  getRawShifts: async (
    weekStart: string, 
    locationId?: number
  ): Promise<RawShiftsResponse> => {
    const params = new URLSearchParams({ week_start: weekStart });
    if (locationId) params.append('location_id', locationId.toString());
    
    const response = await api.get(`/time-punch/labor/shifts/raw?${params}`);
    return response.data;
  },

  getWeekAnalysis: async (
    weekStart: string,
    targetLaborPercent: number = 25.0,
    includePayrollTax: boolean = true,
    locationId?: number
  ): Promise<WeekAnalysisResponse> => {
    const params = new URLSearchParams({
      week_start: weekStart,
      target_labor_percent: targetLaborPercent.toString(),
      include_payroll_tax: includePayrollTax.toString(),
    });
    if (locationId) params.append('location_id', locationId.toString());
    
    const response = await api.get(`/time-punch/labor/analysis/week?${params}`);
    return response.data;
  },

  // Sales data endpoints
  uploadSnackpassData: async (
    file: File, 
    weekStart?: string
  ): Promise<SalesUploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    if (weekStart) formData.append('week_start', weekStart);

    const response = await api.post('/time-punch/labor/sales/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  analyzeCsvDates: async (file: File): Promise<DateRangeInfo> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post('/time-punch/labor/sales/analyze-dates', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Test endpoint
  testConnection: async (): Promise<TestConnectionResponse> => {
    const response = await api.get('/time-punch/labor/test/sevenshifts');
    return response.data;
  },
};