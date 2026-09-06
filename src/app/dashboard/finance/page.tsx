// src/app/dashboard/finance/page.tsx - // src/app/dashboard/finance/page.tsx
// Finance dashboard — billing overview, invoices, and payments.
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RoleSidebar } from "@/components/navbar/RoleSidebar";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
  PieChart,
  Pie,
} from "recharts";
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
  revenueByMonth: { month: string; revenue: number }[];
  invoicesByStatus: { status: string; count: number }[];
}

const STATUS_COLORS: Record<string, string> = {
  PAID: "#34d399",
  ISSUED: "#60a5fa",
  OVERDUE: "#f87171",
  PARTIALLY_PAID: "#fbbf24",
  DRAFT: "#94a3b8",
  CANCELLED: "#64748b",
};

const CHART_COLORS = ["#ffffff", "#06b6d4", "#f59e0b", "#ef4444", "#10b981", "#3b82f6"];

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
          fetch("/api/invoices?limit=50"),
        ]);

        if (!metricsRes.ok || !invoicesRes.ok) {
          throw new Error("Failed to fetch data");
        }

        const metricsData = await metricsRes.json();
        const invoicesData = await invoicesRes.json();

        const invoices: Invoice[] = invoicesData.data?.invoices ?? [];
        const revenueByMonth = computeRevenueByMonth(invoices);
        const invoicesByStatus = computeInvoicesByStatus(invoices);

        setData({
          metrics: {
            totalRevenue: metricsData.data?.metrics?.totalRevenue ?? 0,
            overdueInvoices: metricsData.data?.metrics?.overdueInvoices ?? 0,
            activeSubscriptions: metricsData.data?.metrics?.activeSubscriptions ?? 0,
            pendingApprovals: metricsData.data?.metrics?.pendingApprovals ?? 0,
          },
          recentInvoices: invoices.slice(0, 10),
          dueSubscriptions: [],
          revenueByMonth,
          invoicesByStatus,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  function computeRevenueByMonth(invoices: Invoice[]) {
    const byMonth: Record<string, number> = {};
    for (const inv of invoices) {
      if (inv.status !== "PAID") continue;
      const date = new Date(inv.dueAt);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      byMonth[key] = (byMonth[key] ?? 0) + Number(inv.amount);
    }
    return Object.entries(byMonth)
      .map(([month, revenue]) => ({ month, revenue }))
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-6);
  }

  function computeInvoicesByStatus(invoices: Invoice[]) {
    const byStatus: Record<string, number> = {};
    for (const inv of invoices) {
      byStatus[inv.status] = (byStatus[inv.status] ?? 0) + 1;
    }
    return Object.entries(byStatus).map(([status, count]) => ({ status, count }));
  }

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

  const totalInvoices = data?.invoicesByStatus.reduce((acc, s) => acc + s.count, 0) ?? 0;

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
            <h2 className={styles.cardTitle}>Revenue Trend</h2>
            <p className={styles.subtitle} style={{ marginBottom: "1rem" }}>
              Paid invoice revenue by month
            </p>
            {data?.revenueByMonth && data.revenueByMonth.length > 0 ? (
              <div style={{ width: "100%", height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.revenueByMonth} margin={{ top: 5, right: 10, left: -20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(139,92,246,0.1)" />
                    <XAxis
                      dataKey="month"
                      stroke="#94a3b8"
                      tick={{ fill: "#94a3b8", fontSize: 11 }}
                      tickFormatter={(v: string) => v.slice(5)}
                    />
                    <YAxis
                      stroke="#94a3b8"
                      tick={{ fill: "#94a3b8", fontSize: 11 }}
                      tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#111111",
                        borderColor: "rgba(255,255,255,0.2)",
                        borderRadius: "0.75rem",
                        color: "#fff",
                        fontSize: "0.8125rem",
                      }}
                      formatter={(val: any) => [`$${Number(val).toLocaleString()}`, "Revenue"]}
                    />
                    <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
                      {data.revenueByMonth.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className={styles.emptyStateText}>No revenue data available</p>
            )}
          </section>

          <section className={`${styles.card} ${styles.animateFadeIn}`}>
            <h2 className={styles.cardTitle}>Invoice Status Distribution</h2>
            <p className={styles.subtitle} style={{ marginBottom: "1rem" }}>
              Breakdown of all invoices by current status
            </p>
            {data?.invoicesByStatus && data.invoicesByStatus.length > 0 ? (
              <div style={{ width: "100%", height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.invoicesByStatus}
                      dataKey="count"
                      nameKey="status"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={3}
                      labelLine={{ stroke: "#a78bfa", strokeWidth: 1 }}
                      label={true}
                    >
                      {data.invoicesByStatus.map((entry, i) => (
                        <Cell key={entry.status} fill={STATUS_COLORS[entry.status] || CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#111111",
                        borderColor: "rgba(255,255,255,0.2)",
                        borderRadius: "0.75rem",
                        color: "#fff",
                        fontSize: "0.8125rem",
                      }}
                      formatter={(val: any, name: any) => [`${val} Invoices`, name]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className={styles.emptyStateText}>No invoice data available</p>
            )}
          </section>
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
                    className="flex items-center justify-between py-3 border-b border-[rgba(255,255,255,0.1)] last:border-0"
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
            <h2 className={styles.cardTitle}>Key Metrics</h2>
            <p className={styles.subtitle} style={{ marginBottom: "1.5rem" }}>
              Financial health indicators
            </p>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-[rgba(255,255,255,0.1)]">
                <div>
                  <p className="text-sm text-[#94a3b8]">Collection Rate</p>
                  <p className="text-lg font-semibold text-[#f1f5f9]">
                    {totalInvoices > 0
                      ? `${Math.round((data?.invoicesByStatus.find(s => s.status === "PAID")?.count ?? 0) / totalInvoices * 100)}%`
                      : "N/A"}
                  </p>
                </div>
                <span className={`${styles.statusBadge} ${styles.statusBadgeApproved}`}>
                  Paid
                </span>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-[rgba(255,255,255,0.1)]">
                <div>
                  <p className="text-sm text-[#94a3b8]">Outstanding Rate</p>
                  <p className="text-lg font-semibold text-[#f1f5f9]">
                    {totalInvoices > 0
                      ? `${Math.round(
                          ((data?.invoicesByStatus.find(
                            (item) => item.status === "OVERDUE"
                          )?.count ?? 0) /
                            totalInvoices) *
                            100
                        )}%`
                      : "N/A"}
                  </p>
                </div>
                <span className={`${styles.statusBadge} ${styles.statusBadgeRejected}`}>
                  Overdue
                </span>
              </div>
              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm text-[#94a3b8]">Total Invoices</p>
                  <p className="text-lg font-semibold text-[#f1f5f9]">{totalInvoices}</p>
                </div>
                <span className={`${styles.statusBadge}`}>
                  All Time
                </span>
              </div>
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