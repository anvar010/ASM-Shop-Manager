import { createHmac, timingSafeEqual } from "node:crypto";

/*
 * A shareable link to one customer's tab.
 *
 * The token is derived from the name rather than stored, so sharing a tab
 * needs no column, no migration and no cleanup when a customer stops taking
 * credit. It is signed with AUTH_SECRET, so it cannot be guessed from the
 * name — but it is also stable, which means a link, once sent, keeps working.
 * Rotating AUTH_SECRET invalidates every link at once.
 */

function secret(): string {
  const value = process.env.AUTH_SECRET;
  if (!value) throw new Error("AUTH_SECRET is not set");
  return value;
}

/** The link id for a customer. Case and spacing are ignored, as in the app. */
export function tabToken(customer: string): string {
  return createHmac("sha256", secret())
    .update(customer.trim().toLowerCase())
    .digest("base64url")
    .slice(0, 22);
}

/**
 * Which of these customers a token belongs to, or null. Compared byte by byte
 * in constant time so a wrong token cannot be narrowed down by how long the
 * answer takes.
 */
export function customerForToken(token: string, customers: string[]): string | null {
  const given = Buffer.from(token);
  for (const customer of customers) {
    const expected = Buffer.from(tabToken(customer));
    if (expected.length === given.length && timingSafeEqual(expected, given)) {
      return customer;
    }
  }
  return null;
}
