// src/app/api/auth/refresh/route.ts
export const runtime = "nodejs";
import { cookies } from "next/headers";
import { rotateSession, destroySession, REFRESH_COOKIE, ACCESS_COOKIE } from "@/lib/auth/session";
import { tokenConfig, parseExpiryToSeconds } from "@/lib/auth/jwt";

const ACCESS_MAX = parseExpiryToSeconds(tokenConfig.accessExpires);
const REFRESH_MAX = parseExpiryToSeconds(tokenConfig.refreshExpires);

export async function POST() {
  const store = await cookies();
  const rawRefresh = store.get(REFRESH_COOKIE)?.value;

  if (!rawRefresh) {
    return Response.json(
      { error: { code: "UNAUTHENTICATED", message: "No refresh token." } },
      { status: 401 }
    );
  }

  const rotated = await rotateSession(rawRefresh);
  if (!rotated) {
    // Token revoked or expired — clear cookies and force re-login
    await destroySession();
    return Response.json(
      { error: { code: "UNAUTHENTICATED", message: "Session expired. Please log in again." } },
      { status: 401 }
    );
  }

  store.set(ACCESS_COOKIE, rotated.accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ACCESS_MAX,
  });
  store.set(REFRESH_COOKIE, rotated.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: REFRESH_MAX,
  });

  return Response.json({ ok: true, message: "Token refreshed." });
}
