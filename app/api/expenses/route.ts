import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { canAccess, currentUser } from "@/lib/session";
import { timeToSql } from "@/lib/rows";
import { diff, EXPENSE_FIELDS, sendChangeAlert, sendDeleteAlert } from "@/lib/changes";
import { formatINR } from "@/lib/format";
import { expenseMeta } from "@/lib/constants";
import { formatDateKey } from "@/lib/format";
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

/** Saves an edit in place, so an abandoned edit cannot lose the expense. */
export async function PATCH(request: Request) {
  const user = await currentUser();
  if (!user || !canAccess(user.role, "expenses")) {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }
  try {
    const e = (await request.json()) as Expense;

    const [existing] = await db().query(
      "SELECT description AS `desc`, amount, category, spent_on FROM expenses WHERE id = ?",
      [e.id],
    );
    const before = (existing as Record<string, unknown>[])[0];

    await db().execute(
      `UPDATE expenses SET spent_at = ?, description = ?, category = ?, amount = ? WHERE id = ?`,
      [timeToSql(e.time), e.desc, e.category, e.amount, e.id],
    );

    if (before) {
      await sendChangeAlert({
        kind: "Expense",
        title: String(before.desc ?? "Expense"),
        when: `${formatDateKey(String(before.spent_on))} · ${e.time}`,
        actorName: user.name,
        actorRole: user.role === "admin" ? "owner" : "staff",
        changes: diff(before, e as unknown as Record<string, unknown>, EXPENSE_FIELDS),
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("PATCH /api/expenses", err);
    return NextResponse.json({ error: "Could not save the changes" }, { status: 500 });
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
    const [rows] = await db().query(
      "SELECT description, amount, category, spent_on FROM expenses WHERE id = ?",
      [id],
    );
    const gone = (rows as Record<string, unknown>[])[0];

    await db().execute("DELETE FROM expenses WHERE id = ?", [id]);

    if (gone) {
      await sendDeleteAlert({
        kind: "Expense",
        title: String(gone.description ?? "Expense"),
        when: formatDateKey(String(gone.spent_on)),
        actorName: user.name,
        actorRole: user.role,
        details: [
          { label: "Amount", value: formatINR(Number(gone.amount)) },
          { label: "Category", value: expenseMeta(String(gone.category)).label },
        ],
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/expenses", e);
    return NextResponse.json({ error: "Could not delete the expense" }, { status: 500 });
  }
}
