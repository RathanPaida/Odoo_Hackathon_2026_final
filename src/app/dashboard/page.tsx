// src/app/dashboard/page.tsx
// Main dashboard — redirects to role-specific pages or shows overview.
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { LogoutButton } from "@/components/LogoutButton";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  if (user.role === "SALES_REP") redirect("/dashboard/rep");
  if (user.role === "SALES_MANAGER") redirect("/dashboard/manager");
  if (user.role === "FINANCE") redirect("/dashboard/finance");
  if (user.role === "CUSTOMER") redirect("/dashboard/customer");
  if (user.role === "ADMIN") redirect("/dashboard/admin");

  return (
    <main className="surface-page min-h-screen px-6 py-10">
      <div className="mx-auto max-w-3xl">
        <header className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-[var(--foreground)]">DealFlow360</h1>
            <p className="text-sm text-[var(--muted-foreground)]">Welcome back, {user.name}</p>
          </div>
          <LogoutButton />
        </header>

        <section className="surface-paper-card p-6">
          <h2 className="text-lg font-medium text-[var(--foreground)] mb-2">Session</h2>
          <dl className="grid grid-cols-[120px_1fr] gap-y-2 text-sm">
            <dt className="text-[var(--muted-foreground)]">Name</dt>
            <dd>{user.name}</dd>
            <dt className="text-[var(--muted-foreground)]">Email</dt>
            <dd>{user.email}</dd>
            <dt className="text-[var(--muted-foreground)]">Role</dt>
            <dd>
              <span className="rounded-md bg-[var(--primary)]/15 px-2 py-0.5 text-xs font-medium text-[var(--primary)]">
                {user.role}
              </span>
            </dd>
          </dl>
        </section>
      </div>
    </main>
  );
}
