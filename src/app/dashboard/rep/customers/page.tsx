import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { RoleSidebar } from "@/components/navbar/RoleSidebar";
import NewQuoteButton from "../quotes/NewQuoteButton";
import { CustomerTier } from "@/generated/prisma";
import styles from "../../dashboard.module.css";

export const dynamic = "force-dynamic";

const TIER_CLASSES: Record<CustomerTier, string> = {
  BRONZE: styles.tierBronze,
  SILVER: styles.tierSilver,
  GOLD: styles.tierGold,
  PLATINUM: styles.tierPlatinum,
};

export default async function RepCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ tier?: CustomerTier; q?: string }>;
}) {
  const user = await getCurrentUser();
  if (
    !user ||
    (user.role !== "SALES_REP" &&
      user.role !== "SALES_MANAGER" &&
      user.role !== "ADMIN")
  ) {
    redirect("/login");
  }

  const { tier, q } = await searchParams;

  const where: any = {};
  if (tier) {
    where.tier = tier;
  }
  if (q) {
    where.OR = [
      { companyName: { contains: q, mode: "insensitive" } },
      { contactName: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
    ];
  }

  const customers = await prisma.customer.findMany({
    where,
    orderBy: { companyName: "asc" },
    include: {
      _count: {
        select: { quotes: true, orders: true },
      },
    },
  });

  const tiers: CustomerTier[] = ["BRONZE", "SILVER", "GOLD", "PLATINUM"];

  return (
    <RoleSidebar role={user.role} userName={user.name} userEmail={user.email}>
      <main className={styles.page}>
        <div className={styles.container}>
          <header className={styles.header}>
            <div className={styles.headerLeft}>
              <Link href="/dashboard/rep" className={styles.backLink}>
                ← Back to Dashboard
              </Link>
              <h1 className={styles.title}>Customers Directory</h1>
              <p className={styles.subtitle}>
                Manage customer accounts, view tier eligibility, and create quotes
              </p>
            </div>
            <div className={styles.headerActions}>
              <Link href="/dashboard/rep/customers/new" className={styles.primaryBtn}>
                + New Customer
              </Link>
            </div>
          </header>

        {/* Filter Tabs */}
        <div className={styles.filterTabs}>
          <Link
            href="/dashboard/rep/customers"
            className={`${styles.filterTab} ${!tier ? styles.filterTabActive : ""}`}
          >
            All Tiers
          </Link>
          {tiers.map((t) => (
            <Link
              key={t}
              href={`/dashboard/rep/customers?tier=${t}`}
              className={`${styles.filterTab} ${tier === t ? styles.filterTabActive : ""}`}
            >
              {t}
            </Link>
          ))}
        </div>

        {/* Customer Table */}
        <div className={`${styles.tableCard} ${styles.animateFadeIn}`}>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Contact Person</th>
                  <th>Email</th>
                  <th>Tier</th>
                  <th>Currency</th>
                  <th>Quotes</th>
                  <th>Orders</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {customers.length === 0 ? (
                  <tr>
                    <td colSpan={9} className={styles.emptyState}>
                      <div className={styles.emptyStateText}>
                        No customers found matching the criteria.
                      </div>
                    </td>
                  </tr>
                ) : (
                  customers.map((c) => (
                    <tr key={c.id}>
                      <td className={styles.cellPrimary}>{c.companyName}</td>
                      <td>{c.contactName}</td>
                      <td>
                        <a
                          href={`mailto:${c.email}`}
                          className={styles.backLink}
                          style={{ margin: 0 }}
                        >
                          {c.email}
                        </a>
                      </td>
                      <td>
                        <span className={`${styles.tierBadge} ${TIER_CLASSES[c.tier]}`}>
                          {c.tier}
                        </span>
                      </td>
                      <td>
                        <span className={styles.cellMuted}>{c.currency}</span>
                      </td>
                      <td>
                        <span className={styles.cellPrimary}>
                          <Link href={`/dashboard/rep/customers/${c.id}`} style={{ color: "#c4b5fd", textDecoration: "underline" }}>
                            {c._count.quotes}
                          </Link>
                        </span>
                      </td>
                      <td>
                        <span className={styles.cellMuted}>
                          {c._count.orders}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`${styles.statusBadge} ${
                            c.active
                              ? styles.statusBadgeActive
                              : styles.statusBadgeInactive
                          }`}
                        >
                          {c.active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                          <Link
                            href={`/dashboard/rep/customers/${c.id}`}
                            className={styles.actionLink}
                          >
                            View
                          </Link>
                          <Link
                            href={`/dashboard/rep/customers/${c.id}`}
                            className={styles.actionLink}
                          >
                            Edit
                          </Link>
                          <NewQuoteButton customerId={c.id} />
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
    </RoleSidebar>
  );
}