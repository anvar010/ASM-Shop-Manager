import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

/*
 * Password hashing. Node-only: scrypt has no Web Crypto equivalent, so this
 * must never be imported from middleware or any Edge-runtime code.
 */

const KEY_LEN = 64;

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, KEY_LEN);
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, saltHex, hashHex] = stored.split("$");
  if (scheme !== "scrypt" || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = scryptSync(password, Buffer.from(saltHex, "hex"), expected.length);
  // Constant-time: a length-varying compare would leak the hash byte by byte.
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
