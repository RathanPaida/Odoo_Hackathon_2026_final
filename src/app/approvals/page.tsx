"use client";

import { useState, useEffect } from "react";
import { NavigationHeader } from "@/components/NavigationHeader";
import {
  Badge,
  Card,
  CardHeader,
  CardTitle,
  Modal,
  Button,
  Textarea,
  Field,
  RiskGauge,
  badgeToneForQuoteStatus,
  badgeToneForRisk,
} from "@/components/ui";
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

export default function ApprovalsPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("PENDING_APPROVAL");

  // Selected request for detail modal
  const [activeRequest, setActiveRequest] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Action form
  const [actionReason, setActionReason] = useState("");
  const [submittingAction, setSubmittingAction] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Evaluate quotation simulation
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
        // Refresh details and list
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
      // Calls evaluate on the seeded demo quote: q1111111-1111-1111-1111-111111111111
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
      <main className="surface-page min-h-screen flex flex-col">
        <NavigationHeader />

        <div className="flex-1 max-w-7xl w-full mx-auto px-6 py-8">
          <Card tone="paper" className="mb-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-6">
              <div>
                <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--foreground)]">
                  Approval Queue & Audit Trail
                </h1>
                <p className="text-sm text-[var(--muted-foreground)] mt-1">
                  Review flagged quotations with line-level risk attribution. Audit trail is strictly append-only.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleEvaluateDemoQuote}
                  disabled={evaluating}
                >
                  <Sparkles className="h-4 w-4 text-[var(--primary)] mr-2" />
                  {evaluating ? "Evaluating..." : "Run Evaluation on Demo Quote"}
                </Button>
              </div>
            </div>
          </Card>

          <Card tone="paper" className="mb-6">
            <div className="p-4 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase text-[var(--muted-foreground)] mr-1">
                  Role Queue:
                </span>
                {["ALL", "SALES_MANAGER", "FINANCE"].map((role) => (
                  <Button
                    key={role}
                    variant={selectedRole === role ? "primary" : "ghost"}
                    size="sm"
                    onClick={() => setSelectedRole(role)}
                    className="text-xs"
                  >
                    {role === "ALL" ? "All Roles" : role === "SALES_MANAGER" ? "Sales Manager" : "Finance"}
                  </Button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase text-[var(--muted-foreground)] mr-1">
                  Status:
                </span>
                {[
                  { id: "ALL", label: "All" },
                  { id: "PENDING_APPROVAL", label: "Pending" },
                  { id: "APPROVED", label: "Approved" },
                  { id: "REJECTED", label: "Rejected" },
                  { id: "REVISION_REQUIRED", label: "Revision Requested" },
                ].map((st) => (
                  <Button
                    key={st.id}
                    variant={selectedStatus === st.id ? "primary" : "ghost"}
                    size="sm"
                    onClick={() => setSelectedStatus(st.id)}
                    className="text-xs"
                  >
                    {st.label}
                  </Button>
                ))}
              </div>
            </div>
          </Card>

          {loading ? (
            <Card tone="paper" className="py-20 flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm text-[var(--muted-foreground)]">Loading approval requests...</p>
            </Card>
          ) : requests.length === 0 ? (
            <Card tone="paper" className="py-16 text-center">
              <CheckSquare className="h-10 w-10 text-[var(--muted-foreground)] mx-auto mb-3" />
              <p className="font-medium text-[var(--foreground)]">No approval requests in this queue</p>
              <p className="text-xs text-[var(--muted-foreground)] mt-1">
                Click "Run Evaluation on Demo Quote" to generate a real risk-flagged approval.
              </p>
            </Card>
          ) : (
            <Card tone="paper" className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm tabular">
                  <thead className="bg-[var(--background)] text-xs uppercase text-[var(--muted-foreground)]">
                    <tr>
                      <th className="px-5 py-3.5">Quotation / ID</th>
                      <th className="px-5 py-3.5">Assigned To</th>
                      <th className="px-5 py-3.5">Risk Score</th>
                      <th className="px-5 py-3.5">Flag Reason</th>
                      <th className="px-5 py-3.5">Status</th>
                      <th className="px-5 py-3.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--paper-border)]">
                    {requests.map((req) => {
                      const score = Number(req.riskScore);
                      return (
                        <tr key={req.id} className="hover:bg-[var(--paper)] transition-all">
                          <td className="px-5 py-4">
                            <span className="font-mono text-xs font-semibold text-[var(--primary)] block">
                              {req.quotationId}
                            </span>
                            <span className="text-[11px] text-[var(--muted-foreground)]">
                              Created {new Date(req.createdAt).toLocaleDateString()}
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <Badge tone="neutral">
                              <User className="h-3 w-3 mr-1.5" /> {req.assignedRole}
                            </Badge>
                          </td>

                          <td className="px-5 py-4">
                            <Badge tone={badgeToneForRisk(score)} dot>
                              {score.toFixed(1)} pts
                            </Badge>
                          </td>

                          <td className="px-5 py-4 max-w-xs">
                            <p className="text-xs text-[var(--foreground)] truncate" title={req.reason}>
                              {req.reason || "Discount ceiling exceedance detected"}
                            </p>
                          </td>

                          <td className="px-5 py-4">
                            <Badge tone={badgeToneForQuoteStatus(req.status)}>
                              {req.status.replace("_", " ")}
                            </Badge>
                          </td>

                          <td className="px-5 py-4 text-right">
                            <Button
                              size="sm"
                              onClick={() => handleOpenDetail(req.id)}
                              className="text-xs"
                            >
                              <Eye className="h-3.5 w-3.5 mr-1.5" />
                              Review & Act
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>

        <Modal
          open={activeRequest !== null}
          onClose={() => setActiveRequest(null)}
          size="lg"
          title={
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                Approval Request Inspector
              </span>
              <Badge tone={badgeToneForQuoteStatus(activeRequest?.status ?? "PENDING_APPROVAL")}>
                {activeRequest?.status.replace("_", " ")}
              </Badge>
            </div>
          }
          description={`Quotation: ${activeRequest?.quotationId} · Assigned: ${activeRequest?.assignedRole} · Level: ${activeRequest?.level}`}
          footer={
            activeRequest?.status === "PENDING_APPROVAL" ? (
              <div className="flex items-center justify-end gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  loading={submittingAction}
                  onClick={() => handleAction("REQUEST_REVISION")}
                  className="text-[var(--primary)]"
                >
                  Request revision
                </Button>
                <Button variant="destructive" size="sm" loading={submittingAction} onClick={() => handleAction("REJECT")}>
                  Reject
                </Button>
                <Button variant="success" size="sm" loading={submittingAction} onClick={() => handleAction("APPROVE")}>
                  {activeRequest?.level === "FINANCE" && activeRequest?.assignedRole === "SALES_MANAGER"
                    ? "Approve & escalate"
                    : "Approve"}
                </Button>
              </div>
            ) : null
          }
        >
          {activeRequest && (
            <div className="space-y-6">
              {actionSuccess && (
                <div className="p-3.5 rounded-xl bg-[var(--status-approved-bg)] border border-[var(--status-approved-bd)] text-[var(--status-approved-fg)] text-xs font-medium flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[var(--status-approved-fg)]" /> {actionSuccess}
                </div>
              )}
              {actionError && (
                <div className="p-3.5 rounded-xl bg-[var(--status-rejected-bg)] border border-[var(--status-rejected-bd)] text-[var(--status-rejected-fg)] text-xs font-medium flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-[var(--status-rejected-fg)]" /> {actionError}
                </div>
              )}

              <RiskGauge
                score={activeRequest.riskScore}
                breakdown={activeRequest.evaluation?.breakdown}
              />

              {activeRequest.evaluation?.breakdown?.length > 0 && (
                <Card tone="paper" className="overflow-hidden">
                  <div className="px-4 py-3 border-b border-[var(--paper-border)] text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)] flex items-center gap-2">
                    <ShieldAlert size={12} /> Line-by-line attribution
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left tabular">
                      <thead className="bg-[var(--background)] text-[var(--muted-foreground)] uppercase text-[10px]">
                        <tr>
                          <th className="px-4 py-2.5">Product</th>
                          <th className="px-3 py-2.5">Category</th>
                          <th className="px-3 py-2.5">Applied</th>
                          <th className="px-3 py-2.5">Ceiling</th>
                          <th className="px-3 py-2.5">Excess</th>
                          <th className="px-3 py-2.5">Contribution</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeRequest.evaluation.breakdown.map((line: any) => (
                          <tr key={line.lineId} className="border-t border-[var(--paper-border)]">
                            <td className="px-4 py-2.5 font-medium">{line.productName}</td>
                            <td className="px-3 py-2.5 text-[var(--muted-foreground)]">{line.categoryName}</td>
                            <td className="px-3 py-2.5 font-semibold">{line.appliedDiscount}%</td>
                            <td className="px-3 py-2.5">{line.allowedDiscount}%</td>
                            <td className="px-3 py-2.5">
                              {line.lineExcess > 0 ? (
                                <span className="font-semibold text-[var(--status-rejected-fg)]">+{line.lineExcess}%</span>
                              ) : (
                                <span className="text-[var(--status-approved-fg)]">0%</span>
                              )}
                            </td>
                            <td className="px-3 py-2.5 text-[var(--primary-hover)] font-semibold">
                              {line.weightedViolation} pts
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}

              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mb-3 flex items-center gap-2">
                  <History className="h-3.5 w-3.5 text-[var(--primary-hover)]" /> Append-only audit trail
                </h3>
                {activeRequest.actions?.length > 0 ? (
                  <ul className="relative border-l border-[var(--paper-border)] ml-3 space-y-4 pl-4 text-xs">
                    {activeRequest.actions.map((act: any) => (
                      <li key={act.id} className="relative">
                        <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-[var(--primary)] border border-[var(--background)]" />
                        <div className="flex items-center gap-2">
                          <Badge
                            tone={
                              act.action === "APPROVE"
                                ? "approved"
                                : act.action === "REJECT"
                                ? "rejected"
                                : "negotiating"
                            }
                          >
                            {act.action}
                          </Badge>
                          <span className="text-[var(--muted-foreground)]">
                            {new Date(act.timestamp).toLocaleString()}
                          </span>
                        </div>
                        {act.reason && <p className="mt-1 text-[var(--muted-foreground)]">{act.reason}</p>}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-[var(--muted-foreground)]">No actions recorded yet.</p>
                )}
              </div>

              {activeRequest.status === "PENDING_APPROVAL" && (
                <Field label="Decision notes" htmlFor="reason">
                  <Textarea
                    id="reason"
                    rows={2}
                    value={actionReason}
                    onChange={(e) => setActionReason(e.target.value)}
                    placeholder="Enter approval rationale, revision conditions, or rejection reason…"
                  />
                </Field>
              )}
            </div>
          )}
        </Modal>
      </main>
  );
}
