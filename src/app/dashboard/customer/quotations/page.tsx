"use client";

import { useEffect, useState } from "react";
import { FileText, ChevronRight } from "lucide-react";
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
  const toast = useToast();
  const [quotes, setQuotes] = useState<QuoteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPortal, setLoadingPortal] = useState<string | null>(null);

  useEffect(() => {
    async function loadQuotes() {
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
    }
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

  return (
    <RoleSidebar>
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
                      <th style={{ textAlign: "right" }}>Action</th>
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
                          <button
                            className={cStyles.actionLink}
                            onClick={() => openPortal(q.id)}
                            disabled={loadingPortal === q.id}
                          >
                            {loadingPortal === q.id ? "Loading..." : "Open Portal "}
                            <ChevronRight size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
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
