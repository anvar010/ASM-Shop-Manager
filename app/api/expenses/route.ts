import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { canAccess, currentUser } from "@/lib/session";
import { timeToSql } from "@/lib/rows";
import type { Expense } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user || !canAccess(user.role, "expenses")) {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }
  try {
    const expense = (await request.json()) as Expense;
    await db().execute(
      `INSERT INTO expenses (id, spent_on, spent_at, description, category, amount)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        expense.id,
        expense.date,
        timeToSql(expense.time),
        expense.desc,
        expense.category,
        expense.amount,
      ],
    );
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("POST /api/expenses", e);
    return NextResponse.json({ error: "Could not save the expense" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const user = await currentUser();
  if (!user || !canAccess(user.role, "expenses")) {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  try {
    await db().execute("DELETE FROM expenses WHERE id = ?", [id]);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/expenses", e);
    return NextResponse.json({ error: "Could not delete the expense" }, { status: 500 });
  }
}
