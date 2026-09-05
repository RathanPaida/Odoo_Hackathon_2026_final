"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, Field, Textarea, Badge, Button, useToast } from "@/components/ui";
import { badgeToneForQuoteStatus } from "@/components/ui";

export default function PortalView({ quote, token }: { quote: any; token: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [counterOfferText, setCounterOfferText] = useState("");
  const [isCountering, setIsCountering] = useState(false);
  const toast = useToast();

  const handleConfirm = async () => {
    const ok = await toast.confirm({
      title: "Accept this quote?",
      description: "This will place a binding order.",
      confirmLabel: "Accept & confirm",
    });
    if (!ok) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/portal/${token}/confirm`, { method: "POST" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.message || "Failed to confirm quote");
      toast.success("Thank you — your order has been placed.");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleCounterOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!counterOfferText.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/portal/${token}/counter-offer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: counterOfferText }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.message || "Failed to submit counter offer");
      toast.success("Your request has been sent to the sales team.");
      setIsCountering(false);
      setCounterOfferText("");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const isApproved = quote.status === "APPROVED";
  const isNegotiating = quote.status === "NEGOTIATING";
  const isConfirmed = quote.status === "CONFIRMED";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <Card tone="paper">
          <div className="flex justify-between items-start mb-6 pb-6 border-b border-[var(--paper-border)]">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-gray-900">
                Quote {quote.quoteNumber}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {new Date(quote.updatedAt).toLocaleDateString()}
              </p>
            </div>
            <Badge tone={badgeToneForQuoteStatus(quote.status)}>
              {quote.status.replace("_", " ")}
            </Badge>
          </div>

          {error && (
            <div className="mb-6 p-3.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 text-sm">
              {error}
            </div>
          )}

          <h3 className="text-base font-semibold text-gray-900 mb-3">Products &amp; services</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm tabular">
              <thead>
                <tr className="border-b border-[var(--paper-border)] bg-[var(--paper)]">
                  <th className="p-3 font-semibold text-gray-900">Item</th>
                  <th className="p-3 font-semibold text-gray-900 text-right">Qty</th>
                  <th className="p-3 font-semibold text-gray-900 text-right">Price</th>
                  <th className="p-3 font-semibold text-gray-900 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {quote.lines.map((line: any) => (
                  <tr key={line.id} className="border-b border-[var(--paper-border)] last:border-0">
                    <td className="p-3">
                      <div className="font-medium text-gray-900">{line.product.name}</div>
                      <div className="text-xs text-gray-500">{line.product.sku}</div>
                    </td>
                    <td className="p-3 text-right">{line.qty}</td>
                    <td className="p-3 text-right">
                      {quote.currency} {Number(line.unitPrice).toLocaleString()}
                      {Number(line.discountPct) > 0 && (
                        <div className="text-xs text-emerald-600">
                          −{Number(line.discountPct)}% applied
                        </div>
                      )}
                    </td>
                    <td className="p-3 text-right font-medium text-gray-900">
                      {quote.currency} {Number(line.lineTotal).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {quote.negotiationComments.length > 0 && (
          <Card tone="paper">
            <CardHeader>
              <CardTitle>Discussion</CardTitle>
            </CardHeader>
            <ul className="space-y-3">
              {quote.negotiationComments.map((comment: any) => (
                <li
                  key={comment.id}
                  className={`p-3.5 rounded-lg text-sm border ${
                    comment.actorId
                      ? "bg-indigo-50 border-indigo-100 ml-8"
                      : "bg-[var(--paper)] border-[var(--paper-border)] mr-8"
                  }`}
                >
                  <div className="font-medium text-gray-900 mb-1">
                    {comment.actorId ? quote.owner.name : quote.customer.contactName}
                    <span className="text-gray-400 text-xs ml-2">
                      {new Date(comment.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-gray-700 whitespace-pre-wrap">{comment.content}</p>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>

      <div>
        <Card tone="paper" className="sticky top-6">
          <CardHeader>
            <CardTitle>Order summary</CardTitle>
          </CardHeader>
          <div className="space-y-2 text-sm border-b border-[var(--paper-border)] pb-4 mb-4 tabular">
            <Row label="Subtotal" value={`${quote.currency} ${Number(quote.subtotal).toLocaleString()}`} />
            {Number(quote.discountTotal) > 0 && (
              <Row label="Discount" value={`−${quote.currency} ${Number(quote.discountTotal).toLocaleString()}`} tone="positive" />
            )}
            <Row label="Tax" value={`${quote.currency} ${Number(quote.taxTotal).toLocaleString()}`} />
          </div>
          <div className="flex justify-between items-center text-lg font-semibold text-gray-900 mb-6 tabular">
            <span>Total</span>
            <span>{quote.currency} {Number(quote.grandTotal).toLocaleString()}</span>
          </div>

          {isApproved && !isCountering && (
            <div className="space-y-2">
              <Button variant="primary" className="w-full" loading={loading} onClick={handleConfirm}>
                Accept &amp; confirm order
              </Button>
              <Button variant="secondary" className="w-full" disabled={loading} onClick={() => setIsCountering(true)}>
                Request changes
              </Button>
            </div>
          )}

          {isCountering && (
            <form onSubmit={handleCounterOffer} className="space-y-3">
              <Field label="What would you like to negotiate?" htmlFor="counter">
                <Textarea
                  id="counter"
                  value={counterOfferText}
                  onChange={(e) => setCounterOfferText(e.target.value)}
                  placeholder="Tell us what you’d like to discuss…"
                  rows={4}
                />
              </Field>
              <div className="flex gap-2">
                <Button variant="ghost" className="flex-1" type="button" onClick={() => setIsCountering(false)}>
                  Cancel
                </Button>
                <Button variant="primary" className="flex-1" type="submit" loading={loading} disabled={!counterOfferText.trim()}>
                  Send request
                </Button>
              </div>
            </form>
          )}

          {isNegotiating && (
            <div className="p-4 bg-amber-50 text-amber-800 rounded-lg border border-amber-200 text-sm text-center">
              Your request is being reviewed. The sales team will be in touch shortly.
            </div>
          )}

          {isConfirmed && (
            <div className="p-4 bg-emerald-50 text-emerald-800 rounded-lg border border-emerald-200 text-sm text-center">
              This order has been confirmed.
            </div>
          )}

          {!["APPROVED", "NEGOTIATING", "CONFIRMED"].includes(quote.status) && (
            <div className="p-4 bg-[var(--paper)] text-gray-700 rounded-lg border border-[var(--paper-border)] text-sm text-center">
              This quote is not currently actionable.
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "positive";
}) {
  return (
    <div className={`flex justify-between ${tone === "positive" ? "text-emerald-700" : "text-gray-600"}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}