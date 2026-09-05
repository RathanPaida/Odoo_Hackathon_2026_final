import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import Link from "next/link";
import CustomerForm from "../CustomerForm";
import styles from "../../../dashboard.module.css";

export const dynamic = "force-dynamic";

export default async function NewCustomerPage() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "SALES_REP" && user.role !== "SALES_MANAGER" && user.role !== "ADMIN")) {
    redirect("/login");
  }

  return (
    <main className={styles.page}>
      <div className={styles.container} style={{ maxWidth: "56rem" }}>
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <Link href="/dashboard/rep/customers" className={styles.backLink}>
              ← Back to Customers
            </Link>
            <h1 className={styles.title}>New Customer</h1>
            <p className={styles.subtitle}>
              Create a new customer profile and assign their tier.
            </p>
          </div>
        </header>

        <section className={`${styles.card} ${styles.animateFadeIn}`}>
          <CustomerForm />
        </section>
      </div>
    </main>
  );
}

