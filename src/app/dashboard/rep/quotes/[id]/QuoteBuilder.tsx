"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function QuoteBuilder({ initialQuote, products }: { initialQuote: any, products: any[] }) {
  const router = useRouter();
  const [quote, setQuote] = useState(initialQuote);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [qty, setQty] = useState(1);
  const [discountPct, setDiscountPct] = useState(0);
  const [subscriptionMonths, setSubscriptionMonths] = useState("");
  const [recommendations, setRecommendations] = useState<any[]>([]);

  const isEditable = ["DRAFT", "NEGOTIATING", "REJECTED"].includes(quote.status);

  useEffect(() => {
    if (quote.lines.length > 0) {
      fetch(`/api/quotes/${quote.id}/recommendations`)
        .then(res => res.json())
        .then(data => {
          if (data.success) setRecommendations(data.data);
        })
        .catch(console.error);
    } else {
      setRecommendations([]);
    }
  }, [quote.lines, quote.id]);

  const handleAddLine = async (e?: React.FormEvent, productData?: any) => {
    if (e) e.preventDefault();
    
    const pId = productData?.productId || selectedProductId;
    const pQty = productData?.qty || qty;
    const pDiscount = productData?.discountPct || discountPct;
    
    if (!pId || pQty < 1) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/quotes/${quote.id}/lines`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: pId,
          qty: pQty,
          discountPct: pDiscount,
          subscriptionMonths: subscriptionMonths ? parseInt(subscriptionMonths) : undefined,
        }),
      });

      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.message || "Failed to add line");

      setQuote(body.data);
      setSelectedProductId("");
      setQty(1);
      setDiscountPct(0);
      setSubscriptionMonths("");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveLine = async (lineId: string) => {
    if (!confirm("Are you sure you want to remove this line?")) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/quotes/${quote.id}/lines?lineId=${lineId}`, {
        method: "DELETE",
      });

      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.message || "Failed to remove line");

      setQuote(body.data);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitQuote = async () => {
    if (!confirm("Submit this quote for approval?")) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/quotes/${quote.id}/submit`, {
        method: "POST",
      });

      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.message || "Failed to submit quote");

      setQuote(body.data.quote);
      
      if (body.data.evaluation?.status === "REJECTED") {
        alert("Quote was auto-rejected: " + body.data.evaluation.reason);
      } else if (body.data.evaluation?.requiresApproval) {
        alert(`Quote submitted for ${body.data.evaluation.level} approval.`);
      } else {
        alert("Quote auto-approved!");
      }
      
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const selectedProduct = products.find(p => p.id === selectedProductId);
  const isRecurring = selectedProduct?.billingType === "RECURRING";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Main Quote Workspace */}
      <div className="lg:col-span-2 space-y-6">
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-600 rounded-md text-sm">
            {error}
          </div>
        )}

        {/* Add Line Form */}
        {isEditable && (
          <form onSubmit={handleAddLine} className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 space-y-4 shadow-sm">
            <h3 className="font-medium text-lg border-b border-[var(--border)] pb-2 mb-4">Add Product</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-[var(--ink)]">Product</label>
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--ink)]"
                  required
                >
                  <option value="">Select a product...</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku}) - ₹{Number(p.listPrice).toLocaleString()}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-[var(--ink)]">Quantity</label>
                <input
                  type="number"
                  min="1"
                  value={qty}
                  onChange={(e) => setQty(parseInt(e.target.value))}
                  className="w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--ink)]"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-[var(--ink)]">Discount (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={discountPct}
                  onChange={(e) => setDiscountPct(parseFloat(e.target.value))}
                  className="w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--ink)]"
                />
              </div>

              {isRecurring && (
                <div className="space-y-1">
                  <label className="text-sm font-medium text-[var(--ink)]">Subscription Months</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="e.g. 12"
                    value={subscriptionMonths}
                    onChange={(e) => setSubscriptionMonths(e.target.value)}
                    className="w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--ink)]"
                    required
                  />
                </div>
              )}
            </div>
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={loading || !selectedProductId}
                className="bg-[var(--muted)] text-[var(--ink)] px-4 py-2 rounded-md text-sm font-medium hover:bg-[var(--border)] disabled:opacity-50"
              >
                + Add Line
              </button>
            </div>
          </form>
        )}

        {/* Line Items Table */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden shadow-sm">
          <div className="p-4 border-b border-[var(--border)] bg-[var(--muted)]/30">
            <h3 className="font-medium text-lg">Line Items</h3>
          </div>
          {quote.lines.length === 0 ? (
            <div className="p-8 text-center text-[var(--muted-foreground)]">
              No line items added yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    <th className="p-4 font-medium text-[var(--muted-foreground)]">Product</th>
                    <th className="p-4 font-medium text-[var(--muted-foreground)]">Qty</th>
                    <th className="p-4 font-medium text-[var(--muted-foreground)]">Unit Price</th>
                    <th className="p-4 font-medium text-[var(--muted-foreground)]">Disc %</th>
                    <th className="p-4 font-medium text-[var(--muted-foreground)]">Total</th>
                    {isEditable && <th className="p-4 font-medium text-[var(--muted-foreground)]"></th>}
                  </tr>
                </thead>
                <tbody>
                  {quote.lines.map((line: any) => (
                    <tr key={line.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--muted)]/20">
                      <td className="p-4">
                        <p className="font-medium">{line.product.name}</p>
                        <p className="text-xs text-[var(--muted-foreground)]">{line.product.sku} ({line.billingType})</p>
                      </td>
                      <td className="p-4">{line.qty}</td>
                      <td className="p-4">₹{Number(line.unitPrice).toLocaleString()}</td>
                      <td className="p-4">{Number(line.discountPct)}%</td>
                      <td className="p-4 font-medium text-[var(--ink)]">₹{Number(line.lineTotal).toLocaleString()}</td>
                      {isEditable && (
                        <td className="p-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleRemoveLine(line.id)}
                            disabled={loading}
                            className="text-red-500 hover:text-red-700 disabled:opacity-50"
                          >
                            Remove
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Summary Sidebar */}
      <div className="space-y-6">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm sticky top-6">
          <h3 className="font-medium text-lg border-b border-[var(--border)] pb-4 mb-4">Quote Summary</h3>
          
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-[var(--muted-foreground)]">Subtotal</span>
              <span>₹{Number(quote.subtotal).toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-red-600">
              <span>Discount</span>
              <span>-₹{Number(quote.discountTotal).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--muted-foreground)]">Tax</span>
              <span>₹{Number(quote.taxTotal).toLocaleString()}</span>
            </div>
            <div className="flex justify-between font-bold text-lg pt-4 border-t border-[var(--border)]">
              <span>Grand Total</span>
              <span>₹{Number(quote.grandTotal).toLocaleString()}</span>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-[var(--border)]">
            <h4 className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-3">
              Deal Metrics
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Total Cost</span>
                <span className="text-[var(--muted-foreground)]">₹{Number(quote.totalCost).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Margin</span>
                <span className={`font-medium ${Number(quote.marginPct) < 10 ? "text-red-600" : "text-green-600"}`}>
                  {Number(quote.marginPct).toFixed(2)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span>Blended Disc.</span>
                <span className="font-medium">{Number(quote.blendedDiscountPct).toFixed(2)}%</span>
              </div>
            </div>
          </div>

          {isEditable && (
            <div className="mt-8 pt-6 border-t border-[var(--border)]">
              <button
                type="button"
                onClick={handleSubmitQuote}
                disabled={loading || quote.lines.length === 0}
                className="w-full bg-[var(--ink)] text-[var(--paper)] px-4 py-3 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                Submit for Approval
              </button>
            </div>
          )}

          {quote.status === "APPROVED" && (
            <div className="mt-8 pt-6 border-t border-[var(--border)]">
              <button
                type="button"
                onClick={async () => {
                  if (!confirm("Confirm this quote and convert it to an Order?")) return;
                  setLoading(true);
                  try {
                    const res = await fetch(`/api/quotes/${quote.id}/confirm`, { method: "POST" });
                    const body = await res.json();
                    if (!res.ok) throw new Error(body.error?.message || "Failed to confirm");
                    alert("Quote converted to Order successfully!");
                    router.push("/dashboard/rep/quotes");
                    router.refresh();
                  } catch (err: any) {
                    alert(err.message);
                    setLoading(false);
                  }
                }}
                disabled={loading}
                className="w-full bg-green-600 text-white px-4 py-3 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-opacity"
              >
                Confirm & Create Order
              </button>
            </div>
          )}

          {(quote.status === "APPROVED" || quote.status === "NEGOTIATING") && (
            <div className="mt-4 pt-4 border-t border-[var(--border)]">
              <button
                type="button"
                onClick={async () => {
                  setLoading(true);
                  try {
                    const res = await fetch(`/api/quotes/${quote.id}/portal-link`, { method: "POST" });
                    const body = await res.json();
                    if (!res.ok) throw new Error(body.error?.message || "Failed to generate link");
                    
                    // Copy to clipboard
                    await navigator.clipboard.writeText(body.data.link);
                    alert("Portal link generated and copied to clipboard!\n" + body.data.link);
                  } catch (err: any) {
                    alert(err.message);
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading}
                className="w-full bg-[var(--muted)] text-[var(--ink)] border border-[var(--border)] px-4 py-3 rounded-lg text-sm font-medium hover:bg-[var(--border)] disabled:opacity-50 transition-opacity"
              >
                🔗 Copy Portal Link
              </button>
            </div>
          )}
        </div>

        {/* AI Recommendations */}
        {isEditable && recommendations.length > 0 && (
          <div className="rounded-xl border border-[var(--border)] bg-indigo-50/50 dark:bg-indigo-950/20 p-6 shadow-sm border-indigo-100 dark:border-indigo-900/30 sticky top-[400px]">
            <h3 className="font-medium text-lg border-b border-indigo-200/50 dark:border-indigo-800/50 pb-4 mb-4 flex items-center gap-2 text-indigo-900 dark:text-indigo-300">
              <span className="text-xl">✨</span> Recommendations
            </h3>
            
            <div className="space-y-4">
              {recommendations.map((rec) => (
                <div key={rec.productId} className="bg-white dark:bg-gray-900 p-3 rounded-lg border border-indigo-100 dark:border-indigo-900/30 text-sm">
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-medium">{rec.productName}</span>
                    <span className="text-indigo-600 dark:text-indigo-400 font-medium">₹{Number(rec.listPrice).toLocaleString()}</span>
                  </div>
                  <p className="text-xs text-[var(--muted-foreground)] mb-3">{rec.reason}</p>
                  
                  <button
                    onClick={() => handleAddLine(undefined, { productId: rec.productId, qty: 1, discountPct: 0 })}
                    disabled={loading}
                    className="w-full text-xs font-medium py-1.5 rounded bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-900 transition-colors"
                  >
                    Add to Quote
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
