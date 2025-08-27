// features/payroll-processing/types/timePunch.ts
export interface TimePunch {
    user_id: number;
    user_name: string;
    clocked_in_pacific: string;
    clocked_out_pacific: string;
    clocked_in_date_pacific: string;
    regular_hours: number;
    overtime_hours: number;
    double_ot_hours: number;
    net_worked_hours: number;
  }
  
  export interface TimePunchFilter {
    start_date: string;
    end_date: string;
    location_id?: number;
    approved?: boolean;
    deleted?: boolean;
  }
  
  export interface EmployeeSummary {
    user_id: number;
    user_name: string;
    total_shifts: number;
    total_regular_hours: number;
    total_overtime_hours: number;
    total_double_ot_hours: number;
    total_hours: number;
  }
  
  export interface TimePunchSummary {
    employees: EmployeeSummary[];
  }

  export interface TimesheetEntry {
    id: string;
    employeeName: string;
    gustoId: string;
    date: string;
    clockIn: string;
    clockOut: string;
    breakDuration: number;
    totalHours: number;
    isOvertime: boolean;
    overtime_hours: number;
    double_ot_hours: number;
    regular_hours: number;
  }