import { NextResponse } from "next/server";
import { currentUser } from "@/lib/session";
import { tabToken } from "@/lib/statement";
import { formatINR } from "@/lib/format";

export const dynamic = "force-dynamic";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * Hands the browser straight to WhatsApp with the message written and the
 * customer's tab link in it, leaving them to pick who it goes to.
 *
 * A redirect rather than a fetch: this is reached by clicking a plain link, so
 * WhatsApp opens in the same gesture. Building the link in JavaScript and then
 * opening a window trips pop-up blocking on iOS.
 */
export async function GET(request: Request) {
  if (!(await currentUser())) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const url = new URL(request.url);
  const customer = url.searchParams.get("customer")?.trim();
  const owed = Number(url.searchParams.get("owed") ?? 0);
  if (!customer) {
    return NextResponse.json({ error: "Missing customer" }, { status: 400 });
  }

  /* Behind Vercel the request URL is the internal one, so the public host has
     to come from the forwarded headers. */
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? url.host;
  const proto = request.headers.get("x-forwarded-proto") ?? "https";
  const link = `${proto}://${host}/tab/${tabToken(customer)}`;

  const now = new Date();
  const today = `${now.getDate()} ${MONTHS[now.getMonth()]}`;
  /* The two lines the customer is being asked to act on are in Malayalam,
     which is what most of them read. The name and the figure stay as they are
     written in the book. */
  const seeTheList = "വാങ്ങിയതിന്റെയും തിരിച്ചടച്ചതിന്റെയും പൂർണ്ണ വിവരം ഇവിടെ കാണാം:";
  const haveALook = "സൗകര്യം പോലെ ഒന്ന് നോക്കുമല്ലോ. നന്ദി!";

  const message =
    owed > 0
      ? `ASM Daily Fresh\n\n${customer} — your tab stands at ${formatINR(owed)} on ${today}.\n\n${seeTheList}\n${link}\n\n${haveALook}`
      : `ASM Daily Fresh\n\n${customer} — your tab is fully settled. Thank you!\n\n${seeTheList}\n${link}`;

  return NextResponse.redirect(`https://wa.me/?text=${encodeURIComponent(message)}`);
}
