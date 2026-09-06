"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, ChevronRight, CheckCircle2 } from "lucide-react";
import { RoleSidebar } from "@/components/navbar/RoleSidebar";
import { CustomerNewQuoteButton } from "./CustomerNewQuoteButton";
import styles from "../../dashboard.module.css";
import cStyles from "../customer.module.css";
import { useToast } from "@/components/ui";

interface QuoteRow {
  id: string;
  quoteNumber: string;
  createdAt: string;
  status: string;
  grandTotal: number;
  lines: { id: string }[];
}

function getStatusBadgeClass(status: string): string {
  return status === "APPROVED" ? cStyles.badgeApproved
    : status === "PENDING_APPROVAL" ? cStyles.badgePending
    : status === "CONFIRMED" ? cStyles.badgeConfirmed
    : status === "REJECTED" ? cStyles.badgeRejected
    : status === "NEGOTIATING" ? cStyles.badgeNegotiating
    : cStyles.badgeDraft;
}

export default function CustomerQuotationsPage() {
  const router = useRouter();
  const toast = useToast();
  const [quotes, setQuotes] = useState<QuoteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPortal, setLoadingPortal] = useState<string | null>(null);
  const [confirmingQuote, setConfirmingQuote] = useState<string | null>(null);

  const loadQuotes = async () => {
    try {
      const res = await fetch("/api/quotes?status=ALL");
      if (res.ok) {
        const data = await res.json();
        setQuotes(Array.isArray(data.data) ? data.data : []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuotes();
  }, []);

  async function openPortal(quoteId: string) {
    setLoadingPortal(quoteId);
    try {
      const res = await fetch("/api/customer/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quoteId }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Failed to generate portal link");
      }
      window.open(data.data.portalUrl, "_blank");
    } catch (err: any) {
      toast.error("Error", err.message);
    } finally {
      setLoadingPortal(null);
    }
  }

  async function handleDirectConfirm(quoteId: string) {
    const ok = await toast.confirm({
      title: "Confirm Quotation Order?",
      description: "This will place your order, generate your tax invoice, and set up your billing/subscriptions.",
      confirmLabel: "Accept & Generate Invoice",
    });
    if (!ok) return;

    setConfirmingQuote(quoteId);
    try {
      const res = await fetch(`/api/quotes/${quoteId}/confirm`, {
        method: "POST",
      });
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.error?.message || "Failed to confirm quotation");
      }
      toast.success("Order Placed", "Your order and billing invoice have been generated successfully.");
      await loadQuotes();
      router.push("/dashboard/customer/billing");
    } catch (err: any) {
      toast.error("Confirmation Error", err.message);
    } finally {
      setConfirmingQuote(null);
    }
  }

  return (
    <RoleSidebar role="CUSTOMER">
      <main className={styles.page}>
        <div className={styles.container}>
          <header className={styles.header}>
            <div className={styles.headerLeft}>
              <h1 className={styles.title}>My Quotations</h1>
              <p className={styles.subtitle}>Review quotation proposals, item breakdowns, and terms</p>
            </div>
            <div className={styles.headerActions}>
              <CustomerNewQuoteButton />
            </div>
          </header>

          <div className={`${cStyles.tableCard} overflow-hidden`}>
            {loading ? (
              <div className="text-center py-12 text-[#94a3b8]">
                <p>Loading your quotations...</p>
              </div>
            ) : quotes.length > 0 ? (
              <div className={`${cStyles.tableWrapper} ${cStyles.customScrollbar}`}>
                <table className={cStyles.table}>
                  <thead>
                    <tr>
                      <th>Quote Number</th>
                      <th>Date</th>
                      <th>Status</th>
                      <th>Lines</th>
                      <th>Total Amount</th>
                      <th style={{ textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quotes.map((q) => (
                      <tr key={q.id}>
                        <td className={cStyles.cellMono}>{q.quoteNumber}</td>
                        <td className={cStyles.cellMuted}>{new Date(q.createdAt).toLocaleDateString()}</td>
                        <td>
                          <span className={`${cStyles.statusBadge} ${getStatusBadgeClass(q.status)}`}>
                            {q.status}
                          </span>
                        </td>
                        <td>{q.lines.length} items</td>
                        <td className={cStyles.cellPrimary}>₹{Number(q.grandTotal).toLocaleString()}</td>
                        <td style={{ textAlign: "right" }}>
                          <div className="inline-flex items-center gap-2 justify-end">
                            {q.status === "APPROVED" && (
                              <button
                                onClick={() => handleDirectConfirm(q.id)}
                                disabled={confirmingQuote === q.id}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#ffffff] text-[#000000] text-xs font-bold hover:bg-[#e0e0e0] transition-colors disabled:opacity-50"
                              >
                                <CheckCircle2 size={13} />
                                <span>{confirmingQuote === q.id ? "Placing..." : "Accept & Invoice"}</span>
                              </button>
                            )}

                            <button
                              className={cStyles.actionLink}
                              onClick={() => openPortal(q.id)}
                              disabled={loadingPortal === q.id}
                            >
                              {loadingPortal === q.id ? "Loading..." : "Open Portal "}
                              <ChevronRight size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 text-[#94a3b8]">
                <FileText size={36} className="mx-auto mb-3 text-[#cccccc] opacity-60" />
                <p>No quotations found.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </RoleSidebar>
  );
}
