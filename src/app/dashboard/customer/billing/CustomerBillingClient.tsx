"use client";

import { useState } from "react";
import {
  CreditCard,
  Receipt,
  Eye,
  CheckCircle,
  Plus,
  Ban,
  RotateCcw,
  Zap,
  ShoppingBag,
  Sparkles,
  ShieldCheck
} from "lucide-react";
import { InvoiceDetailModal } from "@/components/invoices/InvoiceDetailModal";
import { RazorpayPaymentModal } from "@/components/payments/RazorpayPaymentModal";
import { Modal, useToast } from "@/components/ui";
import styles from "../../dashboard.module.css";

interface CustomerBillingClientProps {
  invoices: any[];
  subscriptions: any[];
  recurringProducts?: any[];
}

export function CustomerBillingClient({
  invoices: initialInvoices,
  subscriptions: initialSubscriptions,
  recurringProducts = [],
}: CustomerBillingClientProps) {
  const toast = useToast();
  const [invoices, setInvoices] = useState(initialInvoices);
  const [subscriptions, setSubscriptions] = useState(initialSubscriptions);
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  const [isPaying, setIsPaying] = useState(false);

  // Subscriptions Modal State
  const [buyModalOpen, setBuyModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any | null>(
    recurringProducts.length > 0 ? recurringProducts[0] : null
  );
  const [autoPayEnabled, setAutoPayEnabled] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);

  // Razorpay Checkout Gateway Modal state
  const [razorpayOrderData, setRazorpayOrderData] = useState<any | null>(null);
  const [razorpayModalOpen, setRazorpayModalOpen] = useState(false);

  // AutoPay / Cancel processing state
  const [processingSubId, setProcessingSubId] = useState<string | null>(null);

  // 1. Pay Invoice Handler
  const handlePayInvoice = async (invoiceId: string) => {
    setIsPaying(true);
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentMethod: "CUSTOMER_PORTAL_INSTANT" }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Failed to process payment");
      }

      toast.success("Payment Received", "Invoice has been settled successfully.");
      setInvoices((prev) =>
        prev.map((inv) =>
          inv.id === invoiceId ? { ...inv, status: "PAID", paidAmount: inv.amount } : inv
        )
      );
      if (selectedInvoice && selectedInvoice.id === invoiceId) {
        setSelectedInvoice((prev: any) => ({ ...prev, status: "PAID", paidAmount: prev.amount }));
      }
    } catch (err: any) {
      toast.error("Payment Failed", err.message);
    } finally {
      setIsPaying(false);
    }
  };

  // 2. Toggle AutoPay Handler
  const handleToggleAutoPay = async (subId: string, currentAutoPay: boolean) => {
    setProcessingSubId(subId);
    try {
      const res = await fetch(`/api/subscriptions/${subId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ autoPayEnabled: !currentAutoPay }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Failed to update AutoPay");
      }
      toast.success(
        currentAutoPay ? "Auto-Pay Disabled" : "Auto-Pay Enabled",
        `Subscription will ${!currentAutoPay ? "automatically renew" : "require manual invoice payment"}.`
      );
      setSubscriptions((prev) =>
        prev.map((s) => (s.id === subId ? { ...s, autoPayEnabled: !currentAutoPay } : s))
      );
    } catch (err: any) {
      toast.error("Update Error", err.message);
    } finally {
      setProcessingSubId(null);
    }
  };

  // 3. Cancel / Reactivate Subscription Handler
  const handleSubscriptionAction = async (subId: string, action: "CANCEL" | "REACTIVATE") => {
    if (action === "CANCEL") {
      const ok = await toast.confirm({
        title: "Cancel Recurring Subscription?",
        description: "Your service will remain active until the end of the current billing cycle.",
        confirmLabel: "Cancel Subscription",
      });
      if (!ok) return;
    }

    setProcessingSubId(subId);
    try {
      const res = await fetch(`/api/subscriptions/${subId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || `Failed to ${action.toLowerCase()} subscription`);
      }
      toast.success(
        action === "CANCEL" ? "Subscription Cancelled" : "Subscription Reactivated",
        data.message
      );
      setSubscriptions((prev) =>
        prev.map((s) => (s.id === subId ? { ...s, status: action === "CANCEL" ? "CANCELLED" : "ACTIVE" } : s))
      );
    } catch (err: any) {
      toast.error("Action Failed", err.message);
    } finally {
      setProcessingSubId(null);
    }
  };

  // Load Razorpay script dynamically if needed
  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (typeof window !== "undefined" && (window as any).Razorpay) {
        return resolve(true);
      }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  // Step 2: Handle Successful Razorpay Payment and verify on server
  const handleRazorpaySuccess = async (paymentResponse: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature?: string;
  }) => {
    setIsPurchasing(true);
    const targetProduct = selectedProduct || razorpayOrderData?.product;
    if (!targetProduct?.id) {
      toast.error("Error", "Product information missing for payment verification");
      setIsPurchasing(false);
      return;
    }

    try {
      // Server-side verification — plan ONLY enables if successful
      const verifyRes = await fetch("/api/payments/razorpay/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          razorpay_order_id: paymentResponse.razorpay_order_id,
          razorpay_payment_id: paymentResponse.razorpay_payment_id,
          razorpay_signature: paymentResponse.razorpay_signature,
          productId: targetProduct.id,
          autoPayEnabled,
        }),
      });

      const verifyData = await verifyRes.json();
      if (!verifyRes.ok || !verifyData.success) {
        throw new Error(verifyData.error?.message || "Payment verification failed");
      }

      toast.success(
        "Payment Received & Plan Activated",
        `Payment ID: ${paymentResponse.razorpay_payment_id}. Your ${targetProduct.name} subscription is now active!`
      );

      if (verifyData.data?.subscription) {
        setSubscriptions((prev) => [verifyData.data.subscription, ...prev]);
      }
      if (verifyData.data?.invoice) {
        setInvoices((prev) => [verifyData.data.invoice, ...prev]);
      }

      setRazorpayModalOpen(false);
      setBuyModalOpen(false);
      setSelectedProduct(null);
    } catch (verErr: any) {
      toast.error("Activation Failed", verErr.message);
    } finally {
      setIsPurchasing(false);
    }
  };

  // Core Razorpay checkout executor
  const triggerRazorpayCheckout = async (orderPayload: any, prod: any) => {
    const { orderId, amount, keyId, isMock = false } = orderPayload;
    const orderIsMock = isMock || !orderId || String(orderId).startsWith("order_mock_");
    const keyLooksReal =
      !!keyId &&
      (keyId.startsWith("rzp_test_") || keyId.startsWith("rzp_live_")) &&
      !keyId.includes("Mock") &&
      !keyId.includes("PLACEHOLDER");

    // Use the real Razorpay SDK only when we have BOTH a real-looking key
    // AND a non-mock order id from the server. Otherwise fall back to the
    // embedded high-fidelity modal so demos never silently fail.
    if (!orderIsMock && keyLooksReal && typeof window !== "undefined" && (window as any).Razorpay) {
      try {
        await loadRazorpayScript();
        const options = {
          key: keyId,
          amount: amount,
          currency: "INR",
          name: "DealFlow 360",
          description: `Subscription: ${prod.name}`,
          order_id: orderId,
          prefill: {
            name: orderPayload?.user?.name || "Customer",
            email: orderPayload?.user?.email || "customer@dealflow.com",
          },
          theme: { color: "#000000" },
          handler: function (response: any) {
            handleRazorpaySuccess({
              razorpay_order_id: response.razorpay_order_id || orderId,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
          },
          modal: {
            ondismiss: function () {
              setIsPurchasing(false);
              toast.info("Payment Cancelled", "Plan was not activated because checkout was closed.");
            },
          },
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.on("payment.failed", function (resp: any) {
          setIsPurchasing(false);
          toast.error("Payment Failed", resp.error?.description || "Transaction failed.");
        });
        rzp.open();
        return;
      } catch (sdkErr) {
        console.warn("Razorpay SDK launch warning, falling back to embedded checkout:", sdkErr);
      }
    }

    // High-fidelity embedded Razorpay Gateway Modal
    setRazorpayOrderData({
      ...orderPayload,
      product: {
        id: prod.id,
        name: prod.name,
        listPrice: Number(prod.listPrice),
        category: prod.category,
      },
    });
    setBuyModalOpen(false);
    setRazorpayModalOpen(true);
  };

  // 4. Razorpay-Powered Subscription Purchasing Handler
  const handleBuySubscription = async () => {
    if (!selectedProduct) return;
    setIsPurchasing(true);

    try {
      const orderRes = await fetch("/api/payments/razorpay/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: selectedProduct.id }),
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok || !orderData.success) {
        throw new Error(orderData.error?.message || "Failed to initiate Razorpay order");
      }

      setBuyModalOpen(false);
      await triggerRazorpayCheckout(orderData.data, selectedProduct);
    } catch (err: any) {
      toast.error("Payment Error", err.message);
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleStartSubscribe = (productToSubscribe?: any) => {
    const prod = productToSubscribe || selectedProduct || (recurringProducts.length > 0 ? recurringProducts[0] : null);
    if (!prod) {
      toast.error("No Plan Selected", "No subscription plans available at the moment.");
      return;
    }
    setSelectedProduct(prod);

    setIsPurchasing(true);
    fetch("/api/payments/razorpay/create-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: prod.id }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (!data.success) throw new Error(data.error?.message || "Failed to initiate Razorpay");
        setBuyModalOpen(false);
        triggerRazorpayCheckout(data.data, prod);
      })
      .catch((err) => {
        toast.error("Gateway Error", err.message);
      })
      .finally(() => {
        setIsPurchasing(false);
      });
  };

  return (
    <div className="space-y-6">
      {/* Active Subscriptions Card */}
      <div className={`${styles.card} p-6`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <div>
            <h2 className="text-lg font-bold text-[#ffffff] flex items-center gap-2">
              <CreditCard size={20} className="text-[#ffffff]" />
              Recurring Subscriptions &amp; Auto-Pay
            </h2>
            <p className="text-xs text-[#888888] mt-0.5">
              Manage automatic renewal, recurring billing cycles, and on-demand plan subscriptions
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleStartSubscribe()}
              disabled={isPurchasing}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#ffffff] text-[#000000] text-xs font-bold hover:bg-[#e0e0e0] transition-all disabled:opacity-50"
            >
              <Plus size={14} strokeWidth={2.5} />
              <span>{isPurchasing ? "Opening Razorpay..." : "Subscribe to Plan"}</span>
            </button>
            <button
              onClick={() => setBuyModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#1f1f1f] text-[#ffffff] text-xs font-semibold hover:bg-[#2c2c2c] border border-[rgba(255,255,255,0.15)] transition-all"
            >
              <span>Browse All Plans</span>
            </button>
          </div>
        </div>

        {subscriptions.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {subscriptions.map((s) => {
              const productName =
                s.lines?.[0]?.quoteLine?.product?.name ||
                s.plan?.name ||
                "Enterprise Recurring Plan";
              const monthlyAmount =
                s.lines?.[0]?.monthlyAmount || s.plan?.price || 0;
              const isCancelled = s.status === "CANCELLED";

              return (
                <div
                  key={s.id}
                  className={`p-5 rounded-2xl bg-[#141414] border transition-all flex flex-col justify-between ${
                    isCancelled
                      ? "border-[rgba(255,255,255,0.08)] opacity-60"
                      : "border-[rgba(255,255,255,0.16)] hover:border-[rgba(255,255,255,0.3)] shadow-lg"
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div>
                        <span className="text-xs font-bold text-[#888888] uppercase tracking-wider block">
                          Recurring Plan
                        </span>
                        <h3 className="font-bold text-base text-[#ffffff]">{productName}</h3>
                      </div>
                      <span
                        className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider border ${
                          s.status === "ACTIVE"
                            ? "bg-[rgba(16,185,129,0.15)] text-[#34d399] border-[rgba(16,185,129,0.3)]"
                            : "bg-[rgba(239,68,68,0.15)] text-[#f87171] border-[rgba(239,68,68,0.3)]"
                        }`}
                      >
                        {s.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 py-3 border-y border-[rgba(255,255,255,0.08)] text-xs">
                      <div>
                        <span className="text-[#777777] block">Monthly Rate</span>
                        <span className="text-[#ffffff] font-bold">
                          ₹{Number(monthlyAmount).toLocaleString()} / mo
                        </span>
                      </div>
                      <div>
                        <span className="text-[#777777] block">Next Billing</span>
                        <span className="text-[#ffffff] font-medium">
                          {s.nextBillingDate ? new Date(s.nextBillingDate).toLocaleDateString() : "Active Cycle"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions & AutoPay Toggle */}
                  <div className="mt-4 pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    {/* AutoPay Pill Button */}
                    <button
                      onClick={() => handleToggleAutoPay(s.id, s.autoPayEnabled)}
                      disabled={isCancelled || processingSubId === s.id}
                      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all ${
                        s.autoPayEnabled
                          ? "bg-[rgba(255,255,255,0.12)] border-[rgba(255,255,255,0.3)] text-[#ffffff] font-bold"
                          : "bg-[#1c1c1c] border-[rgba(255,255,255,0.12)] text-[#888888]"
                      } disabled:opacity-50`}
                      title="Toggle automated card / treasury charge"
                    >
                      <Zap
                        size={13}
                        className={s.autoPayEnabled ? "text-[#ffffff] fill-white" : "text-[#777777]"}
                      />
                      <span>AutoPay: {s.autoPayEnabled ? "Enabled" : "Disabled"}</span>
                    </button>

                    {/* Cancel or Reactivate button */}
                    {isCancelled ? (
                      <button
                        onClick={() => handleSubscriptionAction(s.id, "REACTIVATE")}
                        disabled={processingSubId === s.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#222222] hover:bg-[#333333] text-[#ffffff] font-semibold border border-[rgba(255,255,255,0.15)] transition-colors"
                      >
                        <RotateCcw size={12} />
                        <span>Reactivate</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleSubscriptionAction(s.id, "CANCEL")}
                        disabled={processingSubId === s.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1a1a1a] hover:bg-[#252525] text-[#888888] hover:text-[#f87171] border border-[rgba(255,255,255,0.1)] transition-colors"
                      >
                        <Ban size={12} />
                        <span>Cancel Plan</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 rounded-2xl bg-[#121212] border border-[rgba(255,255,255,0.08)] text-center">
            <ShoppingBag size={32} className="mx-auto text-[#666666] mb-2" />
            <p className="text-sm font-semibold text-[#ffffff]">No active subscriptions found</p>
            <p className="text-xs text-[#777777] mt-1 max-w-sm mx-auto">
              Subscribe to enterprise software suites, cloud storage, or priority SLAs directly from our catalog.
            </p>
            <button
              onClick={() => handleStartSubscribe()}
              className="mt-4 px-4 py-2 rounded-xl bg-[#ffffff] text-[#000000] text-xs font-bold hover:bg-[#e0e0e0] transition-colors inline-flex items-center gap-2"
            >
              <Plus size={14} />
              <span>Subscribe via Razorpay</span>
            </button>
          </div>
        )}
      </div>

      {/* Invoices & Receipts Card */}
      <div className={`${styles.card} p-6`}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-[#ffffff] flex items-center gap-2">
              <Receipt size={20} className="text-[#ffffff]" />
              Invoices &amp; Certified Receipts
            </h2>
            <p className="text-xs text-[#888888] mt-0.5">
              Official digital tax invoices, payment settlement records, and PDF exports
            </p>
          </div>
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-[#181818] border border-[rgba(255,255,255,0.15)] text-[#ffffff]">
            {invoices.length} Documents
          </span>
        </div>

        {invoices.length > 0 ? (
          <div className="overflow-x-auto rounded-xl border border-[rgba(255,255,255,0.12)]">
            <table className="w-full text-left text-sm bg-[#111111]">
              <thead>
                <tr className="border-b border-[rgba(255,255,255,0.12)] text-[#888888] text-xs uppercase tracking-wider bg-[#161616]">
                  <th className="py-3 px-4">Invoice Number</th>
                  <th className="py-3 px-4">Issued Date</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgba(255,255,255,0.06)] text-[#ffffff]">
                {invoices.map((inv) => {
                  const isPaid = inv.status === "PAID";
                  const isCancelled = inv.status === "CANCELLED";

                  return (
                    <tr key={inv.id} className="hover:bg-[rgba(255,255,255,0.03)] transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-[#ffffff]">{inv.invoiceNumber}</td>
                      <td className="py-3.5 px-4 text-xs text-[#aaaaaa]">{new Date(inv.issuedAt).toLocaleDateString()}</td>
                      <td className="py-3.5 px-4 text-xs text-[#aaaaaa]">{new Date(inv.dueAt).toLocaleDateString()}</td>
                      <td className="py-3.5 px-4">
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-[#1e1e1e] border border-[rgba(255,255,255,0.1)] text-[#bbbbbb]">
                          {inv.invoiceType || "ONE_TIME"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider border ${
                            isPaid
                              ? "bg-[rgba(16,185,129,0.15)] text-[#34d399] border-[rgba(16,185,129,0.3)]"
                              : isCancelled
                              ? "bg-[rgba(239,68,68,0.15)] text-[#f87171] border-[rgba(239,68,68,0.3)]"
                              : "bg-[rgba(245,158,11,0.15)] text-[#fcd34d] border-[rgba(245,158,11,0.3)]"
                          }`}
                        >
                          {inv.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-[#ffffff]">
                        ₹{Number(inv.amount).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-2 justify-end">
                          {!isPaid && !isCancelled && (
                            <button
                              onClick={() => handlePayInvoice(inv.id)}
                              disabled={isPaying}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#ffffff] text-[#000000] text-xs font-bold hover:bg-[#e0e0e0] transition-colors disabled:opacity-50"
                            >
                              <CheckCircle size={13} />
                              <span>Settle</span>
                            </button>
                          )}
                          <button
                            onClick={() => setSelectedInvoice(inv)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#202020] text-[#ffffff] text-xs font-semibold hover:bg-[#2e2e2e] border border-[rgba(255,255,255,0.15)] transition-colors"
                          >
                            <Eye size={13} />
                            <span>View</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-[#888888] py-8 text-center">No invoices have been issued to your account yet.</p>
        )}
      </div>

      {/* Buy Subscription Modal */}
      <Modal
        open={buyModalOpen}
        onClose={() => setBuyModalOpen(false)}
        title="Subscribe to Recurring Service"
        description="Choose a recurring software, cloud, or enterprise plan. Your subscription will activate instantly."
        size="lg"
      >
        <div className="space-y-5 text-[#ffffff]">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#888888] mb-2">
              Select Recurring Plan
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-1">
              {recurringProducts.map((p) => {
                const isSelected = selectedProduct?.id === p.id;
                return (
                  <div
                    key={p.id}
                    onClick={() => setSelectedProduct(p)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? "bg-[#1f1f1f] border-[#ffffff] shadow-md"
                        : "bg-[#141414] border-[rgba(255,255,255,0.12)] hover:border-[rgba(255,255,255,0.25)]"
                    }`}
                  >
                    <div className="flex justify-between items-start gap-1">
                      <h4 className="font-bold text-sm text-[#ffffff]">{p.name}</h4>
                      <span className="text-xs font-extrabold text-[#ffffff]">
                        ₹{Number(p.listPrice).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#777777] mt-1">{p.category} &middot; Monthly billing</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* AutoPay checkbox option */}
          <div className="p-4 rounded-xl bg-[#141414] border border-[rgba(255,255,255,0.12)] flex items-start gap-3">
            <input
              type="checkbox"
              id="autopay-option"
              checked={autoPayEnabled}
              onChange={(e) => setAutoPayEnabled(e.target.checked)}
              className="mt-1 w-4 h-4 rounded bg-[#222222] border-gray-600 text-white focus:ring-0 cursor-pointer"
            />
            <label htmlFor="autopay-option" className="cursor-pointer">
              <span className="text-sm font-bold text-[#ffffff] flex items-center gap-1.5">
                <Zap size={14} />
                Enable Auto-Pay (Recommended)
              </span>
              <p className="text-xs text-[#888888] mt-0.5 leading-relaxed">
                Automatically generate and settle monthly renewal invoices. You can toggle or cancel auto-pay anytime.
              </p>
            </label>
          </div>

          {/* Pricing summary */}
          {selectedProduct && (
            <div className="p-4 rounded-xl bg-[#181818] border border-[rgba(255,255,255,0.1)] flex items-center justify-between">
              <div>
                <span className="text-xs text-[#888888] block">Due Today</span>
                <span className="text-base font-extrabold text-[#ffffff]">
                  ₹{Number(selectedProduct.listPrice).toLocaleString()}
                </span>
              </div>
              <button
                onClick={handleBuySubscription}
                disabled={isPurchasing}
                className="px-5 py-2.5 rounded-xl bg-[#ffffff] text-[#000000] text-xs font-bold hover:bg-[#e2e2e2] transition-colors disabled:opacity-50 inline-flex items-center gap-2"
              >
                {isPurchasing ? (
                  <span>Processing Razorpay...</span>
                ) : (
                  <>
                    <ShieldCheck size={15} />
                    <span>Pay with Razorpay &amp; Subscribe</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </Modal>

      {/* Interactive Invoice Modal */}
      {selectedInvoice && (
        <InvoiceDetailModal
          invoice={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
          onMarkPaid={handlePayInvoice}
          isPaying={isPaying}
          canPay={true}
        />
      )}

      {/* Razorpay Gateway Payment Modal */}
      {razorpayModalOpen && razorpayOrderData && (
        <RazorpayPaymentModal
          open={razorpayModalOpen}
          onClose={() => setRazorpayModalOpen(false)}
          orderData={razorpayOrderData}
          onSuccess={handleRazorpaySuccess}
          onFailure={(err) => toast.error("Razorpay Error", err)}
        />
      )}
    </div>
  );
}
