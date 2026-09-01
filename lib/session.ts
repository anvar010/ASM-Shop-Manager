import { cookies } from "next/headers";
import { readSession, SESSION_COOKIE, type Role, type SessionUser } from "./session-token";

/** The signed-in user for a route handler, or null. */
export async function currentUser(): Promise<SessionUser | null> {
  const store = await cookies();
  return readSession(store.get(SESSION_COOKIE)?.value);
}

/**
 * What each role may reach. Hiding a tab is presentation; this is the rule the
 * server actually enforces, so a staff account cannot read admin data by
 * calling the API directly.
 */
export function canAccess(role: Role, area: "bills" | "purchases" | "expenses" | "reports") {
  if (role === "admin") return true;
  /* Staff keep the shop running day to day, which includes paying for things
     out of the till, so expenses are theirs to record as well. Reports stay
     with the owner: what the shop earns is a different question from what it
     spends. */
  return area === "bills" || area === "purchases" || area === "expenses";
}
