import { NextResponse, type NextRequest } from "next/server";
import { readSession, SESSION_COOKIE } from "@/lib/session-token";

/** Pages a staff account may not open, whatever they type in the address bar. */
const ADMIN_ONLY = ["/credits", "/overview-report"];

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const user = await readSession(request.cookies.get(SESSION_COOKIE)?.value);

  if (pathname === "/login") {
    // Already signed in? No reason to show the form again.
    if (user) return NextResponse.redirect(new URL("/", request.url));
    return NextResponse.next();
  }

  if (!user) {
    const to = new URL("/login", request.url);
    // Come back to where they were headed once they are through.
    if (pathname !== "/") to.searchParams.set("next", pathname + search);
    return NextResponse.redirect(to);
  }

  if (user.role !== "admin" && ADMIN_ONLY.some((p) => pathname.startsWith(p))) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  /*
   * Everything except Next's own assets, the auth endpoints and static files.
   * Images must stay public by extension rather than by name: the login screen
   * shows the logo before anyone is signed in, and the PWA manifest and icons
   * are read by the browser on a signed-out device.
   */
  matcher: [
    "/((?!_next/static|_next/image|api/auth|manifest.webmanifest|sw.js|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|avif|woff|woff2|ttf)$).*)",
  ],
};
