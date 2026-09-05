// src/app/dashboard/rep/quotes/[id]/QuoteBuilder.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Trash2 } from "lucide-react";
import s from "./quote-detail.module.css";
import { RiskGauge, useToast } from "@/components/ui";

export default function QuoteBuilder({ initialQuote, products }: { initialQuote: any; products: any[] }) {
  const router = useRouter();
  const toast = useToast();
  const [quote, setQuote] = useState({
    ...initialQuote,
    lines: initialQuote?.lines || [],
  });
  const [loading, setLoading] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [qty, setQty] = useState<number | string>(1);
  const [discountPct, setDiscountPct] = useState<number | string>(0);
  const [subscriptionMonths, setSubscriptionMonths] = useState("");
  const [recommendations, setRecommendations] = useState<any[]>([]);

  const isEditable = ["DRAFT", "NEGOTIATING", "REJECTED"].includes(quote.status);
  const lines = quote.lines || [];

  useEffect(() => {
    if (lines.length > 0) {
      fetch(`/api/quotes/${quote.id}/recommendations`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success) setRecommendations(data.data);
        })
        .catch(console.error);
    } else {
      setRecommendations([]);
    }
  }, [lines.length, quote.id]);

  const handleAddLine = async (e?: React.FormEvent, productData?: any) => {
    if (e) e.preventDefault();

    const pId = productData?.productId || selectedProductId;
    const rawQty = productData?.qty ?? qty;
    const numQty = typeof rawQty === "string" ? parseInt(rawQty, 10) || 1 : rawQty;
    const rawDiscount = productData?.discountPct ?? discountPct;
    const numDiscount = typeof rawDiscount === "string" ? (rawDiscount === "" ? 0 : parseFloat(rawDiscount) || 0) : rawDiscount;

    if (!pId || numQty < 1) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/quotes/${quote.id}/lines`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: pId,
          qty: numQty,
          discountPct: numDiscount,
          subscriptionMonths: subscriptionMonths ? parseInt(subscriptionMonths) : undefined,
        }),
      });

      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.message || "Failed to add line");

      setQuote((prev: any) => ({
        ...prev,
        ...body.data,
        lines: body.data.lines || prev.lines || [],
      }));
      setSelectedProductId("");
      setQty(1);
      setDiscountPct(0);
      setSubscriptionMonths("");
      router.refresh();
    } catch (err: any) {
      toast.error("Couldn’t add line", err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveLine = async (lineId: string) => {
    const ok = await toast.confirm({
      title: "Remove this line?",
      description: "The product will be removed from this quote.",
      confirmLabel: "Remove",
      destructive: true,
    });
    if (!ok) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/quotes/${quote.id}/lines?lineId=${lineId}`, {
        method: "DELETE",
      });

      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.message || "Failed to remove line");

      setQuote((prev: any) => ({
        ...prev,
        ...body.data,
        lines: body.data.lines || (prev.lines || []).filter((l: any) => l.id !== lineId),
      }));
      router.refresh();
    } catch (err: any) {
      toast.error("Couldn’t remove line", err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitQuote = async () => {
    const ok = await toast.confirm({
      title: "Submit for approval?",
      description: "Once submitted, the quote cannot be edited until it’s reviewed.",
      confirmLabel: "Submit",
    });
    if (!ok) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/quotes/${quote.id}/submit`, {
        method: "POST",
      });

      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.message || "Failed to submit quote");

      setQuote((prev: any) => ({
        ...prev,
        ...body.data.quote,
        lines: body.data.quote.lines || prev.lines || [],
      }));

      if (body.data.evaluation?.status === "REJECTED") {
        toast.warning("Auto-rejected", body.data.evaluation.reason);
      } else if (body.data.evaluation?.requiresApproval) {
        toast.info("Routed for approval", `Sent to ${body.data.evaluation.level}.`);
      } else {
        toast.success("Quote auto-approved");
      }

      router.refresh();
    } catch (err: any) {
      toast.error("Submission failed", err.message);
    } finally {
      setLoading(false);
    }
  };

  const selectedProduct = products.find((p) => p.id === selectedProductId);
  const isRecurring = selectedProduct?.billingType === "RECURRING";

  return (
    <div className={`${s.grid} ${s.animateFadeIn}`}>
      {/* Main Column */}
      <div className={s.mainCol}>
        {isEditable && (
          <div className={s.card}>
            <div className={s.cardHeader}>
              <h2 className={s.cardTitle}>Add a Product</h2>
            </div>
            <form onSubmit={handleAddLine} className={s.formGrid}>
              <div className={`${s.formGroup} ${s.colSpan2}`}>
                <label className={s.formLabel} htmlFor="product">Product</label>
                <div className={s.selectWrapper}>
                  <select
                    id="product"
                    className={s.formSelect}
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    required
                  >
                    <option value="">Select a product…</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.sku}) — ₹{Number(p.listPrice).toLocaleString()}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className={s.formGroup}>
                <label className={s.formLabel} htmlFor="qty">Quantity</label>
                <input
                  id="qty"
                  type="number"
                  min={1}
                  className={s.formInput}
                  value={qty}
                  onChange={(e) => {
                    const val = e.target.value;
                    setQty(val === "" ? "" : isNaN(Number(val)) ? "" : Number(val));
                  }}
                  required
                />
              </div>

              <div className={s.formGroup}>
                <label className={s.formLabel} htmlFor="disc">Discount %</label>
                <input
                  id="disc"
                  type="number"
                  min={0}
                  max={100}
                  step="0.01"
                  className={s.formInput}
                  value={discountPct}
                  onChange={(e) => {
                    const val = e.target.value;
                    setDiscountPct(val === "" ? "" : isNaN(Number(val)) ? "" : val);
                  }}
                />
              </div>

              {isRecurring && (
                <div className={`${s.formGroup} ${s.colSpan2}`}>
                  <label className={s.formLabel} htmlFor="months">Subscription Months</label>
                  <input
                    id="months"
                    type="number"
                    min={1}
                    placeholder="e.g. 12"
                    className={s.formInput}
                    value={subscriptionMonths}
                    onChange={(e) => setSubscriptionMonths(e.target.value)}
                    required
                  />
                </div>
              )}

              <div className={`${s.formActions} ${s.colSpan2}`}>
                <button type="submit" className={s.primaryBtn} disabled={loading || !selectedProductId}>
                  {loading ? <span className={s.spinner}>↻</span> : "Add Line"}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className={s.card} style={{ padding: 0, overflow: 'hidden' }}>
          <div className={s.cardHeader} style={{ padding: '1.25rem 1.5rem', marginBottom: 0 }}>
            <h2 className={s.cardTitle}>Line Items</h2>
            <span className={s.statusBadge} style={{ fontSize: '0.75rem', padding: '0.25rem 0.75rem' }}>
              {lines.length} Items
            </span>
          </div>
          {lines.length === 0 ? (
            <div className={s.emptyState}>
              No lines yet — add a product to start building the quote.
            </div>
          ) : (
            <div className={s.tableWrapper}>
              <table className={s.table}>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th style={{ textAlign: "right" }}>Qty</th>
                    <th style={{ textAlign: "right" }}>Unit Price</th>
                    <th style={{ textAlign: "right" }}>Disc %</th>
                    <th style={{ textAlign: "right" }}>Total</th>
                    {isEditable && <th style={{ textAlign: "right" }}></th>}
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line: any) => {
                    const isOverCeiling =
                      line.maxCategoryDiscount !== undefined &&
                      Number(line.discountPct) > Number(line.maxCategoryDiscount);
                    return (
                      <tr key={line.id}>
                        <td>
                          <div className={s.productName}>{line.product?.name || "Product"}</div>
                          <div className={s.productMeta}>
                            {line.product?.sku} · {line.billingType}
                          </div>
                        </td>
                        <td style={{ textAlign: "right", fontWeight: 500 }}>{line.qty}</td>
                        <td style={{ textAlign: "right", color: "#94a3b8" }}>
                          ₹{Number(line.unitPrice || 0).toLocaleString()}
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <span style={{ color: isOverCeiling ? "#fca5a5" : "#c4b5fd", fontWeight: 600 }}>
                            {Number(line.discountPct || 0)}%
                          </span>
                          {isOverCeiling && line.maxCategoryDiscount !== undefined && (
                            <div style={{ fontSize: "0.6875rem", color: "#f87171" }}>
                              Over {line.maxCategoryDiscount}% cap
                            </div>
                          )}
                        </td>
                        <td style={{ textAlign: "right", fontWeight: 700, color: "#f1f5f9" }}>
                          ₹{Number(line.lineTotal || 0).toLocaleString()}
                        </td>
                        {isEditable && (
                          <td style={{ textAlign: "right" }}>
                            <button
                              type="button"
                              className={s.dangerBtn}
                              onClick={() => handleRemoveLine(line.id)}
                              disabled={loading}
                              title="Remove"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Side Column */}
      <div className={s.sideCol}>
        <div className={s.card}>
          <div className={s.cardHeader}>
            <h2 className={s.cardTitle}>Quote Summary</h2>
          </div>

          <div className={s.summaryRow}>
            <span className={s.summaryLabel}>Subtotal</span>
            <span className={s.summaryValue}>₹{Number(quote.subtotal || 0).toLocaleString()}</span>
          </div>
          <div className={s.summaryRow}>
            <span className={s.summaryLabel}>Discount</span>
            <span className={s.summaryValueNegative}>-₹{Number(quote.discountTotal || 0).toLocaleString()}</span>
          </div>
          <div className={s.summaryRow}>
            <span className={s.summaryLabel}>Tax</span>
            <span className={s.summaryValue}>₹{Number(quote.taxTotal || 0).toLocaleString()}</span>
          </div>
          <div className={s.summaryDivider}></div>
          <div className={s.summaryGrandTotal}>
            <span>Grand Total</span>
            <span style={{ color: "#a78bfa" }}>₹{Number(quote.grandTotal || 0).toLocaleString()}</span>
          </div>

          <div style={{ marginTop: "1.5rem" }}>
            <div className={s.metricsHeader}>Deal Metrics</div>
            <div className={s.summaryRow}>
              <span className={s.summaryLabelMuted}>Total Cost</span>
              <span className={s.summaryValue}>₹{Number(quote.totalCost || 0).toLocaleString()}</span>
            </div>
            <div className={s.summaryRow}>
              <span className={s.summaryLabelMuted}>Margin</span>
              <span className={Number(quote.marginPct || 0) < 10 ? s.summaryValueNegative : s.summaryValuePositive}>
                {Number(quote.marginPct || 0).toFixed(2)}%
              </span>
            </div>
            <div className={s.summaryRow}>
              <span className={s.summaryLabelMuted}>Blended Disc.</span>
              <span className={s.summaryValue}>{Number(quote.blendedDiscountPct || 0).toFixed(2)}%</span>
            </div>
          </div>

          {isEditable && (
            <div style={{ marginTop: "1.5rem" }}>
              <button
                type="button"
                className={`${s.primaryBtn} ${s.primaryBtnFull}`}
                onClick={handleSubmitQuote}
                disabled={loading || lines.length === 0}
              >
                {loading ? <span className={s.spinner}>↻</span> : "Submit for Approval"}
              </button>
            </div>
          )}

          {quote.status === "APPROVED" && (
            <div style={{ marginTop: "1.5rem" }}>
              <button
                type="button"
                className={s.successBtn}
                onClick={async () => {
                  const ok = await toast.confirm({
                    title: "Convert this quote to an order?",
                    description: "Once confirmed, the order is binding.",
                    confirmLabel: "Convert to order",
                  });
                  if (!ok) return;
                  setLoading(true);
                  try {
                    const res = await fetch(`/api/quotes/${quote.id}/confirm`, { method: "POST" });
                    const body = await res.json();
                    if (!res.ok) throw new Error(body.error?.message || "Failed to confirm");
                    toast.success("Order created");
                    router.push("/dashboard/rep/quotes");
                    router.refresh();
                  } catch (err: any) {
                    toast.error("Conversion failed", err.message);
                    setLoading(false);
                  }
                }}
                disabled={loading}
              >
                {loading ? <span className={s.spinner}>↻</span> : "Confirm & Create Order"}
              </button>
            </div>
          )}

          {(quote.status === "APPROVED" || quote.status === "NEGOTIATING") && (
            <div style={{ marginTop: "1rem" }}>
              <button
                type="button"
                className={s.secondaryBtn}
                onClick={async () => {
                  setLoading(true);
                  try {
                    const res = await fetch(`/api/quotes/${quote.id}/portal-link`, { method: "POST" });
                    const body = await res.json();
                    if (!res.ok) throw new Error(body.error?.message || "Failed to generate link");
                    await navigator.clipboard.writeText(body.data.link);
                    toast.success("Portal link copied to clipboard");
                  } catch (err: any) {
                    toast.error("Couldn’t generate link", err.message);
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading}
              >
                Copy Portal Link
              </button>
            </div>
          )}
        </div>

        {/* Recommendations */}
        {isEditable && recommendations.length > 0 && (
          <div className={s.card}>
            <div className={s.cardHeader}>
              <h2 className={s.cardTitle}>
                <Sparkles size={18} style={{ color: "#a78bfa" }} /> Recommendations
              </h2>
            </div>
            <ul className={s.recList}>
              {recommendations.map((rec) => (
                <li key={rec.productId} className={s.recItem}>
                  <div className={s.recHeader}>
                    <span className={s.recName}>{rec.productName}</span>
                    <span className={s.recPrice}>₹{Number(rec.listPrice).toLocaleString()}</span>
                  </div>
                  <p className={s.recReason}>{rec.reason}</p>
                  <button
                    type="button"
                    className={s.secondaryBtn}
                    onClick={() => handleAddLine(undefined, { productId: rec.productId, qty: 1, discountPct: 0 })}
                    disabled={loading}
                  >
                    Add to Quote
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {quote.riskBreakdown && (
          <div className={s.card} style={{ padding: "1.25rem" }}>
            <RiskGauge score={quote.riskScore} breakdown={quote.riskBreakdown} />
          </div>
        )}
      </div>
    </div>
  );
}