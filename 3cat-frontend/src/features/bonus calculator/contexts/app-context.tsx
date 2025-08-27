"use client"

import React, { createContext, useContext, useCallback } from "react"
import { QueryClient, QueryClientProvider, useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import type {
  OrderData,
  BonusAllocation,
  TimesheetEntry,
  ShiftEligibility,
  EmployeeEligibility,
} from "../types/bonus"

// Query Keys
export const QUERY_KEYS = {
  orderData: ['orderData'] as const,
  timesheetData: ['timesheetData'] as const,
  shiftEligibility: ['shiftEligibility'] as const,
  employeeEligibility: ['employeeEligibility'] as const,
  bonusAllocations: ['bonusAllocations'] as const,
  filteredAllocations: ['filteredAllocations'] as const,
  uiState: ['uiState'] as const,
  config: ['config'] as const,
}

// Types
interface UIState {
  isProcessing: boolean
  currentTab: string
}

interface AppConfig {
  bonusRate: number
  shiftSettings: {
    splitMethod: "time-based" | "custom"
    morningHours: string
    nightHours: string
    customSplitTime: string
  }
  apiConfig: {
    apiKey: string
    locationId: string
  }
  dateRange: {
    startDate: string
    endDate: string
  }
}

// Default values
const DEFAULT_CONFIG: AppConfig = {
  bonusRate: 0.12,
  shiftSettings: {
    splitMethod: "time-based",
    morningHours: "06:00-14:00",
    nightHours: "14:00-23:00",
    customSplitTime: "14:00",
  },
  apiConfig: {
    apiKey: "demo-7shifts-key",
    locationId: "location-123",
  },
  dateRange: {
    startDate: "2025-05-19",
    endDate: "2025-05-25",
  },
}

const DEFAULT_UI_STATE: UIState = {
  isProcessing: false,
  currentTab: "upload",
}

// Storage utilities
const STORAGE_KEY = "bonus-allocation-data"

const saveToStorage = (key: string, data: any): void => {
  try {
    const existingData = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
    existingData[key] = data
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existingData))
  } catch (error) {
    console.error(`Failed to save ${key} to localStorage:`, error)
  }
}

function loadFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
    return data[key] || defaultValue
  } catch (error) {
    console.error(`Failed to load ${key} from localStorage:`, error)
    return defaultValue
  }
}

const clearStorage = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch (error) {
    console.error('Failed to clear localStorage:', error)
  }
}

// Create Query Client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 30 * 60 * 1000, // 30 minutes (increased from 10)
      refetchOnWindowFocus: false,
      refetchOnMount: false, // Don't refetch on mount to preserve state
      refetchOnReconnect: false, // Don't refetch on reconnect
    },
  },
})

// Context for query client access
const AppQueryContext = createContext<QueryClient | null>(null)

interface AppProviderProps {
  children: React.ReactNode
}

export function AppProvider({ children }: AppProviderProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <AppQueryContext.Provider value={queryClient}>
        {children}
      </AppQueryContext.Provider>
    </QueryClientProvider>
  )
}

export function useAppContext() {
  const context = useContext(AppQueryContext)
  if (!context) {
    throw new Error("useAppContext must be used within an AppProvider")
  }
  return { state: {}, queryClient: context }
}

// Order Data Hooks
export function useOrderData() {
  const queryClient = useQueryClient()

  const { data: orderData = [], isLoading: isQueryLoading } = useQuery({
    queryKey: QUERY_KEYS.orderData,
    queryFn: () => loadFromStorage<OrderData[]>('orderData', []),
  })

  const setOrderDataMutation = useMutation({
    mutationFn: async (data: OrderData[]) => {
      saveToStorage('orderData', data)
      return data
    },
    onSuccess: (data) => {
      queryClient.setQueryData(QUERY_KEYS.orderData, data)
    },
  })

  return {
    orderData: orderData || [],
    setOrderData: setOrderDataMutation.mutate,
    isLoading: setOrderDataMutation.isPending || isQueryLoading,
  }
}

