import api from '@/lib/axios';
import type { SalesSummaryData, SalesUploadResponse } from '../types/sales';

export const salesApi = {
  // Get sales summary for a specific date range and location
  getSalesSummary: async (
    startDate: string,
    endDate: string,
    locationId?: number
  ): Promise<SalesSummaryData | null> => {
    const params = new URLSearchParams();
    if (locationId) params.append('location_id', locationId.toString());
    params.append('start_date', startDate);
    params.append('end_date', endDate);
    
    const response = await api.get(`/orders/summary?${params}`);
    
    // Transform the orders summary data into the expected SalesSummaryData format
    const summary = response.data.summary || {};
    
    // Check if there are any orders - if not, return null to show "no data" message
    if (!summary.total_orders || summary.total_orders === 0) {
      return null;
    }
    
    const salesData = {
      orders: summary.total_orders || 0,
      subtotal: summary.total_subtotal || 0,
      grossSales: summary.total_gross_sales || 0,
      refunds: summary.total_refunds || 0,
      discounts: summary.total_discounts || 0,
      netSales: summary.total_net_sales || 0,
      taxesYouOwe: (summary.total_tax || 0) + (summary.total_estimated_third_party_taxes || 0),
      tips: summary.total_tips || 0,
      totalSales: summary.total_sales || 0,
    };

    return {
      date: startDate === endDate ? startDate : `${startDate} to ${endDate}`,
      sales: salesData,
      payments: {
        totalCollected: summary.total_net_sales || 0,
        card: 0, // Not available in orders data
        cash: summary.total_cash || 0,
        giftCardRedemption: summary.total_gift_card_redemption || 0,
        storeCreditRedemption: summary.total_store_credit_redemption || 0,
        processingFees: summary.total_processing_fees || 0,
        snackpassFees: summary.total_snackpass_fees || 0,
        netCollected: summary.total_net_sales || 0,
      }
    };
  },

  // Check for existing data in date range
  checkExistingData: async (
    startDate: string,
    endDate: string,
    locationId: number
  ): Promise<any> => {
    const params = new URLSearchParams();
    params.append('location_id', locationId.toString());
    params.append('start_date', startDate);
    params.append('end_date', endDate);
    
    const response = await api.get(`/orders/check-existing-data?${params}`);
    return response.data;
  },

  // Upload snackpass CSV file
  uploadSnackpassFile: async (
    file: File,
    timePeriod: string,
    periodStartDate: string,
    periodEndDate: string,
    locationId: number,
    validateDates: boolean = true,
    overwriteExisting: boolean = false,
    appendMode: boolean = false
  ): Promise<SalesUploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('location_id', locationId.toString());
    formData.append('container_name', '3cat-snackpass');
    formData.append('period_start_date', periodStartDate);
    formData.append('period_end_date', periodEndDate);
    formData.append('validate_dates', validateDates.toString());
    formData.append('overwrite_existing', overwriteExisting.toString());
    formData.append('append_mode', appendMode.toString());

    const response = await api.post('/orders/upload-csv', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    

    
    return response.data;
  },

  // Get category sales breakdown
  getCategorySales: async (
    date: string,
    locationId?: number
  ): Promise<any[]> => {
    const params = new URLSearchParams();
    if (locationId) params.append('location_id', locationId.toString());
    
    const response = await api.get(`/orders/?${params}`);
    return response.data.orders || [];
  },

  // Get provider sales breakdown
  getProviderSales: async (
    date: string,
    locationId?: number
  ): Promise<any[]> => {
    const params = new URLSearchParams();
    if (locationId) params.append('location_id', locationId.toString());
    
    const response = await api.get(`/orders/?${params}`);
    return response.data.orders || [];
  },

  // Get item sales breakdown
  getItemSales: async (
    date: string,
    locationId?: number
  ): Promise<any[]> => {
    const params = new URLSearchParams();
    if (locationId) params.append('location_id', locationId.toString());
    
    const response = await api.get(`/orders/?${params}`);
    return response.data.orders || [];
  },

  // Check if sales data exists for a date/location
  checkSalesDataExists: async (
    date: string,
    locationId?: number
  ): Promise<boolean> => {
    const params = new URLSearchParams();
    if (locationId) params.append('location_id', locationId.toString());
    
    const response = await api.get(`/orders/?${params}`);
    return response.data.count > 0;
  },

  // Find CSV file for a specific date
  findCsvFileForDate: async (
    date: string,
    locationId?: number,
    containerName: string = "3cat-snackpass"
  ): Promise<any> => {
    const params = new URLSearchParams();
    if (locationId) params.append('location_id', locationId.toString());
    
    const response = await api.get(`/orders/?${params}`);
    return {
      success: true,
      found: response.data.count > 0,
      file: null,
      date: date,
      location_id: locationId
    };
  },

  // Get CSV data for a specific date
  getCsvDataForDate: async (
    date: string,
    locationId?: number,
    containerName: string = "3cat-snackpass"
  ): Promise<any> => {
    const params = new URLSearchParams();
    if (locationId) params.append('location_id', locationId.toString());
    
    const response = await api.get(`/orders/?${params}`);
    return {
      success: true,
      data: response.data.orders || [],
      date: date,
      location_id: locationId
    };
  },

  // Find overlapping CSV files
  findOverlappingCsvFiles: async (
    startDate: string,
    endDate: string,
    locationId?: number,
    containerName: string = "3cat-snackpass"
  ): Promise<any> => {
    const params = new URLSearchParams({ 
      start_date: startDate,
      end_date: endDate,
      container_name: containerName
    });
    if (locationId) params.append('location_id', locationId.toString());
    
    const response = await api.get(`/sales/find-overlapping-csv-files?${params}`);
    return response.data;
  },

  // Delete CSV file
  deleteCsvFile: async (
    blobName: string,
    containerName: string = "3cat-snackpass"
  ): Promise<any> => {
    const params = new URLSearchParams({ 
      blob_name: blobName,
      container_name: containerName
    });
    
    const response = await api.delete(`/sales/delete-csv-file?${params}`);
    return response.data;
  },

  // Delete sales data by date range and location
  deleteSalesData: async (
    startDate: string,
    endDate: string,
    locationId: number
  ): Promise<any> => {
    const params = new URLSearchParams();
    params.append('location_id', locationId.toString());
    params.append('start_date', startDate);
    params.append('end_date', endDate);
    
    const response = await api.delete(`/orders/?${params}`);
    return response.data;
  },
}; 