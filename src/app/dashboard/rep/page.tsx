// src/app/dashboard/rep/page.tsx 
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { RoleSidebar } from "@/components/navbar/RoleSidebar";
import Link from "next/link";
import styles from "../dashboard.module.css";

export const dynamic = "force-dynamic";

export default async function RepDashboardPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "SALES_REP") redirect("/login");

  return (
    <RoleSidebar role="SALES_REP" userName={user.name} userEmail={user.email}>
      <main className={styles.page}>
        <div className={styles.container}>
          <header className={styles.header}>
            <div className={styles.headerLeft}>
              <h1 className={styles.title}>Sales Representative</h1>
              <p className={styles.subtitle}>Welcome back, {user.name}</p>
            </div>
          </header>

          <div className={`${styles.cardGrid} ${styles.cardGrid2}`}>
            <Link
              href="/dashboard/rep/quotes"
              className={styles.navLink}
            >
              <span className={styles.navIcon}>📄</span>
              <h2 className={styles.navTitle}>Quotations</h2>
              <p className={styles.navDescription}>
                Manage your active quotes, add lines, and track approvals.
              </p>
            </Link>

            <Link
              href="/dashboard/rep/customer"
              className={styles.navLink}
            >
              <span className={styles.navIcon}>🏢</span>
              <h2 className={styles.navTitle}>Customers</h2>
              <p className={styles.navDescription}>
                View customer directory, create new customers, and update tiers.
              </p>
            </Link>
          </div>
        </div>
      </main>
    </RoleSidebar>
  );
}