// components/labor/LaborSummaryCards.tsx
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Clock, TrendingUp, Target, AlertTriangle } from "lucide-react";
import type { LaborDashboardData, OverallMetrics } from '../../types/labor';

interface LaborSummaryCardsProps {
  data: LaborDashboardData;
  overallMetrics: OverallMetrics | null;
  includePayrollTax: boolean;
  targetLaborPercent: number;
  isLoading: boolean;
}

export const LaborSummaryCards: React.FC<LaborSummaryCardsProps> = ({
  overallMetrics,
  includePayrollTax,
  targetLaborPercent,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-8 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!overallMetrics) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-gray-500">
              No labor data available
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <Clock className="w-8 h-8 text-blue-500" />
            <div>
              <p className="text-2xl font-bold">${overallMetrics.totalLaborCost.toLocaleString()}</p>
              <p className="text-sm text-gray-600">
                Total Labor Cost {includePayrollTax && "(incl. taxes)"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-green-500" />
            <div>
              <p className="text-2xl font-bold">${overallMetrics.totalSales.toLocaleString()}</p>
              <p className="text-sm text-gray-600">Total Sales</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <Target className="w-8 h-8 text-purple-500" />
            <div>
              <p className="text-2xl font-bold">
                ${(overallMetrics.totalLaborCost / (targetLaborPercent / 100)).toLocaleString()}
              </p>
              <p className="text-sm text-gray-600">Required Sales ({targetLaborPercent}%)</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <AlertTriangle className={`w-8 h-8 ${overallMetrics.salesGap > 0 ? "text-red-500" : "text-green-500"}`} />
            <div>
              <p className={`text-2xl font-bold ${overallMetrics.salesGap > 0 ? "text-red-600" : "text-green-600"}`}>
                {overallMetrics.salesGap > 0 ? `+$${overallMetrics.salesGap.toLocaleString()}` : "✓ On Target"}
              </p>
              <p className="text-sm text-gray-600">Sales Gap</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};