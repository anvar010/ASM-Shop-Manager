import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { canAccess, currentUser } from "@/lib/session";
import { expectedDrawer } from "@/lib/drawer";

export const dynamic = "force-dynamic";

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const NEEDS_TABLE = {
  error: "Daily closing needs its database table. Run db/daily-closings.sql first.",
};

/** The table, or its newest column, is not there yet: the SQL has not been run. */
function missingTable(e: unknown): boolean {
  const code = (e as { code?: string }).code;
  return code === "ER_NO_SUCH_TABLE" || code === "ER_BAD_FIELD_ERROR";
}

/** Recent closings, newest first. Owner only: a shortage is not staff's to browse. */
export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (!canAccess(user.role, "reports")) {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }
  try {
    const [rows] = await db().query(
      `SELECT closed_on AS date, expected, counted, difference, taken_out AS takenOut, note,
              closed_by AS closedBy, updated_at AS at
       FROM daily_closings ORDER BY closed_on DESC LIMIT 90`,
    );
    return NextResponse.json({ closings: rows });
  } catch (e) {
    // No table yet is not an error worth alarming anyone over: nothing is closed.
    if (missingTable(e)) return NextResponse.json({ closings: [], setup: true });
    console.error("GET /api/closings", e);
    return NextResponse.json({ error: "Could not read the closings" }, { status: 500 });
  }
}

/** Closes a day: records what was counted against what should be there. */
export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (!canAccess(user.role, "reports")) {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }
  try {
    const { date, counted, takenOut, note } = await request.json();
    const value = Number(counted);
    if (typeof date !== "string" || !DATE.test(date)) {
      return NextResponse.json({ error: "Choose a valid day" }, { status: 400 });
    }
    if (!Number.isFinite(value) || value < 0) {
      return NextResponse.json({ error: "Enter the amount counted" }, { status: 400 });
    }

    const out = takenOut === undefined || takenOut === "" ? 0 : Number(takenOut);
    if (!Number.isFinite(out) || out < 0 || out > value) {
      return NextResponse.json(
        { error: "The amount taken out cannot be more than was counted" },
        { status: 400 },
      );
    }
    const taken = Math.round(out * 100) / 100;

    const expected = await expectedDrawer(date);
    const counts = Math.round(value * 100) / 100;
    const difference = Math.round((counts - expected) * 100) / 100;
    const text = typeof note === "string" && note.trim() !== "" ? note.trim().slice(0, 255) : null;

    await db().execute(
      `INSERT INTO daily_closings (closed_on, expected, counted, difference, taken_out, note, closed_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE expected = VALUES(expected), counted = VALUES(counted),
                               difference = VALUES(difference), taken_out = VALUES(taken_out),
                               note = VALUES(note), closed_by = VALUES(closed_by)`,
      [date, expected, counts, difference, taken, text, user.name],
    );
    return NextResponse.json({
      ok: true,
      closing: {
        date,
        expected,
        counted: counts,
        difference,
        takenOut: taken,
        note: text,
        closedBy: user.name,
      },
    });
  } catch (e) {
    if (missingTable(e)) return NextResponse.json(NEEDS_TABLE, { status: 503 });
    console.error("POST /api/closings", e);
    return NextResponse.json({ error: "Could not close the day" }, { status: 500 });
  }
}

/** Takes a closing back, for a day closed by mistake. The day is simply open again. */
export async function DELETE(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (!canAccess(user.role, "reports")) {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }
  const date = new URL(request.url).searchParams.get("date") ?? "";
  if (!DATE.test(date)) return NextResponse.json({ error: "Choose a valid day" }, { status: 400 });
  try {
    await db().execute("DELETE FROM daily_closings WHERE closed_on = ?", [date]);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (missingTable(e)) return NextResponse.json({ ok: true });
    console.error("DELETE /api/closings", e);
    return NextResponse.json({ error: "Could not reopen the day" }, { status: 500 });
  }
}
