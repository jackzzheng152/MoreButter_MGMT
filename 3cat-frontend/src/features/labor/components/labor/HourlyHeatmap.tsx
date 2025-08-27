import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ArrowUp, ArrowDown, Target, AlertTriangle } from "lucide-react";

interface HourlyDataItem {
  day: string;
  fullDay: string;
  hour: number;
  hourDisplay: string;
  laborCost: number;
  historicalSales: number;
  requiredSales: number;
  laborPercent: number;
  status: string;
  salesGap: number;
  // Optional overtime breakdown fields
  baseLaborCost?: number;
  regularCost?: number;
  overtimeCost?: number;
  doubleOtCost?: number;
  totalCost?: number;
  payrollTaxAmount?: number;
}

interface SelectedCell {
  day: string;
  fullDay: string;
  hour: number;
  hourDisplay: string;
  laborCost: number;
  historicalSales?: number;
  requiredSales?: number;
  laborPercent?: number;
  status?: string;
  salesGap?: number;
  // Optional overtime breakdown fields
  baseLaborCost?: number;
  regularCost?: number;
  overtimeCost?: number;
  doubleOtCost?: number;
  totalCost?: number;
  payrollTaxAmount?: number;
}

interface HourlyHeatmapProps {
  hourlyData: any; // Will handle the actual data structure from your API
  weekDisplayText: string;
  targetLaborPercent: number;
  useOvertimeBreakdown: boolean;
  includePayrollTax: boolean;
  selectedCell: SelectedCell | null;
  onCellSelect: (cell: SelectedCell) => void;
  isLoading: boolean;
  hourlySales: Record<string, Record<number, number>>;
  prevWeekHourlySales?: Record<string, Record<number, number>>;
  dailySalesSource?: Record<string, "current" | "prev_week">;
}

const getPerformanceColor = (status: string) => {
  switch (status) {
    case "critical":
      return "bg-red-500 hover:bg-red-600";
    case "underperforming":
      return "bg-orange-400 hover:bg-orange-500";
    case "meeting":
      return "bg-green-400 hover:bg-green-500";
    case "exceeding":
      return "bg-blue-500 hover:bg-blue-600";
    default:
      return "bg-gray-300 hover:bg-gray-400";
  }
};

const getPerformanceIcon = (status: string) => {
  switch (status) {
    case "critical":
      return <ArrowUp className="w-3 h-3 text-white" />;
    case "underperforming":
      return <ArrowUp className="w-3 h-3 text-white" />;
    case "meeting":
      return <Target className="w-3 h-3 text-white" />;
    case "exceeding":
      return <ArrowDown className="w-3 h-3 text-white" />;
    default:
      return null;
  }
};

const getSalesVolumeColor = (sales: number) => {
  if (sales < 50) return "bg-red-100 hover:bg-red-200 border border-red-200";
  if (sales < 150) return "bg-yellow-200 hover:bg-yellow-300 border border-yellow-300";
  if (sales < 300) return "bg-green-300 hover:bg-green-400 border border-green-400";
  return "bg-blue-500 hover:bg-blue-600 border border-blue-600 text-white";
};

