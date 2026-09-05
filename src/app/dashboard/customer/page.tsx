"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  User,
  FileText,
  ChevronRight,
  Users,
} from "lucide-react";
import { RoleSidebar } from "@/components/navbar/RoleSidebar";
import { CustomerNewQuoteButton } from "./quotations/CustomerNewQuoteButton";
import { CustomerPhoneEditor } from "./CustomerPhoneEditor";
import s from "./customer.module.css";

interface CustomerProfile {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  phone: string | null;
  tier: "BRONZE" | "SILVER" | "GOLD" | "PLATINUM";
}

interface QuoteRow {
  id: string;
  quoteNumber: string;
  createdAt: string;
  status: string;
  grandTotal: number;
}

interface MeUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

function getStatusBadge(status: string) {
  switch (status) {
    case "APPROVED":
      return <span className={`${s.statusBadge} ${s.badgeApproved}`}>Approved</span>;
    case "PENDING_APPROVAL":
      return <span className={`${s.statusBadge} ${s.badgePending}`}>Pending Approval</span>;
    case "CONFIRMED":
      return <span className={`${s.statusBadge} ${s.badgeConfirmed}`}>Confirmed</span>;
    case "REJECTED":
      return <span className={`${s.statusBadge} ${s.badgeRejected}`}>Rejected</span>;
    case "NEGOTIATING":
      return <span className={`${s.statusBadge} ${s.badgeNegotiating}`}>Negotiating</span>;
    default:
      return <span className={`${s.statusBadge} ${s.badgeDraft}`}>{status}</span>;
  }
}

export default function CustomerDashboardPage() {
  const [me, setMe] = useState<MeUser | null>(null);
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [quotes, setQuotes] = useState<QuoteRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [meRes, profileRes, quotesRes] = await Promise.all([
          fetch("/api/auth/me"),
          fetch("/api/customer/profile"),
          fetch("/api/quotes?status=ALL"),
        ]);

        if (meRes.ok) {
          const data = await meRes.json();
          const userData = data.success ? data.data : data.user;
          if (userData?.id) setMe(userData);
        }

        if (profileRes.ok) {
          const data = await profileRes.json();
          if (data.data?.customer) setProfile(data.data.customer);
        }

        if (quotesRes.ok) {
          const data = await quotesRes.json();
          if (Array.isArray(data.data)) setQuotes(data.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const userName = me?.name ?? "Customer";
  const userEmail = me?.email ?? "";
  const activeQuotesCount = quotes.filter((q) => q.status === "APPROVED" || q.status === "PENDING_APPROVAL" || q.status === "DRAFT").length;
  const pendingCount = quotes.filter((q) => q.status === "PENDING_APPROVAL").length;
  const confirmedCount = quotes.filter((q) => q.status === "CONFIRMED").length;
  const totalValue = quotes.reduce((acc, q) => acc + Number(q.grandTotal || 0), 0);

  async function openPortal(quoteId: string) {
    try {
      const res = await fetch("/api/customer/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quoteId }),
      });
      const data = await res.json();
      if (res.ok && data.data?.portalUrl) {
        window.open(data.data.portalUrl, "_blank");
      }
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <RoleSidebar role="CUSTOMER" userName={userName} userEmail={userEmail}>
      <main className={s.page}>
        <div className={s.container}>
          <div className={s.header}>
            <div className={s.headerContent}>
              <div className={s.headerIcon}>
                <User size={14} />
                Customer Portal
              </div>
              <h1 className={s.title}>Welcome back, {userName}</h1>
              <p className={s.subtitle}>
                Manage your quotations, track approvals, and review your account details.
              </p>
            </div>
            <div className={s.headerActions}>
              <CustomerNewQuoteButton />
            </div>
          </div>

          <div className={`${s.statsGrid} ${s.animateFadeIn}`}>
            <div className={s.statCard}>
              <div className={s.statLabel}>Active Quotes</div>
              <div className={`${s.statValue} ${s.statValueBrand}`}>{activeQuotesCount}</div>
            </div>
            <div className={s.statCard}>
              <div className={s.statLabel}>Pending Approval</div>
              <div className={`${s.statValue}`} style={{ color: "#fbbf24" }}>{pendingCount}</div>
            </div>
            <div className={s.statCard}>
              <div className={s.statLabel}>Confirmed Orders</div>
              <div className={`${s.statValue} ${s.statValuePositive}`}>{confirmedCount}</div>
            </div>
            <div className={s.statCard}>
              <div className={s.statLabel}>Total Value</div>
              <div className={s.statValue}>₹{totalValue.toLocaleString()}</div>
            </div>
          </div>

          <div className={`${s.card} ${s.animateFadeIn}`} style={{ animationDelay: "0.1s" }}>
            <div className={s.sectionTitle}>
              <span className={s.sectionIcon}><FileText size={18} /></span>
              Your Quotations
            </div>
            <p className={s.subtitle} style={{ marginBottom: "1.5rem" }}>
              View quotations, review line discounts, and accept terms.
            </p>

            <div className={s.tableCard}>
              <div className={s.tableWrapper}>
                <table className={s.table}>
                  <thead>
                    <tr>
                      <th>Quote Number</th>
                      <th>Date</th>
                      <th>Status</th>
                      <th>Value</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan={5} className="text-center py-6 text-[#94a3b8]">Loading...</td></tr>
                    ) : quotes.length > 0 ? (
                      quotes.map((q) => (
                        <tr key={q.id}>
                          <td className={s.cellMono}>{q.quoteNumber}</td>
                          <td className={s.cellMuted}>{new Date(q.createdAt).toLocaleDateString()}</td>
                          <td>{getStatusBadge(q.status)}</td>
                          <td className={s.cellPrimary}>₹{Number(q.grandTotal).toLocaleString()}</td>
                          <td>
                            <button
                              onClick={() => openPortal(q.id)}
                              className={s.actionLink}
                            >
                              View <ChevronRight size={14} />
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="text-center py-6 text-[#94a3b8]">
                          No quotations found for your account.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className={`${s.card} ${s.animateFadeIn}`} style={{ marginTop: "2rem", animationDelay: "0.2s" }}>
            <div className={s.sectionTitle}>
              <span className={s.sectionIcon}><Users size={18} /></span>
              Account Information
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1.5rem", marginTop: "1rem" }}>
              <div>
                <p className={s.cellMuted} style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.25rem" }}>Customer Name</p>
                <p className={s.cellPrimary}>{profile?.companyName || userName}</p>
              </div>
              <div>
                <p className={s.cellMuted} style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.25rem" }}>Email</p>
                <p className={s.cellPrimary}>{userEmail}</p>
              </div>
              <div>
                <p className={s.cellMuted} style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.25rem" }}>Customer Tier</p>
                <span className={`${s.tierBadge} ${profile?.tier === "PLATINUM" ? s.tierPlatinum : profile?.tier === "GOLD" ? s.tierGold : profile?.tier === "SILVER" ? s.tierSilver : s.tierBronze}`}>
                  {profile?.tier || "GOLD"}
                </span>
              </div>
              <div>
                <p className={s.cellMuted} style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.25rem" }}>Phone</p>
                <CustomerPhoneEditor initialPhone={profile?.phone} />
              </div>
            </div>
          </div>
        </div>
      </main>
    </RoleSidebar>
  );
}
