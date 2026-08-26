import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/session";
import { sendSettlementAlert } from "@/lib/changes";
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
    const { id, billId, date, amount } = await request.json();

    /* The balance before this payment, so the alert can show what it cleared
       rather than just the figure handed over. */
    const [rows] = await db().query(
      `SELECT b.description, b.customer, b.amount,
              GREATEST(b.amount - COALESCE(SUM(p.amount), 0), 0) AS owed
       FROM bills b
       LEFT JOIN bill_credit_payments p ON p.bill_id = b.id
       WHERE b.id = ? GROUP BY b.id`,
      [billId],
    );
    const bill = (rows as Record<string, unknown>[])[0];

    await db().execute(
      "INSERT INTO bill_credit_payments (id, bill_id, paid_on, amount) VALUES (?, ?, ?, ?)",
      [id, billId, date, amount],
    );

    if (bill) {
      const owed = Number(bill.owed);
      const left = Math.max(0, owed - Number(amount));
      const who = String(bill.customer ?? "Unnamed");
      await pushToAdmins({
        title: left === 0 ? `${who} cleared their tab` : `${who} paid ${formatINR(Number(amount))}`,
        body:
          left === 0
            ? `${formatINR(Number(amount))} received — nothing left owing.`
            : `${formatINR(Number(amount))} received · ${formatINR(left)} still owing.`,
        url: "/credits",
        // One tag per customer: a second payment updates the first notice.
        tag: `credit-${who}`,
      });

      await sendSettlementAlert({
        badge: left === 0 ? "Credit cleared" : "Credit part-paid",
        title: `${who} paid ${formatINR(Number(amount))}`,
        actorName: user.name,
        actorRole: user.role,
        when: date,
        rows: [
          { label: "Against", value: String(bill.description ?? "Sale") },
          { label: "Amount received", value: formatINR(Number(amount)) },
          { label: "Balance", before: formatINR(owed), after: formatINR(left) },
        ],
        subject:
          left === 0
            ? `${who} cleared their tab — ${formatINR(Number(amount))}`
            : `${who} paid ${formatINR(Number(amount))} — ${formatINR(left)} still owing`,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("POST /api/bills/settle", e);
    return NextResponse.json({ error: "Could not record the payment" }, { status: 500 });
  }
}
