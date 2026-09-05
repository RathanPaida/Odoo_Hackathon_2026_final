import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { RoleSidebar } from "@/components/navbar/RoleSidebar";
import { CreditCard, Receipt, CheckCircle } from "lucide-react";
import styles from "../../dashboard.module.css";

export const dynamic = "force-dynamic";

export default async function CustomerBillingPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "CUSTOMER") redirect("/login");

  const customer = await prisma.customer.findFirst({
    where: { email: user.email },
    include: {
      invoices: {
        orderBy: { issuedAt: "desc" },
      },
      subscriptions: {
        where: { status: "ACTIVE" },
        include: { plan: true },
      },
    },
  });

  const invoices = customer?.invoices ?? [];
  const subscriptions = customer?.subscriptions ?? [];

  return (
    <RoleSidebar role="CUSTOMER" userName={user.name} userEmail={user.email}>
      <main className={styles.page}>
        <div className={styles.container}>
          <header className={styles.header}>
            <div className={styles.headerLeft}>
              <h1 className={styles.title}>Invoices & Billing</h1>
              <p className={styles.subtitle}>Track your account invoices, recurring plans, and payment receipts</p>
            </div>
          </header>

          <div className="space-y-6">
            {/* Active Subscriptions */}
            <div className={`${styles.card} p-6`}>
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <CreditCard size={20} className="text-[#a78bfa]" />
                Active Recurring Subscriptions
              </h2>
              {subscriptions.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {subscriptions.map((s) => (
                    <div key={s.id} className="p-4 rounded-xl bg-[rgba(15,15,35,0.6)] border border-[rgba(139,92,246,0.2)]">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-white">{s.plan?.name || "Service Plan"}</span>
                        <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-[rgba(16,185,129,0.2)] text-[#34d399] border border-[rgba(16,185,129,0.3)]">
                          {s.status}
                        </span>
                      </div>
                      <p className="text-xs text-[#94a3b8]">Billing Cycle: <span className="text-white font-medium">{s.plan?.billingCycle || "MONTHLY"}</span></p>
                      <p className="text-xs text-[#94a3b8] mt-1">Next Billing: <span className="text-[#c4b5fd] font-medium">{new Date(s.nextBillingDate).toLocaleDateString()}</span></p>
                      <p className="text-xs text-[#94a3b8] mt-1">AutoPay: <span className="text-white font-medium">{s.autoPayEnabled ? "Enabled" : "Disabled"}</span></p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[#94a3b8]">No active subscriptions found.</p>
              )}
            </div>

            {/* Invoices */}
            <div className={`${styles.card} p-6`}>
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Receipt size={20} className="text-[#a78bfa]" />
                Issued Invoices
              </h2>
              {invoices.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-[rgba(139,92,246,0.2)] text-[#a78bfa] text-xs uppercase tracking-wider">
                        <th className="pb-3 px-3">Invoice Number</th>
                        <th className="pb-3 px-3">Issued Date</th>
                        <th className="pb-3 px-3">Due Date</th>
                        <th className="pb-3 px-3">Status</th>
                        <th className="pb-3 px-3 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[rgba(139,92,246,0.1)] text-[#e2e8f0]">
                      {invoices.map((inv) => (
                        <tr key={inv.id} className="hover:bg-[rgba(109,40,217,0.1)] transition-colors">
                          <td className="py-4 px-3 font-mono font-bold text-[#c4b5fd]">{inv.invoiceNumber}</td>
                          <td className="py-4 px-3 text-[#94a3b8]">{new Date(inv.issuedAt).toLocaleDateString()}</td>
                          <td className="py-4 px-3 text-[#94a3b8]">{new Date(inv.dueAt).toLocaleDateString()}</td>
                          <td className="py-4 px-3">
                            <span className={`text-xs px-2.5 py-1 rounded-full font-semibold uppercase tracking-wider ${
                              inv.status === "PAID" 
                                ? "bg-[rgba(16,185,129,0.2)] text-[#34d399] border border-[rgba(16,185,129,0.3)]"
                                : "bg-[rgba(245,158,11,0.2)] text-[#fcd34d] border border-[rgba(245,158,11,0.3)]"
                            }`}>
                              {inv.status}
                            </span>
                          </td>
                          <td className="py-4 px-3 text-right font-bold text-white">₹{Number(inv.amount).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-[#94a3b8]">No invoices have been issued yet.</p>
              )}
            </div>
          </div>
        </div>
      </main>
    </RoleSidebar>
  );
}
