"use client";

import { useState, useEffect } from "react";
import { NavigationHeader } from "@/components/NavigationHeader";
import { 
  CheckSquare, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  RotateCcw, 
  AlertTriangle, 
  ShieldAlert, 
  Eye, 
  FileText, 
  User, 
  History, 
  Percent, 
  TrendingUp, 
  Sparkles,
  ArrowRight
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <NavigationHeader />

      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-1">
              <CheckSquare className="h-4 w-4" />
              <span>Person 2 Responsibility</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">Approval Queue & Audit Trail</h1>
            <p className="text-slate-400 text-sm mt-1">
              Review flagged quotations with line-level risk attribution. Audit trail is strictly append-only.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleEvaluateDemoQuote}
              disabled={evaluating}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-indigo-700/60 bg-indigo-950/40 hover:bg-indigo-900/60 text-indigo-300 text-sm font-semibold transition-all disabled:opacity-50"
            >
              <Sparkles className="h-4 w-4 text-indigo-400" />
              {evaluating ? "Evaluating..." : "Run Evaluation on Demo Quote"}
            </button>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6 p-4 rounded-xl border border-slate-800/80 bg-slate-900/50">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-semibold uppercase mr-1">Role Queue:</span>
            {["ALL", "SALES_MANAGER", "FINANCE"].map((role) => (
              <button
                key={role}
                onClick={() => setSelectedRole(role)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  selectedRole === role
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-950 text-slate-400 hover:text-white"
                }`}
              >
                {role === "ALL" ? "All Roles" : role === "SALES_MANAGER" ? "Sales Manager" : "Finance"}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-semibold uppercase mr-1">Status:</span>
            {[
              { id: "ALL", label: "All" },
              { id: "PENDING_APPROVAL", label: "Pending" },
              { id: "APPROVED", label: "Approved" },
              { id: "REJECTED", label: "Rejected" },
              { id: "REVISION_REQUIRED", label: "Revision Requested" },
            ].map((st) => (
              <button
                key={st.id}
                onClick={() => setSelectedStatus(st.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  selectedStatus === st.id
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-950 text-slate-400 hover:text-white"
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>

        {/* Requests Table */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-500">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm">Loading approval requests...</p>
          </div>
        ) : requests.length === 0 ? (
          <div className="py-16 text-center border border-dashed border-slate-800 rounded-2xl bg-slate-900/30">
            <CheckSquare className="h-10 w-10 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-300 font-medium">No approval requests in this queue</p>
            <p className="text-slate-500 text-xs mt-1">
              Click &quot;Run Evaluation on Demo Quote&quot; above to generate a real risk-flagged approval.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-800 bg-slate-950/80 text-xs uppercase text-slate-400">
                <tr>
                  <th className="px-5 py-3.5">Quotation / ID</th>
                  <th className="px-5 py-3.5">Assigned To</th>
                  <th className="px-5 py-3.5">Risk Score</th>
                  <th className="px-5 py-3.5">Flag Reason</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {requests.map((req) => {
                  const score = Number(req.riskScore);
                  return (
                    <tr key={req.id} className="hover:bg-slate-800/30 transition-all">
                      <td className="px-5 py-4">
                        <span className="font-mono text-xs text-indigo-400 font-semibold block">
                          {req.quotationId}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          Created {new Date(req.createdAt).toLocaleDateString()}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                          <User className="h-3 w-3 text-indigo-400" />
                          {req.assignedRole}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-black ${
                            score > 25
                              ? "bg-rose-950 text-rose-300 border border-rose-800/60"
                              : score > 0
                              ? "bg-amber-950 text-amber-300 border border-amber-800/60"
                              : "bg-emerald-950 text-emerald-300 border border-emerald-800/60"
                          }`}
                        >
                          <TrendingUp className="h-3 w-3" />
                          {score.toFixed(1)} pts
                        </span>
                      </td>

                      <td className="px-5 py-4 max-w-xs">
                        <p className="text-xs text-slate-300 truncate" title={req.reason}>
                          {req.reason || "Discount ceiling exceedance detected"}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                            req.status === "APPROVED"
                              ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                              : req.status === "PENDING_APPROVAL"
                              ? "bg-amber-950 text-amber-300 border border-amber-800"
                              : req.status === "REJECTED"
                              ? "bg-rose-950 text-rose-300 border border-rose-800"
                              : "bg-purple-950 text-purple-300 border border-purple-800"
                          }`}
                        >
                          {req.status}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={() => handleOpenDetail(req.id)}
                          className="px-3.5 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white text-xs font-semibold border border-indigo-500/30 transition-all inline-flex items-center gap-1.5"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Review & Act
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Approval Detail & Action Modal */}
      {activeRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-800 bg-slate-950/60 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                    Approval Request Inspector
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      activeRequest.status === "APPROVED"
                        ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                        : "bg-amber-950 text-amber-300 border border-amber-800"
                    }`}
                  >
                    {activeRequest.status}
                  </span>
                </div>
                <h2 className="text-xl font-black text-white">Quotation: {activeRequest.quotationId}</h2>
                <p className="text-xs text-slate-400 mt-1">Assigned Role: {activeRequest.assignedRole} | Level: {activeRequest.level}</p>
              </div>

              <button
                onClick={() => setActiveRequest(null)}
                className="text-slate-400 hover:text-white p-2"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              {/* Notifications */}
              {actionSuccess && (
                <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs font-medium flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  {actionSuccess}
                </div>
              )}
              {actionError && (
                <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs font-medium flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-rose-400" />
                  {actionError}
                </div>
              )}

              {/* Risk Summary Banner */}
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-950 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400 block font-medium">Computed Blended Risk Score</span>
                  <span className="text-2xl font-black text-white">{Number(activeRequest.riskScore).toFixed(1)} pts</span>
                </div>

                <div className="text-right">
                  <span className="text-xs text-slate-400 block font-medium">Required Approval Role</span>
                  <span className="text-sm font-bold text-indigo-400">{activeRequest.assignedRole}</span>
                </div>
              </div>

              {/* Line Violation Breakdown (Section 13) */}
              {activeRequest.evaluation?.breakdown && activeRequest.evaluation.breakdown.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 text-indigo-400" />
                    Line-by-Line Discount Attribution (Section 13)
                  </h3>

                  <div className="border border-slate-800 rounded-xl overflow-hidden">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-950 text-slate-400 uppercase text-[10px]">
                        <tr>
                          <th className="p-3">Product</th>
                          <th className="p-3">Category</th>
                          <th className="p-3">Applied</th>
                          <th className="p-3">Allowed Ceiling</th>
                          <th className="p-3">Line Excess</th>
                          <th className="p-3">Risk Contribution</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {activeRequest.evaluation.breakdown.map((line: any) => (
                          <tr key={line.lineId} className="hover:bg-slate-800/20">
                            <td className="p-3 font-medium text-white">{line.productName}</td>
                            <td className="p-3 text-slate-400">{line.categoryName}</td>
                            <td className="p-3 font-semibold text-white">{line.appliedDiscount}%</td>
                            <td className="p-3 text-slate-300 font-medium">{line.allowedDiscount}%</td>
                            <td className="p-3">
                              {line.lineExcess > 0 ? (
                                <span className="text-rose-400 font-bold">+{line.lineExcess}%</span>
                              ) : (
                                <span className="text-emerald-400 font-medium">0%</span>
                              )}
                            </td>
                            <td className="p-3 font-mono font-semibold text-indigo-300">
                              {line.weightedViolation} pts
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Append-Only Audit History Timeline */}
              <div>
                <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                  <History className="h-4 w-4 text-indigo-400" />
                  Append-Only Approval Audit Trail
                </h3>

                {activeRequest.actions && activeRequest.actions.length > 0 ? (
                  <div className="relative border-l border-slate-800 ml-3 space-y-4 pl-4 text-xs">
                    {activeRequest.actions.map((act: any) => (
                      <div key={act.id} className="relative">
                        <div className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-indigo-500 border border-slate-900"></div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                              act.action === "APPROVE"
                                ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                                : act.action === "REJECT"
                                ? "bg-rose-950 text-rose-300 border border-rose-800"
                                : "bg-purple-950 text-purple-300 border border-purple-800"
                            }`}
                          >
                            {act.action}
                          </span>
                          <span className="text-slate-500">
                            {new Date(act.timestamp).toLocaleString()}
                          </span>
                        </div>
                        {act.reason && <p className="text-slate-300 mt-1">{act.reason}</p>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">No actions recorded yet.</p>
                )}
              </div>

              {/* Approver Action Panel */}
              {activeRequest.status === "PENDING_APPROVAL" && (
                <div className="pt-4 border-t border-slate-800">
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Approver Reason / Decision Notes
                  </label>
                  <textarea
                    rows={2}
                    value={actionReason}
                    onChange={(e) => setActionReason(e.target.value)}
                    placeholder="Enter approval rationale, revision conditions, or rejection reason..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 mb-4"
                  />

                  <div className="flex items-center justify-end gap-2.5">
                    <button
                      disabled={submittingAction}
                      onClick={() => handleAction("REQUEST_REVISION")}
                      className="px-4 py-2 rounded-lg bg-purple-900/50 hover:bg-purple-800 text-purple-200 text-xs font-semibold border border-purple-700/60 transition-all disabled:opacity-50"
                    >
                      Request Revision
                    </button>
                    <button
                      disabled={submittingAction}
                      onClick={() => handleAction("REJECT")}
                      className="px-4 py-2 rounded-lg bg-rose-900/50 hover:bg-rose-800 text-rose-200 text-xs font-semibold border border-rose-700/60 transition-all disabled:opacity-50"
                    >
                      Reject
                    </button>
                    <button
                      disabled={submittingAction}
                      onClick={() => handleAction("APPROVE")}
                      className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50"
                    >
                      {activeRequest.level === "FINANCE" && activeRequest.assignedRole === "SALES_MANAGER"
                        ? "Approve & Escalate to Finance"
                        : "Approve Quotation"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
