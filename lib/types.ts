export type CategoryId = "groceries" | "produce" | "other";
export type PaymentModeId = "cash" | "upi" | "credit";
export type ExpenseCategoryId =
  | "supplier"
  | "rent"
  | "electricity"
  | "wages"
  | "transport"
  | "other";

export type TabId = "bills" | "overview" | "credits" | "expenses" | "stock" | "calculator";
export type PeriodId = "today" | "week" | "month";
export type PurchaseRangeId = "all" | "today" | "week" | "month" | "custom";

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
  /** Who owes the money. Only set when mode is "credit". */
  customer?: string;
  /** Repayments against a credit sale, oldest first. */
  creditPayments?: PurchasePayment[];
}

export interface Expense {
  id: string;
  /** YYYY-MM-DD */
  date: string;
  desc: string;
  category: ExpenseCategoryId;
  amount: number;
  time: string;
}

/** Money handed to the supplier after the purchase day, against one purchase. */
export interface PurchasePayment {
  id: string;
  /** YYYY-MM-DD */
  date: string;
  amount: number;
}

/** One load of goods taken from a wholesaler, and what has been paid for it. */
export interface Purchase {
  id: string;
  /** YYYY-MM-DD */
  date: string;
  supplier: string;
  item: string;
  /** value of the goods taken */
  amount: number;
  /** handed over at the counter on the purchase day */
  paidUpfront: number;
  /** later part-payments against this purchase, oldest first */
  payments: PurchasePayment[];
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

/** What the shop charges for an item, looked up at the counter. */
export interface PriceItem {
  id: string;
  name: string;
  /** Free text, so a shop can name its own aisles. */
  category?: string | null;
  price: number;
  /** What the price is per: "kg", "litre", "piece". Optional. */
  unit?: string | null;
}
