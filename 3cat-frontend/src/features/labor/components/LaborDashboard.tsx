// components/LaborDashboard.tsx
"use client"

import React, { useState, useMemo } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Download,
  AlertTriangle,
  TrendingUp,
  RefreshCw,
  Database,
  Settings,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { format, addDays, startOfWeek } from "date-fns";

import { useLaborDashboardData, useSalesDataManager } from '../hooks/useLaborData';
import type { OverallMetrics, SelectedCell } from '../types/labor';

// Import sub-components
import { WeekSelector } from '../components/labor/WeekSelector';
import { LocationSelector } from '../components/labor/LocationSelector';
import { LaborSummaryCards } from '../components/labor/LaborSummaryCards';
import { DailyAnalysisView } from '../components/labor/DailyAnalysisView';
import { SalesUploadSection } from '../components/labor/SalesUploadSection';
import { HourlyHeatmap } from '../components/labor/HourlyHeatmap';
import { LaborAnalytics } from '../components/labor/LaborAnalytics';

import { useWeeklyNetSalesHourly } from "../hooks/useLaborData";

interface LaborDashboardProps {
  defaultLocationId?: number;
}

export const LaborDashboard: React.FC<LaborDashboardProps> = ({ defaultLocationId }) => {
  // State management
  const [targetLaborPercent, setTargetLaborPercent] = useState([25]);
  const [selectedWeek, setSelectedWeek] = useState("current");
  const [customDateRange, setCustomDateRange] = useState<Date | undefined>(new Date());
  const [includePayrollTax, setIncludePayrollTax] = useState(true);
  const [viewMode, setViewMode] = useState("daily");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [useOvertimeBreakdown, setUseOvertimeBreakdown] = useState(true);
  const [locationId, setLocationId] = useState<number | undefined>(defaultLocationId);
  const [sevenshiftLocationId, setSevenshiftLocationId] = useState<string | undefined>();
  const [selectedCell, setSelectedCell] = useState<SelectedCell | null>(null);

  // Handle location change
  const handleLocationChange = (newLocationId: number, newSevenshiftLocationId?: string) => {
    setLocationId(newLocationId);
    setSevenshiftLocationId(newSevenshiftLocationId);
  };

  // Calculate current week start
  const currentWeekStart = useMemo(() => {
    if (selectedWeek === "custom" && customDateRange) {
      return format(startOfWeek(customDateRange, { weekStartsOn: 1 }), "yyyy-MM-dd");
    }
    
    const today = new Date();
    const currentWeekStart = startOfWeek(today, { weekStartsOn: 1 });
    
    switch (selectedWeek) {
      case "next":
        return format(addDays(currentWeekStart, 7), "yyyy-MM-dd");
      case "week-after":
        return format(addDays(currentWeekStart, 14), "yyyy-MM-dd");
      default:
        return format(currentWeekStart, "yyyy-MM-dd");
    }
  }, [selectedWeek, customDateRange]);

  // Data fetching
  const {
    data: laborData,
    isLoading,
    error,
    refetch
  } = useLaborDashboardData(
    currentWeekStart,
    targetLaborPercent[0],
    includePayrollTax,
    sevenshiftLocationId && sevenshiftLocationId.trim() !== '' ? parseInt(sevenshiftLocationId) : undefined,
    useOvertimeBreakdown
  );


  const { data: weeklySales } = useWeeklyNetSalesHourly(currentWeekStart, sevenshiftLocationId ? parseInt(sevenshiftLocationId) : undefined);

  console.log("data.hourlyLabor", laborData.hourlyLabor)

  const salesDataManager = useSalesDataManager();

  // Calculate overall metrics
  const overallMetrics: OverallMetrics | null = useMemo(() => {
    if (!laborData.weekLabor || !laborData.weekAnalysis) return null;

    const totalLaborCost = Object.values(laborData.weekAnalysis.labor).reduce(
      (sum, day) => sum + day.adjusted_cost, 0
    );
    const totalLaborHours = Object.values(laborData.weekLabor.labor).reduce(
      (sum, day) => sum + day.hours, 0
    );

    // You would get this from sales data when uploaded
    
    const totalSales = weeklySales?.daily_sales
      ? Object.values(weeklySales.daily_sales).reduce((sum, val) => sum + (val ?? 0), 0)
      : 0;
    const currentLaborPercent = totalSales > 0 ? (totalLaborCost / totalSales) * 100 : 0;
    const targetPercent = targetLaborPercent[0];
    const salesGap = Math.max(0, (totalLaborCost / (targetPercent / 100)) - totalSales);

    return {
      totalLaborCost,
      totalLaborHours,
      totalSales,
      currentLaborPercent,
      targetPercent,
      salesGap,
      isOnTarget: currentLaborPercent <= targetPercent
    };
  }, [laborData, targetLaborPercent]);

  const getWeekDisplayText = () => {
    if (selectedWeek === "custom" && customDateRange) {
      const weekStart = startOfWeek(customDateRange, { weekStartsOn: 1 });
      return `${format(weekStart, "MMM d")} - ${format(addDays(weekStart, 6), "MMM d, yyyy")}`;
    }
    
    const today = new Date();
    const currentWeekStart = startOfWeek(today, { weekStartsOn: 1 });
    
    switch (selectedWeek) {
      case "next":
        const nextWeek = addDays(currentWeekStart, 7);
        return `${format(nextWeek, "MMM d")} - ${format(addDays(nextWeek, 6), "MMM d, yyyy")}`;
      case "week-after":
        const weekAfter = addDays(currentWeekStart, 14);
        return `${format(weekAfter, "MMM d")} - ${format(addDays(weekAfter, 6), "MMM d, yyyy")}`;
      default:
        return `${format(currentWeekStart, "MMM d")} - ${format(addDays(currentWeekStart, 6), "MMM d, yyyy")}`;
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Error loading labor data: {error.message}
            <Button onClick={() => refetch()} className="ml-4" size="sm">
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sticky Header with Controls */}
      <div className="sticky top-0 z-10 bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto p-4">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Labor Forecasting Dashboard</h1>
              <p className="text-sm text-gray-600">Week: {getWeekDisplayText()}</p>
            </div>

            
            {/* Quick Controls */}
            <div className="flex flex-wrap items-center gap-3">
              <LocationSelector
                selectedLocationId={locationId}
                onLocationChange={handleLocationChange}
                defaultLocationId={defaultLocationId}
              />

              <WeekSelector
                selectedWeek={selectedWeek}
                onWeekChange={setSelectedWeek}
                customDate={customDateRange}
                onCustomDateChange={setCustomDateRange}
              />

              {/* Labor Target Quick Control */}
              <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg">
                <TrendingUp className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium">Target: {targetLaborPercent[0]}%</span>
                <div className="flex gap-1">
                  {[20, 25, 30].map((percent) => (
                    <Button
                      key={percent}
                      variant={targetLaborPercent[0] === percent ? "default" : "outline"}
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={() => setTargetLaborPercent([percent])}
                    >
                      {percent}%
                    </Button>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <Button onClick={() => refetch()} disabled={isLoading} size="sm">
                {isLoading ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Database className="w-4 h-4 mr-2" />
                )}
                {isLoading ? "Loading..." : "Refresh"}
              </Button>

              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>

          {/* Expandable Settings Panel */}
          <Collapsible open={settingsOpen} onOpenChange={setSettingsOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="mt-2">
                <Settings className="w-4 h-4 mr-2" />
                Advanced Settings
                {settingsOpen ? <ChevronUp className="w-4 h-4 ml-2" /> : <ChevronDown className="w-4 h-4 ml-2" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-4">
              <Card>
                <CardContent className="p-4">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="space-y-3">
                      <Label>Target Labor Percentage: {targetLaborPercent[0]}%</Label>
                      <Slider
                        value={targetLaborPercent}
                        onValueChange={setTargetLaborPercent}
                        max={35}
                        min={15}
                        step={1}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>15% (Aggressive)</span>
                        <span>25% (Standard)</span>
                        <span>35% (Conservative)</span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Label>Display Options</Label>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Use Overtime Breakdown</span>
                        <Switch checked={useOvertimeBreakdown} onCheckedChange={setUseOvertimeBreakdown} />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Include Payroll Tax</span>
                        <Switch checked={includePayrollTax} onCheckedChange={setIncludePayrollTax} />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Current Labor % Alert */}
        {overallMetrics && (
          <Card
            className={`border-2 ${
              overallMetrics.isOnTarget ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"
            }`}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg font-semibold">
                    Current Labor %:{" "}
                    <span className={overallMetrics.isOnTarget ? "text-green-700" : "text-red-700"}>
                      {overallMetrics.currentLaborPercent.toFixed(1)}%
                    </span>
                  </p>
                  <p className="text-sm text-gray-600">
                    Target: {overallMetrics.targetPercent}% •
                    {overallMetrics.isOnTarget
                      ? ` ${(overallMetrics.targetPercent - overallMetrics.currentLaborPercent).toFixed(1)}% under target`
                      : ` ${(overallMetrics.currentLaborPercent - overallMetrics.targetPercent).toFixed(1)}% over target`}
                    {includePayrollTax && " (including payroll taxes)"}
                  </p>
                </div>
                <div className="text-right">
                  <Badge
                    variant={overallMetrics.isOnTarget ? "default" : "destructive"}
                    className="text-lg px-3 py-1"
                  >
                    {overallMetrics.isOnTarget ? "On Target" : "Above Target"}
                  </Badge>
                  {overallMetrics.salesGap > 0 && (
                    <p className="text-sm text-red-600 mt-1">Need +${overallMetrics.salesGap.toLocaleString()} in sales</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Summary Cards */}
        <LaborSummaryCards 
          data={laborData}
          overallMetrics={overallMetrics}
          includePayrollTax={includePayrollTax}
          targetLaborPercent={targetLaborPercent[0]}
          isLoading={isLoading}
        />

        <Tabs value={viewMode} onValueChange={setViewMode} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="daily">Daily Analysis</TabsTrigger>
            <TabsTrigger value="hourly">Detailed Heatmap</TabsTrigger>
          </TabsList>

          <TabsContent value="daily" className="space-y-6">
            <DailyAnalysisView 
                weekLabor={laborData.weekLabor}
                weekAnalysis={laborData.weekAnalysis}
                hourlyData={laborData.hourlyLabor}
                targetLaborPercent={targetLaborPercent[0]}
                includePayrollTax={includePayrollTax}
                useOvertimeBreakdown={useOvertimeBreakdown}
                weekDisplayText={getWeekDisplayText()}
                isLoading={isLoading}
                weeklySales={weeklySales}
            />
          </TabsContent>

          <TabsContent value="sales-input" className="space-y-6">
            <SalesUploadSection 
              weekStart={currentWeekStart}
              weekDisplayText={getWeekDisplayText()}
              salesDataManager={salesDataManager}
            />
          </TabsContent>

          <TabsContent value="hourly" className="space-y-6">
            <HourlyHeatmap 
              hourlyData={laborData.hourlyLabor}
              weekDisplayText={getWeekDisplayText()}
              targetLaborPercent={targetLaborPercent[0]}
              useOvertimeBreakdown={useOvertimeBreakdown}
              selectedCell={selectedCell}
              onCellSelect={setSelectedCell}
              isLoading={isLoading}
              includePayrollTax={includePayrollTax}
              hourlySales={weeklySales?.hourly_sales ?? {}}
              prevWeekHourlySales={weeklySales?.prev_week_hourly_sales ?? {}}
              dailySalesSource={weeklySales?.daily_sales_source ?? {}}
            />
          </TabsContent>
        </Tabs>

        {/* Analytics Section */}
        <LaborAnalytics 
          data={laborData}
          weekStart={currentWeekStart}
          targetLaborPercent={targetLaborPercent[0]}
          useOvertimeBreakdown={useOvertimeBreakdown}
        />
      </div>
    </div>
  );
};