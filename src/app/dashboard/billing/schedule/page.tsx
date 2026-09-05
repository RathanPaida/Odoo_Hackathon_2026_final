// src/app/dashboard/billing/schedule/page.tsx - // src/app/dashboard/billing/schedule/page.tsx
// Upcoming billing schedule — shows all subscriptions due to bill
"use client";

import { useEffect, useState } from "react";
import { LogoutButton } from "@/components/LogoutButton";
import styles from "../../dashboard.module.css";

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
    <main className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <h1 className={styles.title}>Billing Schedule</h1>
            <p className={styles.subtitle}>Upcoming subscription billing dates</p>
          </div>
          <div className={styles.headerActions}>
            <LogoutButton />
          </div>
        </header>

        <div className={styles.filterTabs}>
          {(["all", "upcoming", "autopay"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`${styles.filterTab} ${filter === f ? styles.filterTabActive : ""}`}
            >
              {f === "all" ? "All" : f === "upcoming" ? "Next 30 Days" : "AutoPay Only"}
            </button>
          ))}
        </div>

        {loading ? (
          <div className={styles.emptyState}>
            <p className={styles.emptyStateText}>Loading...</p>
          </div>
        ) : error ? (
          <div className={`${styles.card} ${styles.textBad}`}>
            <p className={styles.emptyStateText}>{error}</p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(groupedByMonth).map(([month, { items, total }]) => (
              <section key={month} className={`${styles.tableCard} ${styles.animateFadeIn}`}>
                <div className="flex items-center justify-between px-6 py-4 mb-4" style={{ borderBottom: "1px solid rgba(139,92,246,0.15)" }}>
                  <h2 className={styles.cardTitle}>{formatMonth(month)}</h2>
                  <div className="text-right">
                    <p className={styles.metricTitle}>Expected Revenue</p>
                    <p className={styles.metricValue} style={{ fontSize: "1.25rem" }}>${total.toLocaleString()}</p>
                  </div>
                </div>
                <div className={styles.tableWrapper}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Customer</th>
                        <th>Product / Plan</th>
                        <th>Cycle</th>
                        <th>Qty</th>
                        <th>Amount</th>
                        <th>Billing Date</th>
                        <th>Status</th>
                        <th>AutoPay</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item) => (
                        <tr key={item.id}>
                          <td>{item.customerName}</td>
                          <td>
                            <p className={styles.cellPrimary}>{item.productName}</p>
                            <p className={styles.cellMuted}>{item.planName}</p>
                          </td>
                          <td className={styles.cellMuted}>{item.billingCycle}</td>
                          <td>{item.quantity}</td>
                          <td className={styles.cellPrimary}>
                            ${(Number(item.amount) * item.quantity).toLocaleString()}
                          </td>
                          <td className={styles.cellMuted}>
                            {new Date(item.nextBillingDate).toLocaleDateString()}
                          </td>
                          <td>
                            <span className={`${styles.statusBadge} ${getStatusClass(item.status)}`}>
                              {item.status}
                            </span>
                          </td>
                          <td>
                            {item.autoPayEnabled ? (
                              <span className={styles.textGood}>Enabled</span>
                            ) : (
                              <span className={styles.cellMuted}>Manual</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            ))}

            {sortedItems.length === 0 && (
              <div className={styles.emptyState}>
                <p className={styles.emptyStateText}>No billing schedule items found</p>
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

function getStatusClass(status: string): string {
  switch (status) {
    case "ACTIVE": return styles.statusBadgeApproved;
    case "PAST_DUE": return styles.statusBadgeRejected;
    case "PAUSED": return styles.statusBadgePending;
    case "CANCELLED": return styles.statusBadgeRejected;
    default: return styles.statusBadge;
  }
}