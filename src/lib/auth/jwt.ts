// src/lib/auth/jwt.ts
// JWT signing/verification using `jose` — Edge-runtime safe (no Node APIs).
// Spec §6.9: claims { sub, role }. Access: 15m. Refresh: 7d.
// Improvement over spec: separate secrets for access and refresh tokens.
import { SignJWT, jwtVerify, type JWTPayload } from "jose";

const accessSecret = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "dev-insecure-access-secret-change-me-32bytes"
);
const refreshSecret = new TextEncoder().encode(
  process.env.JWT_REFRESH_SECRET ??
    "dev-insecure-refresh-secret-change-me-32b"
);

// ─── Claim shapes ────────────────────────────────────────────────────────────

export interface AccessTokenClaims {
  sub: string; // userId
  role: string; // Role enum value
}

export interface RefreshTokenClaims {
  sub: string;
  role: string;
  jti: string;   // RefreshToken.id in DB — used for revocation lookup
  family: string; // Token family for reuse detection
}

// ─── Config ──────────────────────────────────────────────────────────────────

function parseExpiry(value: string | undefined, fallback: string): string {
  return value && value.length > 0 ? value : fallback;
}

export const tokenConfig = {
  accessExpires: parseExpiry(process.env.ACCESS_TOKEN_TTL, "15m"),
  refreshExpires: parseExpiry(
    process.env.REFRESH_TOKEN_TTL_DAYS
      ? `${process.env.REFRESH_TOKEN_TTL_DAYS}d`
      : undefined,
    "7d"
  ),
};

// ─── Access token ─────────────────────────────────────────────────────────────

export async function signAccessToken(
  claims: AccessTokenClaims
): Promise<string> {
  return new SignJWT({ role: claims.role })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(tokenConfig.accessExpires)
    .setSubject(claims.sub)
    .sign(accessSecret);
}

export async function verifyAccessToken(
  token: string
): Promise<(AccessTokenClaims & JWTPayload) | null> {
  try {
    const { payload } = await jwtVerify(token, accessSecret);
    return payload as AccessTokenClaims & JWTPayload;
  } catch {
    return null;
  }
}

// ─── Refresh token ────────────────────────────────────────────────────────────

export async function signRefreshToken(
  claims: RefreshTokenClaims
): Promise<string> {
  return new SignJWT({
    role: claims.role,
    jti: claims.jti,
    family: claims.family,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(tokenConfig.refreshExpires)
    .setSubject(claims.sub)
    .sign(refreshSecret);
}

export async function verifyRefreshToken(
  token: string
): Promise<(RefreshTokenClaims & JWTPayload) | null> {
  try {
    const { payload } = await jwtVerify(token, refreshSecret);
    return payload as RefreshTokenClaims & JWTPayload;
  } catch {
    return null;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function parseExpiryToSeconds(value: string): number {
  const m = value.trim().match(/^(\d+)\s*(s|m|h|d)?$/);
  if (!m) return 60 * 15;
  const n = parseInt(m[1], 10);
  const mult =
    m[2] === "d" ? 86400 : m[2] === "h" ? 3600 : m[2] === "m" ? 60 : 1;
  return n * mult;
}
