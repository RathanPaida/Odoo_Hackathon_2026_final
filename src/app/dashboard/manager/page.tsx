// src/app/dashboard/manager/page.tsx
// Sales Manager dashboard — approvals, pipeline, and deal health.
"use client";

import { useEffect, useState } from "react";
import { LogoutButton } from "@/components/LogoutButton";

interface Metrics {
  totalQuotations: number;
  confirmedOrders: number;
  totalRevenue: number;
  pendingApprovals: number;
  approvedCount: number;
  rejectedCount: number;
  stalledQuotations: number;
}

interface StalledDeal {
  id: string;
  quoteNumber: string;
  customerName: string;
  grandTotal: string;
  status: string;
  daysStalled: number;
}

interface DiscountAnomaly {
  id: string;
  quoteNumber: string;
  customerName: string;
  blendedDiscountPct: number;
  detectedAt: string;
}

export default function ManagerDashboardPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [stalledDeals, setStalledDeals] = useState<StalledDeal[]>([]);
  const [anomalies, setAnomalies] = useState<DiscountAnomaly[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [metricsRes, anomaliesRes] = await Promise.all([
          fetch("/api/dashboard/metrics"),
          fetch("/api/dashboard/anomalies"),
        ]);

        if (metricsRes.ok) {
          const metricsData = await metricsRes.json();
          setMetrics(metricsData.data?.metrics);
        }

        if (anomaliesRes.ok) {
          const anomaliesData = await anomaliesRes.json();
          setStalledDeals(anomaliesData.data?.stalledDeals ?? []);
          setAnomalies(anomaliesData.data?.discountAnomalies ?? []);
        }
      } catch (err) {
        console.error("Failed to fetch data:", err);
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
            <h1 className="text-3xl font-semibold">Sales Manager</h1>
            <p className="text-sm text-[var(--muted-foreground)]">Pipeline overview and approvals</p>
          </div>
          <LogoutButton />
        </header>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <MetricCard title="Pending Approvals" value={metrics?.pendingApprovals ?? 0} highlight={!!metrics?.pendingApprovals} />
          <MetricCard title="Approved" value={metrics?.approvedCount ?? 0} />
          <MetricCard title="Rejected" value={metrics?.rejectedCount ?? 0} />
          <MetricCard title="Stalled Deals" value={metrics?.stalledQuotations ?? 0} highlightYellow={!!metrics?.stalledQuotations} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
            <h2 className="text-lg font-medium mb-4">Stalled Deals</h2>
            {loading ? (
              <p className="text-sm text-[var(--muted-foreground)]">Loading...</p>
            ) : stalledDeals.length === 0 ? (
              <p className="text-sm text-[var(--muted-foreground)]">No stalled deals</p>
            ) : (
              <div className="space-y-3">
                {stalledDeals.slice(0, 5).map((deal) => (
                  <div key={deal.id} className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0">
                    <div>
                      <p className="font-medium text-sm">{deal.quoteNumber}</p>
                      <p className="text-xs text-[var(--muted-foreground)]">{deal.customerName}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-sm">${Number(deal.grandTotal).toLocaleString()}</p>
                      <p className="text-xs text-red-600">{deal.daysStalled} days stalled</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
            <h2 className="text-lg font-medium mb-4">Discount Anomalies</h2>
            {loading ? (
              <p className="text-sm text-[var(--muted-foreground)]">Loading...</p>
            ) : anomalies.length === 0 ? (
              <p className="text-sm text-[var(--muted-foreground)]">No anomalies detected</p>
            ) : (
              <div className="space-y-3">
                {anomalies.slice(0, 5).map((anomaly) => (
                  <div key={anomaly.id} className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0">
                    <div>
                      <p className="font-medium text-sm">{anomaly.quoteNumber}</p>
                      <p className="text-xs text-[var(--muted-foreground)]">{anomaly.customerName}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-sm">{anomaly.blendedDiscountPct}%</p>
                      <p className="text-xs text-[var(--muted-foreground)]">
                        {new Date(anomaly.detectedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <section className="mt-6 rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
            <h2 className="text-lg font-medium mb-4">Approval Metrics</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-[var(--muted-foreground)]">Total Quotations</p>
                <p className="text-xl font-semibold">{metrics?.totalQuotations ?? 0}</p>
              </div>
              <div>
                <p className="text-sm text-[var(--muted-foreground)]">Confirmed Orders</p>
                <p className="text-xl font-semibold">{metrics?.confirmedOrders ?? 0}</p>
              </div>
              <div>
                <p className="text-sm text-[var(--muted-foreground)]">Approval Rate</p>
                <p className="text-xl font-semibold">
                  {metrics?.pendingApprovals !== undefined && metrics?.approvedCount !== undefined
                    ? metrics.approvedCount + metrics.pendingApprovals > 0
                      ? Math.round((metrics.approvedCount / (metrics.approvedCount + metrics.pendingApprovals)) * 100)
                      : 0
                    : 0}%
                </p>
              </div>
              <div>
                <p className="text-sm text-[var(--muted-foreground)]">Total Revenue</p>
                <p className="text-xl font-semibold">${((metrics?.totalRevenue ?? 0) / 1000).toFixed(1)}k</p>
              </div>
            </div>
          </section>
      </div>
    </main>
  );
}

function MetricCard({
  title,
  value,
  highlight,
  highlightYellow,
}: {
  title: string;
  value: string | number;
  highlight?: boolean;
  highlightYellow?: boolean;
}) {
  const valueClass = highlightYellow
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
