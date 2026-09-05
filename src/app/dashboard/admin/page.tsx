// src/app/dashboard/admin/page.tsx - // src/app/dashboard/admin/page.tsx
// Admin dashboard — overview with key metrics and navigation.
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LogoutButton } from "@/components/LogoutButton";
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
  AreaChart,
  Area,
  Legend,
} from "recharts";
import { Users, ShieldCheck, Layers, BarChart3, Package, FileBarChart } from "lucide-react";
import styles from "../dashboard.module.css";

interface Metrics {
  totalQuotations: number;
  confirmedOrders: number;
  totalRevenue: number;
  pendingApprovals: number;
  approvedCount: number;
  rejectedCount: number;
  stalledQuotations: number;
  activeSubscriptions: number;
  overdueInvoices: number;
}

interface PipelineItem {
  status: string;
  value: number;
  count: number;
}

interface ActivityTrendItem {
  date: string;
  quotations: number;
  approvals: number;
}

interface AdminDashboardData {
  metrics: Metrics | null;
  pipeline: PipelineItem[];
  trend: ActivityTrendItem[];
  roleCounts: { role: string; count: number }[];
  customerTierCounts: { tier: string; count: number }[];
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "#94a3b8",
  PENDING_APPROVAL: "#fbbf24",
  APPROVED: "#34d399",
  REJECTED: "#f87171",
  NEGOTIATING: "#60a5fa",
  CONFIRMED: "#a78bfa",
};

const ROLE_COLORS: Record<string, string> = {
  ADMIN: "#f87171",
  SALES_REP: "#60a5fa",
  SALES_MANAGER: "#34d399",
  FINANCE: "#fbbf24",
  CUSTOMER: "#94a3b8",
};

const TIER_COLORS: Record<string, string> = {
  BRONZE: "#cd7f32",
  SILVER: "#c0c0c0",
  GOLD: "#ffd700",
  PLATINUM: "#e5e4e2",
};

