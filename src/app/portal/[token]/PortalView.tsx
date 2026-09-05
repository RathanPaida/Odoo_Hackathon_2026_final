"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function PortalView({ quote, token }: { quote: any, token: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [counterOfferText, setCounterOfferText] = useState("");
  const [isCountering, setIsCountering] = useState(false);

  const handleConfirm = async () => {
    if (!confirm("Are you sure you want to accept this quote? This will create a binding order.")) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/portal/${token}/confirm`, {
        method: "POST",
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.message || "Failed to confirm quote");

      alert("Thank you! Your order has been placed.");
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

      alert("Your request has been sent to our sales team.");
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
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-6">
        {/* Quote Header */}
        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
          <div className="flex justify-between items-start mb-6 border-b border-gray-100 pb-6">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900">Quotation {quote.quoteNumber}</h2>
              <p className="text-gray-500 mt-1">Date: {new Date(quote.updatedAt).toLocaleDateString()}</p>
            </div>
            <div className="text-right">
              <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
                isApproved ? "bg-green-100 text-green-800" :
                isConfirmed ? "bg-indigo-100 text-indigo-800" :
                "bg-yellow-100 text-yellow-800"
              }`}>
                {quote.status.replace("_", " ")}
              </span>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg border border-red-200">
              {error}
            </div>
          )}

          {/* Line Items */}
          <div className="mb-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Products & Services</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-600">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="p-3 font-semibold text-gray-900">Item</th>
                    <th className="p-3 font-semibold text-gray-900">Qty</th>
                    <th className="p-3 font-semibold text-gray-900 text-right">Price</th>
                    <th className="p-3 font-semibold text-gray-900 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {quote.lines.map((line: any) => (
                    <tr key={line.id} className="border-b border-gray-100 last:border-0">
                      <td className="p-3">
                        <div className="font-medium text-gray-900">{line.product.name}</div>
                        <div className="text-xs text-gray-500">{line.product.sku}</div>
                      </td>
                      <td className="p-3">{line.qty}</td>
                      <td className="p-3 text-right">
                        {quote.currency} {Number(line.unitPrice).toLocaleString()}
                        {Number(line.discountPct) > 0 && (
                          <div className="text-xs text-green-600">-{Number(line.discountPct)}% disc.</div>
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
          </div>
        </div>

        {/* Negotiation History */}
        {quote.negotiationComments.length > 0 && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Discussion</h3>
            <div className="space-y-4">
              {quote.negotiationComments.map((comment: any) => (
                <div key={comment.id} className={`p-4 rounded-lg text-sm ${comment.actorId ? "bg-indigo-50 border border-indigo-100 ml-8" : "bg-gray-50 border border-gray-100 mr-8"}`}>
                  <div className="font-medium text-gray-900 mb-1">
                    {comment.actorId ? quote.owner.name : quote.customer.contactName}
                    <span className="text-gray-400 text-xs ml-2">{new Date(comment.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="text-gray-700 whitespace-pre-wrap">{comment.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-6">
        {/* Total Summary */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 sticky top-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Order Summary</h3>
          <div className="space-y-3 text-sm text-gray-600 border-b border-gray-100 pb-4 mb-4">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{quote.currency} {Number(quote.subtotal).toLocaleString()}</span>
            </div>
            {Number(quote.discountTotal) > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount</span>
                <span>-{quote.currency} {Number(quote.discountTotal).toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Tax</span>
              <span>{quote.currency} {Number(quote.taxTotal).toLocaleString()}</span>
            </div>
          </div>
          <div className="flex justify-between items-center text-lg font-bold text-gray-900 mb-8">
            <span>Total</span>
            <span>{quote.currency} {Number(quote.grandTotal).toLocaleString()}</span>
          </div>

          {/* Action Buttons */}
          {isApproved && !isCountering && (
            <div className="space-y-3">
              <button
                onClick={handleConfirm}
                disabled={loading}
                className="w-full bg-indigo-600 text-white font-medium py-3 px-4 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                Accept & Confirm Order
              </button>
              <button
                onClick={() => setIsCountering(true)}
                disabled={loading}
                className="w-full bg-white text-gray-700 font-medium py-3 px-4 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                Request Changes
              </button>
            </div>
          )}

          {isCountering && (
            <form onSubmit={handleCounterOffer} className="space-y-3">
              <textarea
                value={counterOfferText}
                onChange={(e) => setCounterOfferText(e.target.value)}
                placeholder="What would you like to negotiate?"
                className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none h-24"
                required
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsCountering(false)}
                  className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !counterOfferText.trim()}
                  className="flex-1 bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
                >
                  Submit Request
                </button>
              </div>
            </form>
          )}

          {isNegotiating && (
            <div className="p-4 bg-yellow-50 text-yellow-800 rounded-lg text-sm border border-yellow-200 text-center">
              Your request is currently being reviewed by our sales team. We'll be in touch shortly!
            </div>
          )}

          {isConfirmed && (
            <div className="p-4 bg-green-50 text-green-800 rounded-lg text-sm border border-green-200 text-center">
              This order has been confirmed!
            </div>
          )}

          {quote.status !== "APPROVED" && quote.status !== "NEGOTIATING" && quote.status !== "CONFIRMED" && (
             <div className="p-4 bg-gray-50 text-gray-600 rounded-lg text-sm border border-gray-200 text-center">
               This quote is not currently actionable.
             </div>
          )}
        </div>
      </div>
    </div>
  );
}
