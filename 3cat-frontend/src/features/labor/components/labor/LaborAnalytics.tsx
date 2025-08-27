import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface LaborAnalyticsProps {
  data: any;
  weekStart: string;
  targetLaborPercent: number;
  useOvertimeBreakdown: boolean;
}

export const LaborAnalytics: React.FC<LaborAnalyticsProps> = ({
  data,
  weekStart,
  targetLaborPercent,
  useOvertimeBreakdown,
}) => {
  if (!data.weekAnalysis) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Labor Analytics & Insights</CardTitle>
        <CardDescription>Week of {weekStart} - Key metrics and recommendations</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-3">
            <h4 className="font-medium">Weekly Overview</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Total Labor Cost:</span>
                <span className="font-semibold">$0.00</span>
              </div>
              <div className="flex justify-between">
                <span>Average Daily Cost:</span>
                <span className="font-semibold">$0.00</span>
              </div>
              <div className="flex justify-between">
                <span>Highest Cost Day:</span>
                <span className="font-semibold">Monday</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-medium">Performance Indicators</h4>
            <div className="space-y-2">
              <Badge variant="outline">Target: {targetLaborPercent}%</Badge>
              <Badge variant={useOvertimeBreakdown ? "default" : "outline"}>
                {useOvertimeBreakdown ? "Overtime View" : "Standard View"}
              </Badge>
              <Badge variant="outline">Pacific Time Zone</Badge>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-medium">Recommendations</h4>
            <div className="space-y-1 text-sm text-gray-600">
              <p>• Upload sales data for accurate analysis</p>
              <p>• Monitor labor costs throughout the week</p>
              <p>• Review scheduling efficiency</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};