// src/app/dashboard/admin/page.tsx
// Admin dashboard — overview with key metrics and navigation.
"use client";

import { useEffect, useState } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { LogoutButton } from "@/components/LogoutButton";

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
    <main className="min-h-screen px-6 py-10 bg-[var(--paper)]">
      <div className="mx-auto max-w-6xl">
        <header className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-semibold">Administration</h1>
            <p className="text-sm text-[var(--muted-foreground)]">Platform overview and management</p>
          </div>
          <LogoutButton />
        </header>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <MetricCard title="Active Subscriptions" value={metrics?.activeSubscriptions ?? 0} />
          <MetricCard title="Overdue Invoices" value={metrics?.overdueInvoices ?? 0} highlightRed={metrics?.overdueInvoices ? metrics.overdueInvoices > 0 : false} />
          <MetricCard title="Stalled Deals" value={metrics?.stalledQuotations ?? 0} highlightYellow={metrics?.stalledQuotations ? metrics.stalledQuotations > 0 : false} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
            <h2 className="text-lg font-medium mb-4">Pipeline by Status</h2>
            {loading ? (
              <p className="text-sm text-[var(--muted-foreground)]">Loading...</p>
            ) : (
              <div className="space-y-3">
                {pipeline.map((item) => (
                  <div key={item.status} className="flex items-center justify-between">
                    <span className="text-sm">{item.status}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium">${item.value.toLocaleString()}</span>
                      <span className="text-xs text-[var(--muted-foreground)]">({item.count})</span>
                    </div>
                  </div>
                ))}
                {pipeline.length === 0 && (
                  <p className="text-sm text-[var(--muted-foreground)]">No pipeline data</p>
                )}
              </div>
            )}
          </section>

          <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
            <h2 className="text-lg font-medium mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <Link
                href="/dashboard/admin/users"
                className="block rounded-lg border border-[var(--border)] bg-[var(--paper)] px-4 py-3 hover:bg-[var(--muted)] transition-colors no-underline"
              >
                <p className="font-medium text-sm">Manage Users</p>
                <p className="text-xs text-[var(--muted-foreground)]">View and manage user accounts</p>
              </Link>
              <Link
                href="/dashboard/finance"
                className="block rounded-lg border border-[var(--border)] bg-[var(--paper)] px-4 py-3 hover:bg-[var(--muted)] transition-colors no-underline"
              >
                <p className="font-medium text-sm">Finance & Billing</p>
                <p className="text-xs text-[var(--muted-foreground)]">Invoices, payments, subscriptions</p>
              </Link>
              <Link
                href="/dashboard/billing"
                className="block rounded-lg border border-[var(--border)] bg-[var(--paper)] px-4 py-3 hover:bg-[var(--muted)] transition-colors no-underline"
              >
                <p className="font-medium text-sm">Subscription Plans</p>
                <p className="text-xs text-[var(--muted-foreground)]">Configure billing plans</p>
              </Link>
            </div>
          </section>
        </div>
      </div>
    </main>
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
    ? "text-red-600"
    : highlightYellow
    ? "text-yellow-600"
    : highlight
    ? "text-blue-600"
    : "text-foreground";

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
      <p className="text-sm text-[var(--muted-foreground)]">{title}</p>
      <p className={`text-2xl font-semibold ${valueClass}`}>{value}</p>
    </div>
  );
}
