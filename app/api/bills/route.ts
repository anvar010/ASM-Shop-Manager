import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/session";
import { timeToSql } from "@/lib/rows";
import { BILL_FIELDS, diff, sendChangeAlert, sendDeleteAlert } from "@/lib/changes";
import { formatINR } from "@/lib/format";
import { categoryMeta, modeMeta } from "@/lib/constants";
import { formatDateKey } from "@/lib/format";
import type { Bill } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!(await currentUser())) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  try {
    const bill = (await request.json()) as Bill;
    await db().execute(
      `INSERT INTO bills (id, sold_on, sold_at, description, category, amount, mode, customer)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        bill.id,
        bill.date,
        timeToSql(bill.time),
        bill.desc,
        bill.category,
        bill.amount,
        bill.mode,
        // The schema requires a name on credit and forbids one otherwise.
        bill.mode === "credit" ? (bill.customer ?? "Unnamed") : null,
      ],
    );
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("POST /api/bills", e);
    return NextResponse.json({ error: "Could not save the bill" }, { status: 500 });
  }
}

/** Saves an edit in place, so an abandoned edit cannot lose the bill. */
export async function PATCH(request: Request) {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  try {
    const bill = (await request.json()) as Bill;
    const credit = bill.mode === "credit";

    /* Read the row first: once the UPDATE lands the old values are gone, and
       an alert that cannot say what the figure used to be is of little use. */
    const [existing] = await db().query(
      "SELECT description AS `desc`, amount, category, mode, customer, sold_on FROM bills WHERE id = ?",
      [bill.id],
    );
    const before = (existing as Record<string, unknown>[])[0];
    await db().execute(
      `UPDATE bills SET sold_at = ?, description = ?, category = ?, amount = ?, mode = ?, customer = ?
       WHERE id = ?`,
      [
        timeToSql(bill.time),
        bill.desc,
        bill.category,
        bill.amount,
        bill.mode,
        credit ? (bill.customer ?? "Unnamed") : null,
        bill.id,
      ],
    );
    // Repayments only belong to a credit sale; changing the mode retires them.
    if (!credit) {
      await db().execute("DELETE FROM bill_credit_payments WHERE bill_id = ?", [bill.id]);
    }

    if (before) {
      await sendChangeAlert({
        kind: "Bill",
        title: String(before.desc ?? "Sale"),
        when: `${formatDateKey(String(before.sold_on))} · ${bill.time}`,
        actorName: user.name,
        actorRole: user.role === "admin" ? "owner" : "staff",
        changes: diff(before, { ...bill, customer: credit ? bill.customer : null }, BILL_FIELDS),
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("PATCH /api/bills", e);
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
    /* Read it first — after the DELETE there is nothing left to describe, and
       an alert saying only that "a bill" vanished is no use for checking up. */
    const [rows] = await db().query(
      `SELECT b.description, b.amount, b.category, b.mode, b.customer, b.sold_on, b.sold_at,
              COALESCE(SUM(p.amount), 0) AS repaid
       FROM bills b
       LEFT JOIN bill_credit_payments p ON p.bill_id = b.id
       WHERE b.id = ? GROUP BY b.id`,
      [id],
    );
    const gone = (rows as Record<string, unknown>[])[0];

    // Repayments go with it, via ON DELETE CASCADE.
    await db().execute("DELETE FROM bills WHERE id = ?", [id]);

    if (gone) {
      const credit = gone.mode === "credit";
      await sendDeleteAlert({
        kind: "Bill",
        title: String(gone.description ?? "Sale"),
        when: formatDateKey(String(gone.sold_on)),
        actorName: user.name,
        actorRole: user.role,
        details: [
          { label: "Amount", value: formatINR(Number(gone.amount)) },
          { label: "Category", value: categoryMeta(String(gone.category)).label },
          { label: "Paid by", value: modeMeta(String(gone.mode)).label },
          ...(credit ? [{ label: "Credit customer", value: String(gone.customer ?? "—") }] : []),
          ...(credit && Number(gone.repaid) > 0
            ? [{ label: "Repayments also removed", value: formatINR(Number(gone.repaid)) }]
            : []),
        ],
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/bills", e);
    return NextResponse.json({ error: "Could not delete the bill" }, { status: 500 });
  }
}
