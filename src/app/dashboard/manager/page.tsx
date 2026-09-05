// src/app/dashboard/manager/page.tsx
// Sales Manager dashboard — approvals, pipeline, and deal health.
"use client";

import { useEffect, useState } from "react";
import { LogoutButton } from "@/components/LogoutButton";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { NavigationHeader } from "@/components/NavigationHeader";
import Link from "next/link";
import { CheckSquare, ShieldCheck, Package, Truck, ArrowRight } from "lucide-react";

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
export default async function ManagerDashboardPage() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "SALES_MANAGER" && user.role !== "ADMIN")) redirect("/login");

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <NavigationHeader />

      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-10">
        <header className="mb-8">
          <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">Management Console</span>
          <h1 className="text-3xl font-black text-white mt-1">Welcome back, {user.name}</h1>
          <p className="text-sm text-slate-400 mt-1">
            Sales Manager Workspace — Discount governance, quote approval queues, and catalog oversight.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link
            href="/approvals"
            className="group p-6 rounded-2xl border border-slate-800 bg-slate-900/60 hover:border-indigo-500/50 hover:bg-slate-900 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="p-3 rounded-xl bg-indigo-600/10 text-indigo-400 border border-indigo-500/20">
                  <CheckSquare className="h-6 w-6" />
                </div>
                <span className="text-xs font-semibold text-indigo-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  Open Queue <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </div>
              <h2 className="text-xl font-bold text-white mb-1">Approval Queue</h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Review and decide on quotations flagged by the blended risk engine with line-by-line discount breakdown.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-800/80 text-xs text-slate-500">
              Multi-level governance with append-only audit trail
            </div>
          </Link>

          <Link
            href="/governance"
            className="group p-6 rounded-2xl border border-slate-800 bg-slate-900/60 hover:border-indigo-500/50 hover:bg-slate-900 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="p-3 rounded-xl bg-violet-600/10 text-violet-400 border border-violet-500/20">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <span className="text-xs font-semibold text-violet-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  Configure <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </div>
              <h2 className="text-xl font-bold text-white mb-1">Discount Governance</h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Maintain customer-tier ceilings, category discount limits, and test live calculations in the simulator.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-800/80 text-xs text-slate-500">
              Gold / Silver / Bronze tiers and category caps
            </div>
          </Link>

          <Link
            href="/catalog"
            className="group p-6 rounded-2xl border border-slate-800 bg-slate-900/60 hover:border-indigo-500/50 hover:bg-slate-900 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="p-3 rounded-xl bg-blue-600/10 text-blue-400 border border-blue-500/20">
                  <Package className="h-6 w-6" />
                </div>
                <span className="text-xs font-semibold text-blue-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  Manage <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </div>
              <h2 className="text-xl font-bold text-white mb-1">Product Catalog</h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Browse catalog products, define base and cost pricing, target margins, and category structures.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-800/80 text-xs text-slate-500">
              One-Time & Subscription offerings
            </div>
          </Link>

          <Link
            href="/fulfillment"
            className="group p-6 rounded-2xl border border-slate-800 bg-slate-900/60 hover:border-indigo-500/50 hover:bg-slate-900 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="p-3 rounded-xl bg-emerald-600/10 text-emerald-400 border border-emerald-500/20">
                  <Truck className="h-6 w-6" />
                </div>
                <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  View Split Engine <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </div>
              <h2 className="text-xl font-bold text-white mb-1">Warehouse & Fulfillment</h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Monitor multi-warehouse inventory levels, fulfillment split allocations, and manage backorders.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-800/80 text-xs text-slate-500">
              Greedy multi-warehouse allocation with manual override
            </div>
          </Link>
        </div>
      </main>
    </div>
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
