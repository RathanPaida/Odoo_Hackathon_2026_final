// src/lib/auth/password.ts
// argon2id via @node-rs/argon2 — prebuilt binaries, no node-gyp on Windows.
// Spec §6.9: "Hash with argon2id, default parameters."
import { hash, verify } from "@node-rs/argon2";

const ARGON2ID = 2; // Algorithm ID for argon2id

export async function hashPassword(password: string): Promise<string> {
  return hash(password, {
    algorithm: ARGON2ID,
    memoryCost: 65536, // 64 MiB
    timeCost: 3,
    parallelism: 4,
  });
}

export async function verifyPassword(
  passwordHash: string,
  password: string
): Promise<boolean> {
  try {
    return await verify(passwordHash, password, { algorithm: ARGON2ID });
  } catch {
    return false;
  }
}
