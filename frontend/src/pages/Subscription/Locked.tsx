import { useEffect, useState, useRef } from "react";
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

  //  Manual verification state
  const [showComplaintModal, setShowComplaintModal] = useState(false);
  const [complaintMessage, setComplaintMessage] = useState("");
  const [complaintReference, setComplaintReference] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [submittingComplaint, setSubmittingComplaint] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  //  Auto-poll: check every 5s if the subscription has been unlocked
  //  Auto-poll: check every 5s if the subscription has been unlocked
  // 🎯 Ref to prevent multiple triggers
  const hasUnlockedRef = useRef(false);

  // 🎯 Auto-poll: check every 5s if the subscription has been unlocked
  useEffect(() => {
    const checkUnlock = async () => {
      // If we already triggered the unlock, don't do anything else
      if (hasUnlockedRef.current) return;

      try {
        const res = await api.get("/auth/me");
        const newStatus = res.data?.data?.school?.subscriptionStatus;

        if (newStatus && newStatus !== "LOCKED" && newStatus !== "SUSPENDED") {
          hasUnlockedRef.current = true; // 🛑 Stop future checks
          setUnlocking(true);

          toast.success("Payment received! Unlocking your account...");

          // Clear the interval immediately to stop the loop
          clearInterval(interval);

          setTimeout(() => {
            //  Clear old stale data so the dashboard doesn't bounce us back
            localStorage.removeItem("auth-storage"); // Or whatever your Zustand persist key is

            //  Use location.replace instead of href so the back button doesn't loop
            window.location.replace("/dashboard");
          }, 1200);
        }
      } catch (err) {
        // Silent — still locked
      }
    };

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

  //  Manual verification submit handler
  const handleSubmitComplaint = async () => {
    if (!complaintReference.trim() && !proofFile) {
      toast.error("Please provide a reference number or upload a screenshot.");
      return;
    }

    setSubmittingComplaint(true);
    try {
      const formData = new FormData();
      if (complaintMessage.trim())
        formData.append("message", complaintMessage.trim());
      if (complaintReference.trim())
        formData.append("referenceNumber", complaintReference.trim());
      if (proofFile) formData.append("proof", proofFile);

      const res = await api.post(
        "/schools/subscription/request-manual-verification",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } },
      );

      toast.success(
        res.data.message ||
          "Request submitted. The platform owner will verify shortly.",
      );
      setShowComplaintModal(false);
      setComplaintMessage("");
      setComplaintReference("");
      setProofFile(null);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to submit request");
    } finally {
      setSubmittingComplaint(false);
    }
  };

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
            <div className="space-y-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
                <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-1">
                  Amount to pay
                </p>
                <p className="text-2xl font-bold text-emerald-900 font-mono">
                  MWK {tanData.amount.toLocaleString()}
                </p>
              </div>

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

              {/* 🎯 CORRECTED Airtel Money Steps */}
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
                    Select <strong>1. Send Money</strong>
                  </li>
                  <li>
                    Select <strong>OneKhusa</strong> (or "Others")
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

              {/* TNM Mpamba Steps — same pattern, verify if you can */}
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
                    Select <strong>1. Send Money</strong>
                  </li>
                  <li>
                    Select <strong>OneKhusa</strong>
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

              {/* 🎯 Manual verification request */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
                <p className="text-sm font-semibold text-amber-900">
                  Already paid but still locked?
                </p>
                <p className="text-xs text-amber-700 leading-relaxed">
                  If you have sent the money but your account has not unlocked,
                  request manual verification. Provide a reference number or
                  upload a screenshot of your payment.
                </p>
                <button
                  onClick={() => setShowComplaintModal(true)}
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white py-2.5 rounded-lg text-sm font-semibold transition-colors"
                >
                  Request Manual Verification
                </button>
              </div>
            </div>
          )}
        </div>
        <div className="border-t border-gray-100 p-4">
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-gray-800 py-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </div>

      {/* 🎯 Manual Verification Modal */}
      {showComplaintModal && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center px-4"
          onClick={() => !submittingComplaint && setShowComplaintModal(false)}
        >
          <div
            className="bg-white rounded-xl w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-slate-900 mb-1">
              Request Manual Verification
            </h3>
            <p className="text-sm text-slate-500 mb-4">
              Provide a transaction reference number <strong>or</strong> upload
              a screenshot of your payment. At least one is required.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Transaction Reference
                </label>
                <input
                  value={complaintReference}
                  onChange={(e) => setComplaintReference(e.target.value)}
                  placeholder="e.g. WB261030.1232.289241"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  OR Upload Screenshot
                </label>
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border border-dashed border-slate-300 rounded-lg p-4 text-center cursor-pointer hover:bg-slate-50 transition-colors"
                >
                  <span className="text-sm text-slate-600">
                    {proofFile
                      ? proofFile.name
                      : "Click to browse or take a photo"}
                  </span>
                </button>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Additional Notes (Optional)
                </label>
                <textarea
                  value={complaintMessage}
                  onChange={(e) => setComplaintMessage(e.target.value)}
                  rows={2}
                  placeholder="Any other details..."
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowComplaintModal(false)}
                disabled={submittingComplaint}
                className="rounded-lg border border-slate-300 hover:bg-slate-50 text-sm font-medium px-4 py-2"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitComplaint}
                disabled={submittingComplaint}
                className="rounded-lg bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white text-sm font-semibold px-4 py-2"
              >
                {submittingComplaint ? "Submitting..." : "Submit Request"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
