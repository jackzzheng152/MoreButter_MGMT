export interface TimesheetEntry {
    id: string
    employeeId: string
    employeeName: string
    date: string
    shiftType: "morning" | "night" | "unassigned"
    clockIn: string
    clockOut: string
    hoursWorked: number
    unpaidBreakHours?: number
    role: string
    isShiftLead: boolean
    isTrainee: boolean
    department: string
    hourlyRate: number
    totalPay: number
    status: "approved" | "pending" | "rejected"
  }
  
  export interface TallyForm {
    id: string
    date: string
    shiftType: "morning" | "night"
    submittedBy: string
    submittedAt: string
    issues: TallyIssue[]
    overallStatus: "eligible" | "ineligible" | "conditional"
    notes?: string
  }
  
  export interface TallyIssue {
    type: "understaffed" | "equipment_failure" | "supply_shortage" | "customer_complaint" | "safety_incident" | "other"
    severity: "minor" | "major" | "critical"
    description: string
    affectsEligibility: boolean
  }
  
  export interface ShiftEligibility {
    date: string
    shiftType: "morning" | "night"
    isEligible: boolean
    reason?: string
    tallyFormId?: string
    manualOverride?: boolean
    overrideReason?: string
    lastUpdated: string
    updatedBy: string
  }
  
  export interface EmployeeInfraction {
    id: string
    employeeId: string
    employeeName: string
    date: string
    shiftType: "morning" | "night"
    infractionType:
      | "tardiness"
      | "early_departure"
      | "no_show"
      | "policy_violation"
      | "performance"
      | "attitude"
      | "safety"
      | "other"
    severity: "minor" | "major" | "critical"
    description: string
    affectsBonusEligibility: boolean
    createdBy: string
    createdAt: string
    resolvedAt?: string
    resolvedBy?: string
    notes?: string
  }
  
  export interface EmployeeEligibility {
    employeeId: string
    employeeName: string
    date: string
    shiftType: "morning" | "night"
    isEligible: boolean
    reason?: string
    infractionIds: string[]
    manualOverride?: boolean
    overrideReason?: string
    lastUpdated: string
    updatedBy: string
  }
  