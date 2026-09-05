import { prisma } from "@/lib/db";
import { randomBytes, createHash } from "crypto";

export async function generatePortalToken(quotationId: string, ttlDays: number = 14) {
  const quotation = await prisma.quotation.findUnique({ where: { id: quotationId } });
  if (!quotation) throw new Error("Quotation not found");

  // Generate a random 32-byte token
  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + ttlDays);

  await prisma.portalToken.create({
    data: {
      quoteId: quotationId,
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
    include: { quotation: true },
  });

  if (!tokenRec) return null;
  if (tokenRec.revokedAt || tokenRec.expiresAt < new Date()) return null;

  return tokenRec.quotation;
}
