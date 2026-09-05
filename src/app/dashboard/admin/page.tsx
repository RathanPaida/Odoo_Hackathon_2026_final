import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { LogoutButton } from "@/components/LogoutButton";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") redirect("/login");

  return (
    <main className="min-h-screen px-6 py-10 bg-[var(--paper)]">
      <div className="mx-auto max-w-4xl">
        <header className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-semibold">Administration</h1>
            <p className="text-sm text-[var(--muted-foreground)]">Welcome back, {user.name}</p>
          </div>
          <LogoutButton />
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            href="/dashboard/admin/users"
            className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 hover:shadow-md transition-shadow no-underline"
          >
            <h2 className="text-lg font-medium mb-2">👥 Manage Users</h2>
            <p className="text-sm text-[var(--muted-foreground)]">
              View all users, change roles, and manage platform access.
            </p>
          </Link>

          <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
            <h2 className="text-lg font-medium mb-2">⚙️ Global Configuration</h2>
            <p className="text-sm text-[var(--muted-foreground)]">
              Manage products, price lists, discount tiers, and warehouses.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
