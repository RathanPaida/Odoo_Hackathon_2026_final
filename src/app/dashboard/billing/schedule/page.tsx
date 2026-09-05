// src/app/dashboard/billing/schedule/page.tsx
// Upcoming billing schedule — shows all subscriptions due to bill
"use client";

import { useEffect, useState } from "react";
import { LogoutButton } from "@/components/LogoutButton";

interface ScheduleItem {
  id: string;
  customerId: string;
  customerName: string;
  productName: string;
  planName: string;
  billingCycle: string;
  quantity: number;
  amount: string;
  nextBillingDate: string;
  status: string;
  autoPayEnabled: boolean;
}

export default function BillingSchedulePage() {
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "upcoming" | "autopay">("all");

  useEffect(() => {
    async function fetchSchedule() {
      setLoading(true);
      try {
        const res = await fetch("/api/subscriptions");
        if (!res.ok) throw new Error("Failed to fetch subscriptions");
        const data = await res.json();
        setSchedule(data.data?.subscriptions ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }
    fetchSchedule();
  }, []);

  const now = new Date();
  const upcomingItems = schedule.filter((item) => {
    const billingDate = new Date(item.nextBillingDate);
    if (filter === "upcoming") {
      return billingDate >= now && billingDate <= new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    }
    if (filter === "autopay") {
      return item.autoPayEnabled;
    }
    return true;
  });

  const sortedItems = [...upcomingItems].sort(
    (a, b) => new Date(a.nextBillingDate).getTime() - new Date(b.nextBillingDate).getTime()
  );

  const groupedByMonth = sortedItems.reduce((acc, item) => {
    const date = new Date(item.nextBillingDate);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    if (!acc[monthKey]) {
      acc[monthKey] = { items: [], total: 0 };
    }
    acc[monthKey].items.push(item);
    acc[monthKey].total += Number(item.amount) * item.quantity;
    return acc;
  }, {} as Record<string, { items: ScheduleItem[]; total: number }>);

  return (
    <main className="min-h-screen px-6 py-10 bg-[var(--paper)]">
      <div className="mx-auto max-w-6xl">
        <header className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-semibold">Billing Schedule</h1>
            <p className="text-sm text-[var(--muted-foreground)]">
              Upcoming subscription billing dates
            </p>
          </div>
          <LogoutButton />
        </header>

        <div className="mb-6 flex gap-4">
          {(["all", "upcoming", "autopay"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === f
                  ? "bg-[var(--primary)] text-white"
                  : "bg-[var(--card)] border border-[var(--border)] hover:bg-[var(--muted)]"
              }`}
            >
              {f === "all" ? "All" : f === "upcoming" ? "Next 30 Days" : "AutoPay Only"}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-12 text-[var(--muted-foreground)]">Loading...</div>
        ) : error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>
        ) : (
          <div className="space-y-8">
            {Object.entries(groupedByMonth).map(([month, { items, total }]) => (
              <section key={month} className="rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 bg-[var(--muted)] border-b border-[var(--border)]">
                  <h2 className="font-medium">{formatMonth(month)}</h2>
                  <div className="text-right">
                    <p className="text-sm text-[var(--muted-foreground)]">Expected Revenue</p>
                    <p className="font-semibold">${total.toLocaleString()}</p>
                  </div>
                </div>
                <table className="w-full">
                  <thead className="bg-[var(--paper)]">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium">Customer</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Product / Plan</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Cycle</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Qty</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Amount</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Billing Date</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">AutoPay</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {items.map((item) => (
                      <tr key={item.id} className="hover:bg-[var(--muted)]">
                        <td className="px-4 py-3 text-sm">{item.customerName}</td>
                        <td className="px-4 py-3 text-sm">
                          <p className="font-medium">{item.productName}</p>
                          <p className="text-xs text-[var(--muted-foreground)]">{item.planName}</p>
                        </td>
                        <td className="px-4 py-3 text-sm">{item.billingCycle}</td>
                        <td className="px-4 py-3 text-sm">{item.quantity}</td>
                        <td className="px-4 py-3 text-sm font-medium">
                          ${(Number(item.amount) * item.quantity).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {new Date(item.nextBillingDate).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span
                            className={`inline-block px-2 py-0.5 text-xs rounded ${
                              item.status === "ACTIVE"
                                ? "bg-green-100 text-green-700"
                                : item.status === "PAST_DUE"
                                ? "bg-red-100 text-red-700"
                                : item.status === "PAUSED"
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {item.autoPayEnabled ? (
                            <span className="text-green-600">Enabled</span>
                          ) : (
                            <span className="text-gray-400">Manual</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            ))}

            {sortedItems.length === 0 && (
              <div className="text-center py-12 text-[var(--muted-foreground)]">
                No billing schedule items found
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

function formatMonth(monthKey: string): string {
  const [year, month] = monthKey.split("-");
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}
