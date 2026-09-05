// src/lib/auth/rbac.ts
// Role-based access control for DealFlow360.
// Maps the 4 spec roles (§4.1) to permissions.
// Fine-grained checks happen in route handlers, not middleware (spec §1.1).
import { Role } from "@/generated/prisma";

export { Role };

// ─── Permissions ──────────────────────────────────────────────────────────────

export const PERMISSIONS = {
  // Quotes
  CREATE_QUOTE: "create_quote",
  VIEW_OWN_QUOTE: "view_own_quote",
  VIEW_ALL_QUOTES: "view_all_quotes",
  ADD_QUOTE_LINE: "add_quote_line",
  SUBMIT_QUOTE: "submit_quote",
  // Approvals
  APPROVE_QUOTE: "approve_quote",
  REJECT_QUOTE: "reject_quote",
  VIEW_APPROVER_QUEUE: "view_approver_queue",
  // Finance
  ALLOCATE_STOCK: "allocate_stock",
  CONFIRM_QUOTE: "confirm_quote",
  VIEW_INVOICES: "view_invoices",
  // Admin
  MANAGE_PRODUCTS: "manage_products",
  MANAGE_USERS: "manage_users",
  VIEW_DASHBOARD: "view_dashboard",
  VIEW_ANOMALIES: "view_anomalies",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

// ─── Role → Permission mapping ────────────────────────────────────────────────

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  SALES_REP: [
    PERMISSIONS.CREATE_QUOTE,
    PERMISSIONS.VIEW_OWN_QUOTE,
    PERMISSIONS.ADD_QUOTE_LINE,
    PERMISSIONS.SUBMIT_QUOTE,
  ],
  SALES_MANAGER: [
    PERMISSIONS.CREATE_QUOTE,
    PERMISSIONS.VIEW_OWN_QUOTE,
    PERMISSIONS.VIEW_ALL_QUOTES,
    PERMISSIONS.ADD_QUOTE_LINE,
    PERMISSIONS.SUBMIT_QUOTE,
    PERMISSIONS.APPROVE_QUOTE,
    PERMISSIONS.REJECT_QUOTE,
    PERMISSIONS.VIEW_APPROVER_QUEUE,
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.VIEW_ANOMALIES,
  ],
  FINANCE: [
    PERMISSIONS.VIEW_ALL_QUOTES,
    PERMISSIONS.ALLOCATE_STOCK,
    PERMISSIONS.CONFIRM_QUOTE,
    PERMISSIONS.VIEW_INVOICES,
    PERMISSIONS.VIEW_DASHBOARD,
  ],
  CUSTOMER: [
    PERMISSIONS.VIEW_OWN_QUOTE,
  ],
  ADMIN: Object.values(PERMISSIONS) as Permission[],
};

export function getRolePermissions(role: Role): Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

export function hasPermission(role: Role, permission: Permission): boolean {
  return getRolePermissions(role).includes(permission);
}

export function hasAllPermissions(role: Role, permissions: Permission[]): boolean {
  const granted = getRolePermissions(role);
  return permissions.every((p) => granted.includes(p));
}

// ─── Route handler guards ─────────────────────────────────────────────────────
// These import from session.ts (Node runtime only — never call from middleware).

import { getCurrentUser } from "@/lib/auth/session";

export async function requireUser(): Promise<{
  user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>> | null;
  response: Response | null;
}> {
  const user = await getCurrentUser();
  if (!user) {
    return {
      user: null,
      response: Response.json(
        { error: { code: "UNAUTHENTICATED", message: "Authentication required." } },
        { status: 401 }
      ),
    };
  }
  return { user, response: null };
}

export async function requireRole(...roles: Role[]): Promise<{
  user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>> | null;
  response: Response | null;
}> {
  const user = await getCurrentUser();
  if (!user) {
    return {
      user: null,
      response: Response.json(
        { error: { code: "UNAUTHENTICATED", message: "Authentication required." } },
        { status: 401 }
      ),
    };
  }
  if (!roles.includes(user.role as Role)) {
    return {
      user,
      response: Response.json(
        { error: { code: "FORBIDDEN", message: "Insufficient role." } },
        { status: 403 }
      ),
    };
  }
  return { user, response: null };
}
