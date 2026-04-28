export interface TopSellerRow {
  salesperson_id: string;
  salesperson_name: string;
  total_sales: number;
  total_revenue: number;
  avg_sale_value: number;
}

export interface TopProductRow {
  product_id: string;
  product_name: string;
  product_sku: string;
  category_id: string | null;
  category_name: string | null;
  units_sold: number;
  total_revenue: number;
}

export interface ProductMarginRow {
  product_id: string;
  product_name: string;
  product_sku: string;
  category_name: string | null;
  cost_price: number | null;
  sale_price: number;
  margin_amount: number | null;
  margin_pct: number | null;
  units_sold: number;
  total_revenue: number;
}

export interface RevenueTrendPoint {
  period: string;
  revenue: number;
  sales_count: number;
}

export interface RevenueByPaymentMethod {
  payment_method: string;
  revenue: number;
  sales_count: number;
}

export interface RevenueByCategory {
  category_id: string | null;
  category_name: string | null;
  revenue: number;
  units_sold: number;
}

export interface RevenueReportResponse {
  trend: RevenueTrendPoint[];
  by_payment_method: RevenueByPaymentMethod[];
  by_category: RevenueByCategory[];
  totals: {
    total_revenue: number;
    total_sales: number;
    avg_ticket: number;
  };
}
