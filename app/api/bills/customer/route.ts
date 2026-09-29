import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/session";
import { sendDeleteAlert } from "@/lib/changes";
import { formatDateKey, formatINR } from "@/lib/format";

export const dynamic = "force-dynamic";

/** Old rows with no name stored read as "Unnamed" on the credit page. */
function isUnnamed(name: string): boolean {
  return name === "Unnamed";
}

/** Renames a credit customer across every bill filed under them. */
export async function PATCH(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  try {
    const { from, to } = (await request.json()) as { from?: string; to?: string };
    const oldName = (from ?? "").trim();
    const newName = (to ?? "").trim();
    if (!oldName) return NextResponse.json({ error: "Missing customer" }, { status: 400 });
    if (!newName) return NextResponse.json({ error: "Enter a name" }, { status: 400 });

    if (isUnnamed(oldName)) {
      await db().execute(
        "UPDATE bills SET customer = ? WHERE mode = 'credit' AND customer IS NULL",
        [newName],
      );
    } else {
      await db().execute(
        "UPDATE bills SET customer = ? WHERE mode = 'credit' AND customer = ?",
        [newName, oldName],
      );
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("PATCH /api/bills/customer", e);
    return NextResponse.json({ error: "Could not rename the customer" }, { status: 500 });
  }
}

/** Removes every credit bill — and repayments against them — for one customer. */
export async function DELETE(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const name = new URL(request.url).searchParams.get("customer")?.trim();
  if (!name) return NextResponse.json({ error: "Missing customer" }, { status: 400 });
  try {
    const unnamed = isUnnamed(name);
    const [rows] = await db().query(
      unnamed
        ? "SELECT COUNT(*) AS bills, COALESCE(SUM(amount), 0) AS total FROM bills WHERE mode = 'credit' AND customer IS NULL"
        : "SELECT COUNT(*) AS bills, COALESCE(SUM(amount), 0) AS total FROM bills WHERE mode = 'credit' AND customer = ?",
      unnamed ? [] : [name],
    );
    const info = (rows as Record<string, unknown>[])[0];

    // Repayments go with their bills, via ON DELETE CASCADE.
    await db().execute(
      unnamed
        ? "DELETE FROM bills WHERE mode = 'credit' AND customer IS NULL"
        : "DELETE FROM bills WHERE mode = 'credit' AND customer = ?",
      unnamed ? [] : [name],
    );

    const count = info ? Number(info.bills) : 0;
    if (count > 0) {
      await sendDeleteAlert({
        kind: "Credit customer",
        title: name,
        actorName: user.name,
        actorRole: user.role,
        when: formatDateKey(new Date().toISOString().slice(0, 10)),
        details: [
          { label: "Bills removed", value: String(count) },
          { label: "Total value", value: formatINR(Number(info.total)) },
        ],
      });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/bills/customer", e);
    return NextResponse.json({ error: "Could not delete the customer" }, { status: 500 });
  }
}
