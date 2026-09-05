// src/app/dashboard/billing/page.tsx - // src/app/dashboard/billing/page.tsx
// Billing management — subscription plans, invoices, subscriptions.
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { RoleSidebar } from "@/components/navbar/RoleSidebar";
import styles from "../dashboard.module.css";

type Tab = "invoices" | "subscriptions" | "plans";

interface InvoiceLine {
  id: string;
  description: string;
  productId: string;
  quantity: number;
  unitPrice: string;
  taxAmount: string;
  totalAmount: string;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  amount: string;
  subtotal: string;
  taxAmount: string;
  invoiceType: string;
  status: string;
  issuedAt: string;
  dueAt: string;
  lines?: InvoiceLine[];
}

interface SubscriptionLine {
  id: string;
  monthlyAmount: string;
  startDate: string;
  months: number;
  proratedFirstAmount: string;
  quoteLine?: {
    qty: number;
    unitPrice: string;
    billingType: string;
    product?: {
      name: string;
      category: string;
    };
  };
}

interface Subscription {
  id: string;
  customerId: string;
  productId: string;
  planId: string;
  quantity: number;
  status: string;
  startDate: string;
  nextBillingDate: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  autoPayEnabled: boolean;
  plan?: {
    name: string;
    billingCycle: string;
    price: string;
  };
  customer?: {
    name: string;
    email: string;
  };
  lines?: SubscriptionLine[];
}

interface SubscriptionPlan {
  id: string;
  name: string;
  billingCycle: string;
  price: string;
  prorationEnabled: boolean;
  cancellationPolicy?: string;
  refundPolicy?: string;
  active: boolean;
}

export default function BillingPage() {
  const [activeTab, setActiveTab] = useState<Tab>("invoices");
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const [invoicesRes, subscriptionsRes, plansRes] = await Promise.all([
          fetch("/api/invoices"),
          fetch("/api/subscriptions"),
          fetch("/api/subscription-plans"),
        ]);

        if (!invoicesRes.ok || !subscriptionsRes.ok || !plansRes.ok) {
          throw new Error("Failed to fetch data");
        }

        const [invoicesData, subscriptionsData, plansData] = await Promise.all([
          invoicesRes.json(),
          subscriptionsRes.json(),
          plansRes.json(),
        ]);

        setInvoices(invoicesData.data?.invoices ?? []);
        setSubscriptions(subscriptionsData.data?.subscriptions ?? []);
        setPlans(plansData.data ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [activeTab]);

  return (
    <RoleSidebar role="FINANCE">
      <main className={styles.page}>
        <div className={styles.container}>
          <header className={styles.header}>
            <div className={styles.headerLeft}>
              <h1 className={styles.title}>Billing & Subscriptions</h1>
              <p className={styles.subtitle}>Manage invoices, subscriptions, and billing configuration</p>
            </div>
          </header>

        <div className={styles.filterTabs}>
          {(["invoices", "subscriptions", "plans"] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`${styles.filterTab} ${activeTab === tab ? styles.filterTabActive : ""}`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
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
          <>
            {activeTab === "invoices" && <InvoicesTab invoices={invoices} />}
            {activeTab === "subscriptions" && (
              <SubscriptionsTab
                subscriptions={subscriptions}
                onSelectSubscription={setSelectedSubscription}
              />
            )}
            {activeTab === "plans" && <PlansTab plans={plans} />}
          </>
        )}

        {selectedSubscription && (
          <SubscriptionDetailModal
            subscription={selectedSubscription}
            onClose={() => setSelectedSubscription(null)}
          />
        )}

        <div className={`${styles.cardGrid} ${styles.cardGrid3} mt-8`}>
          <Link
            href="/dashboard/billing/schedule"
            className={styles.navLink}
          >
            <h3 className={styles.navTitle}>Billing Schedule</h3>
            <p className={styles.navDescription}>View upcoming subscription billing dates</p>
          </Link>
          <Link
            href="/dashboard/reports"
            className={styles.navLink}
          >
            <h3 className={styles.navTitle}>Reports</h3>
            <p className={styles.navDescription}>Analytics with Period / Rep / Status filters</p>
          </Link>
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Quick Stats</h3>
            <p className={styles.cardDescription}>
              {subscriptions.filter((s) => s.status === "ACTIVE").length} active subscriptions
            </p>
          </div>
        </div>
      </div>
    </main>
    </RoleSidebar>
  );
}

