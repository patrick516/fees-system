import { useEffect, useState } from "react";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  Inbox,
  X,
  AlertTriangle,
} from "lucide-react";
import platformApi from "../../lib/platformApi";

interface SchoolRequest {
  id: string;
  name: string;
  email: string;
  phone: string;
  schoolName: string;
  tier: string;
  status: string;
  createdAt: string;
}

const TIER_LABELS: Record<string, string> = {
  SMALL: "Small (≤150)",
  MEDIUM: "Medium (151-400)",
  LARGE: "Large (400+)",
};

const STATUS_BADGES: Record<string, { color: string; label: string }> = {
  PENDING: { color: "bg-yellow-100 text-yellow-800", label: "Pending" },
  APPROVED: { color: "bg-green-100 text-green-700", label: "Approved" },
  REJECTED: { color: "bg-red-100 text-red-700", label: "Rejected" },
};

export default function PlatformRequestsPage() {
  const [requests, setRequests] = useState<SchoolRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<
    "PENDING" | "APPROVED" | "REJECTED" | ""
  >("PENDING");

  // Modal State
  const [modalAction, setModalAction] = useState<{
    type: "approve" | "reject";
    request: SchoolRequest;
  } | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalResult, setModalResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const params = filter ? `?status=${filter}` : "";
      const res = await platformApi.get(`/platform/schools/requests${params}`);
      setRequests(res.data.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [filter]);

  const executeAction = async () => {
    if (!modalAction) return;
    setModalLoading(true);
    setModalResult(null);

    try {
      if (modalAction.type === "approve") {
        const res = await platformApi.post(
          `/platform/schools/requests/${modalAction.request.id}/approve`,
        );
        const emailSent = res.data.data?.emailSent;
        setModalResult({
          success: true,
          message: emailSent
            ? `School "${modalAction.request.schoolName}" created successfully. An invitation email has been sent to ${modalAction.request.email}.`
            : `School created, but the invitation email failed to send. Please check Brevo logs.`,
        });
      } else {
        await platformApi.post(
          `/platform/schools/requests/${modalAction.request.id}/reject`,
        );
        setModalResult({
          success: true,
          message:
            "Request rejected. The applicant has been removed from the pending queue.",
        });
      }
      load(); // Refresh the list
    } catch (err: any) {
      setModalResult({
        success: false,
        message:
          err.response?.data?.message || "Action failed. Please try again.",
      });
    } finally {
      setModalLoading(false);
    }
  };

  const closeModal = () => {
    setModalAction(null);
    setModalResult(null);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            School Requests
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Approve new schools from the marketing site. Each approval
            auto-creates the school with the selected tier limits.
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />{" "}
          Refresh
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6">
        {(["PENDING", "APPROVED", "REJECTED", ""] as const).map((s) => (
          <button
            key={s || "all"}
            onClick={() => setFilter(s)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              filter === s
                ? "bg-blue-700 text-white shadow-sm"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            {s ? STATUS_BADGES[s].label : "All"}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-6 rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center text-slate-500">
          <Loader2 className="animate-spin mx-auto mb-3" size={24} />
          Loading requests...
        </div>
      ) : requests.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-16 text-center">
          <Inbox className="mx-auto text-slate-300 mb-4" size={48} />
          <p className="text-slate-600 font-medium">No requests</p>
          <p className="text-sm text-slate-400 mt-1">
            {filter === "PENDING"
              ? "Nothing waiting for you right now."
              : "Nothing here yet."}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-[11px] uppercase tracking-wide text-left">
                <tr>
                  <th className="px-5 py-3 font-medium">School</th>
                  <th className="px-5 py-3 font-medium">Contact</th>
                  <th className="px-5 py-3 font-medium">Tier</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Requested</th>
                  <th className="px-5 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {requests.map((r) => {
                  const badge =
                    STATUS_BADGES[r.status] || STATUS_BADGES.PENDING;
                  return (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="px-5 py-4">
                        <p className="font-semibold text-slate-900">
                          {r.schoolName}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Requested by {r.name}
                        </p>
                      </td>
                      <td className="px-5 py-4 text-xs">
                        <p className="text-slate-700">{r.email}</p>
                        <p className="text-slate-500">
                          {r.phone || "No phone"}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-block px-2 py-1 rounded text-[11px] font-semibold bg-blue-50 text-blue-700">
                          {TIER_LABELS[r.tier] || r.tier}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${badge.color}`}
                        >
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-xs text-slate-500 whitespace-nowrap">
                        {new Date(r.createdAt).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-5 py-4 text-right">
                        {r.status === "PENDING" ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() =>
                                setModalAction({ type: "approve", request: r })
                              }
                              className="flex items-center gap-1 text-xs font-semibold text-white bg-green-600 hover:bg-green-700 px-3 py-1.5 rounded-lg transition-colors shadow-sm"
                            >
                              <CheckCircle2 size={12} /> Approve
                            </button>
                            <button
                              onClick={() =>
                                setModalAction({ type: "reject", request: r })
                              }
                              className="flex items-center gap-1 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 px-3 py-1.5 rounded-lg transition-colors"
                            >
                              <XCircle size={12} /> Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">
                            —
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================== CUSTOM ACTION MODAL ==================== */}
      {modalAction && (
        <div
          className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm"
          onClick={!modalLoading && !modalResult ? closeModal : undefined}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">
                {modalResult
                  ? modalResult.success
                    ? "Success"
                    : "Action Failed"
                  : modalAction.type === "approve"
                    ? "Approve School Request"
                    : "Reject School Request"}
              </h3>
              {!modalLoading && !modalResult && (
                <button
                  onClick={closeModal}
                  className="text-slate-400 hover:text-slate-700"
                >
                  <X size={18} />
                </button>
              )}
            </div>

            {/* Modal Body */}
            <div className="px-6 py-5">
              {modalResult ? (
                <div className="text-center py-4">
                  <div
                    className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                      modalResult.success ? "bg-green-100" : "bg-red-100"
                    }`}
                  >
                    {modalResult.success ? (
                      <CheckCircle2 size={32} className="text-green-600" />
                    ) : (
                      <XCircle size={32} className="text-red-600" />
                    )}
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    {modalResult.message}
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-sm text-slate-600 leading-relaxed mb-4">
                    {modalAction.type === "approve" ? (
                      <>
                        You are about to approve{" "}
                        <strong>{modalAction.request.schoolName}</strong>. This
                        will:
                      </>
                    ) : (
                      <>
                        Are you sure you want to reject the request for{" "}
                        <strong>{modalAction.request.schoolName}</strong>?
                      </>
                    )}
                  </p>

                  {modalAction.type === "approve" && (
                    <ul className="space-y-2 text-sm text-slate-700 bg-slate-50 p-4 rounded-xl border border-slate-100 mb-4">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 size={14} className="text-green-600" />{" "}
                        Create the school with{" "}
                        <strong>{modalAction.request.tier}</strong> limits
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 size={14} className="text-green-600" />{" "}
                        Create the admin account
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 size={14} className="text-green-600" />{" "}
                        Send invitation email to {modalAction.request.email}
                      </li>
                    </ul>
                  )}

                  {modalAction.type === "reject" && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2 mb-4">
                      <AlertTriangle
                        size={16}
                        className="text-amber-600 shrink-0 mt-0.5"
                      />
                      <p className="text-xs text-amber-800">
                        The applicant will not be notified. They will need to
                        submit a new request if they want to try again.
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
              {modalResult ? (
                <button
                  onClick={closeModal}
                  className="px-5 py-2.5 rounded-lg text-sm font-semibold bg-slate-800 hover:bg-slate-900 text-white transition-colors"
                >
                  Done
                </button>
              ) : (
                <>
                  <button
                    onClick={closeModal}
                    disabled={modalLoading}
                    className="px-5 py-2.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-200/50 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={executeAction}
                    disabled={modalLoading}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-50 ${
                      modalAction.type === "approve"
                        ? "bg-green-600 hover:bg-green-700"
                        : "bg-red-600 hover:bg-red-700"
                    }`}
                  >
                    {modalLoading && (
                      <Loader2 size={14} className="animate-spin" />
                    )}
                    {modalLoading
                      ? "Processing..."
                      : modalAction.type === "approve"
                        ? "Yes, Approve & Create"
                        : "Yes, Reject"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
