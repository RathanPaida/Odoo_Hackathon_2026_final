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
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="bg-white p-8 rounded-xl shadow-sm border border-red-200 text-center max-w-md">
          <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 text-xl">
            !
          </div>
          <h2 className="text-xl font-semibold mb-2">Invalid or Expired Link</h2>
          <p className="text-gray-500 text-sm">
            This quote link has expired or is no longer valid. Please contact your sales representative for a new link.
          </p>
        </div>
      </div>
    );
  }

  // Fetch full details
  const quote = await prisma.quote.findUnique({
    where: { id: quoteRef.id },
    include: {
      customer: true,
      owner: true,
      lines: {
        include: {
          product: true,
        }
      },
      negotiationComments: {
        orderBy: { createdAt: "desc" }
      }
    }
  });

  if (!quote) notFound();

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="bg-indigo-900 text-white p-6 shadow-md">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold tracking-tight">DealFlow360</h1>
          <div className="text-sm text-indigo-200">
            Prepared for {quote.customer.companyName}
          </div>
        </div>
      </div>
      <div className="max-w-5xl mx-auto py-10 px-6">
        <PortalView quote={quote} token={token} />
      </div>
    </main>
  );
}
