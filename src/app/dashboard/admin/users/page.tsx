// src/app/dashboard/admin/users/page.tsx  - 
"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import s from "./admin-users.module.css";

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserRow {
  id: string;
  email: string;
  name: string;
  role: string;
  emailVerified: boolean;
  createdAt: string;
}

type RoleValue = "SALES_REP" | "SALES_MANAGER" | "FINANCE" | "ADMIN" | "CUSTOMER";

const ROLE_OPTIONS: { value: RoleValue; label: string }[] = [
  { value: "SALES_REP", label: "Sales Rep" },
  { value: "SALES_MANAGER", label: "Sales Manager" },
  { value: "FINANCE", label: "Finance" },
  { value: "ADMIN", label: "Admin" },
  { value: "CUSTOMER", label: "Customer" },
];

const ROLE_LABEL: Record<string, string> = {
  SALES_REP: "Sales Rep",
  SALES_MANAGER: "Sales Manager",
  FINANCE: "Finance",
  ADMIN: "Admin",
  CUSTOMER: "Customer",
};

const BADGE_CLASS: Record<string, string> = {
  SALES_REP: "badgeRep",
  SALES_MANAGER: "badgeManager",
  FINANCE: "badgeFinance",
  ADMIN: "badgeAdmin",
  CUSTOMER: "badgeCustomer",
};

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({ message, type, onDone }: { message: string; type: "success" | "error"; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3500);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div className={type === "success" ? s.toastSuccess : s.toastError}>
      {type === "success" ? (
        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
          <circle cx="12" cy="12" r="10" />
          <path strokeLinecap="round" d="M12 8v4m0 4h.01" />
        </svg>
      )}
      {message}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingRole, setPendingRole] = useState<RoleValue | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Fetch users
  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/users");
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      if (res.status === 403) {
        router.push("/dashboard");
        return;
      }
      const data = await res.json();
      setUsers(data.users ?? []);

      // Identify current admin from session (look for the cookie-based user)
      const meRes = await fetch("/api/auth/me");
      if (meRes.ok) {
        const meData = await meRes.json();
        setCurrentUserId(meData.user?.id ?? null);
      }
    } catch {
      setToast({ message: "Failed to load users.", type: "error" });
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Save role change
  const handleSave = async (userId: string) => {
    if (!pendingRole) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: pendingRole }),
      });
      const data = await res.json();
      if (!res.ok) {
        setToast({ message: data.error?.message ?? "Failed to update role.", type: "error" });
        return;
      }
      setToast({
        message: `${data.user.name}'s role changed to ${ROLE_LABEL[data.user.newRole]}.`,
        type: "success",
      });
      setEditingId(null);
      setPendingRole(null);
      // Refresh list
      await fetchUsers();
    } catch {
      setToast({ message: "Network error. Please try again.", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (user: UserRow) => {
    setEditingId(user.id);
    setPendingRole(user.role as RoleValue);
  };

  const handleCancel = () => {
    setEditingId(null);
    setPendingRole(null);
  };

  // Stats
  const roleCounts = users.reduce<Record<string, number>>((acc, u) => {
    acc[u.role] = (acc[u.role] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className={s.page}>
      {/* Top bar */}
      <header className={s.topBar}>
        <div className={s.brand}>
          <div className={s.mark}>D</div>
          <span className={s.wordmark}>DealFlow360</span>
        </div>
        <nav className={s.navLinks}>
          <a href="/dashboard/admin" className={s.navLink}>Dashboard</a>
          <a href="/dashboard/admin/users" className={s.navLinkActive}>Users</a>
          <a href="/dashboard/admin/categories" className={s.navLink}>Categories</a>
        </nav>
      </header>

      <main className={s.main}>
        {/* Header */}
        <div className={s.header}>
          <div>
            <h1 className={s.title}>User Management</h1>
            <p className={s.subtitle}>Manage roles and permissions for all platform users</p>
          </div>
          <div className={s.statRow}>
            <div className={s.stat}>
              <span className={s.statNum}>{users.length}</span> Total Users
            </div>
            {Object.entries(roleCounts).map(([role, count]) => (
              <div className={s.stat} key={role}>
                <span className={s.statNum}>{count}</span> {ROLE_LABEL[role] ?? role}
              </div>
            ))}
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className={s.loading}>
            <svg className={s.spinner} width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" d="M12 3a9 9 0 0 1 9 9" />
            </svg>
            Loading users…
          </div>
        ) : (
          <div className={s.tableWrap}>
            <table className={s.table}>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Current Role</th>
                  <th>Verified</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const isSelf = user.id === currentUserId;
                  const isEditing = editingId === user.id;

                  return (
                    <tr key={user.id} className={isSelf ? s.selfRow : undefined}>
                      <td>
                        <div className={s.userCell}>
                          <div className={s.avatar}>
                            {user.name.charAt(0)}
                          </div>
                          <div>
                            <div className={s.userName}>
                              {user.name}
                              {isSelf && <span className={s.selfBadge}>(you)</span>}
                            </div>
                            <div className={s.userEmail}>{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        {isEditing ? (
                          <select
                            className={s.roleSelect}
                            value={pendingRole ?? user.role}
                            onChange={(e) => setPendingRole(e.target.value as RoleValue)}
                            disabled={saving}
                          >
                            {ROLE_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className={`${s.badge} ${s[BADGE_CLASS[user.role]] ?? ""}`}>
                            {ROLE_LABEL[user.role] ?? user.role}
                          </span>
                        )}
                      </td>
                      <td>
                        {user.emailVerified ? (
                          <span className={s.verified}>
                            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                            Yes
                          </span>
                        ) : (
                          <span className={s.unverified}>
                            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                              <circle cx="12" cy="12" r="10" />
                              <path strokeLinecap="round" d="M8 12h8" />
                            </svg>
                            No
                          </span>
                        )}
                      </td>
                      <td>
                        {new Date(user.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>
                      <td>
                        {isSelf ? (
                          <span style={{ fontSize: "0.8125rem", color: "var(--slate)" }}>—</span>
                        ) : isEditing ? (
                          <div className={s.actionCell}>
                            <button
                              className={s.saveBtn}
                              onClick={() => handleSave(user.id)}
                              disabled={saving || pendingRole === user.role}
                            >
                              {saving ? (
                                <svg className={s.spinner} width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                  <path strokeLinecap="round" d="M12 3a9 9 0 0 1 9 9" />
                                </svg>
                              ) : null}
                              Save
                            </button>
                            <button className={s.cancelBtn} onClick={handleCancel} disabled={saving}>
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button className={s.saveBtn} onClick={() => handleEdit(user)}>
                            Change Role
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onDone={() => setToast(null)}
        />
      )}
    </div>
  );
}