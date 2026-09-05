"use client";

import { useState, useEffect } from "react";
import {
  CheckSquare,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Eye,
  User,
  History,
  Sparkles,
  X,
} from "lucide-react";
import styles from "./approvals.module.css";

interface RiskBreakdown {
  lineId: string;
  productName: string;
  categoryName: string;
  appliedDiscount: number;
  allowedDiscount: number;
  lineExcess: number;
  weightedViolation: number;
}

interface ApprovalAction {
  id: string;
  action: string;
  reason?: string;
  timestamp: string;
}

interface ApprovalRequest {
  id: string;
  quoteId?: string;
  quotationId?: string;
  requiredRole?: string;
  assignedRole?: string;
  riskScore?: number;
  reason?: string;
  status: string;
  level?: string;
  createdAt: string;
  quote?: {
    id: string;
    quoteNumber: string;
    riskScore?: number | string;
    customer?: { name: string };
    owner?: { name: string };
    blendedDiscountPct?: number | string;
  };
  evaluation?: {
    riskScore?: number;
    level?: string;
    breakdown: RiskBreakdown[];
  };
  actions?: ApprovalAction[];
}

const BADGE_CLASSES: Record<string, string> = {
  APPROVED: styles.statusBadgeApproved,
  PENDING: styles.statusBadgePending,
  PENDING_APPROVAL: styles.statusBadgePending,
  REJECTED: styles.statusBadgeRejected,
  REVISION_REQUIRED: styles.statusBadgePending,
  DRAFT: styles.statusBadgeDraft,
};

function badgeToneForRisk(score: number): string {
  if (score < 25) return styles.statusBadgeApproved;
  if (score < 50) return styles.statusBadgePending;
  return styles.statusBadgeRejected;
}

function badgeToneForStatus(status: string): string {
  return BADGE_CLASSES[status] || styles.statusBadge;
}

function getRiskGaugeClass(score: number): string {
  if (score < 25) return styles.riskGaugeLow;
  if (score < 50) return styles.riskGaugeMedium;
  return styles.riskGaugeHigh;
}

function getActionDotClass(action: string): string {
  switch (action) {
    case "APPROVE": return styles.auditDotApproved;
    case "REJECT": return styles.auditDotRejected;
    case "REQUEST_REVISION": return styles.auditDotRevision;
    default: return "";
  }
}

