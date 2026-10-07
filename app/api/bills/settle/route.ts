import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { alreadyStored } from "@/lib/idempotent";
import { currentUser } from "@/lib/session";
import { sendDeleteAlert, sendSettlementAlert } from "@/lib/changes";
import { pushToAdmins } from "@/lib/push";
import { formatINR } from "@/lib/format";

export const dynamic = "force-dynamic";

/** Records money a credit customer paid back, against one bill. */
export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  try {
    /* One repayment against one bill, or several in a single request when a
       payment was spread over a customer's bills, so the admins get one
       notice for the lot rather than one per bill. */
    const body = await request.json();
    const list: { id: string; billId: string; date: string; amount: number; mode?: string }[] =
      Array.isArray(body.payments) ? body.payments : [body];

    const done: {
      billId: string;
      description: string;
      who: string;
      owed: number;
      left: number;
      amount: number;
      date: string;
    }[] = [];

    for (const { id, billId, date, amount, mode } of list) {
      const how = mode === "upi" ? "upi" : "cash";
      if (await alreadyStored("bill_credit_payments", id)) continue;

      /* The balance before this payment, so the alert can show what it cleared
         rather than just the figure handed over. Scoped to this shop, so a bill
         id from elsewhere is simply not found. */
      const [rows] = await db().query(
        `SELECT b.description, b.customer, b.amount,
                GREATEST(b.amount - COALESCE(SUM(p.amount), 0), 0) AS owed
         FROM bills b
         LEFT JOIN bill_credit_payments p ON p.bill_id = b.id
         WHERE b.id = ? GROUP BY b.id`,
        [billId],
      );
      const bill = (rows as Record<string, unknown>[])[0];
      if (!bill) return NextResponse.json({ error: "That bill no longer exists" }, { status: 404 });

      try {
        await db().execute(
          "INSERT INTO bill_credit_payments (id, bill_id, paid_on, amount, mode) VALUES (?, ?, ?, ?, ?)",
          [id, billId, date, amount, how],
        );
      } catch (e) {
        /* The mode column arrives with db/credit-payment-mode.sql. Until it has
           been run, keep recording repayments the way they always were. */
        if ((e as { code?: string }).code !== "ER_BAD_FIELD_ERROR") throw e;
        await db().execute(
          "INSERT INTO bill_credit_payments (id, bill_id, paid_on, amount) VALUES (?, ?, ?, ?)",
          [id, billId, date, amount],
        );
      }

      const owed = Number(bill.owed);
      done.push({
        billId,
        description: String(bill.description ?? "Sale"),
        who: String(bill.customer ?? "Unnamed"),
        owed,
        left: Math.max(0, owed - Number(amount)),
        amount: Number(amount),
        date,
      });
    }

    if (done.length === 1) {
      const { who, owed, left, amount, date, description } = done[0];
      await pushToAdmins({
        title: left === 0 ? `${who} cleared their tab` : `${who} paid ${formatINR(amount)}`,
        body:
          left === 0
            ? `${formatINR(amount)} received — nothing left owing.`
            : `${formatINR(amount)} received · ${formatINR(left)} still owing.`,
        url: "/credits",
        // One tag per customer: a second payment updates the first notice.
        tag: `credit-${who}`,
      });

      await sendSettlementAlert({
        badge: left === 0 ? "Credit cleared" : "Credit part-paid",
        title: `${who} paid ${formatINR(amount)}`,
        actorName: user.name,
        actorRole: user.role,
        when: date,
        rows: [
          { label: "Against", value: description },
          { label: "Amount received", value: formatINR(amount) },
          { label: "Balance", before: formatINR(owed), after: formatINR(left) },
        ],
        subject:
          left === 0
            ? `${who} cleared their tab — ${formatINR(amount)}`
            : `${who} paid ${formatINR(amount)} — ${formatINR(left)} still owing`,
      });
    } else if (done.length > 1) {
      const who = done[0].who;
      const total = done.reduce((sum, d) => sum + d.amount, 0);
      const cleared = done.filter((d) => d.left === 0).length;
      const partial = done.length - cleared;
      /* Bills of theirs this payment never reached. */
      const [rest] = await db().query(
        `SELECT COUNT(*) AS n FROM (
           SELECT b.id FROM bills b
           LEFT JOIN bill_credit_payments p ON p.bill_id = b.id
           WHERE b.mode = 'credit' AND COALESCE(b.customer, 'Unnamed') = ?
             AND b.id NOT IN (${done.map(() => "?").join(",")})
           GROUP BY b.id HAVING b.amount - COALESCE(SUM(p.amount), 0) > 0
         ) x`,
        [who, ...done.map((d) => d.billId)],
      );
      const pending = Number((rest as Record<string, unknown>[])[0]?.n ?? 0);
      const parts = [
        cleared > 0 ? `${cleared} ${cleared === 1 ? "bill" : "bills"} cleared` : "",
        partial > 0 ? `${partial} part-paid` : "",
        pending > 0 ? `${pending} pending` : "",
      ].filter(Boolean);
      const summary = parts.join(" · ");

      await pushToAdmins({
        title: `${who} paid ${formatINR(total)}`,
        body: `${formatINR(total)} received · ${summary}.`,
        url: "/credits",
        tag: `credit-${who}`,
      });

      await sendSettlementAlert({
        badge: pending === 0 && partial === 0 ? "Credit cleared" : "Credit part-paid",
        title: `${who} paid ${formatINR(total)}`,
        actorName: user.name,
        actorRole: user.role,
        when: done[0].date,
        rows: [
          { label: "Amount received", value: formatINR(total) },
          { label: "Bills", value: summary },
        ],
        subject: `${who} paid ${formatINR(total)} — ${summary}`,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("POST /api/bills/settle", e);
    return NextResponse.json({ error: "Could not record the payment" }, { status: 500 });
  }
}

/** Corrects the amount of a repayment already recorded. */
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
      `SELECT p.amount AS old, p.paid_on, b.id AS bill_id, b.description, b.customer, b.amount AS total,
              COALESCE((SELECT SUM(x.amount) FROM bill_credit_payments x
                        WHERE x.bill_id = b.id AND x.id <> p.id), 0) AS others
       FROM bill_credit_payments p JOIN bills b ON b.id = p.bill_id
       WHERE p.id = ?`,
      [id],
    );
    const row = (rows as Record<string, unknown>[])[0];
    if (!row) return NextResponse.json({ error: "That payment no longer exists" }, { status: 404 });

    // Repaying more than the bill was worth would read as a negative balance.
    if (Number(row.others) + value > Number(row.total) + 0.001) {
      return NextResponse.json({ error: "That is more than is owed on this bill" }, { status: 400 });
    }

    await db().execute("UPDATE bill_credit_payments SET amount = ? WHERE id = ?", [value, id]);

    if (value !== Number(row.old)) {
      const who = String(row.customer ?? "Unnamed");
      await sendSettlementAlert({
        badge: "Payment corrected",
        title: `${who}'s repayment changed`,
        actorName: user.name,
        actorRole: user.role,
        when: String(row.paid_on),
        rows: [
          { label: "Against", value: String(row.description ?? "Sale") },
          { label: "Amount received", before: formatINR(Number(row.old)), after: formatINR(value) },
        ],
        subject: `${who}'s repayment corrected — ${formatINR(Number(row.old))} to ${formatINR(value)}`,
      });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("PATCH /api/bills/settle", e);
    return NextResponse.json({ error: "Could not save the correction" }, { status: 500 });
  }
}

/** Removes a repayment that should not have been recorded. */
export async function DELETE(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  try {
    const [rows] = await db().query(
      `SELECT p.amount, p.paid_on, b.description, b.customer
       FROM bill_credit_payments p JOIN bills b ON b.id = p.bill_id WHERE p.id = ?`,
      [id],
    );
    const gone = (rows as Record<string, unknown>[])[0];

    await db().execute("DELETE FROM bill_credit_payments WHERE id = ?", [id]);

    if (gone) {
      await sendDeleteAlert({
        kind: "Repayment",
        title: `${formatINR(Number(gone.amount))} from ${String(gone.customer ?? "Unnamed")}`,
        actorName: user.name,
        actorRole: user.role,
        when: String(gone.paid_on),
        details: [
          { label: "Against", value: String(gone.description ?? "Sale") },
          { label: "Amount", value: formatINR(Number(gone.amount)) },
        ],
      });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/bills/settle", e);
    return NextResponse.json({ error: "Could not delete the payment" }, { status: 500 });
  }
}
