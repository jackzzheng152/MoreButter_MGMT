export interface SalesData {
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

export interface PaymentsData {
  totalCollected: number;
  card: number;
  cash: number;
  giftCardRedemption: number;
  storeCreditRedemption: number;
  processingFees: number;
  snackpassFees: number;
  netCollected: number;
}

export interface SalesSummaryData {
  date: string;
  sales: SalesData;
  payments: PaymentsData;
}

export interface CategorySales {
  category: string;
  quantity: number;
  revenue: number;
  percentage: number;
}

export interface ProviderSales {
  provider: string;
  orders: number;
  revenue: number;
  percentage: number;
}

export interface ItemSales {
  item: string;
  category: string;
  quantity: number;
  revenue: number;
  averagePrice: number;
}

export interface DateValidationData {
  valid: boolean;
  csv_min_date: string;
  csv_max_date: string;
  expected_start_date: string;
  expected_end_date: string;
  csv_exactly_matches: boolean;
  total_orders: number;
  error?: string;
}

export interface ExistingDataInfo {
  has_existing_data: boolean;
  existing_dates: Array<{
    date: string;
    count: number;
    formatted_date: string;
  }>;
  total_existing_orders: number;
  error?: string;
}

export interface SalesUploadResponse {
  success: boolean;
  message: string;
  data?: SalesSummaryData;
  error?: string;
  validation_error?: boolean;
  date_validation?: DateValidationData;
  existing_data_error?: boolean;
  existing_data?: ExistingDataInfo;
}

export interface SnackpassCSVRow {
  // Add fields based on actual Snackpass CSV structure
  orderId?: string;
  orderDate?: string;
  itemName?: string;
  category?: string;
  quantity?: number;
  price?: number;
  total?: number;
  paymentMethod?: string;
  location?: string;
  // Add more fields as needed
} 