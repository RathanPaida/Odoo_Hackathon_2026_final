// src/middleware.ts
// Edge runtime — ONLY jose (verifyAccessToken). No Prisma, argon2, ioredis.
// Spec §1.1: "Middleware does coarse route gating; fine-grained role checks
// happen inside route handlers."
import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken } from "@/lib/auth/jwt";

const ACCESS_COOKIE = "df_access";

// Routes that require an authenticated session
const PROTECTED_PREFIXES = [
  "/quotes",
  "/approvals",
  "/dashboard",
  "/admin",
];

// API routes that are authenticated (not portal, not auth)
const PROTECTED_API_PREFIXES = [
  "/api/quotes",
  "/api/products",
  "/api/pricing",
  "/api/upsell",
  "/api/dashboard",
  "/api/payments",
  "/api/invoices",
  "/api/subscriptions",
];

// Public routes (no session needed)
const GUEST_ONLY = ["/login", "/signup"];

// Portal routes are handled by their own token-based auth, not session
// /api/portal/:token — excluded from this middleware

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Skip middleware for portal — portal has its own token auth
  if (pathname.startsWith("/portal") || pathname.startsWith("/api/portal")) {
    return NextResponse.next();
  }

  // Skip Next.js internals and static files
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const isProtectedPage = PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
  const isProtectedApi = PROTECTED_API_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
  const isGuestOnly = GUEST_ONLY.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );

  if (!isProtectedPage && !isProtectedApi && !isGuestOnly) {
    return NextResponse.next();
  }

  // Verify access token (JWT-only, no DB call)
  const accessToken = req.cookies.get(ACCESS_COOKIE)?.value;
  const claims = await verifyAccessToken(accessToken ?? "");

  // Redirect logged-in users away from guest-only pages
  if (isGuestOnly) {
    if (claims) return NextResponse.redirect(new URL("/dashboard", req.url));
    return NextResponse.next();
  }

  // Unauthenticated on protected route
  if (!claims) {
    if (isProtectedApi) {
      return NextResponse.json(
        { error: { code: "UNAUTHENTICATED", message: "Authentication required." } },
        { status: 401 }
      );
    }
    const url = new URL("/login", req.url);
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  // Token is valid — if access token was refreshed by /api/auth/refresh,
  // the new token is already in cookies. Middleware just passes through.
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/quotes/:path*",
    "/approvals/:path*",
    "/dashboard/:path*",
    "/admin/:path*",
    "/login/:path*",
    "/signup/:path*",
    "/api/quotes/:path*",
    "/api/products/:path*",
    "/api/pricing/:path*",
    "/api/upsell/:path*",
    "/api/dashboard/:path*",
    "/api/payments/:path*",
    "/api/invoices/:path*",
    "/api/subscriptions/:path*",
  ],
};
