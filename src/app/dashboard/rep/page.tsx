// src/app/dashboard/rep/page.tsx 
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { LogoutButton } from "@/components/LogoutButton";
import styles from "../dashboard.module.css";

export const dynamic = "force-dynamic";

export default async function RepDashboardPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "SALES_REP") redirect("/login");

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <h1 className={styles.title}>Sales Representative</h1>
            <p className={styles.subtitle}>Welcome back, {user.name}</p>
          </div>
          <div className={styles.headerActions}>
            <LogoutButton />
          </div>
        </header>

        <div className={`${styles.cardGrid} ${styles.cardGrid2}`}>
          <a
            href="/dashboard/rep/quotes"
            className={styles.navLink}
          >
            <span className={styles.navIcon}>📄</span>
            <h2 className={styles.navTitle}>Quotations</h2>
            <p className={styles.navDescription}>
              Manage your active quotes, add lines, and track approvals.
            </p>
          </a>

          <a
            href="/dashboard/rep/customers"
            className={styles.navLink}
          >
            <span className={styles.navIcon}>🏢</span>
            <h2 className={styles.navTitle}>Customers</h2>
            <p className={styles.navDescription}>
              View customer directory, create new customers, and update tiers.
            </p>
          </a>
        </div>
      </div>
    </main>
  );
}