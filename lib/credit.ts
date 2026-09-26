import { db } from "./db";
import { formatINR } from "./format";
import { pushToAdmins } from "./push";

/*
 * Push-only reminders for credit customers who owe more than a limit.
 *
 * The limit is an environment setting rather than a table row, so turning the
 * reminders on needs no change to the live database.
 */

const DEFAULT_LIMIT = 5000;

/** Rupees a customer may owe before the owner is told. 0 switches reminders off. */
export function creditLimit(): number {
  const raw = process.env.CREDIT_LIMIT;
  if (raw === undefined || raw.trim() === "") return DEFAULT_LIMIT;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : DEFAULT_LIMIT;
}

/** What one customer still owes across every credit sale. */
export async function creditOutstanding(customer: string): Promise<number> {
  const [rows] = await db().query(
    `SELECT COALESCE(SUM(b.amount), 0) - COALESCE(SUM(r.repaid), 0) AS owed
     FROM bills b
     LEFT JOIN (
       SELECT bill_id, SUM(amount) AS repaid FROM bill_credit_payments GROUP BY bill_id
     ) r ON r.bill_id = b.id
     WHERE b.mode = 'credit' AND b.customer = ?`,
    [customer],
  );
  return Number((rows as { owed: number }[])[0]?.owed ?? 0);
}

/**
 * Tells the owner when a sale or edit carries a customer over the limit.
 * Only the crossing notifies — a customer already above it is not pinged on
 * every further bill; the daily digest covers them. Never throws.
 */
export async function alertIfOverLimit(customer: string, added: number): Promise<void> {
  try {
    const limit = creditLimit();
    if (limit <= 0 || added <= 0) return;
    const owed = await creditOutstanding(customer);
    if (owed < limit || owed - added >= limit) return;
    await pushToAdmins({
      title: `${customer} is over the credit limit`,
      body: `Owes ${formatINR(owed)} — the limit is ${formatINR(limit)}.`,
      url: "/credits",
      tag: `credit-${customer}`,
    });
  } catch (e) {
    console.error("credit: limit check failed", e);
  }
}

/** Everyone currently at or above the limit, largest debt first. */
export async function customersOverLimit(): Promise<{ customer: string; owed: number }[]> {
  const limit = creditLimit();
  if (limit <= 0) return [];
  const [rows] = await db().query(
    `SELECT b.customer, SUM(b.amount) - COALESCE(SUM(r.repaid), 0) AS owed
     FROM bills b
     LEFT JOIN (
       SELECT bill_id, SUM(amount) AS repaid FROM bill_credit_payments GROUP BY bill_id
     ) r ON r.bill_id = b.id
     WHERE b.mode = 'credit'
     GROUP BY b.customer
     HAVING owed >= ?
     ORDER BY owed DESC`,
    [limit],
  );
  return (rows as { customer: string; owed: number }[]).map((r) => ({
    customer: r.customer,
    owed: Number(r.owed),
  }));
}
