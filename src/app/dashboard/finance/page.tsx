// src/app/dashboard/finance/page.tsx - // src/app/dashboard/finance/page.tsx
// Finance dashboard — billing overview, invoices, and payments.
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RoleSidebar } from "@/components/navbar/RoleSidebar";
import styles from "../dashboard.module.css";

interface Invoice {
  id: string;
  invoiceNumber: string;
  amount: string;
  status: string;
  dueAt: string;
  customerId: string;
}

interface Subscription {
  id: string;
  status: string;
  nextBillingDate: string;
  customerId: string;
}

interface DashboardData {
  metrics: {
    totalRevenue: number;
    overdueInvoices: number;
    activeSubscriptions: number;
    pendingApprovals: number;
  };
  recentInvoices: Invoice[];
  dueSubscriptions: Subscription[];
}

export default function FinanceDashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [metricsRes, invoicesRes] = await Promise.all([
          fetch("/api/dashboard/metrics"),
          fetch("/api/invoices?limit=10"),
        ]);

        if (!metricsRes.ok || !invoicesRes.ok) {
          throw new Error("Failed to fetch data");
        }

        const metricsData = await metricsRes.json();
        const invoicesData = await invoicesRes.json();

        setData({
          metrics: {
            totalRevenue: metricsData.data?.metrics?.totalRevenue ?? 0,
            overdueInvoices: metricsData.data?.metrics?.overdueInvoices ?? 0,
            activeSubscriptions: metricsData.data?.metrics?.activeSubscriptions ?? 0,
            pendingApprovals: metricsData.data?.metrics?.pendingApprovals ?? 0,
          },
          recentInvoices: invoicesData.data?.invoices ?? [],
          dueSubscriptions: [],
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return (
      <RoleSidebar role="FINANCE">
        <main className={styles.page}>
          <div className={styles.container}>
            <header className={styles.header}>
              <div className={styles.headerLeft}>
                <h1 className={styles.title}>Finance & Operations</h1>
                <p className={styles.subtitle}>Loading...</p>
              </div>
            </header>
          </div>
        </main>
      </RoleSidebar>
    );
  }

  return (
    <RoleSidebar role="FINANCE">
      <main className={styles.page}>
        <div className={styles.container}>
          <header className={styles.header}>
            <div className={styles.headerLeft}>
              <h1 className={styles.title}>Finance & Operations</h1>
              <p className={styles.subtitle}>Billing, invoices, and subscriptions</p>
            </div>
          </header>

        <div className={`${styles.cardGrid} ${styles.cardGrid4}`}>
          <MetricCard
            title="Total Revenue"
            value={`$${(data?.metrics.totalRevenue ?? 0).toLocaleString()}`}
            highlight="green"
          />
          <MetricCard
            title="Overdue Invoices"
            value={String(data?.metrics.overdueInvoices ?? 0)}
            highlight={data?.metrics.overdueInvoices ? "red" : "green"}
          />
          <MetricCard
            title="Active Subscriptions"
            value={String(data?.metrics.activeSubscriptions ?? 0)}
            highlight="blue"
          />
          <MetricCard
            title="Pending Approvals"
            value={String(data?.metrics.pendingApprovals ?? 0)}
            highlight={data?.metrics.pendingApprovals ? "yellow" : "green"}
          />
        </div>

        <div className={`${styles.cardGrid} ${styles.cardGrid2}`}>
          <section className={`${styles.card} ${styles.animateFadeIn}`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className={styles.cardTitle}>Recent Invoices</h2>
              <button
                onClick={() => router.push("/dashboard/billing")}
                className={styles.actionLink}
              >
                View all
              </button>
            </div>
            {error ? (
              <p className={styles.emptyStateText}>{error}</p>
            ) : data?.recentInvoices.length === 0 ? (
              <p className={styles.emptyStateText}>No invoices yet</p>
            ) : (
              <div className="space-y-3">
                {data?.recentInvoices.map((invoice) => (
                  <div
                    key={invoice.id}
                    className="flex items-center justify-between py-3 border-b border-[rgba(139,92,246,0.1)] last:border-0"
                  >
                    <div>
                      <p className="font-medium text-sm text-[#f1f5f9]">{invoice.invoiceNumber}</p>
                      <p className="text-xs text-[#64748b]">
                        Due: {new Date(invoice.dueAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-[#f1f5f9]">${Number(invoice.amount).toLocaleString()}</p>
                      <span className={`${styles.statusBadge} ${
                        invoice.status === "PAID"
                          ? styles.statusBadgeApproved
                          : invoice.status === "OVERDUE"
                          ? styles.statusBadgeRejected
                          : styles.statusBadgePending
                      }`}>
                        {invoice.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className={`${styles.card} ${styles.animateFadeIn}`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className={styles.cardTitle}>Quick Actions</h2>
            </div>
            <div className="space-y-3">
              <button
                onClick={() => router.push("/dashboard/billing")}
                className={styles.navLink}
              >
                <h3 className={styles.navTitle}>Manage Subscription Plans</h3>
                <p className={styles.navDescription}>Configure billing cycles and pricing</p>
              </button>
              <button
                onClick={() => router.push("/dashboard/billing")}
                className={styles.navLink}
              >
                <h3 className={styles.navTitle}>View All Invoices</h3>
                <p className={styles.navDescription}>Track payments and outstanding balances</p>
              </button>
            </div>
          </section>
        </div>
      </div>
    </main>
    </RoleSidebar>
  );
}

function MetricCard({
  title,
  value,
  highlight,
}: {
  title: string;
  value: string;
  highlight?: "green" | "red" | "yellow" | "blue";
}) {
  const valueClass = highlight === "red"
    ? styles.metricValueRed
    : highlight === "yellow"
    ? styles.metricValueYellow
    : highlight === "blue"
    ? styles.metricValueBlue
    : styles.metricValueGreen;

  return (
    <div className={`${styles.metricCard} ${styles.animateFadeIn}`}>
      <p className={styles.metricTitle}>{title}</p>
      <p className={`${styles.metricValue} ${valueClass}`}>{value}</p>
    </div>
  );
}