export default function ApprovalsPage() {
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("PENDING");
  const [activeRequest, setActiveRequest] = useState<ApprovalRequest | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionReason, setActionReason] = useState("");
  const [submittingAction, setSubmittingAction] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [evaluating, setEvaluating] = useState(false);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const url = new URL("/api/approvals/requests", window.location.origin);
      if (selectedRole !== "ALL") url.searchParams.set("role", selectedRole);
      if (selectedStatus !== "ALL") url.searchParams.set("status", selectedStatus);

      const res = await fetch(url.toString());
      const data = await res.json();
      if (data.success) setRequests(data.data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [selectedRole, selectedStatus]);

  const handleOpenDetail = async (requestId: string) => {
    try {
      setDetailLoading(true);
      setActiveRequest(null);
      setActionSuccess(null);
      setActionError(null);
      setActionReason("");

      const res = await fetch(`/api/approvals/requests/${requestId}`);
      const data = await res.json();
      if (data.success) {
        setActiveRequest(data.data);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleAction = async (actionType: "APPROVE" | "REJECT" | "REQUEST_REVISION") => {
    if (!activeRequest) return;
    try {
      setSubmittingAction(true);
      setActionError(null);
      setActionSuccess(null);

      const res = await fetch(`/api/approvals/requests/${activeRequest.id}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: actionType,
          reason: actionReason || `Action ${actionType} recorded by approver.`,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setActionSuccess(`Successfully processed action: ${actionType}`);
        handleOpenDetail(activeRequest.id);
        fetchRequests();
      } else {
        setActionError(data.error?.message || "Failed to record approval action.");
      }
    } catch (err: any) {
      setActionError(err.message || "Request failed.");
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleEvaluateDemoQuote = async () => {
    try {
      setEvaluating(true);
      const res = await fetch("/api/approvals/evaluate/q1111111-1111-1111-1111-111111111111", {
        method: "POST",
      });
      const data = await res.json();
      if (data.success) {
        fetchRequests();
        if (data.data.approvalRequestId) {
          handleOpenDetail(data.data.approvalRequestId);
        }
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setEvaluating(false);
    }
  };

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <div className={styles.headerContent}>
            <div className={styles.headerIcon}>
              <ShieldAlert size={16} />
              <span>Approval Queue</span>
            </div>
            <h1 className={styles.title}>Approvals & Audit Trail</h1>
            <p className={styles.subtitle}>
              Review flagged quotations with line-level risk attribution. Every action is logged in the append-only audit trail.
            </p>
          </div>
          <div className={styles.headerActions}>
            <button
              className={styles.primaryBtn}
              onClick={handleEvaluateDemoQuote}
              disabled={evaluating}
            >
              <Sparkles size={16} />
              {evaluating ? "Evaluating..." : "Run Evaluation Demo"}
            </button>
          </div>
        </header>

        <section className={`${styles.card} ${styles.animateFadeIn}`} style={{ marginBottom: "1.5rem" }}>
          <div className={styles.filterSection}>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
              <span style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#a78bfa" }}>
                Role Queue:
              </span>
              <div className={styles.filterTabs}>
                {["ALL", "SALES_MANAGER", "FINANCE"].map((role) => (
                  <button
                    key={role}
                    className={`${styles.filterTab} ${selectedRole === role ? styles.filterTabActive : ""}`}
                    onClick={() => setSelectedRole(role)}
                  >
                    {role === "ALL" ? "All Roles" : role === "SALES_MANAGER" ? "Sales Manager" : "Finance"}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap", marginTop: "1rem" }}>
              <span style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#a78bfa" }}>
                Status:
              </span>
              <div className={styles.filterTabs}>
                {[
                  { id: "ALL", label: "All" },
                  { id: "PENDING", label: "Pending" },
                  { id: "APPROVED", label: "Approved" },
                  { id: "REJECTED", label: "Rejected" },
                ].map((st) => (
                  <button
                    key={st.id}
                    className={`${styles.filterTab} ${selectedStatus === st.id ? styles.filterTabActive : ""}`}
                    onClick={() => setSelectedStatus(st.id)}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {loading ? (
          <section className={styles.loadingState}>
            <div className={styles.spinner}></div>
            <p style={{ color: "#94a3b8" }}>Loading approval requests...</p>
          </section>
        ) : requests.length === 0 ? (
          <section className={`${styles.card} ${styles.animateFadeIn}`}>
            <div className={styles.emptyState}>
              <CheckSquare className={styles.emptyStateIcon} />
              <p className={styles.emptyStateText}>No approval requests in this queue</p>
              <p className={styles.emptyStateSubtext}>Click "Run Evaluation Demo" to generate a risk-flagged approval.</p>
            </div>
          </section>
        ) : (
          <section className={`${styles.tableCard} ${styles.animateFadeIn}`}>
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Quotation ID</th>
                    <th>Assigned To</th>
                    <th>Risk Score</th>
                    <th>Flag Reason</th>
                    <th>Status</th>
                    <th style={{ textAlign: "right" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((req) => {
                    const score = Number(req.riskScore ?? req.quote?.riskScore ?? req.evaluation?.riskScore ?? 0);
                    const qId = req.quote?.quoteNumber || req.quotationId || req.quoteId || req.id;
                    const role = req.requiredRole || req.assignedRole || "SALES_MANAGER";
                    return (
                      <tr key={req.id}>
                        <td>
                          <span className={styles.cellMono}>{qId}</span>
                          <div className={styles.cellMuted} style={{ fontSize: "0.6875rem", marginTop: "0.25rem" }}>
                            {req.quote?.customer?.name ? `${req.quote.customer.name} · ` : ""}Created {new Date(req.createdAt).toLocaleDateString()}
                          </div>
                        </td>
                        <td>
                          <span className={styles.statusBadge}>
                            <User size={12} style={{ marginRight: "0.375rem" }} />
                            {role}
                          </span>
                        </td>
                        <td>
                          <span className={`${styles.statusBadge} ${badgeToneForRisk(score)}`}>
                            {score.toFixed(1)} pts
                          </span>
                        </td>
                        <td>
                          <span style={{ 
                            maxWidth: "16rem", 
                            display: "block",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap"
                          }} title={req.reason}>
                            {req.reason || "Discount ceiling exceedance detected"}
                          </span>
                        </td>
                        <td>
                          <span className={`${styles.statusBadge} ${badgeToneForStatus(req.status)}`}>
                            {req.status.replace("_", " ")}
                          </span>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <button
                            className={styles.actionBtn}
                            onClick={() => handleOpenDetail(req.id)}
                          >
                            <Eye size={14} />
                            Review
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {activeRequest && (
          <div className={styles.modal} onClick={() => setActiveRequest(null)}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <div>
                  <h2 className={styles.modalTitle}>Approval Request Inspector</h2>
                  <p className={styles.modalDescription}>
                    {activeRequest.quote?.quoteNumber || activeRequest.quotationId || activeRequest.quoteId} · {activeRequest.requiredRole || activeRequest.assignedRole} · Level: {activeRequest.level || activeRequest.requiredRole || "SALES_MANAGER"}
                  </p>
                </div>
                <button className={styles.modalClose} onClick={() => setActiveRequest(null)}>
                  <X size={18} />
                </button>
              </div>

              <div className={styles.modalBody}>
                {actionSuccess && (
                  <div className={`${styles.alert} ${styles.alertSuccess}`}>
                    <CheckCircle2 size={18} />
                    {actionSuccess}
                  </div>
                )}
                {actionError && (
                  <div className={`${styles.alert} ${styles.alertError}`}>
                    <AlertTriangle size={18} />
                    {actionError}
                  </div>
                )}

                <div className={styles.riskGauge}>
                  <div className={styles.riskGaugeHeader}>
                    <span className={styles.riskGaugeLabel}>Risk Score</span>
                    <span className={styles.riskGaugeValue}>{Number(activeRequest.riskScore).toFixed(1)}</span>
                  </div>
                  <div className={styles.riskGaugeBar}>
                    <div
                      className={`${styles.riskGaugeFill} ${getRiskGaugeClass(Number(activeRequest.riskScore))}`}
                      style={{ width: `${Math.min(Number(activeRequest.riskScore), 100)}%` }}
                    ></div>
                  </div>
                </div>

                {(activeRequest.evaluation?.breakdown?.length ?? 0) > 0 && (
                  <div className={styles.card} style={{ marginBottom: "1.5rem", padding: "0", overflow: "hidden" }}>
                    <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid rgba(139,92,246,0.15)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <ShieldAlert size={14} style={{ color: "#a78bfa" }} />
                      <span style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#a78bfa" }}>
                        Line-by-line Attribution
                      </span>
                    </div>
                    <div className={styles.tableWrapper}>
                      <table className={styles.table}>
                        <thead>
                          <tr>
                            <th>Product</th>
                            <th>Category</th>
                            <th>Applied</th>
                            <th>Ceiling</th>
                            <th>Excess</th>
                            <th>Contribution</th>
                          </tr>
                        </thead>
                        <tbody>
                          {activeRequest.evaluation?.breakdown?.map((line) => (
                            <tr key={line.lineId}>
                              <td className={styles.cellPrimary}>{line.productName}</td>
                              <td className={styles.cellMuted}>{line.categoryName}</td>
                              <td style={{ fontWeight: 600 }}>{line.appliedDiscount}%</td>
                              <td className={styles.cellMuted}>{line.allowedDiscount}%</td>
                              <td>
                                {line.lineExcess > 0 ? (
                                  <span style={{ color: "#fca5a5", fontWeight: 600 }}>+{line.lineExcess}%</span>
                                ) : (
                                  <span style={{ color: "#6ee7b7" }}>0%</span>
                                )}
                              </td>
                              <td style={{ color: "#c4b5fd", fontWeight: 600 }}>{line.weightedViolation} pts</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div className={styles.auditTrail}>
                  <div className={styles.auditTrailHeader}>
                    <History size={14} />
                    <span>Append-only Audit Trail</span>
                  </div>
                  {(activeRequest.actions?.length ?? 0) > 0 ? (
                    <div className={styles.auditTrailList}>
                      {activeRequest.actions?.map((act) => (
                        <div key={act.id} className={styles.auditItem}>
                          <div className={`${styles.auditDot} ${getActionDotClass(act.action)}`}></div>
                          <div className={styles.auditTimestamp}>
                            {new Date(act.timestamp).toLocaleString()}
                          </div>
                          <div className={styles.auditAction}>{act.action}</div>
                          {act.reason && <div className={styles.auditReason}>{act.reason}</div>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className={styles.cellMuted}>No actions recorded yet.</p>
                  )}
                </div>

                {(activeRequest.status === "PENDING" || activeRequest.status === "PENDING_APPROVAL") && (
                  <div style={{ marginTop: "1.5rem" }}>
                    <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "#a78bfa", marginBottom: "0.5rem" }}>
                      Decision Notes
                    </label>
                    <textarea
                      className={styles.textarea}
                      rows={3}
                      value={actionReason}
                      onChange={(e) => setActionReason(e.target.value)}
                      placeholder="Enter approval rationale, revision conditions, or rejection reason..."
                    />
                  </div>
                )}
              </div>

              {(activeRequest.status === "PENDING" || activeRequest.status === "PENDING_APPROVAL") && (
                <div className={styles.modalFooter}>
                  <button
                    className={styles.secondaryBtn}
                    onClick={() => handleAction("REQUEST_REVISION")}
                    disabled={submittingAction}
                  >
                    Request Revision
                  </button>
                  <button
                    className={styles.secondaryBtn}
                    style={{ color: "#fca5a5", borderColor: "rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.1)" }}
                    onClick={() => handleAction("REJECT")}
                    disabled={submittingAction}
                  >
                    Reject
                  </button>
                  <button
                    className={styles.primaryBtn}
                    onClick={() => handleAction("APPROVE")}
                    disabled={submittingAction}
                  >
                    {activeRequest.level === "FINANCE" && activeRequest.assignedRole === "SALES_MANAGER"
                      ? "Approve & Escalate"
                      : "Approve"}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
