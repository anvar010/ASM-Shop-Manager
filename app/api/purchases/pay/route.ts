import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

/** Records money handed to a supplier after the purchase day. */
export async function POST(request: Request) {
  if (!(await currentUser())) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  try {
    const { id, purchaseId, date, amount } = await request.json();
    await db().execute(
      "INSERT INTO purchase_payments (id, purchase_id, paid_on, amount) VALUES (?, ?, ?, ?)",
      [id, purchaseId, date, amount],
    );
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("POST /api/purchases/pay", e);
    return NextResponse.json({ error: "Could not record the payment" }, { status: 500 });
  }
}
