import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { LogoutButton } from "@/components/LogoutButton";

export const dynamic = "force-dynamic";

export default async function FinanceDashboardPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "FINANCE") redirect("/login");

  return (
    <main className="min-h-screen px-6 py-10 bg-[var(--paper)]">
      <div className="mx-auto max-w-4xl">
        <header className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-semibold">Finance & Operations</h1>
            <p className="text-sm text-[var(--muted-foreground)]">Welcome back, {user.name}</p>
          </div>
          <LogoutButton />
        </header>

        <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
          <h2 className="text-lg font-medium mb-4">Fulfillment & Invoicing</h2>
          <p className="text-sm text-[var(--muted-foreground)]">
            Warehouse split decisions, backorders, and billing will appear here.
          </p>
        </section>
      </div>
    </main>
  );
}
