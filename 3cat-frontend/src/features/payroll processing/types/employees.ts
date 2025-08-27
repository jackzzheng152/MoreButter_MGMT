// /types/employee.ts
export interface Employee {
    id: number;
    name: string;
    jobTitle: string;
    regularHours: number;
    overtimeHours: number;
    doubleOvertimeHours: number;
    tips: number;
    hourlyRate: number;
    scheduledHours?: number;
    gustoId: string;
    selected: boolean;
    isEditing?: boolean;
    breakHourPay: number;
    isEditingBreak?: boolean;
  }
  
  // You might also want to add more interfaces related to employees, such as:
  export interface EmployeeSummary {
    id: number;
    name: string;
    jobTitle: string;
    totalHours: number;
    totalPay: number;
  }
  
  export interface EmployeeUpdate {
    id: number;
    jobTitle?: string;
    breakHourPay?: number;
    tips?: number;
  }