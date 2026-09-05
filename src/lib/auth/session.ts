// src/lib/auth/session.ts
// Session management: create, rotate, destroy sessions using DB-backed
// refresh tokens. Prisma is used here — this file must NOT be imported
// by middleware (Edge runtime). Only import in route handlers with
// `export const runtime = "nodejs"`.
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  tokenConfig,
  parseExpiryToSeconds,
  type AccessTokenClaims,
  type RefreshTokenClaims,
} from "@/lib/auth/jwt";
import crypto from "crypto";

export const ACCESS_COOKIE = "df_access";
export const REFRESH_COOKIE = "df_refresh";

const ACCESS_MAX = parseExpiryToSeconds(tokenConfig.accessExpires);
const REFRESH_MAX = parseExpiryToSeconds(tokenConfig.refreshExpires);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function generateToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString("hex");
}

function cookieOpts(maxAge: number) {
  return {
    httpOnly: true as const,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

// ─── Create session (login) ───────────────────────────────────────────────────

export interface CreateSessionOpts {
  userId: string;
  role: string;
  userAgent?: string;
  ip?: string;
  remember?: boolean;
}

export async function createSession(opts: CreateSessionOpts): Promise<void> {
  const store = await cookies();

  const family = generateToken(16);
  const jti = generateToken(16);
  const rawRefresh = await signRefreshToken({
    sub: opts.userId,
    role: opts.role,
    jti,
    family,
  });
  const accessToken = await signAccessToken({
    sub: opts.userId,
    role: opts.role,
  });

  const tokenHash = sha256(rawRefresh);
  const expiresAt = new Date(Date.now() + REFRESH_MAX * 1000);

  await prisma.refreshToken.create({
    data: { userId: opts.userId, tokenHash, expiresAt },
  });

  await prisma.user.update({
    where: { id: opts.userId },
    data: { updatedAt: new Date() },
  });

  const refreshMaxAge = opts.remember ? REFRESH_MAX : 60 * 60 * 24;
  store.set(ACCESS_COOKIE, accessToken, cookieOpts(ACCESS_MAX));
  store.set(REFRESH_COOKIE, rawRefresh, cookieOpts(refreshMaxAge));
}

// ─── Rotate session (token refresh) ──────────────────────────────────────────
// DB revocation check is here (not in middleware) to keep Edge runtime clean.

export async function rotateSession(rawRefresh: string): Promise<{
  accessToken: string;
  refreshToken: string;
} | null> {
  const payload = await verifyRefreshToken(rawRefresh);
  if (!payload) return null;

  const tokenHash = sha256(rawRefresh);
  const rt = await prisma.refreshToken.findUnique({ where: { tokenHash } });
  if (!rt) return null;
  if (rt.revokedAt) return null;
  if (rt.expiresAt < new Date()) return null;

  // Issue new tokens
  const newJti = generateToken(16);
  const newFamily = (payload as RefreshTokenClaims).family ?? generateToken(16);
  const newRaw = await signRefreshToken({
    sub: payload.sub as string,
    role: (payload as RefreshTokenClaims).role,
    jti: newJti,
    family: newFamily,
  });
  const newAccess = await signAccessToken({
    sub: payload.sub as string,
    role: (payload as RefreshTokenClaims).role,
  });

  const newHash = sha256(newRaw);
  const expiresAt = new Date(Date.now() + REFRESH_MAX * 1000);

  await prisma.$transaction([
    prisma.refreshToken.update({
      where: { id: rt.id },
      data: { revokedAt: new Date() },
    }),
    prisma.refreshToken.create({
      data: { userId: rt.userId, tokenHash: newHash, expiresAt },
    }),
  ]);

  return { accessToken: newAccess, refreshToken: newRaw };
}

// ─── Destroy session (logout) ─────────────────────────────────────────────────

export async function destroySession(rawRefresh?: string): Promise<void> {
  const store = await cookies();
  if (rawRefresh) {
    const tokenHash = sha256(rawRefresh);
    await prisma.refreshToken
      .updateMany({
        where: { tokenHash, revokedAt: null },
        data: { revokedAt: new Date() },
      })
      .catch(() => {});
  }
  store.delete(ACCESS_COOKIE);
  store.delete(REFRESH_COOKIE);
}

// ─── Read current user ────────────────────────────────────────────────────────

export async function getCurrentUser() {
  const store = await cookies();
  const token = store.get(ACCESS_COOKIE)?.value;
  if (!token) return null;

  const { verifyAccessToken } = await import("@/lib/auth/jwt");
  const payload = await verifyAccessToken(token);
  if (!payload?.sub) return null;

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  return user ?? null;
}

export async function getAccessToken(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(ACCESS_COOKIE)?.value;
}

export async function getRefreshToken(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(REFRESH_COOKIE)?.value;
}
