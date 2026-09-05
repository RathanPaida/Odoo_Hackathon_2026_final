// src/app/dashboard/billing/page.tsx
// Billing management — subscription plans, invoices, subscriptions.
// Shows one-time lines vs recurring lines separated.
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LogoutButton } from "@/components/LogoutButton";

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
    <main className="min-h-screen px-6 py-10 bg-[var(--paper)]">
      <div className="mx-auto max-w-6xl">
        <header className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-semibold">Billing & Subscriptions</h1>
            <p className="text-sm text-[var(--muted-foreground)]">
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
                    : "text-[var(--muted-foreground)] hover:text-foreground"
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
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>
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
            className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 hover:shadow-md transition-shadow no-underline block"
          >
            <h3 className="font-medium mb-1">Billing Schedule</h3>
            <p className="text-sm text-[var(--muted-foreground)]">View upcoming subscription billing dates</p>
          </Link>
          <Link
            href="/dashboard/reports"
            className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 hover:shadow-md transition-shadow no-underline block"
          >
            <h3 className="font-medium mb-1">Reports</h3>
            <p className="text-sm text-[var(--muted-foreground)]">Analytics with Period / Rep / Status filters</p>
          </Link>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
            <h3 className="font-medium mb-1">Quick Stats</h3>
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
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
      <table className="w-full">
        <thead className="bg-[var(--muted)]">
          <tr>
            <th className="px-4 py-3 text-left text-sm font-medium">Invoice #</th>
            <th className="px-4 py-3 text-left text-sm font-medium">Type</th>
            <th className="px-4 py-3 text-left text-sm font-medium">Amount</th>
            <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
            <th className="px-4 py-3 text-left text-sm font-medium">Issued</th>
            <th className="px-4 py-3 text-left text-sm font-medium">Due</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border)]">
          {invoices.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-4 py-8 text-center text-[var(--muted-foreground)]">
                No invoices found
              </td>
            </tr>
          ) : (
            invoices.map((invoice) => (
              <tr key={invoice.id} className="hover:bg-[var(--muted)]">
                <td className="px-4 py-3 text-sm font-mono">{invoice.invoiceNumber}</td>
                <td className="px-4 py-3 text-sm">
                  <span className={`px-2 py-0.5 text-xs rounded ${
                    invoice.invoiceType === "RECURRING" ? "bg-blue-100 text-blue-700" :
                    invoice.invoiceType === "PRORATION" ? "bg-purple-100 text-purple-700" :
                    "bg-gray-100 text-gray-700"
                  }`}>
                    {invoice.invoiceType}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm font-medium">${Number(invoice.amount).toLocaleString()}</td>
                <td className="px-4 py-3 text-sm">
                  <span
                    className={`inline-block px-2 py-0.5 text-xs rounded ${
                      invoice.status === "PAID"
                        ? "bg-green-100 text-green-700"
                        : invoice.status === "OVERDUE"
                        ? "bg-red-100 text-red-700"
                        : invoice.status === "PARTIALLY_PAID"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    {invoice.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm">{new Date(invoice.issuedAt).toLocaleDateString()}</td>
                <td className="px-4 py-3 text-sm">{new Date(invoice.dueAt).toLocaleDateString()}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
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
    <div className="space-y-4">
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
        <table className="w-full">
          <thead className="bg-[var(--muted)]">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium">Plan</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Customer</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Quantity</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Billing Cycle</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Next Billing</th>
              <th className="px-4 py-3 text-left text-sm font-medium">AutoPay</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {subscriptions.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-[var(--muted-foreground)]">
                  No subscriptions found
                </td>
              </tr>
            ) : (
              subscriptions.map((sub) => (
                <tr key={sub.id} className="hover:bg-[var(--muted)]">
                  <td className="px-4 py-3 text-sm font-medium">{sub.plan?.name ?? "N/A"}</td>
                  <td className="px-4 py-3 text-sm">{sub.customer?.name ?? "N/A"}</td>
                  <td className="px-4 py-3 text-sm">{sub.quantity}</td>
                  <td className="px-4 py-3 text-sm">
                    <span
                      className={`inline-block px-2 py-0.5 text-xs rounded ${
                        sub.status === "ACTIVE"
                          ? "bg-green-100 text-green-700"
                          : sub.status === "PAST_DUE"
                          ? "bg-red-100 text-red-700"
                          : sub.status === "PAUSED"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {sub.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">{sub.plan?.billingCycle ?? "N/A"}</td>
                  <td className="px-4 py-3 text-sm">{new Date(sub.nextBillingDate).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-sm">
                    {sub.autoPayEnabled ? (
                      <span className="text-green-600 font-medium">Enabled</span>
                    ) : (
                      <span className="text-gray-400">Manual</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <button
                      onClick={() => onSelectSubscription(sub)}
                      className="text-[var(--primary)] hover:underline text-sm"
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
  const oneTimeSetup = sub.lines?.length ? sub.lines.reduce((sum, l) => sum + Number(l.proratedFirstAmount), 0) - recurringAmount : 0;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
          <div>
            <h2 className="text-lg font-semibold">{sub.plan?.name ?? "Subscription Details"}</h2>
            <p className="text-sm text-[var(--muted-foreground)]">
              {sub.customer?.name ?? "Customer"} — {sub.plan?.billingCycle}
            </p>
          </div>
          <button onClick={onClose} className="text-2xl hover:opacity-70">&times;</button>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="text-center py-8 text-[var(--muted-foreground)]">Loading...</div>
          ) : (
            <div className="space-y-6">
              {/* Status and Billing Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="rounded-lg border border-[var(--border)] p-3">
                  <p className="text-xs text-[var(--muted-foreground)]">Status</p>
                  <p className={`font-medium ${
                    sub.status === "ACTIVE" ? "text-green-600" :
                    sub.status === "PAST_DUE" ? "text-red-600" :
                    sub.status === "PAUSED" ? "text-yellow-600" : "text-gray-600"
                  }`}>{sub.status}</p>
                </div>
                <div className="rounded-lg border border-[var(--border)] p-3">
                  <p className="text-xs text-[var(--muted-foreground)]">Quantity</p>
                  <p className="font-medium">{sub.quantity}</p>
                </div>
                <div className="rounded-lg border border-[var(--border)] p-3">
                  <p className="text-xs text-[var(--muted-foreground)]">Next Billing</p>
                  <p className="font-medium">{new Date(sub.nextBillingDate).toLocaleDateString()}</p>
                </div>
                <div className="rounded-lg border border-[var(--border)] p-3">
                  <p className="text-xs text-[var(--muted-foreground)]">AutoPay</p>
                  <p className={`font-medium ${sub.autoPayEnabled ? "text-green-600" : "text-gray-400"}`}>
                    {sub.autoPayEnabled ? "Enabled" : "Manual"}
                  </p>
                </div>
              </div>

              {/* Billing Breakdown — One-Time vs Recurring */}
              <div className="border border-[var(--border)] rounded-xl overflow-hidden">
                <div className="bg-[var(--muted)] px-4 py-3 border-b border-[var(--border)]">
                  <h3 className="font-medium">Billing Breakdown</h3>
                </div>

                {/* One-Time Charges Section */}
                <div className="bg-blue-50 border-b border-[var(--border)]">
                  <div className="flex items-center gap-2 px-4 py-2 border-b border-blue-100">
                    <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                    <h4 className="font-medium text-blue-800">One-Time Charges</h4>
                  </div>
                  {sub.lines && sub.lines.length > 0 ? (
                    <div className="divide-y divide-blue-100">
                      {sub.lines
                        .filter((l) => l.quoteLine?.billingType === "ONE_TIME")
                        .map((line) => (
                          <div key={line.id} className="flex justify-between px-4 py-2 text-sm">
                            <div>
                              <p className="font-medium">{line.quoteLine?.product?.name ?? "Setup Fee"}</p>
                              <p className="text-xs text-blue-600">
                                {line.quoteLine?.product?.category ?? "One-time charge"}
                              </p>
                            </div>
                            <p className="font-medium text-blue-700">
                              ${Number(line.proratedFirstAmount).toLocaleString()}
                            </p>
                          </div>
                        ))}
                      {(!sub.lines || sub.lines.filter((l) => l.quoteLine?.billingType === "ONE_TIME").length === 0) && (
                        <div className="px-4 py-2 text-sm text-blue-600">No one-time charges</div>
                      )}
                    </div>
                  ) : (
                    <div className="px-4 py-2 text-sm text-blue-600">No one-time charges</div>
                  )}
                  <div className="flex justify-between px-4 py-2 bg-blue-100 font-medium">
                    <span>Subtotal One-Time</span>
                    <span>${sub.lines?.length ? sub.lines.filter((l) => l.quoteLine?.billingType === "ONE_TIME").reduce((sum, l) => sum + Number(l.proratedFirstAmount), 0).toLocaleString() : "0"}</span>
                  </div>
                </div>

                {/* Recurring Charges Section */}
                <div className="bg-green-50">
                  <div className="flex items-center gap-2 px-4 py-2 border-b border-green-100">
                    <span className="w-3 h-3 rounded-full bg-green-500"></span>
                    <h4 className="font-medium text-green-800">Recurring Charges ({sub.plan?.billingCycle})</h4>
                  </div>
                  <div className="divide-y divide-green-100">
                    <div className="flex justify-between px-4 py-2 text-sm">
                      <div>
                        <p className="font-medium">{sub.plan?.name ?? "Subscription"}</p>
                        <p className="text-xs text-green-600">
                          {sub.quantity} x ${Number(sub.plan?.price ?? 0).toLocaleString()} / {sub.plan?.billingCycle?.toLowerCase()}
                        </p>
                      </div>
                      <p className="font-medium text-green-700">
                        ${recurringAmount.toLocaleString()}
                      </p>
                    </div>
                    {sub.lines?.filter((l) => l.quoteLine?.billingType === "SUBSCRIPTION").map((line) => (
                      <div key={line.id} className="flex justify-between px-4 py-2 text-sm">
                        <div>
                          <p className="font-medium">{line.quoteLine?.product?.name ?? "Add-on"}</p>
                          <p className="text-xs text-green-600">{line.quoteLine?.product?.category}</p>
                        </div>
                        <p className="font-medium text-green-700">
                          ${Number(line.monthlyAmount).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between px-4 py-2 bg-green-100 font-medium">
                    <span>Subtotal Recurring</span>
                    <span>${recurringAmount.toLocaleString()}</span>
                  </div>
                </div>

                {/* Total */}
                <div className="flex justify-between px-4 py-3 bg-[var(--muted)] font-semibold border-t border-[var(--border)]">
                  <span>Total</span>
                  <span>
                    ${((sub.lines?.length ? sub.lines.reduce((sum, l) => sum + Number(l.proratedFirstAmount), 0) : 0) + recurringAmount).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Billing Period */}
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="rounded-lg border border-[var(--border)] p-3">
                  <p className="text-xs text-[var(--muted-foreground)]">Current Period Start</p>
                  <p className="font-medium">{new Date(sub.currentPeriodStart).toLocaleDateString()}</p>
                </div>
                <div className="rounded-lg border border-[var(--border)] p-3">
                  <p className="text-xs text-[var(--muted-foreground)]">Current Period End</p>
                  <p className="font-medium">{new Date(sub.currentPeriodEnd).toLocaleDateString()}</p>
                </div>
                <div className="rounded-lg border border-[var(--border)] p-3">
                  <p className="text-xs text-[var(--muted-foreground)]">Start Date</p>
                  <p className="font-medium">{new Date(sub.startDate).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PlansTab({ plans }: { plans: SubscriptionPlan[] }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
      <table className="w-full">
        <thead className="bg-[var(--muted)]">
          <tr>
            <th className="px-4 py-3 text-left text-sm font-medium">Name</th>
            <th className="px-4 py-3 text-left text-sm font-medium">Billing Cycle</th>
            <th className="px-4 py-3 text-left text-sm font-medium">Price</th>
            <th className="px-4 py-3 text-left text-sm font-medium">Proration</th>
            <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border)]">
          {plans.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-4 py-8 text-center text-[var(--muted-foreground)]">
                No subscription plans found
              </td>
            </tr>
          ) : (
            plans.map((plan) => (
              <tr key={plan.id} className="hover:bg-[var(--muted)]">
                <td className="px-4 py-3 text-sm font-medium">{plan.name}</td>
                <td className="px-4 py-3 text-sm">{plan.billingCycle}</td>
                <td className="px-4 py-3 text-sm font-medium">${Number(plan.price).toLocaleString()}</td>
                <td className="px-4 py-3 text-sm">{plan.prorationEnabled ? "Enabled" : "Disabled"}</td>
                <td className="px-4 py-3 text-sm">
                  <span
                    className={`inline-block px-2 py-0.5 text-xs rounded ${
                      plan.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {plan.active ? "Active" : "Inactive"}
                  </span>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
