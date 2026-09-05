import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { LogoutButton } from "@/components/LogoutButton";
import NewQuoteButton from "./NewQuoteButton";
import { QuoteStatus } from "@/generated/prisma";
import styles from "./quotes.module.css";

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

export default async function QuotesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: QuoteStatus }>;
}) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "SALES_REP" && user.role !== "SALES_MANAGER" && user.role !== "ADMIN")) {
    redirect("/login");
  }

  const { status } = await searchParams;

  const where: Record<string, unknown> = {};
  if (user.role === "SALES_REP") {
    where.ownerId = user.id;
  }
  if (status) {
    where.status = status;
  }

  const quotes = await prisma.quote.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    include: {
      customer: { select: { companyName: true } },
      owner: { select: { name: true } },
      _count: { select: { lines: true } },
    },
  });

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <Link href="/dashboard/rep" className={styles.backLink}>
              ← Back to Dashboard
            </Link>
            <h1 className={styles.title}>Quotations</h1>
          </div>
          <div className={styles.headerActions}>
            <NewQuoteButton />
            <LogoutButton />
          </div>
        </header>

        <div className={styles.filterTabs}>
          <Link
            href="/dashboard/rep/quotes"
            className={`${styles.filterTab} ${!status ? styles.filterTabActive : ""}`}
          >
            All Quotes
          </Link>
          {["DRAFT", "PENDING_APPROVAL", "APPROVED", "NEGOTIATING", "REJECTED", "CONFIRMED"].map((s) => (
            <Link
              key={s}
              href={`/dashboard/rep/quotes?status=${s}`}
              className={`${styles.filterTab} ${status === s ? styles.filterTabActive : ""}`}
            >
              {s.replace("_", " ")}
            </Link>
          ))}
        </div>

        <section className={styles.tableCard}>
          {quotes.length === 0 ? (
            <div className={styles.emptyState}>
              <p className={styles.emptyStateText}>No quotes found for this filter.</p>
            </div>
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Quote #</th>
                    <th>Customer</th>
                    <th>Status</th>
                    <th>Total</th>
                    <th>Margin</th>
                    <th>Last Updated</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {quotes.map((q) => {
                    const statusClass = STATUS_CLASSES[q.status] || styles.statusBadge;
                    const marginGood = Number(q.marginPct) >= 10;
                    return (
                      <tr key={q.id}>
                        <td className={styles.quoteNumber}>{q.quoteNumber}</td>
                        <td className={styles.customerName}>{q.customer.companyName}</td>
                        <td>
                          <span className={`${styles.statusBadge} ${statusClass}`}>
                            {q.status.replace("_", " ")}
                          </span>
                        </td>
                        <td className={styles.totalAmount}>
                          {q.currency} {q.grandTotal.toString()}
                        </td>
                        <td>
                          <span className={marginGood ? styles.marginGood : styles.marginBad}>
                            {q.marginPct.toString()}%
                          </span>
                        </td>
                        <td className={styles.date}>
                          {q.updatedAt.toLocaleDateString()}
                        </td>
                        <td>
                          <Link
                            href={`/dashboard/rep/quotes/${q.id}`}
                            className={styles.actionLink}
                          >
                            View / Edit
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}