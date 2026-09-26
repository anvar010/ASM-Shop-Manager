import { db } from "./db";

/* What the drawer should hold, worked out from the ledger itself. */

/**
 * Net cash that went through the drawer between two days: cash sales, plus
 * cash paid back against credit, minus expenses. `inclusive` covers the days
 * themselves; otherwise only the days strictly between them.
 */
async function movement(from: string, to: string, inclusive: boolean): Promise<number> {
  const pool = db();
  const [lo, hi] = inclusive ? [">=", "<="] : [">", "<"];
  const one = async (sql: string) =>
    Number(((await pool.query(sql, [from, to]))[0] as { v: number }[])[0]?.v ?? 0);

  const cashSales = await one(
    `SELECT COALESCE(SUM(amount), 0) AS v FROM bills WHERE sold_on ${lo} ? AND sold_on ${hi} ? AND mode = 'cash'`,
  );
  let cashBack: number;
  try {
    cashBack = await one(
      `SELECT COALESCE(SUM(amount), 0) AS v FROM bill_credit_payments WHERE paid_on ${lo} ? AND paid_on ${hi} ? AND mode = 'cash'`,
    );
  } catch (e) {
    // Before db/credit-payment-mode.sql, every repayment counts as cash.
    if ((e as { code?: string }).code !== "ER_BAD_FIELD_ERROR") throw e;
    cashBack = await one(
      `SELECT COALESCE(SUM(amount), 0) AS v FROM bill_credit_payments WHERE paid_on ${lo} ? AND paid_on ${hi} ?`,
    );
  }
  const spent = await one(
    `SELECT COALESCE(SUM(amount), 0) AS v FROM expenses WHERE spent_on ${lo} ? AND spent_on ${hi} ?`,
  );
  return cashSales + cashBack - spent;
}

/**
 * The cash already in the drawer when a day starts: what was left after the
 * last closing before it, plus whatever moved on the days since. With nothing
 * ever closed there is no baseline, so a drawer starts at zero.
 */
export async function openingCash(date: string): Promise<number> {
  const [rows] = await db().query(
    `SELECT closed_on, counted, taken_out FROM daily_closings
     WHERE closed_on < ? ORDER BY closed_on DESC LIMIT 1`,
    [date],
  );
  const last = (rows as { closed_on: string; counted: number; taken_out: number }[])[0];
  if (!last) return 0;
  const left = Number(last.counted) - Number(last.taken_out);
  const since = await movement(last.closed_on, date, false);
  return Math.round((left + since) * 100) / 100;
}

/** What the drawer should hold at the end of a day. */
export async function expectedDrawer(date: string): Promise<number> {
  const opening = await openingCash(date);
  const day = await movement(date, date, true);
  return Math.round((opening + day) * 100) / 100;
}

