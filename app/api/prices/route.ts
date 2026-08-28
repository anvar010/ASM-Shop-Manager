import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/session";
import type { PriceItem } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!(await currentUser())) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  try {
    const item = (await request.json()) as PriceItem;
    const name = (item.name ?? "").trim();
    if (!name || !(item.price >= 0)) {
      return NextResponse.json({ error: "Name and price are required" }, { status: 400 });
    }
    /* Adding a name that already exists updates its price rather than
       refusing: re-entering an item is how a price gets corrected. */
    await db().execute(
      `INSERT INTO price_items (id, name, price, unit) VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE price = VALUES(price), unit = VALUES(unit)`,
      [item.id, name, item.price, item.unit?.trim() || null],
    );
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("POST /api/prices", e);
    return NextResponse.json({ error: "Could not save the price" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if (!(await currentUser())) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  try {
    await db().execute("DELETE FROM price_items WHERE id = ?", [id]);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/prices", e);
    return NextResponse.json({ error: "Could not remove the item" }, { status: 500 });
  }
}
