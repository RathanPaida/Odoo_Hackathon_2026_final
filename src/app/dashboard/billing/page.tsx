// src/app/dashboard/billing/page.tsx
// Billing management — subscription plans, invoices, subscriptions.
// One-time vs recurring lines are visually separated, not just colored.
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LogoutButton } from "@/components/LogoutButton";
import { Card, CardHeader, CardTitle, Badge, Button, Modal, badgeToneForQuoteStatus, type BadgeTone } from "@/components/ui";

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
    <main className="surface-page min-h-screen">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <header className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-[var(--foreground)]">
              Billing & Subscriptions
            </h1>
            <p className="text-sm text-[var(--muted-foreground)] mt-1">
              Manage invoices, subscriptions, and billing configuration
            </p>
          </div>
          <LogoutButton />
        </header>

        <div className="mb-6 border-b border-[var(--border)]">
          <nav className="flex gap-6">
            {(["invoices", "subscriptions", "plans"] as Tab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-3 text-sm font-medium transition-colors ${
                  activeTab === tab
                    ? "border-b-2 border-[var(--primary)] text-[var(--primary)]"
                    : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </nav>
        </div>

        {loading ? (
          <div className="text-center py-12 text-[var(--muted-foreground)]">Loading...</div>
        ) : error ? (
          <Card tone="paper" className="p-4 border-[var(--status-rejected-bd)] bg-[var(--status-rejected-bg)]">
            <p className="text-sm text-[var(--status-rejected-fg)]">{error}</p>
          </Card>
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

        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/dashboard/billing/schedule"
            className="surface-card p-6 hover:shadow-md transition-shadow no-underline block"
          >
            <h3 className="font-medium mb-1 text-[var(--foreground)]">Billing Schedule</h3>
            <p className="text-sm text-[var(--muted-foreground)]">View upcoming subscription billing dates</p>
          </Link>
          <Link
            href="/dashboard/reports"
            className="surface-card p-6 hover:shadow-md transition-shadow no-underline block"
          >
            <h3 className="font-medium mb-1 text-[var(--foreground)]">Reports</h3>
            <p className="text-sm text-[var(--muted-foreground)]">Analytics with Period / Rep / Status filters</p>
          </Link>
          <div className="surface-card p-6">
            <h3 className="font-medium mb-1 text-[var(--foreground)]">Quick Stats</h3>
            <p className="text-sm text-[var(--muted-foreground)]">
              {subscriptions.filter((s) => s.status === "ACTIVE").length} active subscriptions
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

function InvoicesTab({ invoices }: { invoices: Invoice[] }) {
  return (
    <Card tone="paper" className="overflow-hidden">
      <table className="w-full">
        <thead className="bg-[var(--background)]">
          <tr>
            <th className="px-4 py-3 text-left text-sm font-medium text-[var(--foreground)]">Invoice #</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-[var(--foreground)]">Type</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-[var(--foreground)]">Amount</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-[var(--foreground)]">Status</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-[var(--foreground)]">Issued</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-[var(--foreground)]">Due</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--paper-border)]">
          {invoices.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-4 py-8 text-center text-[var(--muted-foreground)]">
                No invoices found
              </td>
            </tr>
          ) : (
            invoices.map((invoice) => (
              <tr key={invoice.id} className="hover:bg-[var(--paper)]">
                <td className="px-4 py-3 text-sm font-mono text-[var(--foreground)]">{invoice.invoiceNumber}</td>
                <td className="px-4 py-3 text-sm">
                  <Badge tone={invoice.invoiceType === "RECURRING" ? "info" : "neutral"} dot>
                    {invoice.invoiceType}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-sm font-medium tabular text-[var(--foreground)]">${Number(invoice.amount).toLocaleString()}</td>
                <td className="px-4 py-3 text-sm">
                  <Badge tone={invoiceToneForStatus(invoice.status)}>
                    {invoice.status.replace("_", " ")}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-sm text-[var(--muted-foreground)]">{new Date(invoice.issuedAt).toLocaleDateString()}</td>
                <td className="px-4 py-3 text-sm text-[var(--muted-foreground)]">{new Date(invoice.dueAt).toLocaleDateString()}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </Card>
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
    <Card tone="paper" className="overflow-hidden">
      <table className="w-full">
        <thead className="bg-[var(--background)]">
          <tr>
            <th className="px-4 py-3 text-left text-sm font-medium text-[var(--foreground)]">Plan</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-[var(--foreground)]">Customer</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-[var(--foreground)]">Quantity</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-[var(--foreground)]">Status</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-[var(--foreground)]">Billing Cycle</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-[var(--foreground)]">Next Billing</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-[var(--foreground)]">AutoPay</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-[var(--foreground)]">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--paper-border)]">
          {subscriptions.length === 0 ? (
            <tr>
              <td colSpan={8} className="px-4 py-8 text-center text-[var(--muted-foreground)]">
                No subscriptions found
              </td>
            </tr>
          ) : (
            subscriptions.map((sub) => (
              <tr key={sub.id} className="hover:bg-[var(--paper)]">
                <td className="px-4 py-3 text-sm font-medium text-[var(--foreground)]">{sub.plan?.name ?? "N/A"}</td>
                <td className="px-4 py-3 text-sm text-[var(--muted-foreground)]">{sub.customer?.name ?? "N/A"}</td>
                <td className="px-4 py-3 text-sm tabular text-[var(--foreground)]">{sub.quantity}</td>
                <td className="px-4 py-3 text-sm">
                  <Badge tone={subscriptionToneForStatus(sub.status)}>{sub.status}</Badge>
                </td>
                <td className="px-4 py-3 text-sm text-[var(--muted-foreground)]">{sub.plan?.billingCycle ?? "N/A"}</td>
                <td className="px-4 py-3 text-sm text-[var(--muted-foreground)]">{new Date(sub.nextBillingDate).toLocaleDateString()}</td>
                <td className="px-4 py-3 text-sm">
                  {sub.autoPayEnabled ? (
                    <span className="text-[var(--status-approved-fg)] font-medium">Enabled</span>
                  ) : (
                    <span className="text-[var(--muted-foreground)]">Manual</span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm">
                  <Button variant="ghost" size="sm" onClick={() => onSelectSubscription(sub)}>
                    View Details
                  </Button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </Card>
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
    <Modal
      open={true}
      onClose={onClose}
      size="lg"
      title={`${sub.plan?.name ?? "Subscription details"} · ${sub.plan?.billingCycle ?? ""}`}
      description={`${sub.customer?.name ?? "Customer"}`}
    >
      {loading ? (
        <div className="py-8 text-center text-sm text-[var(--muted-foreground)]">Loading…</div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <SummaryStat label="Status" value={sub.status} tone={sub.status === "ACTIVE" ? "approved" : sub.status === "PAST_DUE" ? "rejected" : "neutral"} />
            <SummaryStat label="Quantity" value={String(sub.quantity)} />
            <SummaryStat label="Next billing" value={new Date(sub.nextBillingDate).toLocaleDateString()} />
            <SummaryStat label="AutoPay" value={sub.autoPayEnabled ? "Enabled" : "Manual"} tone={sub.autoPayEnabled ? "approved" : "neutral"} />
          </div>

          {/* Hybrid billing breakdown — one-time vs recurring visually separated. */}
          <div className="space-y-4">
            {/* ONE-TIME block */}
            <div className="rounded-lg border border-[var(--paper-border)] overflow-hidden bg-[var(--paper-card)]">
              <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--paper-border)] bg-[var(--background)]">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[var(--status-info-fg)]" />
                  <h3 className="text-sm font-semibold tracking-tight text-[var(--foreground)]">One-time charges</h3>
                </div>
                <span className="text-xs text-[var(--muted-foreground)] tabular">
                  Subtotal ${oneTimeSubtotal.toLocaleString()}
                </span>
              </div>
              {oneTimeCharges.length === 0 ? (
                <div className="px-4 py-4 text-sm text-[var(--muted-foreground)]">
                  No one-time charges.
                </div>
              ) : (
                <ul>
                  {oneTimeCharges.map((line) => (
                    <li key={line.id} className="flex items-center justify-between gap-3 px-4 py-3 border-t border-[var(--paper-border)] text-sm">
                      <div className="min-w-0">
                        <p className="font-medium truncate text-[var(--foreground)]">
                          {line.quoteLine?.product?.name ?? "Setup fee"}
                        </p>
                        <p className="text-xs text-[var(--muted-foreground)]">
                          {line.quoteLine?.product?.category ?? "One-time"}
                        </p>
                      </div>
                      <span className="font-semibold tabular text-[var(--foreground)]">
                        ${Number(line.proratedFirstAmount).toLocaleString()}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* RECURRING block */}
            <div className="rounded-lg border border-[var(--paper-border)] overflow-hidden bg-[var(--paper-card)]">
              <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--paper-border)] bg-[var(--background)]">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[var(--status-approved-fg)]" />
                  <h3 className="text-sm font-semibold tracking-tight text-[var(--foreground)]">
                    Recurring charges <span className="text-[var(--muted-foreground)] font-normal">· {sub.plan?.billingCycle}</span>
                  </h3>
                </div>
                <span className="text-xs text-[var(--muted-foreground)] tabular">
                  Subtotal ${recurringAmount.toLocaleString()}
                </span>
              </div>
              <ul>
                <li className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium text-[var(--foreground)]">{sub.plan?.name ?? "Subscription"}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {sub.quantity} × ${Number(sub.plan?.price ?? 0).toLocaleString()} / {sub.plan?.billingCycle?.toLowerCase()}
                    </p>
                  </div>
                  <span className="font-semibold tabular text-[var(--foreground)]">${recurringAmount.toLocaleString()}</span>
                </li>
                {recurringAddons.map((line) => (
                  <li key={line.id} className="flex items-center justify-between gap-3 px-4 py-3 border-t border-[var(--paper-border)] text-sm">
                    <div className="min-w-0">
                      <p className="font-medium truncate text-[var(--foreground)]">
                        {line.quoteLine?.product?.name ?? "Add-on"}
                      </p>
                      <p className="text-xs text-[var(--muted-foreground)]">
                        {line.quoteLine?.product?.category}
                      </p>
                    </div>
                    <span className="font-semibold tabular text-[var(--foreground)]">
                      ${Number(line.monthlyAmount).toLocaleString()}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Total */}
            <div className="rounded-lg border border-[var(--paper-border)] bg-[var(--background)] px-4 py-3 flex items-center justify-between font-semibold tabular text-[var(--foreground)]">
              <span>Total</span>
              <span>${(oneTimeSubtotal + recurringAmount).toLocaleString()}</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <SummaryStat label="Period start" value={new Date(sub.currentPeriodStart).toLocaleDateString()} />
            <SummaryStat label="Period end" value={new Date(sub.currentPeriodEnd).toLocaleDateString()} />
            <SummaryStat label="Start date" value={new Date(sub.startDate).toLocaleDateString()} />
          </div>
        </div>
      )}
    </Modal>
  );
}

function SummaryStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: BadgeTone;
}) {
  return (
    <div className="rounded-lg border border-[var(--paper-border)] bg-[var(--paper-card)] p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
        {label}
      </p>
      {tone ? (
        <div className="mt-1">
          <Badge tone={tone}>{value}</Badge>
        </div>
      ) : (
        <p className="mt-1 font-medium tabular text-[var(--foreground)]">{value}</p>
      )}
    </div>
  );
}

function invoiceToneForStatus(status: string): BadgeTone {
  switch (status) {
    case "PAID": return "approved";
    case "OVERDUE": return "rejected";
    case "PARTIALLY_PAID": return "pending";
    case "DRAFT": return "info";
    default: return "neutral";
  }
}

function subscriptionToneForStatus(status: string): BadgeTone {
  switch (status) {
    case "ACTIVE": return "approved";
    case "PAST_DUE": return "rejected";
    case "PAUSED": return "pending";
    case "CANCELLED": return "rejected";
    default: return "neutral";
  }
}

function PlansTab({ plans }: { plans: SubscriptionPlan[] }) {
  return (
    <Card tone="paper" className="overflow-hidden">
      <table className="w-full">
        <thead className="bg-[var(--background)]">
          <tr>
            <th className="px-4 py-3 text-left text-sm font-medium text-[var(--foreground)]">Name</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-[var(--foreground)]">Billing Cycle</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-[var(--foreground)]">Price</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-[var(--foreground)]">Proration</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-[var(--foreground)]">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--paper-border)]">
          {plans.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-4 py-8 text-center text-[var(--muted-foreground)]">
                No subscription plans found
              </td>
            </tr>
          ) : (
            plans.map((plan) => (
              <tr key={plan.id} className="hover:bg-[var(--paper)]">
                <td className="px-4 py-3 text-sm font-medium text-[var(--foreground)]">{plan.name}</td>
                <td className="px-4 py-3 text-sm text-[var(--muted-foreground)]">{plan.billingCycle}</td>
                <td className="px-4 py-3 text-sm font-medium tabular text-[var(--foreground)]">${Number(plan.price).toLocaleString()}</td>
                <td className="px-4 py-3 text-sm text-[var(--muted-foreground)]">{plan.prorationEnabled ? "Enabled" : "Disabled"}</td>
                <td className="px-4 py-3 text-sm">
                  <Badge tone={plan.active ? "approved" : "neutral"} dot>
                    {plan.active ? "Active" : "Inactive"}
                  </Badge>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </Card>
  );
}