export const HourlyHeatmap: React.FC<HourlyHeatmapProps> = ({
  hourlyData,
  weekDisplayText,
  targetLaborPercent,
  useOvertimeBreakdown,
  includePayrollTax,
  selectedCell,
  onCellSelect,
  isLoading,
  hourlySales,
  prevWeekHourlySales,
  dailySalesSource,
}) => {
  const [heatmapView, setHeatmapView] = useState("performance");
  
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const hours = Array.from({ length: 17}, (_, i) => i + 7); // 7 AM to 9 PM



  // Transform the hourlyData into the format we need
  const transformedHourlyData = useMemo(() => {
    if (!hourlyData || !hourlyData.hourly_labor) return [];
    
    const result: HourlyDataItem[] = [];
    const getEffectiveSales = (dayName: string, hour: number) => {
      // current week's sales first
      if (hourlySales?.[dayName]?.[hour] != null) {
        return hourlySales[dayName][hour];
      }
    
      if (
        dailySalesSource?.[dayName] === "prev_week" &&
        prevWeekHourlySales?.[dayName]?.[hour] != null
      ) {
        return prevWeekHourlySales[dayName][hour];
      }
    
      return 0;
    };
    
    const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    const dayAbbrevs = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    
    dayNames.forEach((dayName, dayIndex) => {
      const dayAbbrev = dayAbbrevs[dayIndex];
      const dayData = hourlyData.hourly_labor[dayName];
      
      if (dayData && typeof dayData === 'object') {
        hours.forEach((hour) => {
          const hourData = dayData[hour];
          
          if (hourData && typeof hourData === 'object') {
            // Handle overtime breakdown structure
            const baseLaborCost = useOvertimeBreakdown 
              ? (hourData.total_cost || 0)
              : (hourData.regular_cost || hourData.total_cost || 0);
            
            // Apply payroll tax multiplier if enabled (typically ~12%)
            const payrollTaxMultiplier = includePayrollTax ? 1.12 : 1.0;
            const laborCost = baseLaborCost * payrollTaxMultiplier;
            
            if (baseLaborCost > 0) {
              // For now, we'll use placeholder sales data since it's not in your current structure
              // You'll need to replace this with actual sales data when available
              const sales = getEffectiveSales(dayName, hour);
              const laborPercent = sales > 0 ? (laborCost / sales) * 100 : 0;
              const requiredSales = laborCost / (targetLaborPercent / 100);
              
              let status = "meeting";
              if (laborPercent > targetLaborPercent * 1.25) status = "critical";
              else if (laborPercent > targetLaborPercent) status = "underperforming";
              else if (laborPercent < targetLaborPercent * 0.7) status = "exceeding";
              
              result.push({
                day: dayAbbrev,
                fullDay: dayName,
                hour,
                hourDisplay: `${hour}:00`,
                laborCost,
                historicalSales: sales,
                requiredSales: Math.round(requiredSales),
                laborPercent,
                status,
                salesGap: Math.max(0, requiredSales - sales),

                // Add overtime breakdown details for the selected cell view
                baseLaborCost,
                regularCost: hourData.regular_cost || 0,
                overtimeCost: hourData.overtime_cost || 0,
                doubleOtCost: hourData.double_ot_cost || 0,
                totalCost: hourData.total_cost || 0,
                payrollTaxAmount: includePayrollTax ? (baseLaborCost * 0.12) : 0
              });
            }
          } else if (typeof hourData === 'number' && hourData > 0) {
            // Handle old simple numeric structure as fallback
            const baseLaborCost = hourData;
            const payrollTaxMultiplier = includePayrollTax ? 1.12 : 1.0;
            const laborCost = baseLaborCost * payrollTaxMultiplier;
            const sales = getEffectiveSales(dayName, hour);
            const laborPercent = sales > 0 ? (laborCost / sales) * 100 : 0;
            const requiredSales = laborCost / (targetLaborPercent / 100);
            
            let status = "meeting";
            if (laborPercent > targetLaborPercent * 1.25) status = "critical";
            else if (laborPercent > targetLaborPercent) status = "underperforming";
            else if (laborPercent < targetLaborPercent * 0.7) status = "exceeding";
            
            result.push({
              day: dayAbbrev,
              fullDay: dayName,
              hour,
              hourDisplay: `${hour}:00`,
              laborCost,
              historicalSales: sales,
              requiredSales: Math.round(requiredSales),
              laborPercent,
              status,
              salesGap: Math.max(0, requiredSales - sales)
            });
          }
        });
      }
    });
    
    return result;
  }, [hourlyData, targetLaborPercent, useOvertimeBreakdown, includePayrollTax]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Hourly Labor Heatmap</CardTitle>
          <CardDescription>Loading hourly data...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!hourlyData || transformedHourlyData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Hourly Labor Heatmap</CardTitle>
          <CardDescription>{weekDisplayText}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium mb-2">No Hourly Data Available</h3>
            <p className="text-gray-600">
              Hourly labor data is not available for this week. Please check if the week has been scheduled 
              or upload sales data to enable hourly analysis.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getCellData = (day: string, hour: number): HourlyDataItem | undefined => {
    return transformedHourlyData.find((item) => item.day === day && item.hour === hour);
  };

  const getDailySales = (day: string): number => {
    return hours.reduce((sum, hour) => {
      const cellData = getCellData(day, hour);
      return sum + (cellData?.historicalSales || 0);
    }, 0);
  };

  const getHourlySales = (hour: number): number => {
    return days.reduce((sum, day) => {
      const cellData = getCellData(day, hour);
      return sum + (cellData?.historicalSales || 0);
    }, 0);
  };

  const getDailyLaborPercent = (day: string): number => {
    const dayData = transformedHourlyData.filter(item => item.day === day);
    if (dayData.length === 0) return 0;
    
    const totalLaborCost = dayData.reduce((sum, item) => sum + item.laborCost, 0);
    const totalSales = dayData.reduce((sum, item) => sum + item.historicalSales, 0);
    
    return totalSales > 0 ? (totalLaborCost / totalSales) * 100 : 0;
  };

  const totalSales = transformedHourlyData.reduce((sum, item) => sum + item.historicalSales, 0);

  return (
    <div className="space-y-6">
      {/* Heatmap View Toggle */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Label>Heatmap View:</Label>
              <Select value={heatmapView} onValueChange={setHeatmapView}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper">
                  <SelectItem value="performance">Labor Performance</SelectItem>
                  <SelectItem value="sales">Sales Volume</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-wrap gap-6">
              {heatmapView === "performance" ? (
                <>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-red-500 rounded flex items-center justify-center">
                      <ArrowUp className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-sm font-medium">Critical (Labor % too high)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-orange-400 rounded flex items-center justify-center">
                      <ArrowUp className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-sm font-medium">Above Target</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-green-400 rounded flex items-center justify-center">
                      <Target className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-sm font-medium">Meeting Target</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-blue-500 rounded flex items-center justify-center">
                      <ArrowDown className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-sm font-medium">Below Target (Good)</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-red-100 rounded border"></div>
                    <span className="text-sm font-medium">Low Sales ($0-50)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-yellow-200 rounded border"></div>
                    <span className="text-sm font-medium">Medium Sales ($50-150)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-green-300 rounded border"></div>
                    <span className="text-sm font-medium">Good Sales ($150-300)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-blue-500 rounded border"></div>
                    <span className="text-sm font-medium">High Sales ($300+)</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Heatmap */}
      <Card>
        <CardHeader>
          <CardTitle>
            {heatmapView === "performance" ? "Labor Performance" : "Sales Volume"} Heatmap
          </CardTitle>
          <CardDescription>{weekDisplayText} - Click any cell to see detailed breakdown</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <div className="inline-block min-w-full">
              {/* Time headers */}
              <div className="flex mb-2">
                <div className="w-20 flex-shrink-0"></div>
                {hours.map((hour) => (
                  <div
                    key={hour}
                    className="w-16 flex-shrink-0 text-xs font-medium text-gray-500 text-center"
                  >
                    {hour}:00
                  </div>
                ))}
                <div className="w-24 flex-shrink-0 text-xs font-medium text-gray-500 text-center">
                  Daily Total
                </div>
              </div>

              {/* Heatmap rows */}
              {days.map((day) => {
                const dayTotal = getDailySales(day);
                const dailyLaborPercent = getDailyLaborPercent(day);

                return (
                  <div key={day} className="flex mb-1">
                    <div className="w-20 flex-shrink-0 text-sm font-medium text-gray-700 flex items-center pr-2">
                      <div>
                        <div>{day}</div>
                        <div className="text-xs text-gray-500">
                          {dailyLaborPercent.toFixed(0)}%
                        </div>
                      </div>
                    </div>
                    {hours.map((hour) => {
                      const cellData = getCellData(day, hour);
                      if (!cellData) {
                        return (
                          <div key={hour} className="w-16 h-16 flex-shrink-0 bg-gray-100 rounded flex items-center justify-center">
                            <span className="text-xs text-gray-400">$0</span>
                          </div>
                        );
                      }

                      let cellColor = "";
                      let cellContent = null;

                      if (heatmapView === "performance") {
                        cellColor = getPerformanceColor(cellData.status);
                        cellContent = getPerformanceIcon(cellData.status);
                      } else {
                        // Sales volume coloring
                        const sales = cellData.historicalSales;
                        cellColor = getSalesVolumeColor(sales);
                        cellContent = (
                          <div className="text-xs font-medium text-center">
                            <div>${sales}</div>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={`${day}-${hour}`}
                          className={`w-16 h-16 flex-shrink-0 rounded cursor-pointer transition-all duration-200 flex flex-col items-center justify-center ${cellColor} ${
                            selectedCell?.day === cellData.day && selectedCell?.hour === hour 
                              ? "ring-2 ring-gray-800 scale-105" 
                              : ""
                          }`}
                          onClick={() => onCellSelect(cellData)}
                          title={`${cellData.fullDay} ${hour}:00 - Sales: $${cellData.historicalSales} - Labor: ${cellData.laborPercent.toFixed(1)}%`}
                        >
                          {cellContent}
                        </div>
                      );
                    })}
                    <div className="w-24 flex-shrink-0 flex items-center justify-center">
                                              <div className="text-center">
                          <div className="font-semibold">${dayTotal.toLocaleString()}</div>
                          <div
                            className={`text-xs ${
                              dailyLaborPercent > targetLaborPercent ? "text-red-600" : "text-green-600"
                            }`}
                          >
                            {dailyLaborPercent.toFixed(1)}% labor
                          </div>
                          {dailySalesSource?.[["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"][days.indexOf(day)]] && (
                            <div className="text-xs text-gray-500 mt-1">
                              {dailySalesSource[["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"][days.indexOf(day)]] === "current" ? "Current Week" : "Prev Week"}
                            </div>
                          )}
                        </div>
                    </div>
                  </div>
                );
              })}

              {/* Hourly totals row */}
              <div className="flex mt-2 pt-2 border-t">
                <div className="w-20 flex-shrink-0 text-sm font-medium text-gray-700 flex items-center pr-2">
                  Hourly Total
                </div>
                {hours.map((hour) => {
                  const hourTotal = getHourlySales(hour);
                  return (
                    <div key={hour} className="w-16 flex-shrink-0 text-center mr-1">
                      <div className="text-xs font-medium">${hourTotal.toLocaleString()}</div>
                    </div>
                  );
                })}
                <div className="w-24 flex-shrink-0 text-center">
                  <div className="font-bold">${totalSales.toLocaleString()}</div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Selected Cell Details */}
      {selectedCell && (
        <Card className="border-2 border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <div
                className={`w-8 h-8 rounded ${getPerformanceColor(selectedCell.status || "").split(" ")[0]} flex items-center justify-center`}
              >
                {getPerformanceIcon(selectedCell.status || "")}
              </div>
              <div>
                <div className="text-lg">
                  {selectedCell.fullDay} at {selectedCell.hourDisplay}
                </div>
                <Badge
                  variant={
                    selectedCell.status === "critical" || selectedCell.status === "underperforming"
                      ? "destructive"
                      : selectedCell.status === "exceeding"
                        ? "default"
                        : "outline"
                  }
                  className="mt-1"
                >
                  Labor: {selectedCell.laborPercent?.toFixed(1) || "0.0"}% • Sales: ${selectedCell.historicalSales || 0}
                </Badge>
              </div>
            </CardTitle>
          </CardHeader>

          <CardContent>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div className="bg-white p-3 rounded-lg">
                <p className="text-sm text-gray-600">
                  {useOvertimeBreakdown ? "Total Labor Cost" : "Labor Cost"}
                  {includePayrollTax && " (incl. payroll tax)"}
                </p>
                <p className="text-xl font-bold">
                  ${(selectedCell.baseLaborCost ? 
                    (selectedCell.baseLaborCost * (includePayrollTax ? 1.12 : 1)) : 
                    selectedCell.laborCost
                  ).toFixed(2)}
                </p>
                {useOvertimeBreakdown && selectedCell.regularCost !== undefined && (
                  <div className="text-xs text-gray-500 mt-1">
                    <div>Regular: ${((selectedCell.regularCost || 0) * (includePayrollTax ? 1.12 : 1)).toFixed(2)}</div>
                    {(selectedCell.overtimeCost || 0) > 0 && (
                      <div>Overtime: ${((selectedCell.overtimeCost || 0) * (includePayrollTax ? 1.12 : 1)).toFixed(2)}</div>
                    )}
                    {(selectedCell.doubleOtCost || 0) > 0 && (
                      <div>Double OT: ${((selectedCell.doubleOtCost || 0) * (includePayrollTax ? 1.12 : 1)).toFixed(2)}</div>
                    )}
                  </div>
                )}
                {includePayrollTax && selectedCell.baseLaborCost && (
                  <div className="text-xs text-gray-500 mt-1 pt-1 border-t">
                    <div>Base Cost: ${selectedCell.baseLaborCost.toFixed(2)}</div>
                    <div>Payroll Tax: ${(selectedCell.baseLaborCost * 0.12).toFixed(2)}</div>
                  </div>
                )}
              </div>
              <div className="bg-white p-3 rounded-lg">
                <p className="text-sm text-gray-600">Actual Sales</p>
                <p className="text-xl font-bold">${(selectedCell.historicalSales || 0).toFixed(2)}</p>
                <p className="text-xs text-gray-500 mt-1">Placeholder data</p>
              </div>
              <div className="bg-white p-3 rounded-lg">
                <p className="text-sm text-gray-600">Required Sales</p>
                <p className="text-xl font-bold">
                  ${Math.round((selectedCell.baseLaborCost || selectedCell.laborCost) * 
                    (includePayrollTax ? 1.12 : 1) / (targetLaborPercent / 100))}
                </p>
                <p className="text-xs text-gray-500 mt-1">For {targetLaborPercent}% target</p>
              </div>
              <div className="bg-white p-3 rounded-lg">
                <p className="text-sm text-gray-600">Labor %</p>
                <p
                  className={`text-xl font-bold ${
                    ((selectedCell.baseLaborCost || selectedCell.laborCost) * 
                     (includePayrollTax ? 1.12 : 1) / (selectedCell.historicalSales || 1) * 100) > targetLaborPercent 
                      ? "text-red-600" : "text-green-600"
                  }`}
                >
                  {(((selectedCell.baseLaborCost || selectedCell.laborCost) * 
                     (includePayrollTax ? 1.12 : 1) / (selectedCell.historicalSales || 1) * 100)).toFixed(1)}%
                </p>
                <p className="text-xs text-gray-500 mt-1">Target: {targetLaborPercent}%</p>
              </div>
            </div>

            {(selectedCell.salesGap || 0) > 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Action Needed:</strong> Increase sales by ${selectedCell.salesGap} during this hour
                  to meet your {targetLaborPercent}% labor target. Consider promotions, upselling, or
                  improving service efficiency.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};