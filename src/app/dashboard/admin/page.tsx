// src/app/dashboard/admin/page.tsx - // src/app/dashboard/admin/page.tsx
// Admin dashboard — overview with key metrics and navigation.
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LogoutButton } from "@/components/LogoutButton";
import { RoleSidebar } from "@/components/navbar/RoleSidebar";
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

export default function AdminDashboardPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [pipeline, setPipeline] = useState<PipelineItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/dashboard/metrics");
        if (res.ok) {
          const data = await res.json();
          setMetrics(data.data?.metrics);
          setPipeline(data.data?.pipeline ?? []);
        }
      } catch (err) {
        console.error("Failed to fetch metrics:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

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
          <MetricCard title="Total Quotations" value={metrics?.totalQuotations ?? 0} />
          <MetricCard title="Confirmed Orders" value={metrics?.confirmedOrders ?? 0} />
          <MetricCard
            title="Total Revenue"
            value={`$${((metrics?.totalRevenue ?? 0) / 1000).toFixed(1)}k`}
          />
          <MetricCard
            title="Pending Approvals"
            value={metrics?.pendingApprovals ?? 0}
            highlight={metrics?.pendingApprovals ? metrics.pendingApprovals > 0 : false}
          />
        </div>

        <div className={`${styles.cardGrid} ${styles.cardGrid3}`}>
          <MetricCard title="Active Subscriptions" value={metrics?.activeSubscriptions ?? 0} />
          <MetricCard title="Overdue Invoices" value={metrics?.overdueInvoices ?? 0} highlightRed={metrics?.overdueInvoices ? metrics.overdueInvoices > 0 : false} />
          <MetricCard title="Stalled Deals" value={metrics?.stalledQuotations ?? 0} highlightYellow={metrics?.stalledQuotations ? metrics.stalledQuotations > 0 : false} />
        </div>

        <div className={`${styles.cardGrid} ${styles.cardGrid2}`}>
          <section className={`${styles.card} ${styles.animateFadeIn}`}>
            <h2 className={styles.cardTitle}>Pipeline by Status</h2>
            {loading ? (
              <p className={styles.emptyStateText}>Loading...</p>
            ) : (
              <div className="space-y-3 mt-4">
                {pipeline.map((item) => (
                  <div key={item.status} className="flex items-center justify-between py-2 border-b border-[rgba(139,92,246,0.1)] last:border-0">
                    <span className="text-sm text-[#e2e8f0]">{item.status}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-[#f1f5f9]">${item.value.toLocaleString()}</span>
                      <span className="text-xs text-[#64748b]">({item.count})</span>
                    </div>
                  </div>
                ))}
                {pipeline.length === 0 && (
                  <p className={styles.emptyStateText}>No pipeline data</p>
                )}
              </div>
            )}
          </section>

          <section className={`${styles.card} ${styles.animateFadeIn}`}>
            <h2 className={styles.cardTitle}>Quick Actions</h2>
            <div className="space-y-3 mt-4">
              <Link
                href="/dashboard/admin/users"
                className={styles.navLink}
              >
                <h3 className={styles.navTitle}>Manage Users</h3>
                <p className={styles.navDescription}>View and manage user accounts</p>
              </Link>
              <Link
                href="/dashboard/admin/categories"
                className={styles.navLink}
              >
                <h3 className={styles.navTitle}>Product Categories</h3>
                <p className={styles.navDescription}>Hardware, Software, Services & governance</p>
              </Link>
              <Link
                href="/dashboard/finance"
                className={styles.navLink}
              >
                <h3 className={styles.navTitle}>Finance & Billing</h3>
                <p className={styles.navDescription}>Invoices, payments, subscriptions</p>
              </Link>
              <Link
                href="/dashboard/billing"
                className={styles.navLink}
              >
                <h3 className={styles.navTitle}>Subscription Plans</h3>
                <p className={styles.navDescription}>Configure billing plans</p>
              </Link>
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