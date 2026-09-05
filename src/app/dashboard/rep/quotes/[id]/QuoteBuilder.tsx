// src/app/dashboard/rep/quotes/[id]/QuoteBuilder.tsx  - 
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  Field,
  Input,
  Select,
  Textarea,
  Badge,
  RiskGauge,
  useToast,
} from "@/components/ui";
import { Sparkles } from "lucide-react";

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
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main */}
      <div className="lg:col-span-2 space-y-6">
        {isEditable && (
          <Card>
            <CardHeader>
              <CardTitle>Add a product</CardTitle>
            </CardHeader>
            <form onSubmit={handleAddLine} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Product" htmlFor="product" className="md:col-span-2">
                <Select
                  id="product"
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
                </Select>
              </Field>

              <Field label="Quantity" htmlFor="qty">
                <Input
                  id="qty"
                  type="number"
                  min={1}
                  value={qty}
                  onChange={(e) => {
                    const val = e.target.value;
                    setQty(val === "" ? "" : isNaN(Number(val)) ? "" : Number(val));
                  }}
                  required
                />
              </Field>

              <Field label="Discount %" htmlFor="disc">
                <Input
                  id="disc"
                  type="number"
                  min={0}
                  max={100}
                  step="0.01"
                  value={discountPct}
                  onChange={(e) => {
                    const val = e.target.value;
                    setDiscountPct(val === "" ? "" : isNaN(Number(val)) ? "" : val);
                  }}
                />
              </Field>

              {isRecurring && (
                <Field label="Subscription months" htmlFor="months" className="md:col-span-2">
                  <Input
                    id="months"
                    type="number"
                    min={1}
                    placeholder="e.g. 12"
                    value={subscriptionMonths}
                    onChange={(e) => setSubscriptionMonths(e.target.value)}
                    required
                  />
                </Field>
              )}

              <div className="md:col-span-2 flex justify-end">
                <Button type="submit" loading={loading} disabled={!selectedProductId}>
                  Add line
                </Button>
              </div>
            </form>
          </Card>
        )}

        <Card padded={false}>
          <div className="px-5 sm:px-6 py-4 border-b border-[var(--border)] flex items-center justify-between">
            <h3 className="text-base font-semibold tracking-tight">Line items</h3>
            <span className="text-xs text-[var(--muted-foreground)] tabular">{lines.length}</span>
          </div>
          {lines.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-[var(--muted-foreground)]">
              No lines yet — add a product to start.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm tabular">
                <thead className="text-[11px] uppercase tracking-wider text-[var(--muted-foreground)]">
                  <tr className="border-b border-[var(--border)]">
                    <th className="px-5 py-3 font-semibold">Product</th>
                    <th className="px-3 py-3 font-semibold text-right">Qty</th>
                    <th className="px-3 py-3 font-semibold text-right">Unit</th>
                    <th className="px-3 py-3 font-semibold text-right">Disc %</th>
                    <th className="px-3 py-3 font-semibold text-right">Total</th>
                    {isEditable && <th className="px-3 py-3 font-semibold text-right">{" "}</th>}
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line: any) => {
                    const isOverCeiling =
                      line.maxCategoryDiscount !== undefined &&
                      Number(line.discountPct) > Number(line.maxCategoryDiscount);
                    return (
                      <tr key={line.id} className="border-b border-[var(--border)] last:border-0">
                        <td className="px-5 py-3.5">
                          <p className="font-medium">{line.product?.name || "Product"}</p>
                          <p className="text-xs text-[var(--muted-foreground)]">
                            {line.product?.sku || ""} · {line.billingType}
                          </p>
                        </td>
                        <td className="px-3 py-3.5 text-right">{line.qty}</td>
                        <td className="px-3 py-3.5 text-right">
                          ₹{Number(line.unitPrice || 0).toLocaleString()}
                        </td>
                        <td className="px-3 py-3.5 text-right">
                          <span className={isOverCeiling ? "text-rose-400 font-semibold" : ""}>
                            {Number(line.discountPct || 0)}%
                          </span>
                          {isOverCeiling && line.maxCategoryDiscount !== undefined && (
                            <p className="text-[10px] text-rose-400/80">
                              over {line.maxCategoryDiscount}% cap
                            </p>
                          )}
                        </td>
                        <td className="px-3 py-3.5 text-right font-semibold">
                          ₹{Number(line.lineTotal || 0).toLocaleString()}
                        </td>
                        {isEditable && (
                          <td className="px-3 py-3.5 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveLine(line.id)}
                              disabled={loading}
                              className="text-rose-400 hover:text-rose-300"
                            >
                              Remove
                            </Button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {/* Sidebar */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Quote summary</CardTitle>
            <Badge tone={quote.status === "APPROVED" ? "approved" : quote.status === "REJECTED" ? "rejected" : quote.status === "PENDING_APPROVAL" ? "pending" : "info"}>
              {quote.status?.replace("_", " ") || "DRAFT"}
            </Badge>
          </CardHeader>

          <div className="space-y-2.5 text-sm tabular">
            <Row label="Subtotal" value={`₹${Number(quote.subtotal || 0).toLocaleString()}`} />
            <Row label="Discount" value={`-₹${Number(quote.discountTotal || 0).toLocaleString()}`} tone="negative" />
            <Row label="Tax" value={`₹${Number(quote.taxTotal || 0).toLocaleString()}`} />
            <div className="flex justify-between pt-3 mt-3 border-t border-[var(--border)] font-semibold text-base">
              <span>Grand total</span>
              <span>₹{Number(quote.grandTotal || 0).toLocaleString()}</span>
            </div>
          </div>

          <div className="mt-6 pt-5 border-t border-[var(--border)]">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mb-3">
              Deal metrics
            </p>
            <div className="space-y-2 text-sm tabular">
              <Row label="Total cost" value={`₹${Number(quote.totalCost || 0).toLocaleString()}`} muted />
              <Row
                label="Margin"
                value={`${Number(quote.marginPct || 0).toFixed(2)}%`}
                tone={Number(quote.marginPct || 0) < 10 ? "negative" : "positive"}
              />
              <Row label="Blended disc." value={`${Number(quote.blendedDiscountPct || 0).toFixed(2)}%`} />
            </div>
          </div>

          {isEditable && (
            <div className="mt-6 pt-5 border-t border-[var(--border)]">
              <Button
                className="w-full"
                onClick={handleSubmitQuote}
                loading={loading}
                disabled={lines.length === 0}
              >
                Submit for approval
              </Button>
            </div>
          )}

          {quote.status === "APPROVED" && (
            <div className="mt-4">
              <Button
                variant="success"
                className="w-full"
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
                loading={loading}
              >
                Confirm &amp; create order
              </Button>
            </div>
          )}

          {(quote.status === "APPROVED" || quote.status === "NEGOTIATING") && (
            <div className="mt-4">
              <Button
                variant="secondary"
                className="w-full"
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
                loading={loading}
              >
                Copy portal link
              </Button>
            </div>
          )}
        </Card>

        {/* Recommendations */}
        {isEditable && recommendations.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>
                <span className="inline-flex items-center gap-1.5">
                  <Sparkles size={14} className="text-[var(--primary-hover)]" /> Recommendations
                </span>
              </CardTitle>
            </CardHeader>
            <ul className="space-y-3">
              {recommendations.map((rec) => (
                <li key={rec.productId} className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="text-sm font-medium">{rec.productName}</span>
                    <span className="text-sm text-[var(--primary-hover)] font-semibold tabular">
                      ₹{Number(rec.listPrice).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--muted-foreground)] mb-3">{rec.reason}</p>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full"
                    onClick={() => handleAddLine(undefined, { productId: rec.productId, qty: 1, discountPct: 0 })}
                    loading={loading}
                  >
                    Add to quote
                  </Button>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {/* Risk preview, if backend provides one on quote load */}
        {quote.riskBreakdown && (
          <RiskGauge score={quote.riskScore} breakdown={quote.riskBreakdown} />
        )}
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  tone,
  muted,
}: {
  label: string;
  value: string;
  tone?: "positive" | "negative";
  muted?: boolean;
}) {
  const toneClass =
    tone === "negative" ? "text-rose-400" : tone === "positive" ? "text-emerald-400" : "";
  return (
    <div className="flex justify-between">
      <span className={muted ? "text-[var(--muted-foreground)]" : ""}>{label}</span>
      <span className={`font-medium ${toneClass}`}>{value}</span>
    </div>
  );
}