// components/labor/DailyAnalysisView.tsx
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUp, ArrowDown, Target } from "lucide-react";

import { SalesSource, WeeklySalesResponse } from '../../types/labor';

interface WeekLaborResponse {
  labor: {
    [day: string]: {
      hours: number;
      cost: number;
    };
  };
}

interface WeekAnalysisResponse {
  labor: {
    [day: string]: {
      base_cost: number;
      adjusted_cost: number;
      regular_cost?: number;
      overtime_cost?: number;
      double_ot_cost?: number;
      total_cost?: number;
    };
  };
}

interface DailyAnalysisViewProps {
  weekLabor?: WeekLaborResponse;
  weekAnalysis?: WeekAnalysisResponse;
  hourlyData?: any; // Add hourly data prop
  targetLaborPercent: number;
  includePayrollTax: boolean;
  useOvertimeBreakdown: boolean;
  weekDisplayText: string;
  isLoading: boolean;
  weeklySales?: WeeklySalesResponse;
}

// interface WeeklySalesResponse {
//   hourly_sales: Record<string, Record<number, number>>;
//   prev_week_hourly_sales: Record<string, Record<number, number>>;
//   daily_sales: Record<string, number>;
//   prev_week_sales: Record<string, number>;
//   daily_sales_source: Record<string, SalesSource>;
// }

