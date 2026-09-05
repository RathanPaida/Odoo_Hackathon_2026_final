import { notFound } from "next/navigation";
import { validatePortalToken } from "@/lib/services/portal";
import { prisma } from "@/lib/db";
import PortalView from "./PortalView";

export const dynamic = "force-dynamic";

export default async function PortalPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const quoteRef = await validatePortalToken(token);
  if (!quoteRef) {
    return (
      <main className="surface-paper min-h-screen flex items-center justify-center p-6">
        <div className="surface-paper-card max-w-md w-full p-8 text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-[var(--status-rejected-bg)] text-[var(--status-rejected-fg)] flex items-center justify-center text-xl">
            !
          </div>
          <h2 className="text-xl font-semibold tracking-tight">Invalid or expired link</h2>
          <p className="text-sm text-[var(--muted-foreground)] mt-2">
            This quote link has expired or is no longer valid. Please contact your sales representative for a new one.
          </p>
        </div>
      </main>
    );
  }

  const quote = await prisma.quote.findUnique({
    where: { id: quoteRef.id },
    include: {
      customer: true,
      owner: true,
      lines: { include: { product: true } },
      negotiationComments: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!quote) notFound();

  return (
    <main className="surface-paper min-h-screen">
      <header className="bg-[var(--primary)] text-white shadow-sm">
        <div className="max-w-5xl mx-auto px-6 py-5 flex justify-between items-center">
          <h1 className="text-lg font-semibold tracking-tight">DealFlow360</h1>
          <span className="text-sm text-indigo-100">
            Prepared for {quote.customer.companyName}
          </span>
        </div>
      </header>
      <div className="max-w-5xl mx-auto px-6 py-10">
        <PortalView quote={quote} token={token} />
      </div>
    </main>
  );
}