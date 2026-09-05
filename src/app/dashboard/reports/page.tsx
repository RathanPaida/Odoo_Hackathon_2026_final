// src/app/dashboard/reports/page.tsx
// Reports with filters: Period / Rep / Approval Status / Product
"use client";

import { useEffect, useState } from "react";
import { LogoutButton } from "@/components/LogoutButton";

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
    <main className="min-h-screen px-6 py-10 bg-[var(--paper)]">
      <div className="mx-auto max-w-6xl">
        <header className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-semibold">Reports</h1>
            <p className="text-sm text-[var(--muted-foreground)]">
              Analytics and performance reports
            </p>
          </div>
          <LogoutButton />
        </header>

        <div className="mb-6 flex flex-wrap gap-4">
          <div className="flex gap-2">
            {(["quotes", "revenue", "products", "approvals"] as ReportType[]).map((type) => (
              <button
                key={type}
                onClick={() => setReportType(type)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  reportType === type
                    ? "bg-[var(--primary)] text-white"
                    : "bg-[var(--card)] border border-[var(--border)] hover:bg-[var(--muted)]"
                }`}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>

          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as Period)}
            className="px-4 py-2 rounded-lg text-sm border border-[var(--border)] bg-[var(--card)]"
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
            className="px-4 py-2 rounded-lg text-sm border border-[var(--border)] bg-[var(--card)]"
          >
            <option value="">All Reps</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>

          <div className="flex gap-2 ml-auto">
            <button
              onClick={() => handleExport("csv")}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-green-700"
            >
              Export CSV
            </button>
            <button
              onClick={() => handleExport("xls")}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-green-700"
            >
              Export XLS
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-[var(--muted-foreground)]">Loading...</div>
        ) : error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>
        ) : (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
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
  if (data.length === 0) return <div className="p-8 text-center text-[var(--muted-foreground)]">No data</div>;

  return (
    <table className="w-full">
      <thead className="bg-[var(--muted)]">
        <tr>
          <th className="px-4 py-3 text-left text-sm font-medium">Quote #</th>
          <th className="px-4 py-3 text-left text-sm font-medium">Customer</th>
          <th className="px-4 py-3 text-left text-sm font-medium">Rep</th>
          <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
          <th className="px-4 py-3 text-left text-sm font-medium">Subtotal</th>
          <th className="px-4 py-3 text-left text-sm font-medium">Discount %</th>
          <th className="px-4 py-3 text-left text-sm font-medium">Margin %</th>
          <th className="px-4 py-3 text-left text-sm font-medium">Created</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-[var(--border)]">
        {data.map((row, i) => (
          <tr key={i} className="hover:bg-[var(--muted)]">
            <td className="px-4 py-3 text-sm font-mono">{row.quoteNumber}</td>
            <td className="px-4 py-3 text-sm">{row.customerName}</td>
            <td className="px-4 py-3 text-sm">{row.repName}</td>
            <td className="px-4 py-3 text-sm">
              <span className={`inline-block px-2 py-0.5 text-xs rounded ${
                row.status === "CONFIRMED" ? "bg-green-100 text-green-700" :
                row.status === "REJECTED" ? "bg-red-100 text-red-700" :
                row.status === "PENDING_APPROVAL" ? "bg-yellow-100 text-yellow-700" :
                "bg-blue-100 text-blue-700"
              }`}>{row.status}</span>
            </td>
            <td className="px-4 py-3 text-sm font-medium">${Number(row.subtotal).toLocaleString()}</td>
            <td className="px-4 py-3 text-sm">{row.discountPct}%</td>
            <td className="px-4 py-3 text-sm">{row.marginPct}%</td>
            <td className="px-4 py-3 text-sm">{new Date(row.createdAt).toLocaleDateString()}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function RevenueTable({ data }: { data: RevenueRow[] }) {
  if (data.length === 0) return <div className="p-8 text-center text-[var(--muted-foreground)]">No data</div>;

  return (
    <table className="w-full">
      <thead className="bg-[var(--muted)]">
        <tr>
          <th className="px-4 py-3 text-left text-sm font-medium">Month</th>
          <th className="px-4 py-3 text-left text-sm font-medium">Revenue</th>
          <th className="px-4 py-3 text-left text-sm font-medium">Orders</th>
          <th className="px-4 py-3 text-left text-sm font-medium">Avg Deal Size</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-[var(--border)]">
        {data.map((row, i) => (
          <tr key={i} className="hover:bg-[var(--muted)]">
            <td className="px-4 py-3 text-sm font-medium">{row.month}</td>
            <td className="px-4 py-3 text-sm font-medium text-green-600">${row.revenue.toLocaleString()}</td>
            <td className="px-4 py-3 text-sm">{row.orderCount}</td>
            <td className="px-4 py-3 text-sm">${row.avgDealSize.toLocaleString()}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ProductsTable({ data }: { data: ProductRow[] }) {
  if (data.length === 0) return <div className="p-8 text-center text-[var(--muted-foreground)]">No data</div>;

  return (
    <table className="w-full">
      <thead className="bg-[var(--muted)]">
        <tr>
          <th className="px-4 py-3 text-left text-sm font-medium">Product</th>
          <th className="px-4 py-3 text-left text-sm font-medium">Category</th>
          <th className="px-4 py-3 text-left text-sm font-medium">Units Sold</th>
          <th className="px-4 py-3 text-left text-sm font-medium">Revenue</th>
          <th className="px-4 py-3 text-left text-sm font-medium">Avg Discount</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-[var(--border)]">
        {data.map((row, i) => (
          <tr key={i} className="hover:bg-[var(--muted)]">
            <td className="px-4 py-3 text-sm font-medium">{row.productName}</td>
            <td className="px-4 py-3 text-sm">{row.category}</td>
            <td className="px-4 py-3 text-sm">{row.unitsSold}</td>
            <td className="px-4 py-3 text-sm font-medium text-green-600">${row.revenue.toLocaleString()}</td>
            <td className="px-4 py-3 text-sm">{row.avgDiscount}%</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ApprovalsTable({ data }: { data: ApprovalRow[] }) {
  if (data.length === 0) return <div className="p-8 text-center text-[var(--muted-foreground)]">No data</div>;

  return (
    <table className="w-full">
      <thead className="bg-[var(--muted)]">
        <tr>
          <th className="px-4 py-3 text-left text-sm font-medium">Rep</th>
          <th className="px-4 py-3 text-left text-sm font-medium">Submitted</th>
          <th className="px-4 py-3 text-left text-sm font-medium">Approved</th>
          <th className="px-4 py-3 text-left text-sm font-medium">Rejected</th>
          <th className="px-4 py-3 text-left text-sm font-medium">Pending</th>
          <th className="px-4 py-3 text-left text-sm font-medium">Approval Rate</th>
          <th className="px-4 py-3 text-left text-sm font-medium">Avg Turnaround (hrs)</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-[var(--border)]">
        {data.map((row, i) => (
          <tr key={i} className="hover:bg-[var(--muted)]">
            <td className="px-4 py-3 text-sm font-medium">{row.repName}</td>
            <td className="px-4 py-3 text-sm">{row.submitted}</td>
            <td className="px-4 py-3 text-sm text-green-600">{row.approved}</td>
            <td className="px-4 py-3 text-sm text-red-600">{row.rejected}</td>
            <td className="px-4 py-3 text-sm text-yellow-600">{row.pending}</td>
            <td className="px-4 py-3 text-sm font-medium">{row.approvalRate}%</td>
            <td className="px-4 py-3 text-sm">{row.avgTurnaroundHours ?? "N/A"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
