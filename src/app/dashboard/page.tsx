// src/app/dashboard/page.tsx - // src/app/dashboard/page.tsx
// Main dashboard — redirects to role-specific pages or shows overview.
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { LogoutButton } from "@/components/LogoutButton";
import styles from "./dashboard.module.css";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  if (user.role === "SALES_REP") redirect("/dashboard/rep");
  if (user.role === "SALES_MANAGER") redirect("/dashboard/manager");
  if (user.role === "FINANCE") redirect("/dashboard/finance");
  if (user.role === "CUSTOMER") redirect("/dashboard/customer");
  if (user.role === "ADMIN") redirect("/dashboard/admin");

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <h1 className={styles.title}>DealFlow360</h1>
            <p className={styles.subtitle}>Welcome back, {user.name}</p>
          </div>
          <div className={styles.headerActions}>
            <LogoutButton />
          </div>
        </header>

        <section className={`${styles.card} ${styles.animateFadeIn}`}>
          <h2 className={styles.cardTitle}>Session Info</h2>
          <dl className="grid grid-cols-[120px_1fr] gap-y-2 text-sm mt-4">
            <dt className="text-[#94a3b8]">Name</dt>
            <dd className="text-[#f1f5f9]">{user.name}</dd>
            <dt className="text-[#94a3b8]">Email</dt>
            <dd className="text-[#f1f5f9]">{user.email}</dd>
            <dt className="text-[#94a3b8]">Role</dt>
            <dd>
              <span className={styles.roleBadge}>{user.role}</span>
            </dd>
          </dl>
        </section>
      </div>
    </main>
  );
}