// Timesheet Data Hooks
export function useTimesheetData() {
  const queryClient = useQueryClient()

  const { data: timesheetData = [], isLoading: isQueryLoading } = useQuery({
    queryKey: QUERY_KEYS.timesheetData,
    queryFn: () => loadFromStorage<TimesheetEntry[]>('timesheetData', []),
    staleTime: Infinity, // Keep timesheet data fresh across tabs
    gcTime: Infinity, // Don't garbage collect timesheet data
  })

  const setTimesheetDataMutation = useMutation({
    mutationFn: async (data: TimesheetEntry[]) => {
      saveToStorage('timesheetData', data)
      return data
    },
    onSuccess: (data) => {
      queryClient.setQueryData(QUERY_KEYS.timesheetData, data)
      // When timesheet data changes, eligibility might need to be recalculated
      // But don't automatically invalidate - let the components handle this
    },
  })

  return {
    timesheetData: timesheetData || [],
    setTimesheetData: setTimesheetDataMutation.mutate,
    isLoading: setTimesheetDataMutation.isPending || isQueryLoading,
  }
}

// Eligibility Data Hooks
export function useEligibilityData() {
  const queryClient = useQueryClient()

  const { data: shiftEligibility = [], isLoading: isShiftLoading } = useQuery({
    queryKey: QUERY_KEYS.shiftEligibility,
    queryFn: () => loadFromStorage<ShiftEligibility[]>('shiftEligibility', []),
    staleTime: Infinity, // Keep eligibility data fresh across tabs
    gcTime: Infinity, // Don't garbage collect eligibility data
  })

  const { data: employeeEligibility = [], isLoading: isEmployeeLoading } = useQuery({
    queryKey: QUERY_KEYS.employeeEligibility,
    queryFn: () => loadFromStorage<EmployeeEligibility[]>('employeeEligibility', []),
    staleTime: Infinity, // Keep eligibility data fresh across tabs
    gcTime: Infinity, // Don't garbage collect eligibility data
  })

  const setShiftEligibilityMutation = useMutation({
    mutationFn: async (data: ShiftEligibility[]) => {
      saveToStorage('shiftEligibility', data)
      return data
    },
    onSuccess: (data) => {
      queryClient.setQueryData(QUERY_KEYS.shiftEligibility, data)
      // Also invalidate related queries to ensure consistency
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.employeeEligibility })
    },
  })

  const setEmployeeEligibilityMutation = useMutation({
    mutationFn: async (data: EmployeeEligibility[]) => {
      saveToStorage('employeeEligibility', data)
      return data
    },
    onSuccess: (data) => {
      queryClient.setQueryData(QUERY_KEYS.employeeEligibility, data)
      // Also invalidate related queries to ensure consistency
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.shiftEligibility })
    },
  })

  return {
    shiftEligibility: shiftEligibility || [],
    employeeEligibility: employeeEligibility || [],
    setShiftEligibility: setShiftEligibilityMutation.mutate,
    setEmployeeEligibility: setEmployeeEligibilityMutation.mutate,
    isLoading: setShiftEligibilityMutation.isPending || setEmployeeEligibilityMutation.isPending || isShiftLoading || isEmployeeLoading,
  }
}

// Bonus Data Hooks
export function useBonusData() {
  const queryClient = useQueryClient()

  const { data: bonusAllocations = [], isLoading: isBonusLoading } = useQuery({
    queryKey: QUERY_KEYS.bonusAllocations,
    queryFn: () => loadFromStorage<BonusAllocation[]>('bonusAllocations', []),
  })

  const { data: filteredAllocations = [], isLoading: isFilteredLoading } = useQuery({
    queryKey: QUERY_KEYS.filteredAllocations,
    queryFn: () => loadFromStorage<BonusAllocation[]>('filteredAllocations', []),
  })

  const setBonusAllocationsMutation = useMutation({
    mutationFn: async (data: BonusAllocation[]) => {
      saveToStorage('bonusAllocations', data)
      saveToStorage('filteredAllocations', data) // Initially, all data is included
      return data
    },
    onSuccess: (data) => {
      queryClient.setQueryData(QUERY_KEYS.bonusAllocations, data)
      queryClient.setQueryData(QUERY_KEYS.filteredAllocations, data)
    },
  })

  const setFilteredAllocationsMutation = useMutation({
    mutationFn: async (data: BonusAllocation[]) => {
      saveToStorage('filteredAllocations', data)
      return data
    },
    onSuccess: (data) => {
      queryClient.setQueryData(QUERY_KEYS.filteredAllocations, data)
    },
  })

  return {
    bonusAllocations: bonusAllocations || [],
    filteredAllocations: filteredAllocations || [],
    setBonusAllocations: setBonusAllocationsMutation.mutate,
    setFilteredAllocations: setFilteredAllocationsMutation.mutate,
    isLoading: setBonusAllocationsMutation.isPending || setFilteredAllocationsMutation.isPending || isBonusLoading || isFilteredLoading,
  }
}