export const DailyAnalysisView: React.FC<DailyAnalysisViewProps> = ({
  weekLabor,
  weekAnalysis,
  hourlyData,
  targetLaborPercent,
  includePayrollTax,
  useOvertimeBreakdown,
  weekDisplayText,
  isLoading,
  weeklySales,
}) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Daily Labor % Analysis</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-16 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!weekLabor) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Daily Labor % Analysis</CardTitle>
          <CardDescription>No data available for {weekDisplayText}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center text-gray-500 py-8">
            No labor data found. Please check your 7shifts connection.
          </div>
        </CardContent>
      </Card>
    );
  }

  const getPerformanceColor = (laborPercent: number) => {
    if (laborPercent > targetLaborPercent * 1.25) return "bg-red-500";
    if (laborPercent > targetLaborPercent) return "bg-orange-400";
    if (laborPercent < targetLaborPercent * 0.7) return "bg-blue-500";
    return "bg-green-400";
  };

  const getPerformanceIcon = (laborPercent: number) => {
    if (laborPercent > targetLaborPercent * 1.25) return <ArrowUp className="w-3 h-3 text-white" />;
    if (laborPercent > targetLaborPercent) return <ArrowUp className="w-3 h-3 text-white" />;
    if (laborPercent < targetLaborPercent * 0.7) return <ArrowDown className="w-3 h-3 text-white" />;
    return <Target className="w-3 h-3 text-white" />;
  };

  // Helper to safely pick the first defined numeric value from multiple keys
  const pickNum = (obj: any, keys: string[], fallback = 0) => {
    for (const k of keys) {
      const v = obj?.[k];
      if (typeof v === "number" && !Number.isNaN(v)) return v;
    }
    return fallback;
  };

  const getDailyLaborCost = (dayName: string) => {
    const dayData = hourlyData?.hourly_labor?.[dayName];

    // Fallback: use weekAnalysis if no hourly breakdown for the day
    if (!dayData) {
      const dayAnalysis = weekAnalysis?.labor?.[dayName];
      if (!dayAnalysis) return { totalCost: 0, baseCost: 0, breakdown: null };

      const base = dayAnalysis.base_cost ?? 0;
      const adjusted = dayAnalysis.adjusted_cost ?? base;

      const total = useOvertimeBreakdown ? adjusted : base;
      const finalCost = includePayrollTax ? total * 1.12 : total;

      return {
        totalCost: finalCost,
        baseCost: total,
        breakdown: useOvertimeBreakdown
          ? {
              regular: base,
              overtime: Math.max(0, adjusted - base),
              doubleOt: 0,
            }
          : null,
      };
    }

    // Use whatever hour keys exist (strings or numbers), sort ascending
    const hourKeys = Object.keys(dayData)
      .map((k) => (Number.isNaN(Number(k)) ? k : Number(k)))
      .sort((a: any, b: any) => (a > b ? 1 : a < b ? -1 : 0));

    let totalDailyCost = 0;
    let totalRegular = 0;
    let totalOvertime = 0;
    let totalDoubleOt = 0;

    for (const h of hourKeys) {
      const hourVal = (dayData as any)[h];

      if (typeof hourVal === "number") {
        // Simple numeric hour
        totalDailyCost += hourVal;
        totalRegular += hourVal; // treat as regular when breakdown disabled upstream
        continue;
      }

      if (hourVal && typeof hourVal === "object") {
        // Support multiple possible field names
        const regular = pickNum(hourVal, ["regular_cost", "regular", "base_cost"]);
        const overtime = pickNum(hourVal, ["overtime_cost", "overtime", "ot_cost", "ot"]);
        const doubleOt = pickNum(hourVal, ["double_ot_cost", "double_ot", "double_overtime", "2x_ot"]);
        const total =
          pickNum(hourVal, ["total_cost", "total", "sum"]) || regular + overtime + doubleOt;

        if (useOvertimeBreakdown) {
          totalDailyCost += total;
          totalRegular += regular;
          totalOvertime += overtime;
          totalDoubleOt += doubleOt;
        } else {
          // when not breaking down, prefer regular; fallback to total
          const regularOrTotal = regular || total;
          totalDailyCost += regularOrTotal;
          totalRegular += regularOrTotal;
        }
      }
    }

    const finalCost = includePayrollTax ? totalDailyCost * 1.12 : totalDailyCost;

    return {
      totalCost: finalCost,
      baseCost: totalDailyCost,
      breakdown: useOvertimeBreakdown
        ? {
            regular: totalRegular,
            overtime: totalOvertime,
            doubleOt: totalDoubleOt,
          }
        : null,
    };
  };

  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Daily Labor % Analysis</CardTitle>
        <CardDescription>
          Labor cost as percentage of sales for {weekDisplayText}
          {useOvertimeBreakdown && " (including overtime breakdown)"}
          {includePayrollTax && " (including payroll tax)"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {days.map((day) => {
            const dayLabor = weekLabor?.labor[day];
            
            if (!dayLabor) return null;

            const costInfo = getDailyLaborCost(day);
            const laborCost = costInfo.totalCost;
            
            // Placeholder sales data - replace with actual sales when available
            const historicalSales = weeklySales?.daily_sales[day] ?? 0;
            const requiredSales = laborCost / (targetLaborPercent / 100);
            const currentLaborPercent = (laborCost / historicalSales) * 100;
            const salesGap = Math.max(0, requiredSales - historicalSales);

            return (
              <div
                key={day}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-12 h-12 rounded-lg ${getPerformanceColor(currentLaborPercent)} flex items-center justify-center`}
                  >
                    {getPerformanceIcon(currentLaborPercent)}
                  </div>
                  <div>
                    <p className="font-semibold text-lg">{day}</p>
                    <div className="text-sm text-gray-600">
                      <div>
                        ${laborCost.toFixed(2)}
                        {includePayrollTax && costInfo.baseCost && ` (${costInfo.baseCost.toFixed(2)} + tax)`} • {dayLabor.hours} hours scheduled
                      </div>
                      {useOvertimeBreakdown && costInfo.breakdown && (
                        <div className="text-xs mt-1">
                          Regular: ${(costInfo.breakdown.regular * (includePayrollTax ? 1.12 : 1)).toFixed(2)}
                          {costInfo.breakdown.overtime > 0 && (
                            <span> • OT: ${(costInfo.breakdown.overtime * (includePayrollTax ? 1.12 : 1)).toFixed(2)}</span>
                          )}
                          {costInfo.breakdown.doubleOt > 0 && (
                            <span> • 2xOT: ${(costInfo.breakdown.doubleOt * (includePayrollTax ? 1.12 : 1)).toFixed(2)}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-6 text-center">
                  <div>
                    <p className="text-sm text-gray-600">Historical Sales</p>
                    <p className="font-semibold">${historicalSales.toLocaleString()}</p>
                    <p className="text-xs text-gray-500">{weeklySales?.daily_sales_source[day]}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Required Sales</p>
                    <p className="font-semibold">${Math.round(requiredSales).toLocaleString()}</p>
                    <p className="text-xs text-gray-500">For {targetLaborPercent}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Current Labor %</p>
                    <p
                      className={`font-bold text-lg ${
                        currentLaborPercent > targetLaborPercent ? "text-red-600" : "text-green-600"
                      }`}
                    >
                      {currentLaborPercent.toFixed(1)}%
                    </p>
                    <p className="text-xs text-gray-500">Target: {targetLaborPercent}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Sales Gap</p>
                    <p className={`font-semibold ${salesGap > 0 ? "text-red-600" : "text-green-600"}`}>
                      {salesGap > 0 ? `+${Math.round(salesGap).toLocaleString()}` : "✓ Met"}
                    </p>
                    <p className="text-xs text-gray-500">
                      {salesGap > 0 ? "Needed" : "On target"}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};