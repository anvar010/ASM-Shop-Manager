/*
 * Session tokens.
 *
 * Web Crypto only — no node:crypto — because middleware runs on the Edge
 * runtime, where importing a native module fails the whole request. Password
 * hashing lives in ./password, which is Node-only and never imported here.
 */

export type Role = "admin" | "staff";

export interface SessionUser {
  id: string;
  username: string;
  name: string;
  role: Role;
}

/*
 * A signed cookie rather than a sessions table: it needs no round trip to
 * validate, which matters when every request is a separate serverless
 * invocation.
 */

export const SESSION_COOKIE = "asm_session";
const SESSION_DAYS = 30;

interface Payload extends SessionUser {
  exp: number;
}

const b64url = {
  encode: (data: Uint8Array | string) => {
    const bytes = typeof data === "string" ? new TextEncoder().encode(data) : data;
    let s = "";
    bytes.forEach((b) => (s += String.fromCharCode(b)));
    return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  },
  decode: (s: string) => {
    const padded = s.replace(/-/g, "+").replace(/_/g, "/");
    const raw = atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
    return Uint8Array.from(raw, (ch) => ch.charCodeAt(0));
  },
};

function secret(): ArrayBuffer {
  const value = process.env.AUTH_SECRET;
  if (!value || value.length < 32) {
    throw new Error("AUTH_SECRET must be set to at least 32 characters.");
  }
  return bytes(new TextEncoder().encode(value));
}

/** Web Crypto wants an ArrayBuffer, not a view over a possibly larger one. */
function bytes(view: Uint8Array): ArrayBuffer {
  return view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength) as ArrayBuffer;
}

async function key() {
  return crypto.subtle.importKey("raw", secret(), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
    "verify",
  ]);
}

export async function createSession(user: SessionUser): Promise<string> {
  const payload: Payload = { ...user, exp: Date.now() + SESSION_DAYS * 86400_000 };
  const body = b64url.encode(JSON.stringify(payload));
  const sig = await crypto.subtle.sign("HMAC", await key(), bytes(new TextEncoder().encode(body)));
  return `${body}.${b64url.encode(new Uint8Array(sig))}`;
}

/** Returns the user only if the signature is ours and the session is current. */
export async function readSession(token: string | undefined): Promise<SessionUser | null> {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  try {
    const ok = await crypto.subtle.verify(
      "HMAC",
      await key(),
      bytes(b64url.decode(sig)),
      bytes(new TextEncoder().encode(body)),
    );
    if (!ok) return null;
    const payload = JSON.parse(new TextDecoder().decode(b64url.decode(body))) as Payload;
    if (!payload.exp || payload.exp < Date.now()) return null;
    return { id: payload.id, username: payload.username, name: payload.name, role: payload.role };
  } catch {
    return null;
  }
}

export const SESSION_MAX_AGE = SESSION_DAYS * 86400;
