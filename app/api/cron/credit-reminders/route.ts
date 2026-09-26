import { NextResponse } from "next/server";
import { customersOverLimit } from "@/lib/credit";
import { formatINR } from "@/lib/format";
import { pushToAdmins } from "@/lib/push";

export const dynamic = "force-dynamic";

/**
 * The daily nudge: one notification listing everyone still over the credit
 * limit. Called by the scheduler in vercel.json, which sends
 * `Authorization: Bearer $CRON_SECRET`; anything else is refused.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  }

  try {
    const over = await customersOverLimit();
    if (over.length === 0) return NextResponse.json({ ok: true, over: 0 });

    const top = over
      .slice(0, 3)
      .map((o) => `${o.customer} ${formatINR(o.owed)}`)
      .join(", ");
    const more = over.length > 3 ? ` and ${over.length - 3} more` : "";
    await pushToAdmins({
      title: `${over.length} ${over.length === 1 ? "customer owes" : "customers owe"} over the limit`,
      body: `${top}${more}.`,
      url: "/credits",
      tag: "credit-daily",
    });
    return NextResponse.json({ ok: true, over: over.length });
  } catch (e) {
    console.error("GET /api/cron/credit-reminders", e);
    return NextResponse.json({ error: "Could not send reminders" }, { status: 500 });
  }
}
