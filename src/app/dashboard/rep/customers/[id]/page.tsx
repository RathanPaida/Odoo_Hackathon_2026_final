import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { RoleSidebar } from "@/components/navbar/RoleSidebar";
import CustomerForm from "../CustomerForm";
import styles from "../../../dashboard.module.css";

export const dynamic = "force-dynamic";

const STATUS_CLASSES: Record<string, string> = {
  DRAFT: styles.statusBadgeDraft,
  PENDING_APPROVAL: styles.statusBadgePending,
  APPROVED: styles.statusBadgeApproved,
  NEGOTIATING: styles.statusBadgeNegotiating,
  REJECTED: styles.statusBadgeRejected,
  CONFIRMED: styles.statusBadgeConfirmed,
  CANCELLED: styles.statusBadgeRejected,
};

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

  const quotations = await prisma.quote.findMany({
    where: { customerId: id },
    orderBy: { updatedAt: "desc" },
    take: 20,
    select: {
      id: true,
      quoteNumber: true,
      status: true,
      grandTotal: true,
      updatedAt: true,
      owner: { select: { name: true } },
    },
  });

  return (
    <RoleSidebar role={user.role} userName={user.name} userEmail={user.email}>
      <main className={styles.page}>
        <div className={styles.container}>
          <header className={styles.header}>
            <div className={styles.headerLeft}>
              <Link href="/dashboard/rep/customers" className={styles.backLink}>
                ← Back to Customers
              </Link>
              <h1 className={styles.title}>Customer: {customer.companyName}</h1>
              <p className={styles.subtitle}>
                {customer.contactName} &middot; {customer.tier} tier &middot; {customer.active ? "Active" : "Inactive"}
              </p>
            </div>
            <div className={styles.headerActions}>
              <Link href="/dashboard/rep" className={styles.backLink}>
                ← Back to Dashboard
              </Link>
            </div>
          </header>

          <section className={`${styles.card} ${styles.animateFadeIn}`} style={{ marginBottom: "2rem" }}>
            <h2 className={styles.cardTitle}>Edit Details</h2>
            <CustomerForm initialData={customer} />
          </section>

          {quotations.length > 0 && (
            <section className={`${styles.card} ${styles.animateFadeIn}`}>
              <h2 className={styles.cardTitle}>Quotations ({quotations.length})</h2>
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Quote #</th>
                      <th>Status</th>
                      <th>Total</th>
                      <th>Owner</th>
                      <th>Last Updated</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quotations.map((q) => (
                      <tr key={q.id}>
                        <td className={styles.cellPrimary}>{q.quoteNumber}</td>
                        <td>
                          <span className={`${styles.statusBadge} ${STATUS_CLASSES[q.status] || ""}`}>
                            {q.status}
                          </span>
                        </td>
                        <td className={styles.cellMuted}>
                          ${Number(q.grandTotal).toLocaleString()}
                        </td>
                        <td className={styles.cellMuted}>{q.owner.name}</td>
                        <td className={styles.cellMuted}>
                          {new Date(q.updatedAt).toLocaleDateString()}
                        </td>
                        <td>
                          <Link href={`/dashboard/rep/quotes/${q.id}`} className={styles.actionLink}>
                            View →
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      </main>
    </RoleSidebar>
  );
}

