import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { LogoutButton } from "@/components/LogoutButton";

export const dynamic = "force-dynamic";

export default async function RepDashboardPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "SALES_REP") redirect("/login");

  return (
    <main className="min-h-screen px-6 py-10 bg-[var(--paper)]">
      <div className="mx-auto max-w-4xl">
        <header className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-semibold">Sales Representative</h1>
            <p className="text-sm text-[var(--muted-foreground)]">Welcome back, {user.name}</p>
          </div>
          <LogoutButton />
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <a
            href="/dashboard/rep/quotes"
            className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 hover:shadow-md transition-shadow no-underline"
          >
            <h2 className="text-lg font-medium mb-2">📄 Quotations</h2>
            <p className="text-sm text-[var(--muted-foreground)]">
              Manage your active quotes, add lines, and track approvals.
            </p>
          </a>

          <a
            href="/dashboard/rep/customers"
            className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 hover:shadow-md transition-shadow no-underline"
          >
            <h2 className="text-lg font-medium mb-2">🏢 Customers</h2>
            <p className="text-sm text-[var(--muted-foreground)]">
              View customer directory, create new customers, and update tiers.
            </p>
          </a>
        </div>
      </div>
    </main>
  );
}
