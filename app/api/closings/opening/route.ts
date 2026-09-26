import { NextResponse } from "next/server";
import { currentUser } from "@/lib/session";
import { openingCash } from "@/lib/drawer";

export const dynamic = "force-dynamic";

/**
 * The cash already in the drawer when a day starts. Open to anyone signed in:
 * staff see the drawer's figure on the Bills tab, and it has to include this.
 * Only the amount is returned — never the count or any shortage behind it.
 */
export async function GET(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const date = new URL(request.url).searchParams.get("date") ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Choose a valid day" }, { status: 400 });
  }
  try {
    return NextResponse.json({ opening: await openingCash(date) });
  } catch (e) {
    const code = (e as { code?: string }).code;
    // No table or column yet: nothing has ever been closed, so nothing carries over.
    if (code === "ER_NO_SUCH_TABLE" || code === "ER_BAD_FIELD_ERROR") {
      return NextResponse.json({ opening: 0 });
    }
    console.error("GET /api/closings/opening", e);
    return NextResponse.json({ error: "Could not work out the opening cash" }, { status: 500 });
  }
}
