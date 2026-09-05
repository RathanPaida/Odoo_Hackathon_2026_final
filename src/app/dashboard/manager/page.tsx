// src/app/dashboard/manager/page.tsx
// Sales Manager dashboard — approval queue, analytics, and governance tools.
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { RoleSidebar } from "@/components/navbar/RoleSidebar";
import { LogoutButton } from "@/components/LogoutButton";
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
  LineChart,
  Line,
  Legend,
} from "recharts";
import {
  CheckSquare,
  ShieldCheck,
  Package,
  Truck,
  ArrowRight,
  TrendingUp,
  Clock,
  AlertTriangle,
} from "lucide-react";
import styles from "../dashboard.module.css";

interface DashboardData {
  metrics: {
    totalQuotations: number;
    confirmedOrders: number;
    totalRevenue: number;
    pendingApprovals: number;
    approvedCount: number;
    rejectedCount: number;
    stalledQuotations: number;
  } | null;
  pipeline: { status: string; value: number; count: number }[];
  revenueByMonth: { month: string; revenue: number }[];
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "#94a3b8",
  PENDING_APPROVAL: "#fbbf24",
  APPROVED: "#34d399",
  REJECTED: "#f87171",
  NEGOTIATING: "#60a5fa",
  CONFIRMED: "#a78bfa",
};

const tiles = [
  {
    href: "/approvals",
    icon: CheckSquare,
    title: "Approval Queue",
    description:
      "Review and decide on quotations flagged by the blended risk engine with line-by-line discount breakdown.",
    cta: "Open Queue",
    footer: "Multi-level governance with append-only audit trail",
  },
  {
    href: "/governance",
    icon: ShieldCheck,
    title: "Discount Governance",
    description:
      "Maintain customer-tier ceilings, category discount limits, and test live calculations in the simulator.",
    cta: "Configure",
    footer: "Gold / Silver / Bronze tiers and category caps",
  },
  {
    href: "/catalog",
    icon: Package,
    title: "Product Catalog",
    description:
      "Browse catalog products, define base and cost pricing, target margins, and category structures.",
    cta: "Manage",
    footer: "One-Time & Subscription offerings",
  },
  {
    href: "/fulfillment",
    icon: Truck,
    title: "Warehouse & Fulfillment",
    description:
      "Monitor multi-warehouse inventory levels, fulfillment split allocations, and manage backorders.",
    cta: "View Split Engine",
    footer: "Greedy multi-warehouse allocation with manual override",
  },
];

