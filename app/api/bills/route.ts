import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/session";
import { timeToSql } from "@/lib/rows";
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

export async function DELETE(request: Request) {
  if (!(await currentUser())) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  try {
    // Repayments go with it, via ON DELETE CASCADE.
    await db().execute("DELETE FROM bills WHERE id = ?", [id]);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/bills", e);
    return NextResponse.json({ error: "Could not delete the bill" }, { status: 500 });
  }
}
