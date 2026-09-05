import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { LogoutButton } from "@/components/LogoutButton";
import NewQuoteButton from "./NewQuoteButton";
import { QuoteStatus } from "@/generated/prisma";

export const dynamic = "force-dynamic";

export default async function QuotesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: QuoteStatus }>;
}) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "SALES_REP" && user.role !== "SALES_MANAGER" && user.role !== "ADMIN")) {
    redirect("/login");
  }

  const { status } = await searchParams;

  const where: any = {};
  if (user.role === "SALES_REP") {
    where.ownerId = user.id;
  }
  if (status) {
    where.status = status;
  }

  const quotes = await prisma.quote.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    include: {
      customer: { select: { companyName: true } },
      owner: { select: { name: true } },
      _count: { select: { lines: true } },
    },
  });

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
            <h1 className="text-3xl font-semibold mt-2">Quotations</h1>
          </div>
          <div className="flex items-center gap-4">
            <NewQuoteButton />
            <LogoutButton />
          </div>
        </header>

        <div className="flex gap-4 mb-6 overflow-x-auto pb-2">
          <Link
            href="/dashboard/rep/quotes"
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${
              !status ? "bg-[var(--ink)] text-[var(--paper)]" : "bg-[var(--card)] text-[var(--muted-foreground)] border border-[var(--border)] hover:bg-[var(--muted)]"
            }`}
          >
            All Quotes
          </Link>
          {["DRAFT", "PENDING_APPROVAL", "APPROVED", "NEGOTIATING", "REJECTED", "CONFIRMED"].map((s) => (
            <Link
              key={s}
              href={`/dashboard/rep/quotes?status=${s}`}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${
                status === s ? "bg-[var(--ink)] text-[var(--paper)]" : "bg-[var(--card)] text-[var(--muted-foreground)] border border-[var(--border)] hover:bg-[var(--muted)]"
              }`}
            >
              {s.replace("_", " ")}
            </Link>
          ))}
        </div>

        <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
          {quotes.length === 0 ? (
            <div className="text-center py-10 text-[var(--muted-foreground)]">
              No quotes found for this filter.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    <th className="pb-3 font-medium text-[var(--muted-foreground)]">Quote #</th>
                    <th className="pb-3 font-medium text-[var(--muted-foreground)]">Customer</th>
                    <th className="pb-3 font-medium text-[var(--muted-foreground)]">Status</th>
                    <th className="pb-3 font-medium text-[var(--muted-foreground)]">Total</th>
                    <th className="pb-3 font-medium text-[var(--muted-foreground)]">Margin</th>
                    <th className="pb-3 font-medium text-[var(--muted-foreground)]">Last Updated</th>
                    <th className="pb-3 font-medium text-[var(--muted-foreground)]">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {quotes.map((q) => (
                    <tr key={q.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--muted)]/50">
                      <td className="py-3 font-medium">{q.quoteNumber}</td>
                      <td className="py-3">{q.customer.companyName}</td>
                      <td className="py-3">
                        <span className="inline-flex items-center rounded-full bg-[var(--muted)] px-2.5 py-0.5 text-xs font-medium text-[var(--ink)]">
                          {q.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="py-3 font-medium text-[var(--ink)]">
                        {q.currency} {q.grandTotal.toString()}
                      </td>
                      <td className="py-3">
                        <span className={`${Number(q.marginPct) < 10 ? "text-red-600" : "text-green-600"}`}>
                          {q.marginPct.toString()}%
                        </span>
                      </td>
                      <td className="py-3 text-[var(--muted-foreground)]">
                        {q.updatedAt.toLocaleDateString()}
                      </td>
                      <td className="py-3">
                        <Link
                          href={`/dashboard/rep/quotes/${q.id}`}
                          className="text-sm text-[var(--ink)] hover:underline font-medium"
                        >
                          View / Edit
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
