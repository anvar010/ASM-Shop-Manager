import type {
  Category,
  CategoryId,
  ExpenseCategory,
  ExpenseCategoryId,
  PaymentMode,
  PaymentModeId,
  PurchaseRangeId,
} from "./types";

export const CATEGORIES: Category[] = [
  { id: "groceries", label: "Groceries", color: "#2952CC" },
  { id: "produce", label: "Fruits & Vegetables", color: "#1E9E6B" },
  { id: "other", label: "Other", color: "#8B92A0" },
];

export const PAYMENT_MODES: PaymentMode[] = [
  { id: "cash", label: "Cash", note: "Notes and coins", color: "#1E9E6B" },
  { id: "upi", label: "UPI", note: "PhonePe, GPay, Paytm", color: "#2952CC" },
  { id: "credit", label: "Credit", note: "Taken now, paid later", color: "#C08A2E" },
];

/** Date windows offered by the all-bills view of the purchase ledger. */
export const PURCHASE_RANGES: { id: PurchaseRangeId; label: string }[] = [
  { id: "all", label: "All time" },
  { id: "today", label: "Today" },
  { id: "week", label: "This week" },
  { id: "month", label: "This month" },
];

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  { id: "supplier", label: "Supplier", color: "#C23B33" },
  { id: "rent", label: "Rent", color: "#C08A2E" },
  { id: "electricity", label: "Electricity", color: "#C77C1E" },
  { id: "wages", label: "Wages", color: "#2952CC" },
  { id: "transport", label: "Transport", color: "#1E9E6B" },
  { id: "other", label: "Other", color: "#8B92A0" },
];

export const PAD_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "00", "0", "back"];

export function categoryMeta(id: CategoryId | string): Category {
  return CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[CATEGORIES.length - 1];
}

export function modeMeta(id: PaymentModeId | string): PaymentMode {
  return PAYMENT_MODES.find((m) => m.id === id) ?? PAYMENT_MODES[0];
}

export function expenseMeta(id: ExpenseCategoryId | string): ExpenseCategory {
  return (
    EXPENSE_CATEGORIES.find((c) => c.id === id) ??
    EXPENSE_CATEGORIES[EXPENSE_CATEGORIES.length - 1]
  );
}

/*
 * What a shop starts with. Categories are free text on the item, so these are
 * only a starting point — anything typed once appears in the list afterwards.
 */
export const DEFAULT_PRICE_CATEGORIES = ["Bakery", "Groceries", "Vegetables", "Fruits"];
