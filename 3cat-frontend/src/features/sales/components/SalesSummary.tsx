import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Info } from "lucide-react";

interface SalesData {
  orders: number;
  subtotal: number;
  grossSales: number;
  refunds: number;
  discounts: number;
  netSales: number;
  taxesYouOwe: number;
  tips: number;
  totalSales: number;
}

interface PaymentsData {
  cash: number;
  giftCardRedemption: number;
  storeCreditRedemption: number;
  processingFees: number;
  snackpassFees: number;
  netCollected: number;
}

interface SalesSummaryProps {
  data: {
    date: string;
    sales: SalesData;
    payments: PaymentsData;
    source_file?: string;
  };
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

const formatNegativeCurrency = (amount: number) => {
  if (amount < 0) {
    return `(${formatCurrency(Math.abs(amount))})`;
  }
  return formatCurrency(amount);
};

const MetricRow: React.FC<{ label: string; value: string | number }> = ({ 
  label, 
  value
}) => (
  <div className="flex items-center justify-between py-2">
    <span className="text-sm text-gray-700">{label}</span>
    <span className="text-sm font-medium text-gray-900">{value}</span>
  </div>
);

export const SalesSummary: React.FC<SalesSummaryProps> = ({ data }) => {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Sales Panel */}
      <Card className="border border-gray-200">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold text-gray-900">Sales</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          <MetricRow label="Orders" value={data.sales.orders} />
          <MetricRow label="Subtotal" value={formatCurrency(data.sales.subtotal)} />
          <MetricRow label="Gross Sales" value={formatCurrency(data.sales.grossSales)} />
          <MetricRow label="Refunds" value={formatCurrency(data.sales.refunds)} />
          <MetricRow label="Discounts" value={formatCurrency(data.sales.discounts)} />
          <MetricRow label="Net Sales" value={formatCurrency(data.sales.netSales)} />
          <MetricRow label="Taxes You Owe" value={formatCurrency(data.sales.taxesYouOwe)} />
          <MetricRow label="Tips" value={formatCurrency(data.sales.tips)} />
          <MetricRow label="Total Sales" value={formatCurrency(data.sales.totalSales)} />
        </CardContent>
      </Card>

      {/* Payments Panel */}
      <Card className="border border-gray-200">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold text-gray-900">Payments</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          <MetricRow label="Cash" value={formatCurrency(data.payments.cash)} />
          <MetricRow label="Gift Card Redemption" value={formatCurrency(data.payments.giftCardRedemption)} />
          <MetricRow label="Store Credit Redemption" value={formatCurrency(data.payments.storeCreditRedemption)} />
          <MetricRow label="Processing Fees" value={formatNegativeCurrency(data.payments.processingFees)} />
          <MetricRow label="Snackpass Fees" value={formatNegativeCurrency(data.payments.snackpassFees)} />
          <MetricRow label="Net Collected" value={formatCurrency(data.payments.netCollected)} />
        </CardContent>
      </Card>
      </div>
    </div>
  );
}; 