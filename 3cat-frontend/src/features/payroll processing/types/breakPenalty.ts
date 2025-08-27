export interface BreakPenalty {
    employeeId: string;
    employeeName: string;
    gustoId: string;
    date: string;
    clockIn: string;
    clockOut: string;
    totalHours: number;
    breakRequired: number;
    breakTaken: number;
    penaltyHours: number;
    isApplied?: boolean;
  }
  
  // Update Employee type to include breakHourPay
  export interface BreakHourPayUpdate {
    id: string;
    breakHourPay: number;
    date?: string;
  }