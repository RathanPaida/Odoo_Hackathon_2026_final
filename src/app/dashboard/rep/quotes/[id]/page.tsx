import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import Link from "next/link";
import QuoteBuilder from "./QuoteBuilder";

export const dynamic = "force-dynamic";

export default async function QuoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "SALES_REP" && user.role !== "SALES_MANAGER" && user.role !== "ADMIN")) {
    redirect("/login");
  }

  const { id } = await params;

  const quote = await prisma.quote.findUnique({
    where: { id },
    include: {
      customer: true,
      owner: { select: { name: true } },
      lines: {
        include: {
          product: true,
        },
      },
      approvals: {
        orderBy: { cycle: "desc" },
      },
    },
  });

  if (!quote) notFound();

  if (user.role === "SALES_REP" && quote.ownerId !== user.id) {
    redirect("/dashboard/rep/quotes");
  }

  // Fetch product catalog for the product picker
  const products = await prisma.product.findMany({
    orderBy: { category: "asc" },
  });

  return (
    <main className="min-h-screen px-6 py-10 bg-[var(--paper)]">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8">
          <Link href="/dashboard/rep/quotes" className="text-sm text-[var(--muted-foreground)] hover:text-[var(--ink)]">
            ← Back to Quotes
          </Link>
          <div className="flex items-center justify-between mt-2">
            <div>
              <h1 className="text-3xl font-semibold">Quote {quote.quoteNumber}</h1>
              <p className="text-sm text-[var(--muted-foreground)] mt-1">
                For {quote.customer.companyName} ({quote.customer.tier})
              </p>
            </div>
            <div className="text-right">
              <span className="inline-flex items-center rounded-full bg-[var(--muted)] px-3 py-1 text-sm font-medium text-[var(--ink)]">
                {quote.status.replace("_", " ")}
              </span>
            </div>
          </div>
        </header>

        <QuoteBuilder initialQuote={quote} products={products} />
      </div>
    </main>
  );
}
