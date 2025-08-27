// Create a separate types file or update your existing types
// payroll-types.ts (or add to your existing types file)

export type PayPeriod = {
    id: string
    startDate: string
    endDate: string
    status: "pending" | "in-progress" | "completed"
    location: string
    locationId: string
  }
  
  // Rename to avoid conflict with browser's Location interface
  export type StoreLocation = {
    id: string
    name: string
    locationId: string
  }
  
  // Alternative: You can also use a namespace to avoid conflicts
  export namespace Payroll {
    export type Location = {
      id: string
      name: string
      locationId: string
    }
    
    export type PayPeriod = {
      id: string
      startDate: string
      endDate: string
      status: "pending" | "in-progress" | "completed"
      location: string
      locationId: string
    }
  }