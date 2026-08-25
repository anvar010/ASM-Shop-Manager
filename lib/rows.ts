import type { Bill, Expense, Purchase, PurchasePayment } from "./types";

/*
 * Translation between database rows and the shapes the app renders.
 *
 * The database keeps real DATE and TIME columns; the UI wants "9:14 AM".
 * Converting here means neither side has to know about the other's format.
 */

/** "17:30:00" -> "5:30 PM" */
export function timeFromSql(sqlTime: string): string {
  const [h, m] = sqlTime.split(":").map(Number);
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m < 10 ? "0" + m : m} ${h >= 12 ? "PM" : "AM"}`;
}

/** "5:30 PM" -> "17:30:00" */
export function timeToSql(label: string): string {
  const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(label.trim());
  if (!m) return "12:00:00";
  let h = Number(m[1]) % 12;
  if (m[3].toUpperCase() === "PM") h += 12;
  return `${String(h).padStart(2, "0")}:${m[2]}:00`;
}

type BillRow = {
  id: string;
  sold_on: string;
  sold_at: string;
  description: string;
  category: Bill["category"];
  amount: number;
  mode: Bill["mode"];
  customer: string | null;
};

type PaymentRow = { id: string; parent_id: string; paid_on: string; amount: number };

export function toBill(row: BillRow, payments: PaymentRow[]): Bill {
  const bill: Bill = {
    id: row.id,
    date: row.sold_on,
    desc: row.description,
    category: row.category,
    amount: row.amount,
    time: timeFromSql(row.sold_at),
    mode: row.mode,
  };
  if (row.mode === "credit") {
    bill.customer = row.customer ?? "Unnamed";
    bill.creditPayments = payments.map(toPayment);
  }
  return bill;
}

type ExpenseRow = {
  id: string;
  spent_on: string;
  spent_at: string;
  description: string;
  category: Expense["category"];
  amount: number;
};

export function toExpense(row: ExpenseRow): Expense {
  return {
    id: row.id,
    date: row.spent_on,
    desc: row.description,
    category: row.category,
    amount: row.amount,
    time: timeFromSql(row.spent_at),
  };
}

type PurchaseRow = {
  id: string;
  bought_on: string;
  supplier: string;
  item: string;
  amount: number;
  paid_upfront: number;
};

export function toPurchase(row: PurchaseRow, payments: PaymentRow[]): Purchase {
  return {
    id: row.id,
    date: row.bought_on,
    supplier: row.supplier,
    item: row.item,
    amount: row.amount,
    paidUpfront: row.paid_upfront,
    payments: payments.map(toPayment),
  };
}

function toPayment(row: PaymentRow): PurchasePayment {
  return { id: row.id, date: row.paid_on, amount: row.amount };
}
