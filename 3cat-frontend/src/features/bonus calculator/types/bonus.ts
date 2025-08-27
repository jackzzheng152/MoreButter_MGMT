export interface OrderData {
    orderNumber: string
    orderedAt: string
    status: string
    customer: string
    items: string
    total: string
    date: string
    time: string
    drinkCount: number
  }
  
  export interface ShiftData {
    id: string
    employeeId: string
    employeeName: string
    role: string
    jobTitle: string
    clockIn: string
    clockOut: string
    hoursWorked: number
    date: string
    shiftType: "morning" | "night"
    isShiftLead: boolean
    isTrainee: boolean
  }
  
  export interface BonusAllocation {
    date: string
    shiftType: "morning" | "night"
    employeeName: string
    role: string
    hoursWorked: number
    multiplier: number // Always 1 now - no special multipliers
    adjustedHours: number // Same as hoursWorked since no multiplier
    bonusAmount: number
    drinkCount: number
    bonusPool: number
    hoursRatio?: number // Percentage of total shift hours
    totalShiftHours?: number // Total hours worked in the shift
  }
  
  export interface DailyShiftSummary {
    date: string
    morningShift: {
      drinkCount: number
      bonusPool: number
      allocations: BonusAllocation[]
    }
    nightShift: {
      drinkCount: number
      bonusPool: number
      allocations: BonusAllocation[]
    }
  }
  
  export interface ShiftConfig {
    morningStart: string // e.g., "06:00"
    morningEnd: string // e.g., "14:00"
    nightStart: string // e.g., "14:00"
    nightEnd: string // e.g., "23:00"
  }
  
  export interface ShiftSplitSettings {
    splitMethod: "time-based" | "custom"
    morningHours: string
    nightHours: string
    customSplitTime: string
  }
  
  // Import timesheet types
  export type { TimesheetEntry, ShiftEligibility, EmployeeEligibility } from "../types/timesheet"
  