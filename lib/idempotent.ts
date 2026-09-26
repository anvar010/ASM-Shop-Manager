import { db } from "./db";

/**
 * Rows are created with ids the app generates, and a save waiting in an
 * offline outbox may be sent twice — once if the reply is lost, again on the
 * next reconnect. A create that finds its id already there did its job the
 * first time, so it answers "done" instead of failing on the duplicate key and
 * repeating any alert it sent.
 */
export async function alreadyStored(
  table: "bills" | "expenses" | "purchases" | "bill_credit_payments" | "purchase_payments",
  id: unknown,
): Promise<boolean> {
  if (typeof id !== "string" || id === "") return false;
  const [rows] = await db().query(`SELECT 1 FROM ${table} WHERE id = ? LIMIT 1`, [id]);
  return (rows as unknown[]).length > 0;
}
