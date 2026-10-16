// frontend/src/components/Settings/OneKhusaStatusCard.tsx
import { useEffect, useState } from "react";
import { Shield, Loader2, CheckCircle2, XCircle, Lock } from "lucide-react";
import api from "../../lib/axios";

interface Status {
  configured: boolean;
  merchantAccountMasked: string | null;
  hasSuccessSecret: boolean;
  hasReversedSecret: boolean;
}

export default function OneKhusaStatusCard() {
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/schools/settings/onekhusa-status");
        setStatus(res.data.data);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center gap-2 text-sm text-gray-500">
        <Loader2 size={16} className="animate-spin" /> Loading payment status...
      </div>
    );
  }

  if (!status) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Shield size={16} className="text-gray-400" />
          <h3 className="font-medium text-gray-800">Online Payments</h3>
        </div>
        <span className="flex items-center gap-1 text-[11px] text-gray-600 bg-gray-100 border border-gray-200 rounded-full px-2 py-0.5">
          <Lock size={10} /> Managed by SchoolPay
        </span>
      </div>

      <div className="p-5">
        <p className="text-xs text-gray-500 mb-4">
          This section is configured by SchoolPay on your behalf. Contact
          support if you need changes.
        </p>

        <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div>
            <dt className="text-xs text-gray-500">Status</dt>
            <dd className="mt-1">
              {status.configured ? (
                <span className="inline-flex items-center gap-1 text-green-700 font-medium">
                  <CheckCircle2 size={14} /> Active
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-gray-500">
                  <XCircle size={14} /> Not configured yet
                </span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">Merchant Account</dt>
            <dd className="mt-1 font-mono text-gray-800">
              {status.merchantAccountMasked || "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">Webhooks</dt>
            <dd className="mt-1 text-gray-700">
              {status.hasSuccessSecret && status.hasReversedSecret
                ? "✅ Configured"
                : "Pending"}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
