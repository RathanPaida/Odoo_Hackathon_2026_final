"use client";

import { useState, useEffect } from "react";
import { NavigationHeader } from "@/components/NavigationHeader";
import { Card, Badge } from "@/components/ui";
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
    <main className="surface-page min-h-screen flex flex-col">
      <NavigationHeader />

      <div className="flex-1 max-w-7xl w-full mx-auto px-6 py-8">
        <Card tone="paper" className="mb-8">
          <div className="p-6">
            <div className="flex items-center gap-2 text-[var(--primary)] text-xs font-semibold uppercase tracking-wider mb-1">
              <ShieldCheck className="h-4 w-4" />
              <span>Discount Governance</span>
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-[var(--foreground)]">
              Discount Governance &amp; Ceilings
            </h1>
            <p className="text-sm text-[var(--muted-foreground)] mt-1">
              Configure multi-tier discount boundaries, category caps, and the blended risk engine rules.
            </p>
          </div>
        </Card>

        {message && (
          <Card tone="paper" className={`mb-6 p-4 flex items-center gap-3 text-sm font-medium ${
            message.type === "success"
              ? "bg-[var(--status-approved-bg)] border-[var(--status-approved-bd)] text-[var(--status-approved-fg)]"
              : "bg-[var(--status-rejected-bg)] border-[var(--status-rejected-bd)] text-[var(--status-rejected-fg)]"
          }`}>
            {message.type === "success" ? (
              <CheckCircle2 className="h-5 w-5 shrink-0" />
            ) : (
              <AlertTriangle className="h-5 w-5 shrink-0" />
            )}
            <span>{message.text}</span>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {/* Customer Tier Ceilings */}
            <Card tone="paper" className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-[var(--foreground)] flex items-center gap-2">
                    <Sliders className="h-5 w-5 text-[var(--primary)]" />
                    Customer Tier Ceilings
                  </h2>
                  <p className="text-xs text-[var(--muted-foreground)] mt-0.5">Maximum auto-approved discount allowed per tier.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {["GOLD", "SILVER", "BRONZE"].map((tier) => {
                  const item = tiers.find((t) => t.customerTier === tier);
                  const currentVal = item ? Number(item.maximumDiscount).toFixed(1) : "15.0";
                  const tierTone = tier === "GOLD" ? "pending" : tier === "SILVER" ? "neutral" : "negotiating";

                  return (
                    <Card key={tier} tone="paper" className="p-4 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <Badge tone={tierTone}>{tier}</Badge>
                          <span className="text-xs text-[var(--muted-foreground)]">Tier Cap</span>
                        </div>
                        <div className="text-2xl font-semibold text-[var(--foreground)] mt-1 tabular">{currentVal}%</div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-[var(--paper-border)] flex items-center gap-2">
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          max="100"
                          defaultValue={currentVal}
                          id={`input-${tier}`}
                          className="w-full bg-[var(--paper)] border border-[var(--paper-border)] rounded-md px-2.5 py-1 text-xs text-[var(--foreground)] focus:outline-none focus:border-[var(--primary)]"
                        />
                        <button
                          disabled={saving}
                          onClick={() => {
                            const val = (document.getElementById(`input-${tier}`) as HTMLInputElement)?.value;
                            if (val) handleUpdateTier(tier, val);
                          }}
                          className="p-1.5 rounded-md bg-[var(--primary)] text-white transition-all disabled:opacity-50"
                          title="Save ceiling"
                        >
                          <Save className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </Card>

            {/* Category Ceilings */}
            <Card tone="paper" className="p-6">
              <h2 className="text-lg font-semibold text-[var(--foreground)] mb-1">Category Discount Ceilings</h2>
              <p className="text-xs text-[var(--muted-foreground)] mb-4">
                Category limits override or constrain customer tier ceilings according to <code>min(tier, category)</code> rule.
              </p>

              <div className="space-y-3">
                {categoryRules.map((rule) => {
                  const catName = rule.category?.name || "Category";
                  const currentVal = Number(rule.maximumDiscount).toFixed(1);

                  return (
                    <Card key={rule.id} tone="paper" className="p-3.5 flex items-center justify-between">
                      <div>
                        <span className="text-sm font-semibold text-[var(--foreground)] block">{catName}</span>
                        <span className="text-xs text-[var(--muted-foreground)]">{rule.category?.description || "Category limit"}</span>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className="text-sm font-bold text-[var(--primary-hover)] block">{currentVal}%</span>
                          <span className="text-[10px] text-[var(--muted-foreground)]">Max Discount</span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            max="100"
                            defaultValue={currentVal}
                            id={`cat-input-${rule.categoryId}`}
                            className="w-16 bg-[var(--paper)] border border-[var(--paper-border)] rounded-md px-2 py-1 text-xs text-[var(--foreground)] focus:outline-none focus:border-[var(--primary)] text-right"
                          />
                          <button
                            disabled={saving}
                            onClick={() => {
                              const val = (document.getElementById(`cat-input-${rule.categoryId}`) as HTMLInputElement)?.value;
                              if (val) handleUpdateCategoryCeiling(rule.categoryId, val);
                            }}
                            className="p-1.5 rounded-md bg-[var(--primary)] text-white transition-all disabled:opacity-50"
                          >
                            <Save className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </Card>

            {/* Approval Chain Rules */}
            <Card tone="paper" className="p-6">
              <h2 className="text-lg font-semibold text-[var(--foreground)] mb-1">Approval Chain Escalation Matrix</h2>
              <p className="text-xs text-[var(--muted-foreground)] mb-4">Risk score brackets mapping directly to required approver roles.</p>

              <div className="space-y-2">
                {approvalRules.map((rule) => (
                  <Card key={rule.id} tone="paper" className="p-3 flex items-center justify-between text-xs">
                    <span className="font-mono text-[var(--muted-foreground)]">
                      Score {Number(rule.minimumRiskScore).toFixed(1)} – {Number(rule.maximumRiskScore).toFixed(1)}
                    </span>
                    <div className="flex items-center gap-2">
                      <ArrowRight className="h-3.5 w-3.5 text-[var(--muted-foreground)]" />
                      <Badge
                        tone={
                          rule.requiredApprovalLevel === "NONE"
                            ? "approved"
                            : rule.requiredApprovalLevel === "MANAGER"
                            ? "pending"
                            : "rejected"
                        }
                      >
                        {rule.requiredApprovalLevel === "NONE"
                          ? "AUTO-APPROVED"
                          : `${rule.requiredApprovalLevel} APPROVAL`}
                      </Badge>
                    </div>
                  </Card>
                ))}
              </div>
            </Card>
          </div>

          {/* Right Column: Interactive Blended Risk Simulator */}
          <div className="space-y-6">
            <Card tone="paper" className="p-6 border-[var(--primary)]/30 bg-[var(--background)]/40 relative overflow-hidden">
              <div className="absolute top-0 right-0 transform translate-x-4 -translate-y-4 w-32 h-32 bg-[var(--primary)]/10 rounded-full blur-2xl pointer-events-none"></div>

              <div className="flex items-center gap-2 text-[var(--primary)] text-xs font-bold uppercase tracking-wider mb-2">
                <Calculator className="h-4 w-4" />
                <span>Live Blended Risk Simulator</span>
              </div>

              <h2 className="text-xl font-semibold text-[var(--foreground)] mb-1">Test Line Discount Rule</h2>
              <p className="text-xs text-[var(--muted-foreground)] mb-6">
                Direct implementation of Spec Section 13 algorithm. Simulates how customer tier and category ceiling interact.
              </p>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-[var(--foreground)] uppercase mb-1">Customer Tier</label>
                  <select
                    value={simCustomerTier}
                    onChange={(e) => setSimCustomerTier(e.target.value)}
                    className="w-full bg-[var(--paper)] border border-[var(--paper-border)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:border-[var(--primary)]"
                  >
                    <option value="GOLD">Gold Customer (Ceiling: {tierCeiling}%)</option>
                    <option value="SILVER">Silver Customer</option>
                    <option value="BRONZE">Bronze Customer</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-[var(--foreground)] uppercase mb-1">Product Category</label>
                  <select
                    value={simCategoryId}
                    onChange={(e) => setSimCategoryId(e.target.value)}
                    className="w-full bg-[var(--paper)] border border-[var(--paper-border)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:border-[var(--primary)]"
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
                    <label className="block font-semibold text-[var(--foreground)] uppercase mb-1">Unit Price ($)</label>
                    <input
                      type="number"
                      value={simUnitPrice}
                      onChange={(e) => setSimUnitPrice(e.target.value)}
                      className="w-full bg-[var(--paper)] border border-[var(--paper-border)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:border-[var(--primary)]"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-[var(--foreground)] uppercase mb-1">Proposed Discount (%)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={simAppliedDiscount}
                      onChange={(e) => setSimAppliedDiscount(e.target.value)}
                      className="w-full bg-[var(--paper)] border border-[var(--paper-border)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:border-[var(--primary)]"
                    />
                  </div>
                </div>

                <div className="mt-6 pt-5 border-t border-[var(--paper-border)] space-y-3">
                  <div className="flex justify-between items-center text-[var(--muted-foreground)]">
                    <span>Customer Tier Limit:</span>
                    <span className="font-semibold text-[var(--foreground)]">{tierCeiling}%</span>
                  </div>
                  <div className="flex justify-between items-center text-[var(--muted-foreground)]">
                    <span>{catName} Limit:</span>
                    <span className="font-semibold text-[var(--foreground)]">{catCeiling}%</span>
                  </div>
                  <div className="flex justify-between items-center text-[var(--muted-foreground)] font-medium">
                    <span className="text-[var(--primary)]">Effective Ceiling min(T, C):</span>
                    <span className="font-bold text-[var(--primary)]">{allowedDiscount}%</span>
                  </div>
                  <div className="flex justify-between items-center text-[var(--muted-foreground)]">
                    <span>Line Excess Points:</span>
                    <span className={`font-bold ${lineExcess > 0 ? "text-[var(--status-rejected-fg)]" : "text-[var(--status-approved-fg)]"}`}>
                      +{lineExcess.toFixed(1)}%
                    </span>
                  </div>

                  <div className="pt-3 border-t border-[var(--paper-border)]">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[var(--foreground)] font-semibold text-sm">Evaluated Outcome</span>
                      <Badge
                        tone={
                          simLevel === "NONE" ? "approved" : simLevel === "MANAGER" ? "pending" : "rejected"
                        }
                      >
                        {simLevel === "NONE" ? "APPROVED" : `PENDING_${simLevel}_APPROVAL`}
                      </Badge>
                    </div>

                    <div className="text-[11px] text-[var(--muted-foreground)] bg-[var(--paper)] p-2.5 rounded-lg border border-[var(--paper-border)]">
                      {lineExcess > 0 ? (
                        <>
                          ⚠️ <strong>Flagged:</strong> Discount of {appliedDiscount}% exceeds strict {catName} limit ({catCeiling}%) despite customer being {simCustomerTier}. Requires {simLevel} sign-off.
                        </>
                      ) : (
                        <>
                          ✅ <strong>Within Limits:</strong> Discount of {appliedDiscount}% is within approved ceiling ({allowedDiscount}%).
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            <Card tone="paper" className="p-4">
              <div className="flex items-center gap-1.5 font-semibold text-[var(--foreground)] mb-2">
                <Info className="h-4 w-4 text-[var(--primary)]" />
                <span>Section 13 Worked Example</span>
              </div>
              <p className="text-xs text-[var(--muted-foreground)]">
                <strong>Gold Customer</strong> (15% ceiling) buying <strong>Setup Service</strong> (10% ceiling) at 18% discount:
              </p>
              <div className="font-mono text-[11px] bg-[var(--paper)] p-2 rounded border border-[var(--paper-border)] text-[var(--muted-foreground)] my-2">
                allowedDiscount = min(15%, 10%) = 10%<br />
                lineExcess = max(0, 18% - 10%) = 8 pts
              </div>
              <p className="text-xs text-[var(--muted-foreground)]">
                The service line alone flags the quotation, despite the customer being Gold.
              </p>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}

