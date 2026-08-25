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
  failed_attempts: number;
  is_locked: number;
  lock_minutes: number | null;
}

/*
 * Guessing is the attack a password hash does nothing about: scrypt protects a
 * stolen database, not a login form left open to unlimited attempts. Five
 * failures freeze the account briefly, and a success clears the count.
 *
 * The window is short on purpose — a long lockout would let anyone shut the
 * owner out of their own shop just by failing a few logins.
 */
const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();
    if (typeof username !== "string" || typeof password !== "string") {
      return NextResponse.json({ error: "Enter a username and password" }, { status: 400 });
    }

    /* Whether the lock has expired is decided by the database's own clock.
       Comparing its timestamps against the app's would be wrong by the offset
       between the two machines — here the server runs UTC and the shop does
       not, so a live lock read as long expired. */
    const [rows] = await db().query(
      `SELECT *,
              (locked_until IS NOT NULL AND locked_until > NOW()) AS is_locked,
              CEIL(TIMESTAMPDIFF(SECOND, NOW(), locked_until) / 60)   AS lock_minutes
       FROM users WHERE username = ? LIMIT 1`,
      [username.trim().toLowerCase()],
    );
    const user = (rows as UserRow[])[0];

    /* One message for a wrong username and a wrong password alike: telling
       them apart lets an attacker discover which accounts exist. */
    const wrong = NextResponse.json({ error: "Wrong username or password" }, { status: 401 });
    if (!user || !user.active) return wrong;

    if (user.is_locked) {
      const mins = Math.max(1, Number(user.lock_minutes ?? 1));
      return NextResponse.json(
        { error: `Too many attempts. Try again in ${mins} minute${mins === 1 ? "" : "s"}.` },
        { status: 429 },
      );
    }

    if (!verifyPassword(password, user.password_hash)) {
      const attempts = user.failed_attempts + 1;
      if (attempts >= MAX_ATTEMPTS) {
        await db().execute(
          "UPDATE users SET failed_attempts = ?, locked_until = DATE_ADD(NOW(), INTERVAL ? MINUTE) WHERE id = ?",
          [attempts, LOCK_MINUTES, user.id],
        );
      } else {
        await db().execute("UPDATE users SET failed_attempts = ? WHERE id = ?", [
          attempts,
          user.id,
        ]);
      }
      return wrong;
    }

    const session = await createSession({
      id: user.id,
      username: user.username,
      name: user.display_name,
      role: user.role,
    });

    await db().execute(
      "UPDATE users SET last_login_at = NOW(), failed_attempts = 0, locked_until = NULL WHERE id = ?",
      [user.id],
    );

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
