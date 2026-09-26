import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Which build is live. Public and tiny: an open app polls it. */
export async function GET() {
  return NextResponse.json(
    { id: process.env.NEXT_PUBLIC_BUILD_ID ?? "" },
    { headers: { "Cache-Control": "no-store" } },
  );
}
