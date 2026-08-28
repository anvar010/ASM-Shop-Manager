import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

/** Adds a heading, which can then be used before anything is filed under it. */
export async function POST(request: Request) {
  if (!(await currentUser())) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  try {
    const { name } = (await request.json()) as { name?: string };
    const cat = (name ?? "").trim();
    if (!cat) return NextResponse.json({ error: "Name is required" }, { status: 400 });
    await db().execute("INSERT IGNORE INTO price_categories (name) VALUES (?)", [cat]);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("POST /api/prices/category", e);
    return NextResponse.json({ error: "Could not add the category" }, { status: 500 });
  }
}

/** Renames a category across every item filed under it. */
export async function PATCH(request: Request) {
  if (!(await currentUser())) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  try {
    const { from, to } = (await request.json()) as { from?: string; to?: string };
    const oldName = (from ?? "").trim();
    const newName = (to ?? "").trim();
    if (!oldName || !newName) {
      return NextResponse.json({ error: "Both names are required" }, { status: 400 });
    }
    /* Renaming onto a category that already exists merges the two, which is
       what the screen warns about — no items are lost either way. The heading
       and the items it labels move together. */
    await db().execute("INSERT IGNORE INTO price_categories (name) VALUES (?)", [newName]);
    await db().execute("UPDATE price_items SET category = ? WHERE category = ?", [
      newName,
      oldName,
    ]);
    await db().execute("DELETE FROM price_categories WHERE name = ?", [oldName]);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("PATCH /api/prices/category", e);
    return NextResponse.json({ error: "Could not rename the category" }, { status: 500 });
  }
}

/**
 * Removes a category. The items it held are kept and simply lose their
 * heading — a shop's stock is not a filing decision, and deleting prices
 * because a label was tidied away would be the wrong trade.
 */
export async function DELETE(request: Request) {
  if (!(await currentUser())) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const name = new URL(request.url).searchParams.get("name")?.trim();
  if (!name) return NextResponse.json({ error: "Missing category" }, { status: 400 });
  try {
    await db().execute("UPDATE price_items SET category = NULL WHERE category = ?", [name]);
    await db().execute("DELETE FROM price_categories WHERE name = ?", [name]);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/prices/category", e);
    return NextResponse.json({ error: "Could not remove the category" }, { status: 500 });
  }
}
