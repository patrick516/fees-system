import { useEffect, useState } from "react";
import { useAuthStore } from "../../store/authStore";
import {
  LogOut,
  Loader2,
  Copy,
  CheckCircle,
  Smartphone,
  Landmark,
} from "lucide-react";
import api from "../../lib/axios";
import { toast } from "../../lib/toast";

export default function SubscriptionLocked() {
  const { logout, staff } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [tanData, setTanData] = useState<{
    timedAccountNumber: string;
    amount: number;
  } | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [unlocking, setUnlocking] = useState(false);

  // 🎯 Auto-poll: check every 5s if the subscription has been unlocked
  useEffect(() => {
    const checkUnlock = async () => {
      try {
        const res = await api.get("/auth/me");
        const newStatus = res.data?.data?.school?.subscriptionStatus;

        // If the school is no longer locked, redirect to dashboard
        if (newStatus && newStatus !== "LOCKED" && newStatus !== "SUSPENDED") {
          setUnlocking(true);
          toast.success("Payment received! Unlocking your account...");
          // Small delay so they see the success toast
          setTimeout(() => {
            window.location.href = "/dashboard";
          }, 1200);
        }
      } catch (err) {
        // Silent — 403 means still locked, keep polling
      }
    };

    // First check immediately, then every 5 seconds
    checkUnlock();
    const interval = setInterval(checkUnlock, 5_000);
    return () => clearInterval(interval);
  }, []);

  const handlePay = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.post("/schools/subscription/pay");
      setTanData({
        timedAccountNumber: res.data.data.timedAccountNumber,
        amount: res.data.data.amount,
      });
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to initiate payment");
    } finally {
      setLoading(false);
    }
  };

  const copyAccount = () => {
    if (!tanData?.timedAccountNumber) return;
    navigator.clipboard.writeText(tanData.timedAccountNumber);
    setCopied(true);
    toast.success("Account number copied");
    setTimeout(() => setCopied(false), 2000);
  };

  // 🎯 Show "unlocking" transition after payment is detected
  if (unlocking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-emerald-100 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-emerald-200 p-8 text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={32} className="text-emerald-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">
            Payment Received!
          </h1>
          <p className="text-sm text-gray-600 mb-4">
            Unlocking your account...
          </p>
          <Loader2
            size={20}
            className="animate-spin text-emerald-600 mx-auto"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center px-4 py-8">
      <div className="max-w-lg w-full bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-500 to-rose-600 px-6 py-6 text-center">
          <div className="w-16 h-16 bg-white/20 backdrop-blur rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-white mb-1">Account Locked</h1>
          <p className="text-sm text-white/90">
            {staff?.school?.name || "Your school"}'s subscription has expired
          </p>
        </div>

        <div className="p-6">
          {!tanData ? (
            /* ============ INITIAL STATE — Pay button ============ */
            <div className="space-y-4 text-center">
              <p className="text-sm text-gray-600 leading-relaxed">
                Your subscription has expired. Click below to generate a payment
                reference, then follow the instructions to pay with Airtel
                Money, TNM Mpamba, or Bank Transfer.
              </p>

              {error && (
                <div className="text-sm text-red-700 bg-red-50 border border-red-200 p-3 rounded-lg text-left">
                  {error}
                </div>
              )}

              <button
                onClick={handlePay}
                disabled={loading}
                className="w-full flex justify-center items-center gap-2 bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white font-semibold py-3 rounded-lg transition-colors"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    Generating reference...
                  </>
                ) : (
                  "Pay Subscription Now"
                )}
              </button>
            </div>
          ) : (
            /* ============ TAN GENERATED — Instructions ============ */
            <div className="space-y-4">
              {/* Amount */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
                <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-1">
                  Amount to pay
                </p>
                <p className="text-2xl font-bold text-emerald-900 font-mono">
                  MWK {tanData.amount.toLocaleString()}
                </p>
              </div>

              {/* Timed account */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-2 text-center">
                  Send payment to this account
                </p>
                <div className="flex items-center justify-center gap-3">
                  <p className="text-2xl font-mono font-bold text-blue-900 tracking-wider">
                    {tanData.timedAccountNumber}
                  </p>
                  <button
                    onClick={copyAccount}
                    className="p-2 rounded-lg bg-blue-100 hover:bg-blue-200 transition-colors"
                    title="Copy account number"
                  >
                    {copied ? (
                      <CheckCircle size={16} className="text-blue-700" />
                    ) : (
                      <Copy size={16} className="text-blue-700" />
                    )}
                  </button>
                </div>
                <p className="text-[11px] text-blue-600 mt-2 text-center">
                  Use your <strong>school name</strong> as payment reference
                </p>
              </div>

              {/* Airtel Money */}
              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-lg bg-red-100 flex items-center justify-center">
                    <Smartphone size={14} className="text-red-600" />
                  </div>
                  <p className="text-sm font-bold text-gray-900">
                    Airtel Money
                  </p>
                </div>
                <ol className="text-xs text-gray-600 space-y-1 pl-4 list-decimal">
                  <li>
                    Dial <strong>*211#</strong> on your phone
                  </li>
                  <li>
                    Select <strong>Pay Bills</strong>
                  </li>
                  <li>
                    Enter account number:{" "}
                    <strong className="font-mono">
                      {tanData.timedAccountNumber}
                    </strong>
                  </li>
                  <li>
                    Enter amount:{" "}
                    <strong>MWK {tanData.amount.toLocaleString()}</strong>
                  </li>
                  <li>Confirm with your PIN</li>
                  <li className="text-emerald-700 font-medium">
                    Wait 30 seconds — your account unlocks automatically
                  </li>
                </ol>
              </div>

              {/* TNM Mpamba */}
              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center">
                    <Smartphone size={14} className="text-amber-600" />
                  </div>
                  <p className="text-sm font-bold text-gray-900">TNM Mpamba</p>
                </div>
                <ol className="text-xs text-gray-600 space-y-1 pl-4 list-decimal">
                  <li>
                    Dial <strong>*444#</strong> on your phone
                  </li>
                  <li>
                    Select <strong>Pay Bills</strong>
                  </li>
                  <li>
                    Enter account number:{" "}
                    <strong className="font-mono">
                      {tanData.timedAccountNumber}
                    </strong>
                  </li>
                  <li>
                    Enter amount:{" "}
                    <strong>MWK {tanData.amount.toLocaleString()}</strong>
                  </li>
                  <li>Confirm with your PIN</li>
                  <li className="text-emerald-700 font-medium">
                    Wait 30 seconds — your account unlocks automatically
                  </li>
                </ol>
              </div>

              {/* Bank Transfer */}
              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Landmark size={14} className="text-blue-600" />
                  </div>
                  <p className="text-sm font-bold text-gray-900">
                    Bank Transfer
                  </p>
                </div>
                <div className="text-xs text-gray-600 space-y-1">
                  <p>
                    Send to: <strong>SchoolPay Malawi</strong>
                  </p>
                  <p>
                    Account:{" "}
                    <strong className="font-mono">
                      {tanData.timedAccountNumber}
                    </strong>
                  </p>
                  <p>
                    Reference:{" "}
                    <strong>{staff?.school?.name || "School Name"}</strong>
                  </p>
                  <p className="text-[11px] text-gray-500 pt-1">
                    Bank transfers may take 1 business day. Contact support
                    after payment.
                  </p>
                </div>
              </div>

              {/* Auto-unlock notice */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
                <Loader2
                  size={14}
                  className="text-blue-600 shrink-0 mt-0.5 animate-spin"
                />
                <p className="text-[11px] text-blue-800 leading-relaxed">
                  <strong>Watching for payment:</strong> This page refreshes
                  every 5 seconds. Once your payment is received, your dashboard
                  will open automatically.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 p-4">
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-gray-800 py-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
