// src/lib/audit.ts
// Append-only AuditLog writer.
// Spec §4.2: "Append-only. Never update or delete a row in this table."
// This module MUST only be called from Node runtime (has Prisma import).
import { prisma } from "@/lib/db";

export interface AuditParams {
  entityType: string;
  entityId: string;
  action: string;
  actorId?: string;
  before?: unknown;
  after?: unknown;
}

export async function writeAudit(params: AuditParams): Promise<void> {
  await prisma.auditLog.create({
    data: {
      entityType: params.entityType,
      entityId: params.entityId,
      action: params.action,
      actorId: params.actorId ?? null,
      beforeJson: params.before !== undefined ? (params.before as object) : undefined,
      afterJson: params.after !== undefined ? (params.after as object) : undefined,
    },
  });
}
