import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { salesApi } from '../api/salesApi';
import type { SalesSummaryData, SalesUploadResponse } from '../types/sales';

export const useSalesSummary = (date: string, locationId?: number) => {
  return useQuery({
    queryKey: ['sales-summary', date, locationId],
    queryFn: () => salesApi.getSalesSummary(date, locationId),
    enabled: !!date,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useCategorySales = (date: string, locationId?: number) => {
  return useQuery({
    queryKey: ['category-sales', date, locationId],
    queryFn: () => salesApi.getCategorySales(date, locationId),
    enabled: !!date,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useProviderSales = (date: string, locationId?: number) => {
  return useQuery({
    queryKey: ['provider-sales', date, locationId],
    queryFn: () => salesApi.getProviderSales(date, locationId),
    enabled: !!date,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useItemSales = (date: string, locationId?: number) => {
  return useQuery({
    queryKey: ['item-sales', date, locationId],
    queryFn: () => salesApi.getItemSales(date, locationId),
    enabled: !!date,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useSalesDataExists = (date: string, locationId?: number) => {
  return useQuery({
    queryKey: ['sales-exists', date, locationId],
    queryFn: () => salesApi.checkSalesDataExists(date, locationId),
    enabled: !!date,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useUploadSnackpassFile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ file, date, locationId }: { 
      file: File; 
      date: string; 
      locationId: number; 
    }) => salesApi.uploadSnackpassFile(file, date, locationId),
    onSuccess: (data, variables) => {
      // Invalidate and refetch sales data
      queryClient.invalidateQueries({ 
        queryKey: ['sales-summary', variables.date, variables.locationId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['category-sales', variables.date, variables.locationId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['provider-sales', variables.date, variables.locationId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['item-sales', variables.date, variables.locationId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['sales-exists', variables.date, variables.locationId] 
      });
    },
  });
}; 