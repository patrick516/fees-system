import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, Loader2, RefreshCw, Inbox } from "lucide-react";
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
  const [acting, setActing] = useState<string | null>(null);

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

  const approve = async (id: string, schoolName: string) => {
    if (
      !confirm(
        `Approve "${schoolName}"?\n\nThis will:\n• Create the school\n• Create the School Admin account\n• Send an invitation email with login credentials\n\nContinue?`,
      )
    )
      return;
    setActing(id);
    try {
      const res = await platformApi.post(
        `/platform/schools/requests/${id}/approve`,
      );
      const emailSent = res.data.data?.emailSent;
      alert(
        emailSent
          ? "✅ School created. Invitation email sent!"
          : "⚠️ School created but email failed. Check Brevo logs.",
      );
      load();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to approve");
    } finally {
      setActing(null);
    }
  };

  const reject = async (id: string) => {
    if (!confirm("Reject this request? They will not be notified.")) return;
    setActing(id);
    try {
      await platformApi.post(`/platform/schools/requests/${id}/reject`);
      load();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to reject");
    } finally {
      setActing(null);
    }
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
                ? "bg-blue-700 text-white"
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
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
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
                              onClick={() => approve(r.id, r.schoolName)}
                              disabled={acting === r.id}
                              className="flex items-center gap-1 text-xs font-semibold text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 px-3 py-1.5 rounded-lg"
                            >
                              {acting === r.id ? (
                                <Loader2 size={12} className="animate-spin" />
                              ) : (
                                <CheckCircle2 size={12} />
                              )}
                              Approve
                            </button>
                            <button
                              onClick={() => reject(r.id)}
                              disabled={acting === r.id}
                              className="flex items-center gap-1 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 disabled:opacity-50 px-3 py-1.5 rounded-lg"
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
    </div>
  );
}
