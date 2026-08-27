import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";

const PUBLIC_PATHS = ["/login", "/forgot-password", "/reset-password"];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/**
 * Lightweight, cookie-presence-only gate for page navigation. This does NOT
 * validate the session against the database (Edge-safe, no DB round trip
 * here) -- it only blocks the obvious case of no cookie at all. The real
 * authorization check is requireOptometrist(), which every protected layout
 * and server action calls and which does hit the database.
 */
export function proxy(request: NextRequest) {
  const hasSessionCookie = Boolean(request.cookies.get(SESSION_COOKIE_NAME)?.value);
  const { pathname } = request.nextUrl;

  if (!hasSessionCookie && !isPublicPath(pathname)) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (hasSessionCookie && (pathname === "/login" || pathname === "/")) {
    return NextResponse.redirect(new URL("/home", request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Route Handlers under /api/** do their own auth via requireOptometrist()
  // and return a proper response for their content type (JSON error, or in
  // some cases just omitting the resource) -- redirecting them to the HTML
  // /login page here would break non-page consumers like <img> and <a
  // download> links (e.g. the signature and PDF endpoints).
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
