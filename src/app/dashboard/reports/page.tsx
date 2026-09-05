// src/app/dashboard/reports/page.tsx - // src/app/dashboard/reports/page.tsx
// Reports with filters: Period / Rep / Approval Status / Product
"use client";

import { useEffect, useState } from "react";
import { LogoutButton } from "@/components/LogoutButton";
import styles from "../dashboard.module.css";

type ReportType = "quotes" | "revenue" | "products" | "approvals";
type Period = "this_month" | "last_month" | "last_quarter" | "this_year" | "all";

interface QuoteRow {
  quoteNumber: string;
  customerName: string;
  repName: string;
  status: string;
  subtotal: string;
  discountPct: string;
  marginPct: string;
  createdAt: string;
  confirmedAt: string | null;
}

interface RevenueRow {
  month: string;
  revenue: number;
  orderCount: number;
  avgDealSize: number;
}

interface ProductRow {
  productName: string;
  category: string;
  unitsSold: number;
  revenue: number;
  avgDiscount: number;
}

interface ApprovalRow {
  repName: string;
  submitted: number;
  approved: number;
  rejected: number;
  pending: number;
  approvalRate: number;
  avgTurnaroundHours: number | null;
}

interface User {
  id: string;
  name: string;
  role: string;
}

export default function ReportsPage() {
  const [reportType, setReportType] = useState<ReportType>("quotes");
  const [period, setPeriod] = useState<Period>("this_month");
  const [data, setData] = useState<unknown[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedRepId, setSelectedRepId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchUsers() {
      try {
        const res = await fetch("/api/admin/users");
        if (res.ok) {
          const result = await res.json();
          setUsers(result.data ?? []);
        }
      } catch {
        // ignore
      }
    }
    fetchUsers();
  }, []);

  useEffect(() => {
    async function fetchReport() {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          type: reportType,
          period,
          format: "json",
        });
        if (selectedRepId) params.set("repId", selectedRepId);

        const res = await fetch(`/api/reports?${params}`);
        if (!res.ok) throw new Error("Failed to fetch report");
        const result = await res.json();
        setData(result.data ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }
    fetchReport();
  }, [reportType, period, selectedRepId]);

  async function handleExport(format: "csv" | "xls") {
    const params = new URLSearchParams({
      type: reportType,
      period,
      format,
    });
    if (selectedRepId) params.set("repId", selectedRepId);

    const res = await fetch(`/api/reports?${params}`);
    if (!res.ok) return;

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `report-${reportType}-${Date.now()}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <h1 className={styles.title}>Reports</h1>
            <p className={styles.subtitle}>Analytics and performance reports</p>
          </div>
          <div className={styles.headerActions}>
            <LogoutButton />
          </div>
        </header>

        <div className={styles.filterTabs}>
          {(["quotes", "revenue", "products", "approvals"] as ReportType[]).map((type) => (
            <button
              key={type}
              onClick={() => setReportType(type)}
              className={`${styles.filterTab} ${reportType === type ? styles.filterTabActive : ""}`}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>

        <div className={`${styles.cardGrid} ${styles.cardGrid3}`} style={{ marginBottom: "1.5rem" }}>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as Period)}
            className={styles.formSelect}
          >
            <option value="this_month">This Month</option>
            <option value="last_month">Last Month</option>
            <option value="last_quarter">Last Quarter</option>
            <option value="this_year">This Year</option>
            <option value="all">All Time</option>
          </select>

          <select
            value={selectedRepId}
            onChange={(e) => setSelectedRepId(e.target.value)}
            className={styles.formSelect}
          >
            <option value="">All Reps</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>

          <div style={{ display: "flex", gap: "0.75rem", marginLeft: "auto" }}>
            <button
              onClick={() => handleExport("csv")}
              className={styles.secondaryBtn}
            >
              Export CSV
            </button>
            <button
              onClick={() => handleExport("xls")}
              className={styles.secondaryBtn}
            >
              Export XLS
            </button>
          </div>
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
          <div className={`${styles.tableCard} ${styles.animateFadeIn}`}>
            {reportType === "quotes" && <QuotesTable data={data as QuoteRow[]} />}
            {reportType === "revenue" && <RevenueTable data={data as RevenueRow[]} />}
            {reportType === "products" && <ProductsTable data={data as ProductRow[]} />}
            {reportType === "approvals" && <ApprovalsTable data={data as ApprovalRow[]} />}
          </div>
        )}
      </div>
    </main>
  );
}

function QuotesTable({ data }: { data: QuoteRow[] }) {
  if (data.length === 0) return <div className={styles.emptyState}><p className={styles.emptyStateText}>No data</p></div>;

  return (
    <div className={styles.tableWrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Quote #</th>
            <th>Customer</th>
            <th>Rep</th>
            <th>Status</th>
            <th>Subtotal</th>
            <th>Discount %</th>
            <th>Margin %</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i}>
              <td className={styles.cellPrimary}>{row.quoteNumber}</td>
              <td>{row.customerName}</td>
              <td className={styles.cellMuted}>{row.repName}</td>
              <td>
                <span className={`${styles.statusBadge} ${getStatusClass(row.status)}`}>
                  {row.status}
                </span>
              </td>
              <td className={styles.cellPrimary}>${Number(row.subtotal).toLocaleString()}</td>
              <td>{row.discountPct}%</td>
              <td className={Number(row.marginPct) >= 10 ? styles.textGood : styles.textBad}>
                {row.marginPct}%
              </td>
              <td className={styles.cellMuted}>{new Date(row.createdAt).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RevenueTable({ data }: { data: RevenueRow[] }) {
  if (data.length === 0) return <div className={styles.emptyState}><p className={styles.emptyStateText}>No data</p></div>;

  return (
    <div className={styles.tableWrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Month</th>
            <th>Revenue</th>
            <th>Orders</th>
            <th>Avg Deal Size</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i}>
              <td className={styles.cellPrimary}>{row.month}</td>
              <td className={styles.textGood}>${row.revenue.toLocaleString()}</td>
              <td>{row.orderCount}</td>
              <td>${row.avgDealSize.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ProductsTable({ data }: { data: ProductRow[] }) {
  if (data.length === 0) return <div className={styles.emptyState}><p className={styles.emptyStateText}>No data</p></div>;

  return (
    <div className={styles.tableWrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Product</th>
            <th>Category</th>
            <th>Units Sold</th>
            <th>Revenue</th>
            <th>Avg Discount</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i}>
              <td className={styles.cellPrimary}>{row.productName}</td>
              <td className={styles.cellMuted}>{row.category}</td>
              <td>{row.unitsSold}</td>
              <td className={styles.textGood}>${row.revenue.toLocaleString()}</td>
              <td>{row.avgDiscount}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ApprovalsTable({ data }: { data: ApprovalRow[] }) {
  if (data.length === 0) return <div className={styles.emptyState}><p className={styles.emptyStateText}>No data</p></div>;

  return (
    <div className={styles.tableWrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Rep</th>
            <th>Submitted</th>
            <th>Approved</th>
            <th>Rejected</th>
            <th>Pending</th>
            <th>Approval Rate</th>
            <th>Avg Turnaround (hrs)</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i}>
              <td className={styles.cellPrimary}>{row.repName}</td>
              <td>{row.submitted}</td>
              <td className={styles.textGood}>{row.approved}</td>
              <td className={styles.textBad}>{row.rejected}</td>
              <td className={styles.textWarning}>{row.pending}</td>
              <td className={styles.cellPrimary}>{row.approvalRate}%</td>
              <td className={styles.cellMuted}>{row.avgTurnaroundHours ?? "N/A"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function getStatusClass(status: string): string {
  switch (status) {
    case "CONFIRMED": return styles.statusBadgeConfirmed;
    case "REJECTED": return styles.statusBadgeRejected;
    case "PENDING_APPROVAL": return styles.statusBadgePending;
    case "APPROVED": return styles.statusBadgeApproved;
    case "DRAFT": return styles.statusBadgeDraft;
    case "NEGOTIATING": return styles.statusBadgeNegotiating;
    default: return styles.statusBadge;
  }
}