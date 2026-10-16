// frontend/src/components/Settings/SettlementAccountCard.tsx
import { useEffect, useState } from "react";
import {
  Landmark,
  Lock,
  AlertTriangle,
  Loader2,
  Clock,
  Send,
} from "lucide-react";
import api from "../../lib/axios";

interface Settlement {
  settlementBankName: string | null;
  settlementAccountName: string | null;
  settlementAccountNumber: string | null;
  settlementBranch: string | null;
  isLocked: boolean;
  pendingRequest: {
    id: string;
    submittedAt: string;
    proposed: any;
  } | null;
}

export default function SettlementAccountCard() {
  const [data, setData] = useState<Settlement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);

  const [bankName, setBankName] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [branch, setBranch] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get("/schools/settings/settlement-account");
      setData(res.data.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openModal = () => {
    setBankName(data?.settlementBankName || "");
    setAccountName(data?.settlementAccountName || "");
    setAccountNumber(data?.settlementAccountNumber || "");
    setBranch(data?.settlementBranch || "");
    setReason("");
    setError("");
    setShowModal(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await api.post("/schools/settings/settlement-change-request", {
        bankName,
        accountName,
        accountNumber,
        branch,
        reason,
      });
      setShowModal(false);
      load();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center gap-2 text-sm text-gray-500">
        <Loader2 size={16} className="animate-spin" /> Loading settlement
        account...
      </div>
    );
  }

  const hasAccount = !!data?.settlementAccountNumber;
  const pending = data?.pendingRequest;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Landmark size={16} className="text-gray-400" />
          <h3 className="font-medium text-gray-800">
            Settlement Account — Online Payments
          </h3>
        </div>
        {hasAccount && (
          <span className="flex items-center gap-1 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
            <Lock size={10} /> Locked
          </span>
        )}
      </div>

      <div className="p-5 space-y-4">
        {/* Warning alert */}
        <div className="flex gap-3 rounded-lg bg-amber-50 border border-amber-200 p-3">
          <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900 leading-relaxed">
            <p className="font-semibold mb-1">
              This is where parents&apos; ONLINE payments land
            </p>
            <p>
              SchoolPay manages this account. To change it, click{" "}
              <strong>Request Change</strong> below. The platform owner will
              review and apply it.
            </p>
          </div>
        </div>

        {/* Pending request banner */}
        {pending && (
          <div className="flex gap-3 rounded-lg bg-blue-50 border border-blue-200 p-3">
            <Clock size={18} className="text-blue-600 shrink-0 mt-0.5" />
            <div className="text-xs text-blue-900 leading-relaxed">
              <p className="font-semibold mb-1">
                Change request pending review
              </p>
              <p>
                Submitted {new Date(pending.submittedAt).toLocaleString()}. The
                platform owner will approve or reject it shortly.
              </p>
            </div>
          </div>
        )}

        {error && !showModal && (
          <div className="text-sm rounded-lg bg-red-50 border border-red-200 text-red-700 px-3 py-2">
            {error}
          </div>
        )}

        {/* Current account display (read-only) */}
        {hasAccount ? (
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-xs text-gray-500">Bank Name</dt>
              <dd className="text-gray-800 mt-0.5">
                {data?.settlementBankName}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Account Name</dt>
              <dd className="text-gray-800 mt-0.5">
                {data?.settlementAccountName}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Account Number</dt>
              <dd className="text-gray-800 mt-0.5 font-mono">
                {data?.settlementAccountNumber}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Branch</dt>
              <dd className="text-gray-800 mt-0.5">
                {data?.settlementBranch || "—"}
              </dd>
            </div>
          </dl>
        ) : (
          <p className="text-sm text-gray-500">
            No settlement account set yet. Submit a request below to add one.
          </p>
        )}

        {!pending && (
          <button
            onClick={openModal}
            className="rounded-lg bg-[var(--color-primary)] hover:opacity-90 text-white text-sm font-semibold px-4 py-2"
          >
            {hasAccount ? "Request Change" : "Submit Settlement Account"}
          </button>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4">
          <div className="bg-white rounded-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              {hasAccount
                ? "Request Settlement Change"
                : "Add Settlement Account"}
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              The platform owner will review this request.
            </p>

            {error && (
              <div className="mb-3 text-sm rounded-lg bg-red-50 border border-red-200 text-red-700 px-3 py-2">
                {error}
              </div>
            )}

            <form onSubmit={submit} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Bank Name *
                  </label>
                  <input
                    required
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Account Name *
                  </label>
                  <input
                    required
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Account Number *
                  </label>
                  <input
                    required
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Branch
                  </label>
                  <input
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Reason (optional)
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={2}
                  placeholder="Why are you requesting this change?"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={submitting}
                  className="rounded-lg border border-gray-300 hover:bg-gray-50 text-sm font-medium px-4 py-2"
                >
                  Cancel
                </button>
                <button
                  disabled={submitting}
                  className="flex items-center gap-2 rounded-lg bg-[var(--color-primary)] hover:opacity-90 disabled:opacity-60 text-white text-sm font-semibold px-4 py-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send size={14} /> Send Request
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
