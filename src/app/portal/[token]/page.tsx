import { notFound } from "next/navigation";
import { validatePortalToken } from "@/lib/services/portal";
import { prisma } from "@/lib/db";
import PortalView from "./PortalView";
import { RoleSidebar } from "@/components/navbar/RoleSidebar";

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

  const serializedQuote = JSON.parse(JSON.stringify(quote));

  return (
    <RoleSidebar
      role="CUSTOMER"
      userName={quote.customer.companyName}
      userEmail={quote.customer.email}
    >
      <div
        style={{
          maxWidth: "80rem",
          margin: "0 auto",
          padding: "2rem 1.5rem",
        }}
      >
        {/* Topbar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "1rem 0",
            borderBottom: "1px solid rgba(139,92,246,0.1)",
            marginBottom: "2rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <span
              style={{
                fontSize: "0.875rem",
                color: "#94a3b8",
              }}
            >
              Quote <strong style={{ color: "#c4b5fd" }}>{quote.quoteNumber}</strong>
              &nbsp;&mdash;&nbsp; {quote.status.replace("_", " ")}
            </span>
          </div>
          <span style={{ fontSize: "0.8125rem", color: "#64748b" }}>
            Last updated {new Date(quote.updatedAt).toLocaleDateString()}
          </span>
        </div>

        <PortalView quote={serializedQuote} token={token} />
      </div>
    </RoleSidebar>
  );
}