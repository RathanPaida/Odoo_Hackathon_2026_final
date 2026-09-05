import { prisma } from "@/lib/db";
import { randomBytes, createHash } from "crypto";

export async function generatePortalToken(quoteId: string, ttlDays: number = 14) {
  const quote = await prisma.quote.findUnique({ where: { id: quoteId } });
  if (!quote) throw new Error("Quote not found");

  // Generate a random 32-byte token
  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + ttlDays);

  await prisma.portalToken.create({
    data: {
      quoteId,
      tokenHash,
      expiresAt,
    },
  });

  return rawToken;
}

export async function validatePortalToken(rawToken: string) {
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");

  const tokenRec = await prisma.portalToken.findUnique({
    where: { tokenHash },
    include: { quote: true },
  });

  if (!tokenRec) return null;
  if (tokenRec.revokedAt || tokenRec.expiresAt < new Date()) return null;

  return tokenRec.quote;
}
