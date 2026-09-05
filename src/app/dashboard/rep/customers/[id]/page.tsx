import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import Link from "next/link";
import CustomerForm from "../CustomerForm";

export const dynamic = "force-dynamic";

export default async function EditCustomerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "SALES_REP" && user.role !== "SALES_MANAGER" && user.role !== "ADMIN")) {
    redirect("/login");
  }

  const { id } = await params;

  const customer = await prisma.customer.findUnique({
    where: { id },
  });

  if (!customer) {
    notFound();
  }

  return (
    <main className="min-h-screen px-6 py-10 bg-[var(--paper)]">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8">
          <Link href="/dashboard/rep/customers" className="text-sm text-[var(--muted-foreground)] hover:text-[var(--ink)]">
            ← Back to Customers
          </Link>
          <h1 className="text-3xl font-semibold mt-2">Edit Customer</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">
            Update {customer.companyName}'s details.
          </p>
        </header>

        <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
          <CustomerForm initialData={customer} />
        </section>
      </div>
    </main>
  );
}
