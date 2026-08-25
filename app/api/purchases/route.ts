import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/session";
import type { Purchase } from "@/lib/types";
import { diff, PURCHASE_FIELDS, sendChangeAlert, sendDeleteAlert } from "@/lib/changes";
import { formatINR } from "@/lib/format";
import { formatDateKey } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!(await currentUser())) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  try {
    const p = (await request.json()) as Purchase;
    await db().execute(
      `INSERT INTO purchases (id, bought_on, supplier, item, amount, paid_upfront)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [p.id, p.date, p.supplier, p.item, p.amount, p.paidUpfront],
    );
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("POST /api/purchases", e);
    return NextResponse.json({ error: "Could not save the purchase" }, { status: 500 });
  }
}

/** Saves an edit. Instalments are untouched; only the load's own fields move. */
export async function PATCH(request: Request) {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  try {
    const p = (await request.json()) as Purchase;

    const [existing] = await db().query(
      "SELECT supplier, item, amount, paid_upfront AS paidUpfront, bought_on FROM purchases WHERE id = ?",
      [p.id],
    );
    const before = (existing as Record<string, unknown>[])[0];

    await db().execute(
      `UPDATE purchases SET supplier = ?, item = ?, amount = ?, paid_upfront = ? WHERE id = ?`,
      [p.supplier, p.item, p.amount, p.paidUpfront, p.id],
    );

    if (before) {
      await sendChangeAlert({
        kind: "Purchase",
        title: `${before.item} · ${before.supplier}`,
        when: formatDateKey(String(before.bought_on)),
        actorName: user.name,
        actorRole: user.role === "admin" ? "owner" : "staff",
        changes: diff(before, p as unknown as Record<string, unknown>, PURCHASE_FIELDS),
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("PATCH /api/purchases", e);
    return NextResponse.json({ error: "Could not save the changes" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  try {
    const [rows] = await db().query(
      `SELECT w.supplier, w.item, w.amount, w.paid_upfront, w.bought_on,
              COALESCE(SUM(p.amount), 0) AS instalments
       FROM purchases w
       LEFT JOIN purchase_payments p ON p.purchase_id = w.id
       WHERE w.id = ? GROUP BY w.id`,
      [id],
    );
    const gone = (rows as Record<string, unknown>[])[0];

    await db().execute("DELETE FROM purchases WHERE id = ?", [id]);

    if (gone) {
      const instalments = Number(gone.instalments);
      await sendDeleteAlert({
        kind: "Purchase",
        title: `${gone.item} · ${gone.supplier}`,
        when: formatDateKey(String(gone.bought_on)),
        actorName: user.name,
        actorRole: user.role,
        details: [
          { label: "Goods value", value: formatINR(Number(gone.amount)) },
          { label: "Paid upfront", value: formatINR(Number(gone.paid_upfront)) },
          ...(instalments > 0
            ? [{ label: "Instalments also removed", value: formatINR(instalments) }]
            : []),
        ],
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/purchases", e);
    return NextResponse.json({ error: "Could not delete the purchase" }, { status: 500 });
  }
}
