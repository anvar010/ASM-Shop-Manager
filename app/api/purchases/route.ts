import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/session";
import type { Purchase } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!(await currentUser())) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  try {
    const p = (await request.json()) as Purchase;
    await db().execute(
      `INSERT INTO purchases (id, bought_on, supplier, item, amount, paid_upfront)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [p.id, p.date, p.supplier, p.item, p.amount, p.paidUpfront],
    );
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("POST /api/purchases", e);
    return NextResponse.json({ error: "Could not save the purchase" }, { status: 500 });
  }
}

/** Saves an edit. Instalments are untouched; only the load's own fields move. */
export async function PATCH(request: Request) {
  if (!(await currentUser())) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  try {
    const p = (await request.json()) as Purchase;
    await db().execute(
      `UPDATE purchases SET supplier = ?, item = ?, amount = ?, paid_upfront = ? WHERE id = ?`,
      [p.supplier, p.item, p.amount, p.paidUpfront, p.id],
    );
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("PATCH /api/purchases", e);
    return NextResponse.json({ error: "Could not save the changes" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if (!(await currentUser())) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  try {
    await db().execute("DELETE FROM purchases WHERE id = ?", [id]);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/purchases", e);
    return NextResponse.json({ error: "Could not delete the purchase" }, { status: 500 });
  }
}
