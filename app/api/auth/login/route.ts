import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createSession, SESSION_COOKIE, SESSION_MAX_AGE, type Role } from "@/lib/session-token";
import { verifyPassword } from "@/lib/password";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface UserRow {
  id: string;
  username: string;
  display_name: string;
  password_hash: string;
  role: Role;
  active: number;
}

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();
    if (typeof username !== "string" || typeof password !== "string") {
      return NextResponse.json({ error: "Enter a username and password" }, { status: 400 });
    }

    const [rows] = await db().query("SELECT * FROM users WHERE username = ? LIMIT 1", [
      username.trim().toLowerCase(),
    ]);
    const user = (rows as UserRow[])[0];

    /* One message for a wrong username and a wrong password alike: telling
       them apart lets an attacker discover which accounts exist. */
    if (!user || !user.active || !verifyPassword(password, user.password_hash)) {
      return NextResponse.json({ error: "Wrong username or password" }, { status: 401 });
    }

    const session = await createSession({
      id: user.id,
      username: user.username,
      name: user.display_name,
      role: user.role,
    });

    await db().execute("UPDATE users SET last_login_at = NOW() WHERE id = ?", [user.id]);

    const res = NextResponse.json({
      user: { id: user.id, username: user.username, name: user.display_name, role: user.role },
    });
    res.cookies.set(SESSION_COOKIE, session, {
      httpOnly: true, // unreadable to scripts, so XSS cannot steal the session
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: SESSION_MAX_AGE,
    });
    return res;
  } catch (e) {
    console.error("POST /api/auth/login", e);
    return NextResponse.json({ error: "Could not sign you in" }, { status: 500 });
  }
}
