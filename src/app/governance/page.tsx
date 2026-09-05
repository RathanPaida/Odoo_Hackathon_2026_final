"use client";

import { useState, useEffect } from "react";
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
import s from "./governance.module.css";

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
    if (weightedViolation <= 5.0) {
      simLevel = "MANAGER";
    } else {
      simLevel = "FINANCE";
    }
  }

  return (
    <main className={s.page}>
      <div className={s.container}>
        <div className={s.header}>
          <div className={s.headerContent}>
            <div className={s.headerIcon}>
              <ShieldCheck size={14} />
              Discount Governance
            </div>
            <h1 className={s.title}>Discount Governance &amp; Ceilings</h1>
            <p className={s.subtitle}>
              Configure multi-tier discount boundaries, category caps, and the blended risk engine rules.
            </p>
          </div>
        </div>

        {message && (
          <div className={`${s.alert} ${message.type === "success" ? s.alertSuccess : s.alertWarning}`}>
            {message.type === "success" ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
            <span>{message.text}</span>
          </div>
        )}

        <div className={s.statsGrid}>
          <div className={s.statCard}>
            <p className={s.statLabel}>Active Tiers</p>
            <p className={s.statValue}>{tiers.length}</p>
          </div>
          <div className={s.statCard}>
            <p className={s.statLabel}>Categories</p>
            <p className={s.statValue}>{categoryRules.length}</p>
          </div>
          <div className={s.statCard}>
            <p className={s.statLabel}>Approval Rules</p>
            <p className={s.statValue}>{approvalRules.length}</p>
          </div>
          <div className={s.statCard}>
            <p className={s.statLabel}>Current Risk Level</p>
            <p className={`${s.statValue} ${s.statValueWarning}`}>MEDIUM</p>
          </div>
        </div>

        <div className={s.twoCol}>
          <div className="space-y-8">
            <div className={`${s.card} ${s.animateFadeIn}`}>
              <div className={s.sectionTitle}>
                <span className={s.sectionIcon}><Sliders size={18} /></span>
                Customer Tier Ceilings
              </div>
              <p className={s.subtitle} style={{marginBottom: '1.5rem'}}>Maximum auto-approved discount allowed per tier.</p>

              <div className={s.statsGrid} style={{gridTemplateColumns: '1fr'}}>
                {["GOLD", "SILVER", "BRONZE"].map((tier) => {
                  const item = tiers.find((t) => t.customerTier === tier);
                  const currentVal = item ? Number(item.maximumDiscount).toFixed(1) : "15.0";
                  const tierBadgeClass = tier === "GOLD" ? s.badgeWarning : tier === "SILVER" ? s.badgeNeutral : s.badgeNeutral;

                  return (
                    <div key={tier} className={s.complianceItem}>
                      <div className={s.complianceInfo}>
                        <div className={`${s.complianceIcon} ${tier === "GOLD" ? s.auditIconWarning : s.auditIconInfo}`}>
                          <ShieldCheck size={16} />
                        </div>
                        <div>
                          <span className={s.complianceName}>{tier}</span>
                          <span className={s.complianceDescription}>Current ceiling: {currentVal}%</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          max="100"
                          defaultValue={currentVal}
                          id={`input-${tier}`}
                          className={s.formInput}
                          style={{width: '80px'}}
                        />
                        <button
                          disabled={saving}
                          onClick={() => {
                            const val = (document.getElementById(`input-${tier}`) as HTMLInputElement)?.value;
                            if (val) handleUpdateTier(tier, val);
                          }}
                          className={s.primaryBtn}
                          style={{padding: '0.5rem 0.75rem'}}
                        >
                          <Save size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className={`${s.card} ${s.animateFadeIn}`}>
              <div className={s.sectionTitle}>
                <span className={s.sectionIcon}><Sliders size={18} /></span>
                Category Discount Ceilings
              </div>
              <p className={s.subtitle} style={{marginBottom: '1.5rem'}}>
                Category limits override or constrain customer tier ceilings according to <code>min(tier, category)</code> rule.
              </p>

              <div className={s.complianceList}>
                {categoryRules.map((rule) => {
                  const catName = rule.category?.name || "Category";
                  const currentVal = Number(rule.maximumDiscount).toFixed(1);

                  return (
                    <div key={rule.id} className={s.complianceItem}>
                      <div className={s.complianceInfo}>
                        <div className={`${s.complianceIcon} ${s.auditIconInfo}`}>
                          <Sliders size={16} />
                        </div>
                        <div>
                          <span className={s.complianceName}>{catName}</span>
                          <span className={s.complianceDescription}>{rule.category?.description || "Category limit"}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className={s.complianceName} style={{color: '#c4b5fd'}}>{currentVal}%</span>
                        </div>
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          max="100"
                          defaultValue={currentVal}
                          id={`cat-input-${rule.categoryId}`}
                          className={s.formInput}
                          style={{width: '80px'}}
                        />
                        <button
                          disabled={saving}
                          onClick={() => {
                            const val = (document.getElementById(`cat-input-${rule.categoryId}`) as HTMLInputElement)?.value;
                            if (val) handleUpdateCategoryCeiling(rule.categoryId, val);
                          }}
                          className={s.primaryBtn}
                          style={{padding: '0.5rem 0.75rem'}}
                        >
                          <Save size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className={`${s.card} ${s.animateFadeIn}`}>
              <div className={s.sectionTitle}>
                <span className={s.sectionIcon}><ArrowRight size={18} /></span>
                Approval Chain Escalation Matrix
              </div>
              <p className={s.subtitle} style={{marginBottom: '1.5rem'}}>Risk score brackets mapping directly to required approver roles.</p>

              <div className={s.complianceList}>
                {approvalRules.map((rule) => (
                  <div key={rule.id} className={s.complianceItem}>
                    <div className={s.complianceInfo}>
                      <div className={`${s.complianceIcon} ${s.auditIconWarning}`}>
                        <ArrowRight size={16} />
                      </div>
                      <div>
                        <span className={s.complianceName}>
                          Score {Number(rule.minimumRiskScore).toFixed(1)} – {Number(rule.maximumRiskScore).toFixed(1)}
                        </span>
                        <span className={s.complianceDescription}>Risk score range</span>
                      </div>
                    </div>
                    <span className={`${s.statusBadge} ${
                      rule.requiredApprovalLevel === "NONE" ? s.badgeSuccess :
                      rule.requiredApprovalLevel === "MANAGER" ? s.badgeWarning : s.badgeDanger
                    }`}>
                      {rule.requiredApprovalLevel === "NONE" ? "AUTO-APPROVED" : `${rule.requiredApprovalLevel} APPROVAL`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className={`${s.card} ${s.cardHighlight} ${s.animateFadeIn}`}>
              <div className={s.sectionTitle}>
                <span className={s.sectionIcon}><Calculator size={18} /></span>
                Live Blended Risk Simulator
              </div>
              <p className={s.subtitle} style={{marginBottom: '1.5rem'}}>
                Direct implementation of Spec Section 13 algorithm. Simulates how customer tier and category ceiling interact.
              </p>

              <div className={s.statsGrid} style={{gridTemplateColumns: '1fr', marginBottom: '1rem'}}>
                <div className={s.formGroup}>
                  <label className={s.formLabel}>Customer Tier</label>
                  <select
                    value={simCustomerTier}
                    onChange={(e) => setSimCustomerTier(e.target.value)}
                    className={s.formSelect}
                  >
                    <option value="GOLD">Gold Customer (Ceiling: {tierCeiling}%)</option>
                    <option value="SILVER">Silver Customer</option>
                    <option value="BRONZE">Bronze Customer</option>
                  </select>
                </div>

                <div className={s.formGroup}>
                  <label className={s.formLabel}>Product Category</label>
                  <select
                    value={simCategoryId}
                    onChange={(e) => setSimCategoryId(e.target.value)}
                    className={s.formSelect}
                  >
                    {categoryRules.map((c) => (
                      <option key={c.categoryId} value={c.categoryId}>
                        {c.category?.name} (Ceiling: {Number(c.maximumDiscount)}%)
                      </option>
                    ))}
                  </select>
                </div>

                <div className={s.formGroup}>
                  <label className={s.formLabel}>Unit Price ($)</label>
                  <input
                    type="number"
                    value={simUnitPrice}
                    onChange={(e) => setSimUnitPrice(e.target.value)}
                    className={s.formInput}
                  />
                </div>

                <div className={s.formGroup}>
                  <label className={s.formLabel}>Proposed Discount (%)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={simAppliedDiscount}
                    onChange={(e) => setSimAppliedDiscount(e.target.value)}
                    className={s.formInput}
                  />
                </div>
              </div>

              <div className={s.complianceItem} style={{flexDirection: 'column', alignItems: 'stretch', gap: '0.75rem'}}>
                <div style={{display: 'flex', justifyContent: 'space-between'}}>
                  <span className={s.cellMuted}>Customer Tier Limit:</span>
                  <span className={s.cellPrimary}>{tierCeiling}%</span>
                </div>
                <div style={{display: 'flex', justifyContent: 'space-between'}}>
                  <span className={s.cellMuted}>{catName} Limit:</span>
                  <span className={s.cellPrimary}>{catCeiling}%</span>
                </div>
                <div style={{display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(139, 92, 246, 0.15)', paddingTop: '0.75rem'}}>
                  <span style={{color: '#c4b5fd', fontWeight: 600}}>Effective Ceiling min(T, C):</span>
                  <span style={{color: '#c4b5fd', fontWeight: 700}}>{allowedDiscount}%</span>
                </div>
                <div style={{display: 'flex', justifyContent: 'space-between'}}>
                  <span className={s.cellMuted}>Line Excess Points:</span>
                  <span style={{color: lineExcess > 0 ? '#fca5a5' : '#6ee7b7', fontWeight: 700}}>+{lineExcess.toFixed(1)}%</span>
                </div>

                <div style={{borderTop: '1px solid rgba(139, 92, 246, 0.15)', paddingTop: '0.75rem', marginTop: '0.25rem'}}>
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem'}}>
                    <span className={s.cellPrimary}>Evaluated Outcome</span>
                    <span className={`${s.statusBadge} ${
                      simLevel === "NONE" ? s.badgeSuccess : simLevel === "MANAGER" ? s.badgeWarning : s.badgeDanger
                    }`}>
                      {simLevel === "NONE" ? "APPROVED" : `PENDING_${simLevel}_APPROVAL`}
                    </span>
                  </div>
                  <div className={s.alert} style={{
                    background: lineExcess > 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                    borderColor: lineExcess > 0 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                    color: lineExcess > 0 ? '#fca5a5' : '#6ee7b7'
                  }}>
                    {lineExcess > 0 ? (
                      <>
                        <AlertTriangle size={16} />
                        <span>Discount of {appliedDiscount}% exceeds strict {catName} limit ({catCeiling}%) despite customer being {simCustomerTier}. Requires {simLevel} sign-off.</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={16} />
                        <span>Discount of {appliedDiscount}% is within approved ceiling ({allowedDiscount}%).</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className={`${s.card} ${s.animateFadeIn}`}>
              <div className={s.sectionTitle}>
                <span className={s.sectionIcon}><Info size={18} /></span>
                Section 13 Worked Example
              </div>
              <p className={s.subtitle}>
                <strong>Gold Customer</strong> (15% ceiling) buying <strong>Setup Service</strong> (10% ceiling) at 18% discount:
              </p>
              <div style={{
                fontFamily: "'SF Mono', 'Fira Code', monospace",
                fontSize: '0.6875rem',
                background: 'rgba(15, 15, 35, 0.5)',
                padding: '0.75rem',
                borderRadius: '0.75rem',
                border: '1px solid rgba(139, 92, 246, 0.15)',
                color: '#94a3b8',
                margin: '1rem 0'
              }}>
                allowedDiscount = min(15%, 10%) = 10%<br />
                lineExcess = max(0, 18% - 10%) = 8 pts
              </div>
              <p className={s.subtitle}>
                The service line alone flags the quotation, despite the customer being Gold.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

