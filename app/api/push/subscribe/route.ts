import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Registers this device to receive notifications. */
export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  try {
    const sub = await request.json();
    const endpoint = sub?.endpoint;
    const p256dh = sub?.keys?.p256dh;
    const auth = sub?.keys?.auth;
    if (!endpoint || !p256dh || !auth) {
      return NextResponse.json({ error: "Incomplete subscription" }, { status: 400 });
    }

    /* A browser may hand back the same endpoint after re-subscribing, and it
       can move between accounts on a shared device, so claim it either way. */
    await db().execute(
      `INSERT INTO push_subscriptions (id, user_id, endpoint, p256dh, auth)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE user_id = VALUES(user_id),
                               p256dh  = VALUES(p256dh),
                               auth    = VALUES(auth)`,
      [randomUUID(), user.id, endpoint, p256dh, auth],
    );
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("POST /api/push/subscribe", e);
    return NextResponse.json({ error: "Could not enable notifications" }, { status: 500 });
  }
}

/** Stops this device receiving them. */
export async function DELETE(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  try {
    const { endpoint } = await request.json();
    if (!endpoint) return NextResponse.json({ error: "Missing endpoint" }, { status: 400 });
    await db().execute("DELETE FROM push_subscriptions WHERE endpoint = ?", [endpoint]);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/push/subscribe", e);
    return NextResponse.json({ error: "Could not turn notifications off" }, { status: 500 });
  }
}