// App Configuration Hooks
export function useAppConfig() {
  const queryClient = useQueryClient()

  const { data: config = DEFAULT_CONFIG } = useQuery({
    queryKey: QUERY_KEYS.config,
    queryFn: () => loadFromStorage<AppConfig>('config', DEFAULT_CONFIG),
  })

  const updateConfigMutation = useMutation({
    mutationFn: async (updates: Partial<AppConfig>) => {
      const currentConfig = queryClient.getQueryData<AppConfig>(QUERY_KEYS.config) || DEFAULT_CONFIG
      const updatedConfig = { ...currentConfig, ...updates }
      saveToStorage('config', updatedConfig)
      return updatedConfig
    },
    onSuccess: (data) => {
      queryClient.setQueryData(QUERY_KEYS.config, data)
    },
  })

  const setBonusRate = useCallback((rate: number) => {
    updateConfigMutation.mutate({ bonusRate: rate })
  }, [updateConfigMutation])

  const setShiftSettings = useCallback((settings: Partial<AppConfig['shiftSettings']>) => {
    updateConfigMutation.mutate({ 
      shiftSettings: { ...config.shiftSettings, ...settings } 
    })
  }, [updateConfigMutation, config.shiftSettings])

  const setApiConfig = useCallback((apiConfig: Partial<AppConfig['apiConfig']>) => {
    updateConfigMutation.mutate({ 
      apiConfig: { ...config.apiConfig, ...apiConfig } 
    })
  }, [updateConfigMutation, config.apiConfig])

  const setDateRange = useCallback((dateRange: Partial<AppConfig['dateRange']>) => {
    updateConfigMutation.mutate({ 
      dateRange: { ...config.dateRange, ...dateRange } 
    })
  }, [updateConfigMutation, config.dateRange])

  return {
    bonusRate: config.bonusRate,
    shiftSettings: config.shiftSettings,
    apiConfig: config.apiConfig,
    dateRange: config.dateRange,
    setBonusRate,
    setShiftSettings,
    setApiConfig,
    setDateRange,
    isLoading: updateConfigMutation.isPending,
  }
}

// UI State Hooks
export function useAppUI() {
  const queryClient = useQueryClient()

  const { data: uiState = DEFAULT_UI_STATE } = useQuery({
    queryKey: QUERY_KEYS.uiState,
    queryFn: () => loadFromStorage<UIState>('uiState', DEFAULT_UI_STATE),
  })

  const updateUIMutation = useMutation({
    mutationFn: async (updates: Partial<UIState>) => {
      const currentState = queryClient.getQueryData<UIState>(QUERY_KEYS.uiState) || DEFAULT_UI_STATE
      const updatedState = { ...currentState, ...updates }
      saveToStorage('uiState', updatedState)
      return updatedState
    },
    onSuccess: (data) => {
      queryClient.setQueryData(QUERY_KEYS.uiState, data)
    },
  })

  const clearAllDataMutation = useMutation({
    mutationFn: async () => {
      clearStorage()
      // Reset all queries to their default values
      queryClient.setQueryData(QUERY_KEYS.orderData, [])
      queryClient.setQueryData(QUERY_KEYS.timesheetData, [])
      queryClient.setQueryData(QUERY_KEYS.shiftEligibility, [])
      queryClient.setQueryData(QUERY_KEYS.employeeEligibility, [])
      queryClient.setQueryData(QUERY_KEYS.bonusAllocations, [])
      queryClient.setQueryData(QUERY_KEYS.filteredAllocations, [])
      queryClient.setQueryData(QUERY_KEYS.config, DEFAULT_CONFIG)
      queryClient.setQueryData(QUERY_KEYS.uiState, DEFAULT_UI_STATE)
      return true
    },
  })

  const setIsProcessing = useCallback((isProcessing: boolean) => {
    updateUIMutation.mutate({ isProcessing })
  }, [updateUIMutation])

  const setCurrentTab = useCallback((currentTab: string) => {
    updateUIMutation.mutate({ currentTab })
  }, [updateUIMutation])

  return {
    isProcessing: uiState.isProcessing,
    currentTab: uiState.currentTab,
    setIsProcessing,
    setCurrentTab,
    clearAllData: clearAllDataMutation.mutate,
    isLoading: updateUIMutation.isPending || clearAllDataMutation.isPending,
  }
}