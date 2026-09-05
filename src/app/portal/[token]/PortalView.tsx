"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui";
import s from "./portal-view.module.css";

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "#94a3b8",
  PENDING_APPROVAL: "#fbbf24",
  APPROVED: "#34d399",
  REJECTED: "#f87171",
  NEGOTIATING: "#60a5fa",
  CONFIRMED: "#a78bfa",
  CANCELLED: "#64748b",
};

export default function PortalView({ quote, token }: { quote: any; token: string }) {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [counterOfferText, setCounterOfferText] = useState("");
  const [isCountering, setIsCountering] = useState(false);

  const isApproved = quote.status === "APPROVED";
  const isNegotiating = quote.status === "NEGOTIATING";
  const isConfirmed = quote.status === "CONFIRMED";
  const isPending = quote.status === "PENDING_APPROVAL";
  const isDraft = quote.status === "DRAFT";
  const isRejected = quote.status === "REJECTED";

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

  return (
    <div className={s.layout}>
      {/* Left column */}
      <div className={s.leftCol}>
        {/* Quote Header Card */}
        <div className={`${s.card} ${s.animateFadeIn}`}>
          <div className={s.cardHeader}>
            <div>
              <h2 className={s.cardTitle}>Quote {quote.quoteNumber}</h2>
              <p className={s.cardMeta}>
                {quote.customer.companyName} &middot; {new Date(quote.updatedAt).toLocaleDateString()}
              </p>
            </div>
            <span
              className={s.statusBadge}
              style={{ color: STATUS_COLORS[quote.status] || "#94a3b8", borderColor: STATUS_COLORS[quote.status] || "#94a3b8", backgroundColor: `${STATUS_COLORS[quote.status] || "#94a3b8"}15` }}
            >
              {quote.status.replace("_", " ")}
            </span>
          </div>

          {error && (
            <div className={s.errorBox}>
              {error}
            </div>
          )}

          {/* Products Table */}
          <div className={s.tableSection}>
            <h3 className={s.tableTitle}>Products &amp; Services</h3>
            <div className={s.tableWrap}>
              <table className={s.table}>
                <thead>
                  <tr>
                    <th>Item</th>
                    <th className={s.alignRight}>Qty</th>
                    <th className={s.alignRight}>Unit Price</th>
                    <th className={s.alignRight}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {quote.lines.map((line: any) => (
                    <tr key={line.id}>
                      <td>
                        <div className={s.itemName}>{line.product.name}</div>
                        <div className={s.itemSku}>{line.product.sku}</div>
                      </td>
                      <td className={s.alignRight}>{line.qty}</td>
                      <td className={s.alignRight}>
                        <div>{quote.currency} {Number(line.unitPrice).toLocaleString()}</div>
                        {Number(line.discountPct) > 0 && (
                          <div className={s.discountNote}>
                            −{Number(line.discountPct).toFixed(1)}% applied
                          </div>
                        )}
                      </td>
                      <td className={`${s.alignRight} ${s.totalCell}`}>
                        {quote.currency} {Number(line.lineTotal).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Discussion */}
        {quote.negotiationComments.length > 0 && (
          <div className={`${s.card} ${s.animateFadeIn}`} id="discussion">
            <h3 className={s.cardTitle}>Discussion</h3>
            <div className={s.discussionList}>
              {quote.negotiationComments.map((comment: any) => (
                <div
                  key={comment.id}
                  className={`${s.commentBubble} ${comment.actorId ? s.commentRep : s.commentCustomer}`}
                >
                  <div className={s.commentMeta}>
                    <span className={s.commentAuthor}>
                      {comment.actorId ? quote.owner.name : quote.customer.contactName}
                    </span>
                    <span className={s.commentTime}>
                      {new Date(comment.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className={s.commentText}>{comment.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Status Banner */}
        {isNegotiating && (
          <div className={`${s.card} ${s.statusBannerNegotiating} ${s.animateFadeIn}`}>
            <div className={s.statusBannerIcon}>⏳</div>
            <div>
              <p className={s.statusBannerTitle}>Your request is being reviewed</p>
              <p className={s.statusBannerText}>The sales team will be in touch shortly.</p>
            </div>
          </div>
        )}

        {isConfirmed && (
          <div className={`${s.card} ${s.statusBannerConfirmed} ${s.animateFadeIn}`}>
            <div className={s.statusBannerIcon}>✅</div>
            <div>
              <p className={s.statusBannerTitle}>Order confirmed</p>
              <p className={s.statusBannerText}>This order has been placed successfully.</p>
            </div>
          </div>
        )}

        {isPending && (
          <div className={`${s.card} ${s.statusBannerPending} ${s.animateFadeIn}`}>
            <div className={s.statusBannerIcon}>⏳</div>
            <div>
              <p className={s.statusBannerTitle}>Awaiting approval</p>
              <p className={s.statusBannerText}>This quote is pending internal approval.</p>
            </div>
          </div>
        )}

        {isDraft && (
          <div className={`${s.card} ${s.statusBannerDraft} ${s.animateFadeIn}`}>
            <div className={s.statusBannerIcon}>📝</div>
            <div>
              <p className={s.statusBannerTitle}>Quote in draft</p>
              <p className={s.statusBannerText}>Your sales rep is still working on this quote.</p>
            </div>
          </div>
        )}

        {isRejected && (
          <div className={`${s.card} ${s.statusBannerRejected} ${s.animateFadeIn}`}>
            <div className={s.statusBannerIcon}>❌</div>
            <div>
              <p className={s.statusBannerTitle}>Quote rejected</p>
              <p className={s.statusBannerText}>Please contact your sales rep for more information.</p>
            </div>
          </div>
        )}
      </div>

      {/* Right column — sticky summary */}
      <div className={s.rightCol}>
        <div className={`${s.card} ${s.summaryCard} ${s.animateFadeIn}`}>
          <h3 className={s.cardTitle}>Order Summary</h3>

          <div className={s.summaryRows}>
            <div className={s.summaryRow}>
              <span>Subtotal</span>
              <span>{quote.currency} {Number(quote.subtotal).toLocaleString()}</span>
            </div>
            {Number(quote.discountTotal) > 0 && (
              <div className={`${s.summaryRow} ${s.summaryRowDiscount}`}>
                <span>Discount</span>
                <span>−{quote.currency} {Number(quote.discountTotal).toLocaleString()}</span>
              </div>
            )}
            <div className={s.summaryRow}>
              <span>Tax</span>
              <span>{quote.currency} {Number(quote.taxTotal).toLocaleString()}</span>
            </div>
          </div>

          <div className={s.summaryTotal}>
            <span>Total</span>
            <span className={s.grandTotal}>
              {quote.currency} {Number(quote.grandTotal).toLocaleString()}
            </span>
          </div>

          {isApproved && !isCountering && (
            <div className={s.actionButtons}>
              <button
                className={s.btnPrimary}
                onClick={handleConfirm}
                disabled={loading}
              >
                {loading ? "Processing..." : "Accept & confirm order"}
              </button>
              <button
                className={s.btnSecondary}
                onClick={() => setIsCountering(true)}
                disabled={loading}
              >
                Request changes
              </button>
            </div>
          )}

          {isCountering && (
            <form onSubmit={handleCounterOffer} className={s.negotiateForm}>
              <label className={s.negotiateLabel}>
                What would you like to negotiate?
              </label>
              <textarea
                className={s.negotiateTextarea}
                value={counterOfferText}
                onChange={(e) => setCounterOfferText(e.target.value)}
                placeholder="Tell us what you'd like to discuss…"
                rows={4}
              />
              <div className={s.negotiateActions}>
                <button
                  type="button"
                  className={s.btnGhost}
                  onClick={() => setIsCountering(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={s.btnPrimary}
                  disabled={!counterOfferText.trim() || loading}
                >
                  {loading ? "Sending..." : "Send request"}
                </button>
              </div>
            </form>
          )}

          {!["APPROVED", "NEGOTIATING", "CONFIRMED"].includes(quote.status) && (
            <div className={s.inactiveNote}>
              This quote is not currently actionable.
            </div>
          )}
        </div>

        {/* Contact Sales */}
        <div className={`${s.card} ${s.contactCard} ${s.animateFadeIn}`}>
          <p className={s.contactLabel}>Your sales representative</p>
          <div className={s.contactPerson}>
            <div className={s.contactAvatar}>
              {quote.owner.name?.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className={s.contactName}>{quote.owner.name}</p>
              <p className={s.contactEmail}>{quote.owner.email}</p>
            </div>
          </div>
          <a href={`mailto:${quote.owner.email}`} className={s.contactBtn}>
            Send a message
          </a>
        </div>
      </div>
    </div>
  );
}
