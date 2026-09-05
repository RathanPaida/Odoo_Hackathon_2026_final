import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { RoleSidebar } from "@/components/navbar/RoleSidebar";
import Link from "next/link";
import { 
  User, 
  FileText, 
  ChevronRight,
  Users
} from "lucide-react";
import { CustomerNewQuoteButton } from "./quotations/CustomerNewQuoteButton";
import s from "./customer.module.css";

export const dynamic = "force-dynamic";

export default async function CustomerDashboardPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "CUSTOMER") redirect("/login");

  // Fetch real customer record matching email
  const customer = await prisma.customer.findFirst({
    where: { email: user.email },
    include: {
      quotes: {
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { portalTokens: { where: { revokedAt: null }, take: 1 } },
      },
      _count: { select: { quotes: true, orders: true } },
    },
  });

  const quotes = customer?.quotes ?? [];
  const activeQuotesCount = quotes.filter(q => q.status === "APPROVED" || q.status === "PENDING_APPROVAL" || q.status === "DRAFT").length;
  const pendingCount = quotes.filter(q => q.status === "PENDING_APPROVAL").length;
  const confirmedCount = customer?._count.orders ?? quotes.filter(q => q.status === "CONFIRMED").length;
  const totalValue = quotes.reduce((acc, q) => acc + Number(q.grandTotal), 0);

  const getStatusBadge = (status: string) => {
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
  };

  return (
    <RoleSidebar role="CUSTOMER" userName={user.name} userEmail={user.email}>
      <main className={s.page}>
        <div className={s.container}>
          <div className={s.header}>
            <div className={s.headerContent}>
              <div className={s.headerIcon}>
                <User size={14} />
                Customer Portal
              </div>
              <h1 className={s.title}>Welcome back, {user.name}</h1>
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
              <div className={`${s.statValue}`} style={{color: '#fbbf24'}}>{pendingCount}</div>
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

          <div className={`${s.card} ${s.animateFadeIn}`} style={{animationDelay: '0.1s'}}>
            <div className={s.sectionTitle}>
              <span className={s.sectionIcon}><FileText size={18} /></span>
              Your Quotations
            </div>
            <p className={s.subtitle} style={{marginBottom: '1.5rem'}}>
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
                    {quotes.length > 0 ? (
                      quotes.map((q) => {
                        const portalToken = q.portalTokens?.[0]?.tokenHash;
                        const href = portalToken ? `/portal/${portalToken}` : `/dashboard/rep/quotes/${q.id}`;
                        return (
                          <tr key={q.id}>
                            <td className={s.cellMono}>{q.quoteNumber}</td>
                            <td className={s.cellMuted}>{new Date(q.createdAt).toLocaleDateString()}</td>
                            <td>{getStatusBadge(q.status)}</td>
                            <td className={s.cellPrimary}>₹{Number(q.grandTotal).toLocaleString()}</td>
                            <td>
                              <Link href={href} className={s.actionLink}>
                                View <ChevronRight size={14} />
                              </Link>
                            </td>
                          </tr>
                        );
                      })
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

          <div className={`${s.card} ${s.animateFadeIn}`} style={{marginTop: '2rem', animationDelay: '0.2s'}}>
            <div className={s.sectionTitle}>
              <span className={s.sectionIcon}><Users size={18} /></span>
              Account Information
            </div>
            <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginTop: '1rem'}}>
              <div>
                <p className={s.cellMuted} style={{fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem'}}>Customer Name</p>
                <p className={s.cellPrimary}>{customer?.companyName || user.name}</p>
              </div>
              <div>
                <p className={s.cellMuted} style={{fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem'}}>Email</p>
                <p className={s.cellPrimary}>{user.email}</p>
              </div>
              <div>
                <p className={s.cellMuted} style={{fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem'}}>Customer Tier</p>
                <span className={`${s.tierBadge} ${customer?.tier === "PLATINUM" ? s.tierPlatinum : customer?.tier === "GOLD" ? s.tierGold : customer?.tier === "SILVER" ? s.tierSilver : s.tierBronze}`}>
                  {customer?.tier || "GOLD"}
                </span>
              </div>
              <div>
                <p className={s.cellMuted} style={{fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem'}}>Phone</p>
                <p className={s.cellPrimary}>{customer?.phone || "+91 (Direct)"}</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </RoleSidebar>
  );
}
