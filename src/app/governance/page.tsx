"use client";

import { useState, useEffect } from "react";
import { NavigationHeader } from "@/components/NavigationHeader";
import { 
  ShieldCheck, 
  Sliders, 
  CheckCircle2, 
  AlertTriangle, 
  Save, 
  Calculator, 
  Info, 
  ArrowRight,
  Sparkles
} from "lucide-react";

export default function GovernancePage() {
  const [tiers, setTiers] = useState<any[]>([]);
  const [categoryRules, setCategoryRules] = useState<any[]>([]);
  const [approvalRules, setApprovalRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Simulator state
  const [simCustomerTier, setSimCustomerTier] = useState("GOLD");
  const [simCategoryId, setSimCategoryId] = useState("");
  const [simAppliedDiscount, setSimAppliedDiscount] = useState("18.0");
  const [simUnitPrice, setSimUnitPrice] = useState("500.0");
  const [simQty, setSimQty] = useState("1");

  const fetchData = async () => {
    try {
      setLoading(true);
      const [tRes, cRes, aRes] = await Promise.all([
        fetch("/api/governance/tiers"),
        fetch("/api/governance/categories"),
        fetch("/api/governance/rules"),
      ]);

      const tData = await tRes.json();
      const cData = await cRes.json();
      const aData = await aRes.json();

      if (tData.success) setTiers(tData.data);
      if (cData.success) {
        setCategoryRules(cData.data);
        if (cData.data.length > 0 && !simCategoryId) {
          setSimCategoryId(cData.data[0].categoryId);
        }
      }
      if (aData.success) setApprovalRules(aData.data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUpdateTier = async (customerTier: string, maxDiscount: string) => {
    try {
      setSaving(true);
      setMessage(null);
      const res = await fetch("/api/governance/tiers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerTier, maximumDiscount: parseFloat(maxDiscount) }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ text: `${customerTier} tier ceiling updated to ${maxDiscount}%`, type: "success" });
        fetchData();
      } else {
        setMessage({ text: data.error?.message || "Failed to update tier.", type: "error" });
      }
    } catch (err: any) {
      setMessage({ text: err.message, type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateCategoryCeiling = async (categoryId: string, maxDiscount: string) => {
    try {
      setSaving(true);
      setMessage(null);
      const res = await fetch("/api/governance/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryId, maximumDiscount: parseFloat(maxDiscount) }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ text: "Category discount ceiling updated!", type: "success" });
        fetchData();
      } else {
        setMessage({ text: data.error?.message || "Failed to update category rule.", type: "error" });
      }
    } catch (err: any) {
      setMessage({ text: err.message, type: "error" });
    } finally {
      setSaving(false);
    }
  };

  // ─── Live Simulator Computation (Section 13 Algorithm) ─────────────────────
  const tierObj = tiers.find((t) => t.customerTier === simCustomerTier);
  const tierCeiling = tierObj ? Number(tierObj.maximumDiscount) : 15.0;

  const catRuleObj = categoryRules.find((c) => c.categoryId === simCategoryId);
  const catCeiling = catRuleObj ? Number(catRuleObj.maximumDiscount) : 10.0;
  const catName = catRuleObj?.category?.name || "Selected Category";

  const appliedDiscount = parseFloat(simAppliedDiscount) || 0;
  const unitPrice = parseFloat(simUnitPrice) || 0;
  const qty = parseInt(simQty) || 1;

  // Stricter wins: allowedDiscount = min(tierCeiling, categoryCeiling)
  const allowedDiscount = Math.min(tierCeiling, catCeiling);
  const lineExcess = Math.max(0, appliedDiscount - allowedDiscount);

  const lineSubtotal = unitPrice * qty;
  const lineTotal = lineSubtotal * (1 - appliedDiscount / 100);
  const weightedViolation = lineExcess; // for single line test

  let simLevel = "NONE";
  if (weightedViolation > 0) {
    if (weightedViolation <= 25) {
      simLevel = "MANAGER";
    } else {
      simLevel = "FINANCE";
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <NavigationHeader />

      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <ShieldCheck className="h-4 w-4" />
            <span>Person 2 Responsibility</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Discount Governance & Ceilings</h1>
          <p className="text-slate-400 text-sm mt-1">
            Configure multi-tier discount boundaries, category caps, and the blended risk engine rules.
          </p>
        </div>

        {message && (
          <div
            className={`mb-6 p-4 rounded-xl flex items-center gap-3 text-sm font-medium border ${
              message.type === "success"
                ? "bg-emerald-950/60 border-emerald-800/80 text-emerald-300"
                : "bg-rose-950/60 border-rose-800/80 text-rose-300"
            }`}
          >
            {message.type === "success" ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-rose-400 shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Tiers & Category Ceilings */}
          <div className="lg:col-span-2 space-y-8">
            {/* Customer Tier Ceilings */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Sliders className="h-5 w-5 text-indigo-400" />
                    Customer Tier Ceilings
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">Maximum auto-approved discount allowed per tier.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {["GOLD", "SILVER", "BRONZE"].map((tier) => {
                  const item = tiers.find((t) => t.customerTier === tier);
                  const currentVal = item ? Number(item.maximumDiscount).toFixed(1) : "15.0";

                  return (
                    <div
                      key={tier}
                      className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-4 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span
                            className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                              tier === "GOLD"
                                ? "bg-amber-950 text-amber-300 border border-amber-800/60"
                                : tier === "SILVER"
                                ? "bg-slate-800 text-slate-300 border border-slate-700"
                                : "bg-orange-950 text-orange-300 border border-orange-800/60"
                            }`}
                          >
                            {tier}
                          </span>
                          <span className="text-xs text-slate-500">Tier Cap</span>
                        </div>
                        <div className="text-2xl font-black text-white mt-1">{currentVal}%</div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center gap-2">
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          max="100"
                          defaultValue={currentVal}
                          id={`input-${tier}`}
                          className="w-full bg-slate-900 border border-slate-700 rounded-md px-2.5 py-1 text-xs text-white focus:outline-none focus:border-indigo-500"
                        />
                        <button
                          disabled={saving}
                          onClick={() => {
                            const val = (document.getElementById(`input-${tier}`) as HTMLInputElement)?.value;
                            if (val) handleUpdateTier(tier, val);
                          }}
                          className="p-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white transition-all disabled:opacity-50"
                          title="Save ceiling"
                        >
                          <Save className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Category Ceilings */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
              <div className="mb-4">
                <h2 className="text-lg font-bold text-white">Category Discount Ceilings</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Category limits override or constrain customer tier ceilings according to <code>min(tier, category)</code> rule.
                </p>
              </div>

              <div className="space-y-3">
                {categoryRules.map((rule) => {
                  const catName = rule.category?.name || "Category";
                  const currentVal = Number(rule.maximumDiscount).toFixed(1);

                  return (
                    <div
                      key={rule.id}
                      className="flex items-center justify-between p-3.5 rounded-xl border border-slate-800/80 bg-slate-950/60"
                    >
                      <div>
                        <span className="text-sm font-semibold text-white block">{catName}</span>
                        <span className="text-xs text-slate-500">{rule.category?.description || "Category limit"}</span>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className="text-sm font-bold text-indigo-300 block">{currentVal}%</span>
                          <span className="text-[10px] text-slate-500">Max Discount</span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            max="100"
                            defaultValue={currentVal}
                            id={`cat-input-${rule.categoryId}`}
                            className="w-16 bg-slate-900 border border-slate-700 rounded-md px-2 py-1 text-xs text-white focus:outline-none focus:border-indigo-500 text-right"
                          />
                          <button
                            disabled={saving}
                            onClick={() => {
                              const val = (document.getElementById(`cat-input-${rule.categoryId}`) as HTMLInputElement)?.value;
                              if (val) handleUpdateCategoryCeiling(rule.categoryId, val);
                            }}
                            className="p-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white transition-all disabled:opacity-50"
                          >
                            <Save className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Approval Chain Rules */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
              <h2 className="text-lg font-bold text-white mb-1">Approval Chain Escalation Matrix</h2>
              <p className="text-xs text-slate-400 mb-4">Risk score brackets mapping directly to required approver roles.</p>

              <div className="space-y-2">
                {approvalRules.map((rule) => (
                  <div
                    key={rule.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-slate-800/70 bg-slate-950/50 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-slate-400">
                        Score {Number(rule.minimumRiskScore).toFixed(1)} – {Number(rule.maximumRiskScore).toFixed(1)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <ArrowRight className="h-3.5 w-3.5 text-slate-600" />
                      <span
                        className={`font-semibold px-2.5 py-0.5 rounded ${
                          rule.requiredApprovalLevel === "NONE"
                            ? "bg-emerald-950 text-emerald-300 border border-emerald-800/50"
                            : rule.requiredApprovalLevel === "MANAGER"
                            ? "bg-amber-950 text-amber-300 border border-amber-800/50"
                            : "bg-rose-950 text-rose-300 border border-rose-800/50"
                        }`}
                      >
                        {rule.requiredApprovalLevel === "NONE"
                          ? "AUTO-APPROVED (No Review)"
                          : `${rule.requiredApprovalLevel} APPROVAL`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Blended Risk Simulator */}
          <div className="space-y-6">
            <div className="rounded-2xl border border-indigo-900/50 bg-gradient-to-b from-indigo-950/40 to-slate-900/80 p-6 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 transform translate-x-4 -translate-y-4 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none"></div>

              <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-wider mb-2">
                <Calculator className="h-4 w-4" />
                <span>Live Blended Risk Simulator</span>
              </div>

              <h2 className="text-xl font-extrabold text-white mb-1">Test Line Discount Rule</h2>
              <p className="text-xs text-slate-400 mb-6">
                Direct implementation of Spec Section 13 algorithm. Simulates how customer tier and category ceiling interact.
              </p>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-300 uppercase mb-1">Customer Tier</label>
                  <select
                    value={simCustomerTier}
                    onChange={(e) => setSimCustomerTier(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="GOLD">Gold Customer (Ceiling: {tierCeiling}%)</option>
                    <option value="SILVER">Silver Customer</option>
                    <option value="BRONZE">Bronze Customer</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 uppercase mb-1">Product Category</label>
                  <select
                    value={simCategoryId}
                    onChange={(e) => setSimCategoryId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  >
                    {categoryRules.map((c) => (
                      <option key={c.categoryId} value={c.categoryId}>
                        {c.category?.name} (Ceiling: {Number(c.maximumDiscount)}%)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-300 uppercase mb-1">Unit Price ($)</label>
                    <input
                      type="number"
                      value={simUnitPrice}
                      onChange={(e) => setSimUnitPrice(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-300 uppercase mb-1">Proposed Discount (%)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={simAppliedDiscount}
                      onChange={(e) => setSimAppliedDiscount(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* Calculation Breakdown Result */}
                <div className="mt-6 pt-5 border-t border-slate-800/80 space-y-3">
                  <div className="flex justify-between items-center text-slate-400">
                    <span>Customer Tier Limit:</span>
                    <span className="font-semibold text-slate-200">{tierCeiling}%</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-400">
                    <span>{catName} Limit:</span>
                    <span className="font-semibold text-slate-200">{catCeiling}%</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-400 font-medium">
                    <span className="text-indigo-300">Effective Ceiling min(T, C):</span>
                    <span className="font-bold text-indigo-300">{allowedDiscount}%</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-400">
                    <span>Line Excess Points:</span>
                    <span className={`font-bold ${lineExcess > 0 ? "text-rose-400" : "text-emerald-400"}`}>
                      +{lineExcess.toFixed(1)}%
                    </span>
                  </div>

                  <div className="pt-3 border-t border-slate-800/80">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-slate-300 font-semibold text-sm">Evaluated Outcome</span>
                      <span
                        className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                          simLevel === "NONE"
                            ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                            : simLevel === "MANAGER"
                            ? "bg-amber-950 text-amber-300 border border-amber-800"
                            : "bg-rose-950 text-rose-300 border border-rose-800"
                        }`}
                      >
                        {simLevel === "NONE" ? "APPROVED" : `PENDING_${simLevel}_APPROVAL`}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-400 bg-slate-950/80 p-2.5 rounded-lg border border-slate-800">
                      {lineExcess > 0 ? (
                        <>
                          ⚠️ <strong>Flagged:</strong> Discount of {appliedDiscount}% exceeds strict {catName} limit ({catCeiling}%) despite customer being {simCustomerTier}. Requires {simLevel} sign-off.
                        </>
                      ) : (
                        <>
                          ✅ <strong>Within Limits:</strong> Discount of {appliedDiscount}% is within approved ceiling ({allowedDiscount}%).
                        </>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Explanatory Box */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 text-xs text-slate-400 space-y-2">
              <div className="flex items-center gap-1.5 font-semibold text-slate-300">
                <Info className="h-4 w-4 text-indigo-400" />
                <span>Section 13 Worked Example</span>
              </div>
              <p>
                <strong>Gold Customer</strong> (15% ceiling) buying <strong>Setup Service</strong> (10% ceiling) at 18% discount:
              </p>
              <div className="font-mono text-[11px] bg-slate-950 p-2 rounded border border-slate-800 text-slate-300">
                allowedDiscount = min(15%, 10%) = 10%<br />
                lineExcess = max(0, 18% - 10%) = 8 pts
              </div>
              <p className="text-slate-500">
                The service line alone flags the quotation, despite the customer being Gold.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
