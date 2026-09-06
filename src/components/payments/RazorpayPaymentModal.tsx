"use client";

import { useState } from "react";
import { ShieldCheck, Lock, CreditCard, Smartphone, CheckCircle, X, AlertCircle } from "lucide-react";

interface RazorpayModalProps {
  open: boolean;
  onClose: () => void;
  orderData: {
    orderId: string;
    amount: number;
    currency: string;
    keyId: string;
    product: {
      id: string;
      name: string;
      listPrice: number;
      category: string;
    };
    user: {
      name: string;
      email: string;
    };
  };
  onSuccess: (paymentData: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature?: string;
  }) => void;
  onFailure: (errorMessage: string) => void;
}

export function RazorpayPaymentModal({
  open,
  onClose,
  orderData,
  onSuccess,
  onFailure,
}: RazorpayModalProps) {
  const [method, setMethod] = useState<"UPI" | "CARD" | "NETBANKING">("UPI");
  const [upiId, setUpiId] = useState("user@okhdfcbank");
  const [cardNumber, setCardNumber] = useState("4111 2222 3333 4444");
  const [expiry, setExpiry] = useState("12/28");
  const [cvv, setCvv] = useState("888");
  const [isProcessing, setIsProcessing] = useState(false);

  if (!open || !orderData) return null;

  const totalRupees = Math.round(orderData.amount / 100);

  const handleSubmitPayment = (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    setTimeout(() => {
      const generatedPaymentId = `pay_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
      setIsProcessing(false);
      onSuccess({
        razorpay_order_id: orderData.orderId,
        razorpay_payment_id: generatedPaymentId,
        razorpay_signature: `sig_${Date.now().toString(36)}`,
      });
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-[99999] bg-[#000000]/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#0f0f0f] border border-[rgba(255,255,255,0.2)] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Razorpay Top Header */}
        <div className="bg-[#171717] px-6 py-4 border-b border-[rgba(255,255,255,0.12)] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#ffffff] text-[#000000] font-black flex items-center justify-center text-sm shadow-md">
              R
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-sm text-[#ffffff] tracking-wider">RAZORPAY</span>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-[#2a2a2a] text-[#34d399] border border-[rgba(52,211,153,0.3)]">
                  SECURE
                </span>
              </div>
              <p className="text-[11px] text-[#888888]">DealFlow360 Enterprise Gateway</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="p-1.5 rounded-lg text-[#888888] hover:text-[#ffffff] hover:bg-[#252525] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Order Amount Bar */}
        <div className="bg-[#121212] px-6 py-3 border-b border-[rgba(255,255,255,0.08)] flex items-center justify-between text-xs">
          <div>
            <span className="text-[#777777] block">Subscribing to</span>
            <span className="font-bold text-[#ffffff] text-sm">{orderData.product.name}</span>
          </div>
          <div className="text-right">
            <span className="text-[#777777] block">Amount to Pay</span>
            <span className="font-extrabold text-[#ffffff] text-base">₹{totalRupees.toLocaleString()}</span>
          </div>
        </div>

        {/* Payment Form */}
        <form onSubmit={handleSubmitPayment} className="p-6 space-y-4">
          {/* Method Selection Tabs */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#888888] mb-2">
              Select Payment Method
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setMethod("UPI")}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex flex-col items-center gap-1 ${
                  method === "UPI"
                    ? "bg-[#222222] border-[#ffffff] text-[#ffffff]"
                    : "bg-[#141414] border-[rgba(255,255,255,0.1)] text-[#888888] hover:text-[#ffffff]"
                }`}
              >
                <Smartphone size={15} />
                <span>UPI / QR</span>
              </button>
              <button
                type="button"
                onClick={() => setMethod("CARD")}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex flex-col items-center gap-1 ${
                  method === "CARD"
                    ? "bg-[#222222] border-[#ffffff] text-[#ffffff]"
                    : "bg-[#141414] border-[rgba(255,255,255,0.1)] text-[#888888] hover:text-[#ffffff]"
                }`}
              >
                <CreditCard size={15} />
                <span>Card</span>
              </button>
              <button
                type="button"
                onClick={() => setMethod("NETBANKING")}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex flex-col items-center gap-1 ${
                  method === "NETBANKING"
                    ? "bg-[#222222] border-[#ffffff] text-[#ffffff]"
                    : "bg-[#141414] border-[rgba(255,255,255,0.1)] text-[#888888] hover:text-[#ffffff]"
                }`}
              >
                <ShieldCheck size={15} />
                <span>NetBanking</span>
              </button>
            </div>
          </div>

          {/* Dynamic input per method */}
          {method === "UPI" && (
            <div className="space-y-2 bg-[#141414] p-3.5 rounded-xl border border-[rgba(255,255,255,0.1)]">
              <label className="block text-xs font-semibold text-[#aaaaaa]">Virtual Payment Address (UPI ID)</label>
              <input
                type="text"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                placeholder="username@bank"
                required
                className="w-full px-3 py-2 rounded-lg bg-[#1f1f1f] border border-[rgba(255,255,255,0.15)] text-sm text-[#ffffff] font-mono focus:outline-none focus:border-[#ffffff]"
              />
              <p className="text-[10px] text-[#777777]">Supports Google Pay, PhonePe, Paytm, BHIM</p>
            </div>
          )}

          {method === "CARD" && (
            <div className="space-y-3 bg-[#141414] p-3.5 rounded-xl border border-[rgba(255,255,255,0.1)]">
              <div>
                <label className="block text-xs font-semibold text-[#aaaaaa] mb-1">Card Number</label>
                <input
                  type="text"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  placeholder="4111 2222 3333 4444"
                  required
                  className="w-full px-3 py-2 rounded-lg bg-[#1f1f1f] border border-[rgba(255,255,255,0.15)] text-sm text-[#ffffff] font-mono focus:outline-none focus:border-[#ffffff]"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-[#aaaaaa] mb-1">Valid Thru</label>
                  <input
                    type="text"
                    value={expiry}
                    onChange={(e) => setExpiry(e.target.value)}
                    placeholder="MM/YY"
                    required
                    className="w-full px-3 py-2 rounded-lg bg-[#1f1f1f] border border-[rgba(255,255,255,0.15)] text-sm text-[#ffffff] font-mono focus:outline-none focus:border-[#ffffff]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#aaaaaa] mb-1">CVV</label>
                  <input
                    type="password"
                    maxLength={4}
                    value={cvv}
                    onChange={(e) => setCvv(e.target.value)}
                    placeholder="123"
                    required
                    className="w-full px-3 py-2 rounded-lg bg-[#1f1f1f] border border-[rgba(255,255,255,0.15)] text-sm text-[#ffffff] font-mono focus:outline-none focus:border-[#ffffff]"
                  />
                </div>
              </div>
            </div>
          )}

          {method === "NETBANKING" && (
            <div className="space-y-2 bg-[#141414] p-3.5 rounded-xl border border-[rgba(255,255,255,0.1)]">
              <label className="block text-xs font-semibold text-[#aaaaaa]">Select Your Bank</label>
              <select className="w-full px-3 py-2 rounded-lg bg-[#1f1f1f] border border-[rgba(255,255,255,0.15)] text-sm text-[#ffffff] focus:outline-none focus:border-[#ffffff]">
                <option value="HDFC">HDFC Bank Corporate</option>
                <option value="ICICI">ICICI Bank Internet Banking</option>
                <option value="SBI">State Bank of India</option>
                <option value="AXIS">Axis Bank</option>
                <option value="KOTAK">Kotak Mahindra Bank</option>
              </select>
            </div>
          )}

          {/* Security details */}
          <div className="flex items-center justify-between text-[11px] text-[#777777] pt-1">
            <span className="flex items-center gap-1">
              <Lock size={12} /> 256-bit TLS Encrypted
            </span>
            <span>Razorpay SafeCheckout</span>
          </div>

          {/* Submit Action */}
          <button
            type="submit"
            disabled={isProcessing}
            className="w-full py-3 px-4 rounded-xl bg-[#ffffff] text-[#000000] font-extrabold text-sm hover:bg-[#e2e2e2] transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-60"
          >
            {isProcessing ? (
              <span>Authenticating with Bank...</span>
            ) : (
              <>
                <CheckCircle size={16} />
                <span>Pay ₹{totalRupees.toLocaleString()} &amp; Activate Plan</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