function InvoicesTab({ invoices }: { invoices: Invoice[] }) {
  return (
    <div className={`${styles.tableCard} ${styles.animateFadeIn}`}>
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Invoice #</th>
              <th>Type</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Issued</th>
              <th>Due</th>
            </tr>
          </thead>
          <tbody>
            {invoices.length === 0 ? (
              <tr>
                <td colSpan={6} className={styles.emptyState}>
                  No invoices found
                </td>
              </tr>
            ) : (
              invoices.map((invoice) => (
                <tr key={invoice.id}>
                  <td className={styles.cellPrimary}>{invoice.invoiceNumber}</td>
                  <td>
                    <span className={invoice.invoiceType === "RECURRING" ? styles.statusBadgeNegotiating : styles.statusBadge}>
                      {invoice.invoiceType}
                    </span>
                  </td>
                  <td className={styles.cellPrimary}>${Number(invoice.amount).toLocaleString()}</td>
                  <td>
                    <span className={`${styles.statusBadge} ${getInvoiceStatusClass(invoice.status)}`}>
                      {invoice.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className={styles.cellMuted}>{new Date(invoice.issuedAt).toLocaleDateString()}</td>
                  <td className={styles.cellMuted}>{new Date(invoice.dueAt).toLocaleDateString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SubscriptionsTab({
  subscriptions,
  onSelectSubscription,
}: {
  subscriptions: Subscription[];
  onSelectSubscription: (sub: Subscription) => void;
}) {
  return (
    <div className={`${styles.tableCard} ${styles.animateFadeIn}`}>
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Plan</th>
              <th>Customer</th>
              <th>Qty</th>
              <th>Status</th>
              <th>Cycle</th>
              <th>Next Billing</th>
              <th>AutoPay</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {subscriptions.length === 0 ? (
              <tr>
                <td colSpan={8} className={styles.emptyState}>
                  No subscriptions found
                </td>
              </tr>
            ) : (
              subscriptions.map((sub) => (
                <tr key={sub.id}>
                  <td className={styles.cellPrimary}>{sub.plan?.name ?? "N/A"}</td>
                  <td className={styles.cellMuted}>{sub.customer?.name ?? "N/A"}</td>
                  <td>{sub.quantity}</td>
                  <td>
                    <span className={`${styles.statusBadge} ${getSubscriptionStatusClass(sub.status)}`}>
                      {sub.status}
                    </span>
                  </td>
                  <td className={styles.cellMuted}>{sub.plan?.billingCycle ?? "N/A"}</td>
                  <td className={styles.cellMuted}>{new Date(sub.nextBillingDate).toLocaleDateString()}</td>
                  <td>
                    {sub.autoPayEnabled ? (
                      <span className={styles.textGood}>Enabled</span>
                    ) : (
                      <span className={styles.cellMuted}>Manual</span>
                    )}
                  </td>
                  <td>
                    <button
                      className={styles.actionLink}
                      onClick={() => onSelectSubscription(sub)}
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SubscriptionDetailModal({
  subscription,
  onClose,
}: {
  subscription: Subscription;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDetail() {
      setLoading(true);
      try {
        const res = await fetch(`/api/subscriptions/${subscription.id}`);
        if (res.ok) {
          const data = await res.json();
          setDetail(data.data);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    fetchDetail();
  }, [subscription.id]);

  const sub = detail ?? subscription;

  const recurringAmount = Number(sub.plan?.price ?? 0) * sub.quantity;
  const oneTimeSubtotal =
    sub.lines
      ?.filter((l) => l.quoteLine?.billingType === "ONE_TIME")
      .reduce((sum, l) => sum + Number(l.proratedFirstAmount), 0) ?? 0;
  const oneTimeCharges = sub.lines?.filter((l) => l.quoteLine?.billingType === "ONE_TIME") ?? [];
  const recurringAddons = sub.lines?.filter((l) => l.quoteLine?.billingType === "SUBSCRIPTION") ?? [];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className={`${styles.card} max-w-2xl w-full max-h-[90vh] overflow-y-auto`}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className={styles.cardTitle}>{sub.plan?.name ?? "Subscription details"}</h2>
            <p className={styles.subtitle}>{sub.customer?.name ?? "Customer"}</p>
          </div>
          <button onClick={onClose} className={styles.dangerBtn}>Close</button>
        </div>

        {loading ? (
          <div className={styles.emptyState}>
            <p className={styles.emptyStateText}>Loading...</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className={`${styles.cardGrid} ${styles.cardGrid4}`}>
              <div className={styles.metricCard}>
                <p className={styles.metricTitle}>Status</p>
                <span className={`${styles.statusBadge} ${getSubscriptionStatusClass(sub.status)}`}>{sub.status}</span>
              </div>
              <div className={styles.metricCard}>
                <p className={styles.metricTitle}>Quantity</p>
                <p className={styles.metricValue}>{sub.quantity}</p>
              </div>
              <div className={styles.metricCard}>
                <p className={styles.metricTitle}>Next Billing</p>
                <p className={styles.cellPrimary}>{new Date(sub.nextBillingDate).toLocaleDateString()}</p>
              </div>
              <div className={styles.metricCard}>
                <p className={styles.metricTitle}>AutoPay</p>
                <p className={sub.autoPayEnabled ? styles.textGood : styles.cellMuted}>
                  {sub.autoPayEnabled ? "Enabled" : "Manual"}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className={`${styles.cardSmall}`}>
                <h3 className={styles.cardTitle}>One-time Charges</h3>
                {oneTimeCharges.length === 0 ? (
                  <p className={styles.cellMuted}>No one-time charges.</p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {oneTimeCharges.map((line) => (
                      <li key={line.id} className="flex justify-between py-2 border-b border-[rgba(139,92,246,0.1)] last:border-0">
                        <div>
                          <p className={styles.cellPrimary}>{line.quoteLine?.product?.name ?? "Setup fee"}</p>
                          <p className={styles.cellMuted}>{line.quoteLine?.product?.category ?? "One-time"}</p>
                        </div>
                        <span className={styles.cellPrimary}>${Number(line.proratedFirstAmount).toLocaleString()}</span>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="mt-3 pt-3 border-t border-[rgba(139,92,246,0.1)] flex justify-between font-medium">
                  <span>Subtotal</span>
                  <span>${oneTimeSubtotal.toLocaleString()}</span>
                </div>
              </div>

              <div className={`${styles.cardSmall}`}>
                <h3 className={styles.cardTitle}>Recurring Charges</h3>
                <ul className="mt-3 space-y-2">
                  <li className="flex justify-between py-2 border-b border-[rgba(139,92,246,0.1)]">
                    <div>
                      <p className={styles.cellPrimary}>{sub.plan?.name ?? "Subscription"}</p>
                      <p className={styles.cellMuted}>
                        {sub.quantity} × ${Number(sub.plan?.price ?? 0).toLocaleString()} / {sub.plan?.billingCycle?.toLowerCase()}
                      </p>
                    </div>
                    <span className={styles.cellPrimary}>${recurringAmount.toLocaleString()}</span>
                  </li>
                  {recurringAddons.map((line) => (
                    <li key={line.id} className="flex justify-between py-2 border-b border-[rgba(139,92,246,0.1)] last:border-0">
                      <div>
                        <p className={styles.cellPrimary}>{line.quoteLine?.product?.name ?? "Add-on"}</p>
                        <p className={styles.cellMuted}>{line.quoteLine?.product?.category}</p>
                      </div>
                      <span className={styles.cellPrimary}>${Number(line.monthlyAmount).toLocaleString()}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-3 pt-3 border-t border-[rgba(139,92,246,0.1)] flex justify-between font-medium">
                  <span>Subtotal</span>
                  <span>${recurringAmount.toLocaleString()}</span>
                </div>
              </div>

              <div className={`${styles.cardSmall} flex justify-between font-semibold text-lg`}>
                <span>Total</span>
                <span className={styles.textGood}>${(oneTimeSubtotal + recurringAmount).toLocaleString()}</span>
              </div>
            </div>

            <div className={`${styles.cardGrid} ${styles.cardGrid3}`}>
              <div className={styles.metricCard}>
                <p className={styles.metricTitle}>Period Start</p>
                <p className={styles.cellPrimary}>{new Date(sub.currentPeriodStart).toLocaleDateString()}</p>
              </div>
              <div className={styles.metricCard}>
                <p className={styles.metricTitle}>Period End</p>
                <p className={styles.cellPrimary}>{new Date(sub.currentPeriodEnd).toLocaleDateString()}</p>
              </div>
              <div className={styles.metricCard}>
                <p className={styles.metricTitle}>Start Date</p>
                <p className={styles.cellPrimary}>{new Date(sub.startDate).toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PlansTab({ plans }: { plans: SubscriptionPlan[] }) {
  return (
    <div className={`${styles.tableCard} ${styles.animateFadeIn}`}>
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Billing Cycle</th>
              <th>Price</th>
              <th>Proration</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {plans.length === 0 ? (
              <tr>
                <td colSpan={5} className={styles.emptyState}>
                  No subscription plans found
                </td>
              </tr>
            ) : (
              plans.map((plan) => (
                <tr key={plan.id}>
                  <td className={styles.cellPrimary}>{plan.name}</td>
                  <td className={styles.cellMuted}>{plan.billingCycle}</td>
                  <td className={styles.cellPrimary}>${Number(plan.price).toLocaleString()}</td>
                  <td className={styles.cellMuted}>{plan.prorationEnabled ? "Enabled" : "Disabled"}</td>
                  <td>
                    <span className={`${styles.statusBadge} ${plan.active ? styles.statusBadgeActive : styles.statusBadgeInactive}`}>
                      {plan.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function getInvoiceStatusClass(status: string): string {
  switch (status) {
    case "PAID": return styles.statusBadgeApproved;
    case "OVERDUE": return styles.statusBadgeRejected;
    case "PARTIALLY_PAID": return styles.statusBadgePending;
    case "DRAFT": return styles.statusBadgeDraft;
    default: return styles.statusBadge;
  }
}

function getSubscriptionStatusClass(status: string): string {
  switch (status) {
    case "ACTIVE": return styles.statusBadgeApproved;
    case "PAST_DUE": return styles.statusBadgeRejected;
    case "PAUSED": return styles.statusBadgePending;
    case "CANCELLED": return styles.statusBadgeRejected;
    default: return styles.statusBadge;
  }
}