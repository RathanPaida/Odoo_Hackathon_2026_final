import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import Link from "next/link";
import CustomerForm from "../CustomerForm";

export const dynamic = "force-dynamic";

export default async function NewCustomerPage() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "SALES_REP" && user.role !== "SALES_MANAGER" && user.role !== "ADMIN")) {
    redirect("/login");
  }

  return (
    <main className="min-h-screen px-6 py-10 bg-[var(--paper)]">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8">
          <Link href="/dashboard/rep/customers" className="text-sm text-[var(--muted-foreground)] hover:text-[var(--ink)]">
            ← Back to Customers
          </Link>
          <h1 className="text-3xl font-semibold mt-2">New Customer</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">
            Create a new customer profile.
          </p>
        </header>

        <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
          <CustomerForm />
        </section>
      </div>
    </main>
  );
}
