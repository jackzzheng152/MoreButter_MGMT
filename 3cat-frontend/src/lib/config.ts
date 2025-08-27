// Configuration file for the application
export const config = {
  // 7shifts API configuration
  sevenShifts: {
    companyId: parseInt(import.meta.env.VITE_SEVEN_SHIFTS_COMPANY_ID || "358260"),
  },
  
  // API configuration
  api: {
    baseUrl: import.meta.env.VITE_API_URL || "http://localhost:8000",
  },
  
  // App configuration
  app: {
    passcode: import.meta.env.VITE_MGMT_3CAT_PASSCODE || "",
  },
} as const;

// Type for the config
export type AppConfig = typeof config; 