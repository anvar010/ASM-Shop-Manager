import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

/** Records money a credit customer paid back, against one bill. */
export async function POST(request: Request) {
  if (!(await currentUser())) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  try {
    const { id, billId, date, amount } = await request.json();
    await db().execute(
      "INSERT INTO bill_credit_payments (id, bill_id, paid_on, amount) VALUES (?, ?, ?, ?)",
      [id, billId, date, amount],
    );
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("POST /api/bills/settle", e);
    return NextResponse.json({ error: "Could not record the payment" }, { status: 500 });
  }
}
