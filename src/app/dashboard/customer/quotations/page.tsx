import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { RoleSidebar } from "@/components/navbar/RoleSidebar";
import Link from "next/link";
import { FileText, ChevronRight } from "lucide-react";
import { CustomerNewQuoteButton } from "./CustomerNewQuoteButton";
import styles from "../../dashboard.module.css";
import cStyles from "../customer.module.css";

export const dynamic = "force-dynamic";

export default async function CustomerQuotationsPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "CUSTOMER") redirect("/login");

  let customer = await prisma.customer.findFirst({
    where: {
      OR: [
        { email: user.email },
        { contactName: { contains: user.name, mode: "insensitive" } },
        { companyName: { contains: user.name, mode: "insensitive" } },
      ],
    },
    include: {
      quotes: {
        orderBy: { createdAt: "desc" },
        include: {
          lines: { include: { product: true } },
          portalTokens: { where: { revokedAt: null }, take: 1 },
        },
      },
    },
  });

  const quotes = customer?.quotes ?? [];

  return (
    <RoleSidebar role="CUSTOMER" userName={user.name} userEmail={user.email}>
      <main className={styles.page}>
        <div className={styles.container}>
          <header className={styles.header}>
            <div className={styles.headerLeft}>
              <h1 className={styles.title}>My Quotations</h1>
              <p className={styles.subtitle}>Review quotation proposals, item breakdowns, and terms</p>
            </div>
            <div className={styles.headerActions}>
              <CustomerNewQuoteButton />
            </div>
          </header>

          <div className={`${cStyles.tableCard} overflow-hidden`}>
            {quotes.length > 0 ? (
              <div className={`${cStyles.tableWrapper} ${cStyles.customScrollbar}`}>
                <table className={cStyles.table}>
                  <thead>
                    <tr>
                      <th>Quote Number</th>
                      <th>Date</th>
                      <th>Status</th>
                      <th>Lines</th>
                      <th>Total Amount</th>
                      <th style={{ textAlign: "right" }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quotes.map((q) => {
                      const portalToken = q.portalTokens?.[0]?.tokenHash;
                      const href = portalToken ? `/portal/${portalToken}` : `/dashboard/rep/quotes/${q.id}`;
                      return (
                        <tr key={q.id}>
                          <td className={cStyles.cellMono}>{q.quoteNumber}</td>
                          <td className={cStyles.cellMuted}>{new Date(q.createdAt).toLocaleDateString()}</td>
                          <td>
                            <span className={`${cStyles.statusBadge} ${q.status === "APPROVED" ? cStyles.badgeApproved : q.status === "PENDING_APPROVAL" ? cStyles.badgePending : q.status === "CONFIRMED" ? cStyles.badgeConfirmed : q.status === "REJECTED" ? cStyles.badgeRejected : q.status === "NEGOTIATING" ? cStyles.badgeNegotiating : cStyles.badgeDraft}`}>
                              {q.status}
                            </span>
                          </td>
                          <td>{q.lines.length} items</td>
                          <td className={cStyles.cellPrimary}>₹{Number(q.grandTotal).toLocaleString()}</td>
                          <td style={{ textAlign: "right" }}>
                            <Link href={href} className={cStyles.actionLink}>
                              Open Portal <ChevronRight size={14} />
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 text-[#94a3b8]">
                <FileText size={36} className="mx-auto mb-3 text-[#a78bfa] opacity-60" />
                <p>No quotations found.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </RoleSidebar>
  );
}
