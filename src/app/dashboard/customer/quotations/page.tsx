import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { RoleSidebar } from "@/components/navbar/RoleSidebar";
import Link from "next/link";
import { FileText, ChevronRight } from "lucide-react";
import styles from "../../dashboard.module.css";

export const dynamic = "force-dynamic";

export default async function CustomerQuotationsPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "CUSTOMER") redirect("/login");

  const customer = await prisma.customer.findFirst({
    where: { email: user.email },
    include: {
      quotes: {
        orderBy: { createdAt: "desc" },
        include: {
          lines: { include: { product: true } },
          portalTokens: { where: { revokedAt: null }, take: 1 },
        },
      },
    },
  });

  const quotes = customer?.quotes ?? [];

  return (
    <RoleSidebar role="CUSTOMER" userName={user.name} userEmail={user.email}>
      <main className={styles.page}>
        <div className={styles.container}>
          <header className={styles.header}>
            <div className={styles.headerLeft}>
              <h1 className={styles.title}>My Quotations</h1>
              <p className={styles.subtitle}>Review quotation proposals, item breakdowns, and terms</p>
            </div>
          </header>

          <div className={`${styles.card} p-6`}>
            {quotes.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-[rgba(139,92,246,0.2)] text-[#a78bfa] text-xs uppercase tracking-wider">
                      <th className="pb-3 px-3">Quote Number</th>
                      <th className="pb-3 px-3">Date</th>
                      <th className="pb-3 px-3">Status</th>
                      <th className="pb-3 px-3">Lines</th>
                      <th className="pb-3 px-3">Total Amount</th>
                      <th className="pb-3 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[rgba(139,92,246,0.1)] text-[#e2e8f0]">
                    {quotes.map((q) => {
                      const portalToken = q.portalTokens?.[0]?.tokenHash;
                      const href = portalToken ? `/portal/${portalToken}` : `/dashboard/rep/quotes/${q.id}`;
                      return (
                        <tr key={q.id} className="hover:bg-[rgba(109,40,217,0.1)] transition-colors">
                          <td className="py-4 px-3 font-mono font-bold text-[#c4b5fd]">{q.quoteNumber}</td>
                          <td className="py-4 px-3 text-[#94a3b8]">{new Date(q.createdAt).toLocaleDateString()}</td>
                          <td className="py-4 px-3">
                            <span className="text-xs px-2.5 py-1 rounded-full font-semibold uppercase tracking-wider bg-[rgba(139,92,246,0.15)] text-[#c4b5fd] border border-[rgba(139,92,246,0.25)]">
                              {q.status}
                            </span>
                          </td>
                          <td className="py-4 px-3">{q.lines.length} items</td>
                          <td className="py-4 px-3 font-semibold text-white">₹{Number(q.grandTotal).toLocaleString()}</td>
                          <td className="py-4 px-3 text-right">
                            <Link href={href} className="inline-flex items-center gap-1 text-[#c4b5fd] hover:text-white font-medium text-xs">
                              Open Portal <ChevronRight size={14} />
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 text-[#94a3b8]">
                <FileText size={36} className="mx-auto mb-3 text-[#a78bfa] opacity-60" />
                <p>No quotations found.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </RoleSidebar>
  );
}