export default function ManagerDashboardPage() {
  const [data, setData] = useState<DashboardData>({
    metrics: null,
    pipeline: [],
    revenueByMonth: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const res = await fetch("/api/dashboard/metrics");
        if (res.ok) {
          const json = await res.json();
          setData({
            metrics: json.data?.metrics ?? null,
            pipeline: json.data?.pipeline ?? [],
            revenueByMonth: json.data?.revenueByMonth ?? [],
          });
        }
      } catch (err) {
        console.error("Failed to load dashboard data:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchDashboard();
  }, []);

  const chartData = data.pipeline.map((item) => ({
    status: item.status.replace("_", " "),
    value: item.value,
    count: item.count,
    color: STATUS_COLORS[item.status] || "#8b5cf6",
  }));

  const statusDistribution = [
    { name: "Approved", value: data.metrics?.approvedCount ?? 0, color: "#34d399" },
    { name: "Pending", value: data.metrics?.pendingApprovals ?? 0, color: "#fbbf24" },
    { name: "Confirmed", value: data.metrics?.confirmedOrders ?? 0, color: "#a78bfa" },
    { name: "Rejected", value: data.metrics?.rejectedCount ?? 0, color: "#f87171" },
  ].filter((d) => d.value > 0);

  return (
    <RoleSidebar role="SALES_MANAGER">
      <main className={styles.page}>
        <div className={styles.container}>
          <header className={styles.header}>
            <div className={styles.headerLeft}>
              <h1 className={styles.title}>Management Console</h1>
              <p className={styles.subtitle}>
                Sales Manager Workspace — discount governance, quote approval queues, and catalog
                oversight.
              </p>
            </div>
            <div className={styles.headerActions}>
              <LogoutButton />
            </div>
          </header>

          <div className={`${styles.cardGrid} ${styles.cardGrid4}`}>
            <MetricCard
              title="Pending Approvals"
              value={data.metrics?.pendingApprovals ?? 0}
              icon={Clock}
              highlight={data.metrics?.pendingApprovals ? data.metrics.pendingApprovals > 0 : false}
            />
            <MetricCard
              title="Total Quotations"
              value={data.metrics?.totalQuotations ?? 0}
              icon={TrendingUp}
            />
            <MetricCard
              title="Confirmed Orders"
              value={data.metrics?.confirmedOrders ?? 0}
              icon={CheckSquare}
            />
            <MetricCard
              title="Stalled Deals"
              value={data.metrics?.stalledQuotations ?? 0}
              icon={AlertTriangle}
              highlightYellow={
                data.metrics?.stalledQuotations ? data.metrics.stalledQuotations > 0 : false
              }
            />
          </div>

          <div className={`${styles.cardGrid} ${styles.cardGrid2}`}>
            <section className={`${styles.card} ${styles.animateFadeIn}`}>
              <h2 className={styles.cardTitle}>Pipeline by Status</h2>
              <p className={styles.subtitle} style={{ marginBottom: "1rem" }}>
                Quotation value distribution across stages
              </p>
              {loading ? (
                <p className={styles.emptyStateText}>Loading pipeline...</p>
              ) : chartData.length > 0 ? (
                <div style={{ width: "100%", height: 260 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(139,92,246,0.1)" />
                      <XAxis
                        dataKey="status"
                        stroke="#94a3b8"
                        tick={{ fill: "#94a3b8", fontSize: 11 }}
                        interval={0}
                        angle={-15}
                        textAnchor="end"
                      />
                      <YAxis
                        stroke="#94a3b8"
                        tick={{ fill: "#94a3b8", fontSize: 11 }}
                        tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#1e1b4b",
                          borderColor: "rgba(139,92,246,0.4)",
                          borderRadius: "0.75rem",
                          color: "#fff",
                          fontSize: "0.8125rem",
                        }}
                        formatter={(val: any) => [`$${Number(val).toLocaleString()}`, "Value"]}
                      />
                      <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                        {chartData.map((entry, idx) => (
                          <Cell key={`cell-${idx}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className={styles.emptyStateText}>No pipeline data available</p>
              )}
            </section>

            <section className={`${styles.card} ${styles.animateFadeIn}`}>
              <h2 className={styles.cardTitle}>Approval Distribution</h2>
              <p className={styles.subtitle} style={{ marginBottom: "1rem" }}>
                Current quote status breakdown
              </p>
              {loading ? (
                <p className={styles.emptyStateText}>Loading distribution...</p>
              ) : statusDistribution.length > 0 ? (
                <div style={{ width: "100%", height: 260 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusDistribution}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={85}
                        paddingAngle={4}
                        labelLine={{ stroke: "#a78bfa", strokeWidth: 1 }}
                        label={true}
                      >
                        {statusDistribution.map((entry, idx) => (
                          <Cell key={`pie-${idx}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#1e1b4b",
                          borderColor: "rgba(139,92,246,0.4)",
                          borderRadius: "0.75rem",
                          color: "#fff",
                          fontSize: "0.8125rem",
                        }}
                        formatter={(val: any, name: any) => [`${val} Deals`, name]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className={styles.emptyStateText}>No status data available</p>
              )}
            </section>
          </div>

          {data.revenueByMonth.length > 0 && (
            <div className={`${styles.cardGrid} ${styles.cardGrid1}`}>
              <section className={`${styles.card} ${styles.animateFadeIn}`}>
                <h2 className={styles.cardTitle}>Revenue Trend</h2>
                <p className={styles.subtitle} style={{ marginBottom: "1rem" }}>
                  Monthly confirmed revenue over time
                </p>
                <div style={{ width: "100%", height: 220 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.revenueByMonth} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(139,92,246,0.1)" />
                      <XAxis dataKey="month" stroke="#94a3b8" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                      <YAxis
                        stroke="#94a3b8"
                        tick={{ fill: "#94a3b8", fontSize: 11 }}
                        tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#1e1b4b",
                          borderColor: "rgba(139,92,246,0.4)",
                          borderRadius: "0.75rem",
                          color: "#fff",
                          fontSize: "0.8125rem",
                        }}
                        formatter={(val: any) => [`$${Number(val).toLocaleString()}`, "Revenue"]}
                      />
                      <Legend wrapperStyle={{ color: "#cbd5e1", fontSize: "0.75rem" }} />
                      <Line
                        type="monotone"
                        dataKey="revenue"
                        name="Revenue"
                        stroke="#8b5cf6"
                        strokeWidth={2}
                        dot={{ fill: "#8b5cf6", r: 4 }}
                        activeDot={{ r: 6, fill: "#c4b5fd" }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </section>
            </div>
          )}

          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Management Tools</h2>
          </div>

          <div className={`${styles.cardGrid} ${styles.cardGrid2}`}>
            {tiles.map((tile) => {
              const Icon = tile.icon;
              return (
                <Link
                  key={tile.href}
                  href={tile.href}
                  className={styles.navLink}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div
                      className={`p-3 rounded-xl ${styles.card}`}
                      style={{
                        background: "rgba(109, 40, 217, 0.2)",
                        border: "1px solid rgba(139, 92, 246, 0.3)",
                      }}
                    >
                      <Icon className="h-6 w-6" style={{ color: "#c4b5fd" }} />
                    </div>
                    <span className={styles.actionLink}>
                      {tile.cta} <ArrowRight className="h-3.5 w-3.5 inline" />
                    </span>
                  </div>
                  <h2 className={styles.navTitle}>{tile.title}</h2>
                  <p className={styles.navDescription}>{tile.description}</p>
                  <div
                    className="mt-4 pt-4 border-t border-[rgba(139,92,246,0.15)] text-xs"
                    style={{ color: "#64748b" }}
                  >
                    {tile.footer}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </main>
    </RoleSidebar>
  );
}

function MetricCard({
  title,
  value,
  icon: Icon,
  highlight,
  highlightYellow,
}: {
  title: string;
  value: number;
  icon: any;
  highlight?: boolean;
  highlightYellow?: boolean;
}) {
  const valueClass = highlightYellow
    ? styles.metricValueYellow
    : highlight
    ? styles.metricValueBlue
    : styles.metricValue;

  return (
    <div className={`${styles.metricCard} ${styles.animateFadeIn}`}>
      <div className="flex items-center justify-between mb-2">
        <p className={styles.metricTitle}>{title}</p>
        <Icon className="h-4 w-4" style={{ color: "#94a3b8" }} />
      </div>
      <p className={`${styles.metricValue} ${valueClass}`}>{value}</p>
    </div>
  );
}
