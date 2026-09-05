import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import Link from "next/link";
import QuoteBuilder from "./QuoteBuilder";
import { RoleSidebar } from "@/components/navbar/RoleSidebar";
import s from "./quote-detail.module.css";
import { ArrowLeft } from "lucide-react";

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

  const getStatusClass = (status: string) => {
    if (status === "APPROVED") return s.statusApproved;
    if (status === "REJECTED") return s.statusRejected;
    if (status === "PENDING_APPROVAL") return s.statusPending;
    return "";
  };

  return (
    <RoleSidebar role={user.role} userName={user.name} userEmail={user.email}>
      <main className={s.page}>
        <div className={s.container}>
          <header className={`${s.header} ${s.animateFadeIn}`}>
            <Link href="/dashboard/rep/quotes" className={s.backLink}>
              <ArrowLeft size={16} />
              Back to Quotes
            </Link>
            <div className={s.headerTop}>
              <div>
                <h1 className={s.title}>Quote {quote.quoteNumber}</h1>
                <p className={s.subtitle}>
                  For {quote.customer.companyName} ({quote.customer.tier})
                </p>
              </div>
              <div>
                <span className={`${s.statusBadge} ${getStatusClass(quote.status)}`}>
                  {quote.status.replace("_", " ")}
                </span>
              </div>
            </div>
          </header>

          <QuoteBuilder initialQuote={quote} products={products} />
        </div>
      </main>
    </RoleSidebar>
  );
}
