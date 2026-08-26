import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * A fingerprint of the ledger, in a few bytes.
 *
 * Row counts catch anything added or removed; the newest updated_at catches
 * anything changed in place. An open screen asks for this on a timer and only
 * fetches the ledger itself when the answer differs — so watching costs a
 * handful of bytes rather than the whole book every time.
 */
export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  try {
    const [rows] = await db().query(
      `SELECT
         (SELECT COUNT(*) FROM bills)                                          AS b,
         (SELECT COUNT(*) FROM expenses)                                       AS e,
         (SELECT COUNT(*) FROM purchases)                                      AS p,
         (SELECT COUNT(*) FROM bill_credit_payments)                           AS bp,
         (SELECT COUNT(*) FROM purchase_payments)                              AS pp,
         (SELECT COALESCE(MAX(UNIX_TIMESTAMP(updated_at)), 0) FROM bills)      AS bt,
         (SELECT COALESCE(MAX(UNIX_TIMESTAMP(updated_at)), 0) FROM expenses)   AS et,
         (SELECT COALESCE(MAX(UNIX_TIMESTAMP(updated_at)), 0) FROM purchases)  AS pt`,
    );
    const r = (rows as Record<string, number>[])[0];
    return NextResponse.json({
      v: `${r.b}.${r.e}.${r.p}.${r.bp}.${r.pp}.${r.bt}.${r.et}.${r.pt}`,
    });
  } catch (err) {
    console.error("GET /api/data/version", err);
    return NextResponse.json({ error: "Could not check for changes" }, { status: 500 });
  }
}
