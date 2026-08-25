import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/session";
import { sendSettlementAlert } from "@/lib/changes";
import { formatINR } from "@/lib/format";

export const dynamic = "force-dynamic";

/** Records money handed to a supplier after the purchase day. */
export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  try {
    const { id, purchaseId, date, amount } = await request.json();

    const [rows] = await db().query(
      `SELECT w.supplier, w.item,
              GREATEST(w.amount - w.paid_upfront - COALESCE(SUM(p.amount), 0), 0) AS owed
       FROM purchases w
       LEFT JOIN purchase_payments p ON p.purchase_id = w.id
       WHERE w.id = ? GROUP BY w.id`,
      [purchaseId],
    );
    const load = (rows as Record<string, unknown>[])[0];

    await db().execute(
      "INSERT INTO purchase_payments (id, purchase_id, paid_on, amount) VALUES (?, ?, ?, ?)",
      [id, purchaseId, date, amount],
    );

    if (load) {
      const owed = Number(load.owed);
      const left = Math.max(0, owed - Number(amount));
      const who = String(load.supplier);
      await sendSettlementAlert({
        badge: left === 0 ? "Supplier settled" : "Supplier part-paid",
        title: `${formatINR(Number(amount))} paid to ${who}`,
        actorName: user.name,
        actorRole: user.role,
        when: date,
        rows: [
          { label: "For", value: String(load.item) },
          { label: "Amount paid", value: formatINR(Number(amount)) },
          { label: "Balance", before: formatINR(owed), after: formatINR(left) },
        ],
        subject:
          left === 0
            ? `${who} settled — ${formatINR(Number(amount))} paid`
            : `${formatINR(Number(amount))} paid to ${who} — ${formatINR(left)} still owed`,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("POST /api/purchases/pay", e);
    return NextResponse.json({ error: "Could not record the payment" }, { status: 500 });
  }
}
