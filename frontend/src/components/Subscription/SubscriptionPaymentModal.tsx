import { useState, useEffect } from "react";
import { Loader2, X, Copy, CheckCircle2 } from "lucide-react";
import api from "../../lib/axios";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function SubscriptionPaymentModal({
  isOpen,
  onClose,
  onSuccess,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [tanData, setTanData] = useState<{
    paymentId: string;
    timedAccountNumber: string;
    amount: number;
  } | null>(null);

  // Polling state
  const [isPolling, setIsPolling] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Reset state when modal closes/opens
  useEffect(() => {
    if (!isOpen) {
      setTanData(null);
      setIsSuccess(false);
      setIsPolling(false);
      setCopied(false);
      setError("");
    }
  }, [isOpen]);

  // Polling logic
  useEffect(() => {
    // 🎯 FIX: Use ReturnType instead of NodeJS.Timeout
    let interval: ReturnType<typeof setInterval>;

    if (isPolling && tanData) {
      interval = setInterval(async () => {
        try {
          const res = await api.get(
            `/schools/subscription/status/${tanData.paymentId}`,
          );
          if (res.data.status === "VERIFIED") {
            setIsPolling(false);
            setIsSuccess(true);
            if (onSuccess) onSuccess();
          }
        } catch (err) {
          // Ignore errors, keep polling
        }
      }, 3000); // Check every 3 seconds
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPolling, tanData, onSuccess]);

  if (!isOpen) return null;

  const handlePay = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.post("/schools/subscription/pay");
      setTanData({
        paymentId: res.data.data.paymentId,
        timedAccountNumber: res.data.data.timedAccountNumber,
        amount: res.data.data.amount,
      });
      setIsPolling(true); // Start checking for success
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to initiate payment");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (tanData) {
      navigator.clipboard.writeText(tanData.timedAccountNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4">
      <div className="bg-white rounded-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Pay Subscription
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700"
          >
            <X size={20} />
          </button>
        </div>

        {isSuccess ? (
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={32} />
            </div>
            <h4 className="text-xl font-bold text-gray-900 mb-2">
              Payment Confirmed!
            </h4>
            <p className="text-sm text-gray-600 mb-6">
              Your subscription has been renewed successfully.
            </p>
            <button
              onClick={onClose}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 rounded-lg"
            >
              Done
            </button>
          </div>
        ) : !tanData ? (
          <div className="text-center py-4">
            <p className="text-sm text-gray-600 mb-6">
              You are about to pay for the next term of SchoolPay. Once
              confirmed, your access will automatically extend.
            </p>
            {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
            <button
              onClick={handlePay}
              disabled={loading}
              className="w-full flex justify-center items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white font-semibold py-3 rounded-lg"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                "Generate Account Number"
              )}
            </button>
          </div>
        ) : (
          <div className="py-2">
            <p className="text-sm text-gray-600 mb-2 text-center">
              Send exactly
            </p>
            <p className="text-2xl font-bold text-gray-900 mb-6 text-center">
              MWK {tanData.amount.toLocaleString()}
            </p>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4 relative">
              <p className="text-sm text-blue-800 mb-1 text-center">
                Pay Bill / Lipa Account Number
              </p>
              <p className="text-3xl font-mono font-bold text-blue-800 tracking-wider text-center">
                {tanData.timedAccountNumber}
              </p>
              <button
                onClick={handleCopy}
                className="absolute top-2 right-2 p-1.5 text-blue-600 hover:bg-blue-100 rounded-lg transition"
                title="Copy Account Number"
              >
                {copied ? <CheckCircle2 size={16} /> : <Copy size={16} />}
              </button>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-6">
              <p className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-3">
                How to pay from your phone:
              </p>

              <div className="space-y-3 text-xs text-slate-600">
                {/* Airtel Money */}
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 shrink-0" />
                  <p>
                    <strong>Airtel Money:</strong> Dial{" "}
                    <code className="bg-slate-200 px-1 rounded">*211#</code> →
                    Select <strong>5 (Pay Bill)</strong> → Enter Account Number{" "}
                    <strong>{tanData.timedAccountNumber}</strong> → Enter Amount{" "}
                    <strong>{tanData.amount}</strong> → Enter PIN.
                  </p>
                </div>

                {/* TNM Mpamba */}
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                  <p>
                    <strong>TNM Mpamba:</strong> Dial{" "}
                    <code className="bg-slate-200 px-1 rounded">*444#</code> →
                    Select <strong>4 (Pay Bill)</strong> → Enter Account Number{" "}
                    <strong>{tanData.timedAccountNumber}</strong> → Enter Amount{" "}
                    <strong>{tanData.amount}</strong> → Enter PIN.
                  </p>
                </div>

                {/* Bank App */}
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 shrink-0" />
                  <p>
                    <strong>Bank App:</strong> Open your bank app → Select{" "}
                    <strong>Pay Bill / Merchant</strong> → Enter Account Number{" "}
                    <strong>{tanData.timedAccountNumber}</strong> → Enter Amount{" "}
                    <strong>{tanData.amount}</strong>.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 text-sm text-blue-700 font-medium bg-blue-50 py-2 rounded-lg">
              <Loader2 className="animate-spin" size={16} />
              Waiting for payment...
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
