import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { canAccess, currentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** One CSV field. Quoted when needed, and a leading = + - @ is defused so a
 *  spreadsheet never runs a customer or item name as a formula. */
function field(v: unknown): string {
  let t = v === null || v === undefined ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(t) && Number.isNaN(Number(t))) t = `'${t}`;
  return /[",\n\r]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
}

function csv(head: string[], rows: unknown[][]): string {
  // The BOM makes Excel read the file as UTF-8, which the Malayalam names need.
  return "﻿" + [head, ...rows].map((r) => r.map(field).join(",")).join("\r\n") + "\r\n";
}

/** The book as a spreadsheet: ?type=bills|expenses|purchases&from=&to= */
export async function GET(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (!canAccess(user.role, "reports")) {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }

  const q = new URL(request.url).searchParams;
  const type = q.get("type") ?? "";
  const from = q.get("from") ?? "";
  const to = q.get("to") ?? "";
  if (!DATE.test(from) || !DATE.test(to) || from > to) {
    return NextResponse.json({ error: "Choose a valid date range" }, { status: 400 });
  }

  try {
    let body: string;
    if (type === "bills") {
      const [rows] = await db().query(
        `SELECT b.sold_on, TIME_FORMAT(b.sold_at, '%H:%i') AS t, b.description, b.category,
                b.mode, b.customer, b.amount, COALESCE(SUM(p.amount), 0) AS repaid
         FROM bills b LEFT JOIN bill_credit_payments p ON p.bill_id = b.id
         WHERE b.sold_on BETWEEN ? AND ?
         GROUP BY b.id ORDER BY b.sold_on, b.sold_at`,
        [from, to],
      );
      body = csv(
        ["Date", "Time", "Description", "Category", "Paid by", "Customer", "Amount", "Repaid"],
        (rows as Record<string, unknown>[]).map((r) => [
          r.sold_on, r.t, r.description, r.category, r.mode, r.customer, r.amount,
          r.mode === "credit" ? r.repaid : "",
        ]),
      );
    } else if (type === "expenses") {
      const [rows] = await db().query(
        `SELECT spent_on, TIME_FORMAT(spent_at, '%H:%i') AS t, description, category, amount
         FROM expenses WHERE spent_on BETWEEN ? AND ? ORDER BY spent_on, spent_at`,
        [from, to],
      );
      body = csv(
        ["Date", "Time", "Description", "Category", "Amount"],
        (rows as Record<string, unknown>[]).map((r) => [
          r.spent_on, r.t, r.description, r.category, r.amount,
        ]),
      );
    } else if (type === "purchases") {
      const [rows] = await db().query(
        `SELECT w.bought_on, w.supplier, w.item, w.amount,
                w.paid_upfront + COALESCE(SUM(p.amount), 0) AS paid,
                GREATEST(w.amount - w.paid_upfront - COALESCE(SUM(p.amount), 0), 0) AS balance
         FROM purchases w LEFT JOIN purchase_payments p ON p.purchase_id = w.id
         WHERE w.bought_on BETWEEN ? AND ?
         GROUP BY w.id ORDER BY w.bought_on, w.supplier`,
        [from, to],
      );
      body = csv(
        ["Date", "Supplier", "Item", "Total", "Paid", "Balance"],
        (rows as Record<string, unknown>[]).map((r) => [
          r.bought_on, r.supplier, r.item, r.amount, r.paid, r.balance,
        ]),
      );
    } else if (type === "closings") {
      let rows: Record<string, unknown>[] = [];
      try {
        [rows] = (await db().query(
          `SELECT closed_on, expected, counted, difference, note, closed_by
           FROM daily_closings WHERE closed_on BETWEEN ? AND ? ORDER BY closed_on`,
          [from, to],
        )) as unknown as [Record<string, unknown>[]];
      } catch (e) {
        // No table yet means nothing has been closed: an empty sheet, not an error.
        if ((e as { code?: string }).code !== "ER_NO_SUCH_TABLE") throw e;
      }
      body = csv(
        ["Date", "Expected", "Counted", "Difference", "Note", "Closed by"],
        rows.map((r) => [r.closed_on, r.expected, r.counted, r.difference, r.note, r.closed_by]),
      );
    } else {
      return NextResponse.json({ error: "Unknown export" }, { status: 400 });
    }

    return new NextResponse(body, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="asm-${type}-${from}-to-${to}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error("GET /api/export", e);
    return NextResponse.json({ error: "Could not build the export" }, { status: 500 });
  }
}
