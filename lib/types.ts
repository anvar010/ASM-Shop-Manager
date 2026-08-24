export type CategoryId = "groceries" | "produce" | "other";
export type PaymentModeId = "cash" | "upi";
export type ExpenseCategoryId =
  | "supplier"
  | "rent"
  | "electricity"
  | "wages"
  | "transport"
  | "other";

export type TabId = "home" | "bills" | "expenses" | "stock" | "reports";
export type PeriodId = "today" | "week" | "month";

export interface Category {
  id: CategoryId;
  label: string;
  color: string;
}

export interface PaymentMode {
  id: PaymentModeId;
  label: string;
  note: string;
  color: string;
}

export interface ExpenseCategory {
  id: ExpenseCategoryId;
  label: string;
  color: string;
}

export interface Bill {
  id: string;
  /** YYYY-MM-DD */
  date: string;
  desc: string;
  category: CategoryId;
  amount: number;
  /** e.g. "9:14 AM" */
  time: string;
  mode: PaymentModeId;
}

export interface Expense {
  id: string;
  desc: string;
  category: ExpenseCategoryId;
  amount: number;
  time: string;
}

export interface Product {
  id: string;
  name: string;
  category: CategoryId;
  unit: string;
  qty: number;
  /** low-stock alert fires at or below this */
  threshold: number;
  updated: string;
}

export interface DayOption {
  key: string;
  short: string;
  sub: string;
  long: string;
}

export interface PeriodStats {
  label: string;
  list: Bill[];
  total: number;
  bills: number;
  trend: number[];
  trendLabels: string[];
  compare: string;
  up: boolean;
  has: boolean;
}
