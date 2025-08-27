// PayPeriodDetailWrapper.tsx
"use client"

import { useRef, useEffect } from "react";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { PayPeriodDetail as OriginalPayPeriodDetail } from './pay-period-detail';
import { persistQueryClient } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import type { PayPeriod, StoreLocation } from "@/features/payroll processing/types/payroll-types";

// Create a storage persister
// We need to check if window is defined since this might run on the server in Next.js
const localStoragePersister = typeof window !== 'undefined' 
  ? createSyncStoragePersister({
      storage: window.localStorage,
      key: 'PAYROLL_QUERY_CACHE', // Custom key for storing the cache
    })
  : null;

// Create a query client with increased cacheTime and staleTime
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60 * 24, // 24 hours cache time (formerly cacheTime)
      staleTime: 1000 * 60 * 60, // 1 hour stale time
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
    },
  },
});

// Setup persistence if we're in the browser
if (typeof window !== 'undefined' && localStoragePersister) {
  persistQueryClient({
    queryClient,
    persister: localStoragePersister,
    // Optional but recommended
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
  });
}

interface PayPeriodDetailWrapperProps {
  payPeriod: PayPeriod;
  locationName: string;
  locations: StoreLocation[];
  onBack: () => void;
  onUpdate: (updatedPayPeriod: PayPeriod) => void;
}

// This is a wrapper component that provides the React Query context
export function PayPeriodDetail({ 
  payPeriod, 
  locationName,
  locations,
  onBack, 
  onUpdate 
}: PayPeriodDetailWrapperProps) {
  // Use a ref to make sure we only apply persistence once in the browser
  const persistApplied = useRef(false);
  
  // Effect to ensure persistence is applied in the browser environment
  useEffect(() => {
    if (typeof window !== 'undefined' && !persistApplied.current && localStoragePersister) {
      persistApplied.current = true;
      console.log('Query client persistence initialized');
    }
  }, []);
  
  return (
    <QueryClientProvider client={queryClient}>
      <OriginalPayPeriodDetail
        payPeriod={payPeriod}
        locationName={locationName}
        locationId={payPeriod.locationId}
        locations={locations}
        onBack={onBack}
        onUpdate={onUpdate}
      />
      {/* Optional: Include DevTools in development mode */}
      {process.env.NODE_ENV === 'development' && <ReactQueryDevtools />}
    </QueryClientProvider>
  );
}