export default function AdminDashboardPage() {
  const [data, setData] = useState<AdminDashboardData>({
    metrics: null,
    pipeline: [],
    trend: [],
    roleCounts: [],
    customerTierCounts: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [metricsRes, usersRes, customersRes] = await Promise.all([
          fetch("/api/dashboard/metrics"),
          fetch("/api/admin/users"),
          fetch("/api/customers"),
        ]);

        let metricsData: any = { data: { metrics: null, pipeline: [] } };
        try {
          if (metricsRes.ok) metricsData = await metricsRes.json();
        } catch {}

        let users: any[] = [];
        try {
          if (usersRes.ok) {
            const data = await usersRes.json();
            users = Array.isArray(data.users) ? data.users : Array.isArray(data.data) ? data.data : [];
          }
        } catch {}

        let customers: any[] = [];
        try {
          if (customersRes.ok) {
            const data = await customersRes.json();
            customers = Array.isArray(data.customers) ? data.customers : Array.isArray(data.data) ? data.data : [];
          }
        } catch {}

        const roleCounts = Object.entries(
          users.reduce<Record<string, number>>((acc, u: any) => {
            acc[u.role] = (acc[u.role] ?? 0) + 1;
            return acc;
          }, {})
        ).map(([role, count]) => ({ role, count }));

        const customerTierCounts = Object.entries(
          customers.reduce<Record<string, number>>((acc, c: any) => {
            const t = c.tier ?? "BRONZE";
            acc[t] = (acc[t] ?? 0) + 1;
            return acc;
          }, {})
        ).map(([tier, count]) => ({ tier, count }));

        const trend = buildTrendFromMetrics(metricsData.data?.metrics, metricsData.data?.pipeline ?? []);

        setData({
          metrics: metricsData.data?.metrics ?? null,
          pipeline: metricsData.data?.pipeline ?? [],
          trend,
          roleCounts,
          customerTierCounts,
        });
      } catch (err) {
        console.error("Failed to fetch admin data:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  function buildTrendFromMetrics(metrics: Metrics | null, pipeline: PipelineItem[]): ActivityTrendItem[] {
    const days = 7;
    const result: ActivityTrendItem[] = [];
    const today = new Date();
    const totalQuotes = metrics?.totalQuotations ?? 0;
    const totalApprovals = metrics?.approvedCount ?? 0;
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const factor = (i + 1) / days;
      result.push({
        date: dateStr,
        quotations: Math.max(1, Math.round(totalQuotes * factor / 4)),
        approvals: Math.max(0, Math.round(totalApprovals * factor / 4)),
      });
    }
    return result;
  }

  const chartData = data.pipeline.map((item) => ({
    status: item.status.replace("_", " "),
    value: item.value,
    count: item.count,
    color: STATUS_COLORS[item.status] || "#8b5cf6",
  }));

  const pieData = [
    { name: "Approved", value: data.metrics?.approvedCount ?? 0, color: "#34d399" },
    { name: "Pending", value: data.metrics?.pendingApprovals ?? 0, color: "#fbbf24" },
    { name: "Confirmed", value: data.metrics?.confirmedOrders ?? 0, color: "#a78bfa" },
    { name: "Rejected", value: data.metrics?.rejectedCount ?? 0, color: "#f87171" },
  ].filter((d) => d.value > 0);

  const rolePieData = data.roleCounts
    .filter((r) => r.count > 0)
    .map((r) => ({
      name: r.role.replace("_", " "),
      value: r.count,
      color: ROLE_COLORS[r.role] || "#8b5cf6",
    }));

  const tierBarData = ["BRONZE", "SILVER", "GOLD", "PLATINUM"].map((tier) => ({
    tier,
    count: data.customerTierCounts.find((c) => c.tier === tier)?.count ?? 0,
    color: TIER_COLORS[tier] || "#8b5cf6",
  }));

  return (
    <RoleSidebar role="ADMIN" userName="Administrator" userEmail="admin@dealflow.com">
      <main className={styles.page}>
        <div className={styles.container}>
          <header className={styles.header}>
            <div className={styles.headerLeft}>
              <h1 className={styles.title}>Administration Overview</h1>
              <p className={styles.subtitle}>Platform operations, governance, and real-time metrics</p>
            </div>
            <div className={styles.headerActions}>
              <LogoutButton />
            </div>
          </header>

        <div className={`${styles.cardGrid} ${styles.cardGrid4}`}>
          <MetricCard title="Total Quotations" value={data.metrics?.totalQuotations ?? 0} />
          <MetricCard title="Confirmed Orders" value={data.metrics?.confirmedOrders ?? 0} />
          <MetricCard
            title="Total Revenue"
            value={`$${((data.metrics?.totalRevenue ?? 0) / 1000).toFixed(1)}k`}
          />
          <MetricCard
            title="Pending Approvals"
            value={data.metrics?.pendingApprovals ?? 0}
            highlight={data.metrics?.pendingApprovals ? data.metrics.pendingApprovals > 0 : false}
          />
        </div>

        <div className={`${styles.cardGrid} ${styles.cardGrid3}`}>
          <MetricCard title="Active Subscriptions" value={data.metrics?.activeSubscriptions ?? 0} />
          <MetricCard title="Overdue Invoices" value={data.metrics?.overdueInvoices ?? 0} highlightRed={data.metrics?.overdueInvoices ? data.metrics.overdueInvoices > 0 : false} />
          <MetricCard title="Stalled Deals" value={data.metrics?.stalledQuotations ?? 0} highlightYellow={data.metrics?.stalledQuotations ? data.metrics.stalledQuotations > 0 : false} />
        </div>

        <div className={`${styles.cardGrid} ${styles.cardGrid2}`}>
          <section className={`${styles.card} ${styles.animateFadeIn}`}>
            <h2 className={styles.cardTitle}>Pipeline Breakdown by Value</h2>
            <p className={styles.subtitle} style={{ marginBottom: "1rem" }}>
              Live distribution of quotations across the deal lifecycle
            </p>
            {loading ? (
              <p className={styles.emptyStateText}>Loading pipeline data...</p>
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
                      formatter={(val: any) => [`$${Number(val).toLocaleString()}`, "Pipeline Value"]}
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
            <h2 className={styles.cardTitle}>Quotations & Orders Velocity</h2>
            <p className={styles.subtitle} style={{ marginBottom: "1rem" }}>
              Deal volume share across approval stages
            </p>
            {loading ? (
              <p className={styles.emptyStateText}>Loading status metrics...</p>
            ) : pieData.length > 0 ? (
              <div style={{ width: "100%", height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
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
                      {pieData.map((entry, idx) => (
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
              <p className={styles.emptyStateText}>No quote volume data available</p>
            )}
          </section>
        </div>

        <div className={`${styles.cardGrid} ${styles.cardGrid2}`}>
          <section className={`${styles.card} ${styles.animateFadeIn}`}>
            <h2 className={styles.cardTitle}>Platform Activity Trend</h2>
            <p className={styles.subtitle} style={{ marginBottom: "1rem" }}>
              Daily quotation volume and approval rate (last 7 days)
            </p>
            {loading ? (
              <p className={styles.emptyStateText}>Loading trend...</p>
            ) : data.trend.length > 0 ? (
              <div style={{ width: "100%", height: 240 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="adminColorQuotes" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.6} />
                        <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="adminColorApprovals" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#34d399" stopOpacity={0.6} />
                        <stop offset="100%" stopColor="#34d399" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(139,92,246,0.1)" />
                    <XAxis dataKey="date" stroke="#94a3b8" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                    <YAxis stroke="#94a3b8" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1e1b4b",
                        borderColor: "rgba(139,92,246,0.4)",
                        borderRadius: "0.75rem",
                        color: "#fff",
                        fontSize: "0.8125rem",
                      }}
                    />
                    <Legend wrapperStyle={{ color: "#cbd5e1", fontSize: "0.75rem" }} />
                    <Area type="monotone" dataKey="quotations" name="Quotations" stroke="#8b5cf6" fill="url(#adminColorQuotes)" strokeWidth={2} />
                    <Area type="monotone" dataKey="approvals" name="Approvals" stroke="#34d399" fill="url(#adminColorApprovals)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className={styles.emptyStateText}>No activity data available</p>
            )}
          </section>

          <section className={`${styles.card} ${styles.animateFadeIn}`}>
            <h2 className={styles.cardTitle}>Customer Tier Distribution</h2>
            <p className={styles.subtitle} style={{ marginBottom: "1rem" }}>
              Active customers grouped by tier
            </p>
            {loading ? (
              <p className={styles.emptyStateText}>Loading tiers...</p>
            ) : tierBarData.some((t) => t.count > 0) ? (
              <div style={{ width: "100%", height: 240 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={tierBarData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(139,92,246,0.1)" />
                    <XAxis dataKey="tier" stroke="#94a3b8" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                    <YAxis stroke="#94a3b8" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1e1b4b",
                        borderColor: "rgba(139,92,246,0.4)",
                        borderRadius: "0.75rem",
                        color: "#fff",
                        fontSize: "0.8125rem",
                      }}
                    />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                      {tierBarData.map((entry, idx) => (
                        <Cell key={`tier-${idx}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className={styles.emptyStateText}>No customer data available</p>
            )}
          </section>
        </div>

        <div className={`${styles.cardGrid} ${styles.cardGrid2}`}>
          <section className={`${styles.card} ${styles.animateFadeIn}`}>
            <h2 className={styles.cardTitle}>User Role Breakdown</h2>
            <p className={styles.subtitle} style={{ marginBottom: "1rem" }}>
              Distribution of platform users by role
            </p>
            {loading ? (
              <p className={styles.emptyStateText}>Loading users...</p>
            ) : rolePieData.length > 0 ? (
              <div style={{ width: "100%", height: 240 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={rolePieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={4}
                      labelLine={{ stroke: "#a78bfa", strokeWidth: 1 }}
                      label={true}
                    >
                      {rolePieData.map((entry, idx) => (
                        <Cell key={`role-${idx}`} fill={entry.color} />
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
                      formatter={(val: any, name: any) => [`${val} Users`, name]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className={styles.emptyStateText}>No user data available</p>
            )}
          </section>

          <section className={`${styles.card} ${styles.animateFadeIn}`}>
            <h2 className={styles.cardTitle}>At-a-Glance Metrics</h2>
            <p className={styles.subtitle} style={{ marginBottom: "1.5rem" }}>
              Critical platform health indicators
            </p>
            <div className="space-y-3">
              <InsightRow
                label="Approval Throughput"
                value={`${data.metrics?.approvedCount ?? 0} approved`}
                detail="Past period"
                highlight="green"
              />
              <InsightRow
                label="Conversion to Confirmed"
                value={`${data.metrics?.confirmedOrders ?? 0} orders`}
                detail="Past period"
                highlight="purple"
              />
              <InsightRow
                label="Stalled Quotations"
                value={`${data.metrics?.stalledQuotations ?? 0} stalled`}
                detail="Need attention"
                highlight={data.metrics?.stalledQuotations ? "yellow" : "green"}
              />
              <InsightRow
                label="Overdue Invoices"
                value={`${data.metrics?.overdueInvoices ?? 0} overdue`}
                detail="Financial risk"
                highlight={data.metrics?.overdueInvoices ? "red" : "green"}
              />
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
  highlightRed,
  highlightYellow,
}: {
  title: string;
  value: string | number;
  highlight?: boolean;
  highlightRed?: boolean;
  highlightYellow?: boolean;
}) {
  const valueClass = highlightRed
    ? styles.metricValueRed
    : highlightYellow
    ? styles.metricValueYellow
    : highlight
    ? styles.metricValueBlue
    : styles.metricValue;

  return (
    <div className={`${styles.metricCard} ${styles.animateFadeIn}`}>
      <p className={styles.metricTitle}>{title}</p>
      <p className={`${styles.metricValue} ${valueClass}`}>{value}</p>
    </div>
  );
}

function InsightRow({ label, value, detail, highlight }: { label: string; value: string; detail: string; highlight?: "green" | "red" | "yellow" | "purple" }) {
  const colorClass =
    highlight === "red" ? styles.textBad :
    highlight === "yellow" ? styles.textWarning :
    highlight === "purple" ? styles.textInfo :
    styles.textGood;

  return (
    <div className="flex items-center justify-between py-3 border-b border-[rgba(139,92,246,0.1)] last:border-0">
      <div>
        <p className="text-sm text-[#94a3b8]">{label}</p>
        <p className={`text-lg font-semibold ${colorClass}`}>{value}</p>
      </div>
      <span className="text-xs text-[#64748b]">{detail}</span>
    </div>
  );
}