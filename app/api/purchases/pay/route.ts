import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { alreadyStored } from "@/lib/idempotent";
import { currentUser } from "@/lib/session";
import { sendDeleteAlert, sendSettlementAlert } from "@/lib/changes";
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
    if (await alreadyStored("purchase_payments", id)) return NextResponse.json({ ok: true });

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

/** Corrects the amount of a payment already recorded. */
export async function PATCH(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  try {
    const { id, amount } = await request.json();
    const value = Number(amount);
    if (!id || !Number.isFinite(value) || value <= 0) {
      return NextResponse.json({ error: "Enter an amount above zero" }, { status: 400 });
    }

    const [rows] = await db().query(
      `SELECT p.amount AS old, p.paid_on, w.id AS load_id, w.supplier, w.item, w.amount AS total,
              w.paid_upfront + COALESCE((SELECT SUM(x.amount) FROM purchase_payments x
                                         WHERE x.purchase_id = w.id AND x.id <> p.id), 0) AS others
       FROM purchase_payments p JOIN purchases w ON w.id = p.purchase_id
       WHERE p.id = ?`,
      [id],
    );
    const row = (rows as Record<string, unknown>[])[0];
    if (!row) return NextResponse.json({ error: "That payment no longer exists" }, { status: 404 });

    // Paying more than the goods are worth would read as a negative balance.
    if (Number(row.others) + value > Number(row.total) + 0.001) {
      return NextResponse.json({ error: "That is more than the load is worth" }, { status: 400 });
    }

    await db().execute("UPDATE purchase_payments SET amount = ? WHERE id = ?", [value, id]);

    if (value !== Number(row.old)) {
      await sendSettlementAlert({
        badge: "Payment corrected",
        title: `Payment to ${String(row.supplier)} changed`,
        actorName: user.name,
        actorRole: user.role,
        when: String(row.paid_on),
        rows: [
          { label: "For", value: String(row.item) },
          { label: "Amount paid", before: formatINR(Number(row.old)), after: formatINR(value) },
        ],
        subject: `Payment to ${String(row.supplier)} corrected — ${formatINR(Number(row.old))} to ${formatINR(value)}`,
      });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("PATCH /api/purchases/pay", e);
    return NextResponse.json({ error: "Could not save the correction" }, { status: 500 });
  }
}

/** Removes a payment that should not have been recorded. */
export async function DELETE(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  try {
    const [rows] = await db().query(
      `SELECT p.amount, p.paid_on, w.supplier, w.item
       FROM purchase_payments p JOIN purchases w ON w.id = p.purchase_id WHERE p.id = ?`,
      [id],
    );
    const gone = (rows as Record<string, unknown>[])[0];

    await db().execute("DELETE FROM purchase_payments WHERE id = ?", [id]);

    if (gone) {
      await sendDeleteAlert({
        kind: "Supplier payment",
        title: `${formatINR(Number(gone.amount))} paid to ${String(gone.supplier)}`,
        actorName: user.name,
        actorRole: user.role,
        when: String(gone.paid_on),
        details: [
          { label: "For", value: String(gone.item) },
          { label: "Amount", value: formatINR(Number(gone.amount)) },
        ],
      });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/purchases/pay", e);
    return NextResponse.json({ error: "Could not delete the payment" }, { status: 500 });
  }
}
