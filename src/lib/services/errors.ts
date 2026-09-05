import { Prisma, Role } from "@prisma/client";

export class RequiredRoleError extends Error {
  constructor(public requiredRole: Role) {
    super(`Required role: ${requiredRole}`);
    this.name = "RequiredRoleError";
  }
}

export class ApproverLimitError extends Error {
  constructor(
    public quoteBlendedDiscountPct: Prisma.Decimal,
    public approverLimitPct: Prisma.Decimal
  ) {
    super(`Approver limit exceeded: ${quoteBlendedDiscountPct} > ${approverLimitPct}`);
    this.name = "ApproverLimitError";
  }
}
