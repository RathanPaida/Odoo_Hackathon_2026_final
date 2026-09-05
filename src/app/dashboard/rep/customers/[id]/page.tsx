import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import Link from "next/link";
import CustomerForm from "../CustomerForm";
import styles from "../../../dashboard.module.css";

export const dynamic = "force-dynamic";

export default async function EditCustomerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "SALES_REP" && user.role !== "SALES_MANAGER" && user.role !== "ADMIN")) {
    redirect("/login");
  }

  const { id } = await params;

  const customer = await prisma.customer.findUnique({
    where: { id },
  });

  if (!customer) {
    notFound();
  }

  return (
    <main className={styles.page}>
      <div className={styles.container} style={{ maxWidth: "56rem" }}>
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <Link href="/dashboard/rep/customers" className={styles.backLink}>
              ← Back to Customers
            </Link>
            <h1 className={styles.title}>Edit Customer</h1>
            <p className={styles.subtitle}>
              Update {customer.companyName}'s details and tier.
            </p>
          </div>
        </header>

        <section className={`${styles.card} ${styles.animateFadeIn}`}>
          <CustomerForm initialData={customer} />
        </section>
      </div>
    </main>
  );
}

