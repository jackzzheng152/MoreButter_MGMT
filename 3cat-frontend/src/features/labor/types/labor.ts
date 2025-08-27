// types/labor.ts
export interface HourlyLaborData {
    [day: string]: {
      [hour: number]: number;
    };
  }
  
  export interface HourlyLaborWithOvertimeData {
    [day: string]: {
      [hour: number]: {
        regular_cost: number;
        overtime_cost: number;
        double_ot_cost: number;
        total_cost: number;
      };
    };
  }
  
  export interface DailyLaborData {
    [day: string]: {
      hours: number;
      cost: number;
    };
  }
  
  export interface HourlySalesData {
    [day: string]: {
      [hour: number]: number;
    };
  }
  
  export interface WeekAnalysisData {
    [day: string]: {
      hours: number;
      base_cost: number;
      adjusted_cost: number;
    };
  }
  
  export interface SalesUploadResponse {
    success: boolean;
    data: {
      filename: string;
      sales: HourlySalesData;
      summary: {
        total_weekly_sales: number;
        average_daily_sales: number;
        peak_hour_average: number;
        off_peak_average: number;
        daily_totals: { [day: string]: number };
        hourly_totals: { [hour: string]: number };
        peak_sales: number;
        off_peak_sales: number;
        peak_hours: number[];
        business_hours: number[];
      };
      week_start?: string;
      filtered_by_week: boolean;
    };
  }
  
  export interface DateRangeInfo {
    success: boolean;
    data: {
      date_range: {
        min_date: string;
        max_date: string;
        total_orders: number;
        total_sales: number;
      };
      weeks_available: Array<{
        week_start: string;
        week_end: string;
        week_label: string;
        order_count: number;
        total_sales: number;
      }>;
      timezone: string;
    };
  }
  
  export interface RawShiftsResponse {
    success: boolean;
    data: {
      week_start: string;
      location_id?: number;
      shifts_count: number;
      shifts: Array<{
        id: number;
        user_id: number;
        start: string;
        end: string;
        hourly_wage: number;
        department_id?: number;
        role_id?: number;
        notes?: string;
        breaks?: any[];
      }>;
    };
  }
  
  export interface WeekLaborResponse {
    success: boolean;
    data: {
      week_start: string;
      labor: DailyLaborData;
    };
  }
  
  export interface HourlyLaborResponse {
    success: boolean;
    data: {
      week_start: string;
      hourly_labor: HourlyLaborData;
      daily_totals: { [day: string]: number };
      total_week_cost: number;
    };
  }
  
  export interface HourlyLaborWithOvertimeResponse {
    success: boolean;
    data: {
      week_start: string;
      hourly_labor: HourlyLaborWithOvertimeData;
      daily_totals: any;
      weekly_totals: any;
    };
  }
  
  export interface WeekAnalysisResponse {
    success: boolean;
    data: {
      week_start: string;
      labor: WeekAnalysisData;
      summary: {
        total_labor_cost: number;
        total_labor_hours: number;
        target_labor_percent: number;
        include_payroll_tax: boolean;
        payroll_tax_multiplier: number;
      };
    };
  }
  
  export interface TestConnectionResponse {
    success: boolean;
    message: string;
    test_week_start: string;
    total_scheduled_hours: number;
    total_labor_cost: number;
    days_with_shifts: number;
  }
  
  export interface OverallMetrics {
    totalLaborCost: number;
    totalLaborHours: number;
    totalSales: number;
    currentLaborPercent: number;
    targetPercent: number;
    salesGap: number;
    isOnTarget: boolean;
  }
  
  export interface LaborDashboardData {
    weekLabor?: WeekLaborResponse['data'];
    hourlyLabor?: HourlyLaborResponse['data'] | HourlyLaborWithOvertimeResponse['data'];
    weekAnalysis?: WeekAnalysisResponse['data'];
  }
  
  export interface SelectedCell {
    day: string;
    fullDay: string;
    hour: number;
    hourDisplay: string;
    laborCost: number;
    status: string;
    historicalSales: number;
    requiredSales: number;
    laborPercent: number;
    salesGap: number;
  }

  export type SalesSource = "current" | "prev_week";

  export interface WeeklySalesResponse {
    hourly_sales: Record<string, Record<number, number>>;
    prev_week_hourly_sales: Record<string, Record<number, number>>;
    daily_sales: Record<string, number>;
    prev_week_sales: Record<string, number>;
    daily_sales_source: Record<string, SalesSource>;
  }