import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { LogoutButton } from "@/components/LogoutButton";
import { 
  User, 
  FileText, 
  ChevronRight,
  Users
} from "lucide-react";
import s from "./customer.module.css";

export const dynamic = "force-dynamic";

export default async function CustomerDashboardPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "CUSTOMER") redirect("/login");

  return (
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
            <LogoutButton />
          </div>
        </div>

        <div className={`${s.statsGrid} ${s.animateFadeIn}`}>
          <div className={s.statCard}>
            <div className={s.statLabel}>Active Quotes</div>
            <div className={`${s.statValue} ${s.statValueBrand}`}>3</div>
          </div>
          <div className={s.statCard}>
            <div className={s.statLabel}>Pending Approval</div>
            <div className={`${s.statValue}`} style={{color: '#fbbf24'}}>1</div>
          </div>
          <div className={s.statCard}>
            <div className={s.statLabel}>Confirmed Orders</div>
            <div className={`${s.statValue} ${s.statValuePositive}`}>12</div>
          </div>
          <div className={s.statCard}>
            <div className={s.statLabel}>Total Value</div>
            <div className={s.statValue}>$48.5K</div>
          </div>
        </div>

        <div className={`${s.card} ${s.animateFadeIn}`} style={{animationDelay: '0.1s'}}>
          <div className={s.sectionTitle}>
            <span className={s.sectionIcon}><FileText size={18} /></span>
            Your Quotations
          </div>
          <p className={s.subtitle} style={{marginBottom: '1.5rem'}}>
            View quotations, request changes, and confirm terms here.
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
                  <tr>
                    <td className={s.cellMono}>QTN-2024-001</td>
                    <td className={s.cellMuted}>Sep 12, 2024</td>
                    <td><span className={`${s.statusBadge} ${s.badgeApproved}`}>Approved</span></td>
                    <td className={s.cellPrimary}>$12,500.00</td>
                    <td><a href="#" className={s.actionLink}>View <ChevronRight size={14} /></a></td>
                  </tr>
                  <tr>
                    <td className={s.cellMono}>QTN-2024-002</td>
                    <td className={s.cellMuted}>Sep 18, 2024</td>
                    <td><span className={`${s.statusBadge} ${s.badgePending}`}>Pending</span></td>
                    <td className={s.cellPrimary}>$8,750.00</td>
                    <td><a href="#" className={s.actionLink}>View <ChevronRight size={14} /></a></td>
                  </tr>
                  <tr>
                    <td className={s.cellMono}>QTN-2024-003</td>
                    <td className={s.cellMuted}>Sep 20, 2024</td>
                    <td><span className={`${s.statusBadge} ${s.badgeNegotiating}`}>Negotiating</span></td>
                    <td className={s.cellPrimary}>$15,200.00</td>
                    <td><a href="#" className={s.actionLink}>View <ChevronRight size={14} /></a></td>
                  </tr>
                  <tr>
                    <td className={s.cellMono}>QTN-2024-004</td>
                    <td className={s.cellMuted}>Aug 30, 2024</td>
                    <td><span className={`${s.statusBadge} ${s.badgeConfirmed}`}>Confirmed</span></td>
                    <td className={s.cellPrimary}>$22,000.00</td>
                    <td><a href="#" className={s.actionLink}>View <ChevronRight size={14} /></a></td>
                  </tr>
                  <tr>
                    <td className={s.cellMono}>QTN-2024-005</td>
                    <td className={s.cellMuted}>Aug 15, 2024</td>
                    <td><span className={`${s.statusBadge} ${s.badgeDraft}`}>Draft</span></td>
                    <td className={s.cellPrimary}>$5,300.00</td>
                    <td><a href="#" className={s.actionLink}>View <ChevronRight size={14} /></a></td>
                  </tr>
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
              <p className={s.cellPrimary}>{user.name}</p>
            </div>
            <div>
              <p className={s.cellMuted} style={{fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem'}}>Email</p>
              <p className={s.cellPrimary}>{user.email}</p>
            </div>
            <div>
              <p className={s.cellMuted} style={{fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem'}}>Customer Tier</p>
              <span className={`${s.tierBadge} ${s.tierGold}`}>Gold</span>
            </div>
            <div>
              <p className={s.cellMuted} style={{fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem'}}>Account Manager</p>
              <p className={s.cellPrimary}>Sarah Johnson</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
