import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { readSession, SESSION_COOKIE } from "@/lib/session-token";

export const dynamic = "force-dynamic";

/** Who the browser is signed in as, for the client to gate what it renders. */
export async function GET() {
  const store = await cookies();
  const user = await readSession(store.get(SESSION_COOKIE)?.value);
  if (!user) return NextResponse.json({ user: null }, { status: 401 });
  return NextResponse.json({ user });
}
