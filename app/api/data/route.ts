import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { canAccess, currentUser } from "@/lib/session";
import { toBill, toExpense, toPurchase } from "@/lib/rows";

// The ledger changes on every write, so this must never be cached.
export const dynamic = "force-dynamic";

/** The whole book in one round trip — the app derives every figure from it. */
export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  try {
    const pool = db();
    const [billRows] = await pool.query("SELECT * FROM bills ORDER BY sold_on DESC, sold_at DESC");
    const [creditPays] = await pool.query(
      "SELECT id, bill_id AS parent_id, paid_on, amount FROM bill_credit_payments ORDER BY paid_on",
    );
    /* Expenses go to whoever may record them, which is now staff as well as
       the owner. Gated on the same rule the write routes use, so the tab and
       the data can never disagree. */
    const [expenseRows] = canAccess(user.role, "expenses")
      ? await pool.query("SELECT * FROM expenses ORDER BY spent_on DESC, spent_at DESC")
      : [[]];
    const [purchaseRows] = await pool.query("SELECT * FROM purchases ORDER BY bought_on DESC");
    const [priceRows] = await pool.query(
      "SELECT id, name, category, price, per_qty AS perQty, unit FROM price_items ORDER BY category, name",
    );
    const [categoryRows] = await pool.query(
      "SELECT name FROM price_categories ORDER BY name",
    );
    const [purchasePays] = await pool.query(
      "SELECT id, purchase_id AS parent_id, paid_on, amount FROM purchase_payments ORDER BY paid_on",
    );

    const by = (rows: any[], key: string) => rows.filter((r) => r.parent_id === key);

    return NextResponse.json({
      bills: (billRows as any[]).map((r) => toBill(r, by(creditPays as any[], r.id))),
      expenses: (expenseRows as any[]).map(toExpense),
      purchases: (purchaseRows as any[]).map((r) => toPurchase(r, by(purchasePays as any[], r.id))),
      prices: priceRows,
      categories: (categoryRows as { name: string }[]).map((r) => r.name),
    });
  } catch (e) {
    console.error("GET /api/data", e);
    return NextResponse.json({ error: "Could not read the ledger" }, { status: 500 });
  }
}
