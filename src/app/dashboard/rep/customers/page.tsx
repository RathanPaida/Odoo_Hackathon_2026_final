// src/app/dashboard/customer/page.tsx - 
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { LogoutButton } from "@/components/LogoutButton";
import styles from "../../dashboard.module.css";

export const dynamic = "force-dynamic";

export default async function CustomerDashboardPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "CUSTOMER") redirect("/login");

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <h1 className={styles.title}>Customer Portal</h1>
            <p className={styles.subtitle}>Welcome back, {user.name}</p>
          </div>
          <div className={styles.headerActions}>
            <LogoutButton />
          </div>
        </header>

        <section className={`${styles.card} ${styles.animateFadeIn}`}>
          <h2 className={styles.cardTitle}>Your Quotations</h2>
          <p className={styles.cardDescription}>
            View quotations, request changes, and confirm terms here.
          </p>
        </section>
      </div>
    </main>
  );
}