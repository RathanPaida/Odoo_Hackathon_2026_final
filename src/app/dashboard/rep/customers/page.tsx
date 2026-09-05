import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { LogoutButton } from "@/components/LogoutButton";

export const dynamic = "force-dynamic";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; page?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "SALES_REP" && user.role !== "SALES_MANAGER" && user.role !== "ADMIN")) {
    redirect("/login");
  }

  const { search, page: pageStr } = await searchParams;
  const page = parseInt(pageStr || "1");
  const limit = 20;

  const where = search
    ? {
        OR: [
          { companyName: { contains: search, mode: "insensitive" as const } },
          { contactName: { contains: search, mode: "insensitive" as const } },
          { email: { contains: search, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        _count: { select: { quotes: true, orders: true } },
      },
    }),
    prisma.customer.count({ where }),
  ]);

  return (
    <main className="min-h-screen px-6 py-10 bg-[var(--paper)]">
      <div className="mx-auto max-w-5xl">
        <header className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3">
              <Link href="/dashboard/rep" className="text-sm text-[var(--muted-foreground)] hover:text-[var(--ink)]">
                ← Back to Dashboard
              </Link>
            </div>
            <h1 className="text-3xl font-semibold mt-2">Customers</h1>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard/rep/customers/new"
              className="bg-[var(--ink)] text-[var(--paper)] px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90"
            >
              + New Customer
            </Link>
            <LogoutButton />
          </div>
        </header>

        <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
          <form className="mb-6 flex gap-2">
            <input
              type="text"
              name="search"
              defaultValue={search}
              placeholder="Search by company, contact, or email..."
              className="flex-1 rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--ink)]"
            />
            <button
              type="submit"
              className="bg-[var(--muted)] text-[var(--ink)] px-4 py-2 rounded-md text-sm font-medium hover:bg-[var(--border)]"
            >
              Search
            </button>
          </form>

          {customers.length === 0 ? (
            <div className="text-center py-10 text-[var(--muted-foreground)]">
              No customers found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    <th className="pb-3 font-medium text-[var(--muted-foreground)]">Company</th>
                    <th className="pb-3 font-medium text-[var(--muted-foreground)]">Contact</th>
                    <th className="pb-3 font-medium text-[var(--muted-foreground)]">Email</th>
                    <th className="pb-3 font-medium text-[var(--muted-foreground)]">Tier</th>
                    <th className="pb-3 font-medium text-[var(--muted-foreground)]">Quotes</th>
                    <th className="pb-3 font-medium text-[var(--muted-foreground)]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((c) => (
                    <tr key={c.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--muted)]/50">
                      <td className="py-3 font-medium">{c.companyName}</td>
                      <td className="py-3">{c.contactName}</td>
                      <td className="py-3 text-[var(--muted-foreground)]">{c.email}</td>
                      <td className="py-3">
                        <span className="inline-flex items-center rounded-full bg-[var(--muted)] px-2.5 py-0.5 text-xs font-medium text-[var(--ink)]">
                          {c.tier}
                        </span>
                      </td>
                      <td className="py-3 text-[var(--muted-foreground)]">{c._count.quotes}</td>
                      <td className="py-3">
                        <Link
                          href={`/dashboard/rep/customers/${c.id}`}
                          className="text-sm text-[var(--muted-foreground)] hover:text-[var(--ink)] font-medium"
                        >
                          Edit
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
