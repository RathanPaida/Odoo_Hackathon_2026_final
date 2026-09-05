// src/app/dashboard/finance/page.tsx
// Finance dashboard — billing overview, invoices, and payments.
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogoutButton } from "@/components/LogoutButton";

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
      <main className="min-h-screen px-6 py-10 bg-[var(--paper)]">
        <div className="mx-auto max-w-6xl">
          <header className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-semibold">Finance & Operations</h1>
              <p className="text-sm text-[var(--muted-foreground)]">Loading...</p>
            </div>
            <LogoutButton />
          </header>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-6 py-10 bg-[var(--paper)]">
      <div className="mx-auto max-w-6xl">
        <header className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-semibold">Finance & Operations</h1>
            <p className="text-sm text-[var(--muted-foreground)]">Billing, invoices, and subscriptions</p>
          </div>
          <LogoutButton />
        </header>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <MetricCard
            title="Total Revenue"
            value={`$${(data?.metrics.totalRevenue ?? 0).toLocaleString()}`}
            trend="up"
          />
          <MetricCard
            title="Overdue Invoices"
            value={String(data?.metrics.overdueInvoices ?? 0)}
            trend={data?.metrics.overdueInvoices ? "down" : "up"}
          />
          <MetricCard
            title="Active Subscriptions"
            value={String(data?.metrics.activeSubscriptions ?? 0)}
            trend="up"
          />
          <MetricCard
            title="Pending Approvals"
            value={String(data?.metrics.pendingApprovals ?? 0)}
            trend={data?.metrics.pendingApprovals ? "warning" : "up"}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium">Recent Invoices</h2>
              <button
                onClick={() => router.push("/dashboard/billing")}
                className="text-sm text-[var(--primary)] hover:underline"
              >
                View all
              </button>
            </div>
            {error ? (
              <p className="text-sm text-red-500">{error}</p>
            ) : data?.recentInvoices.length === 0 ? (
              <p className="text-sm text-[var(--muted-foreground)]">No invoices yet</p>
            ) : (
              <div className="space-y-3">
                {data?.recentInvoices.map((invoice) => (
                  <div
                    key={invoice.id}
                    className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0"
                  >
                    <div>
                      <p className="font-medium text-sm">{invoice.invoiceNumber}</p>
                      <p className="text-xs text-[var(--muted-foreground)]">
                        Due: {new Date(invoice.dueAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">${Number(invoice.amount).toLocaleString()}</p>
                      <span
                        className={`text-xs px-2 py-0.5 rounded ${
                          invoice.status === "PAID"
                            ? "bg-green-100 text-green-700"
                            : invoice.status === "OVERDUE"
                            ? "bg-red-100 text-red-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {invoice.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium">Quick Actions</h2>
            </div>
            <div className="space-y-3">
              <button
                onClick={() => router.push("/dashboard/billing")}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--paper)] px-4 py-3 text-left hover:bg-[var(--muted)] transition-colors"
              >
                <p className="font-medium">Manage Subscription Plans</p>
                <p className="text-sm text-[var(--muted-foreground)]">Configure billing cycles and pricing</p>
              </button>
              <button
                onClick={() => router.push("/dashboard/billing")}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--paper)] px-4 py-3 text-left hover:bg-[var(--muted)] transition-colors"
              >
                <p className="font-medium">View All Invoices</p>
                <p className="text-sm text-[var(--muted-foreground)]">Track payments and outstanding balances</p>
              </button>
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
  trend,
}: {
  title: string;
  value: string;
  trend: "up" | "down" | "warning";
}) {
  const trendColors = {
    up: "text-green-600",
    down: "text-red-600",
    warning: "text-yellow-600",
  };

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
      <p className="text-sm text-[var(--muted-foreground)]">{title}</p>
      <p className={`text-2xl font-semibold ${trendColors[trend]}`}>{value}</p>
    </div>
  );
}
