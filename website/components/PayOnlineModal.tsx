"use client";
import { useState, useEffect, useRef } from "react";
import {
  X,
  Loader2,
  CheckCircle,
  XCircle,
  Copy,
  Smartphone,
  Hash,
  Info,
} from "lucide-react";
import api from "../lib/axios";
import { useAuthStore } from "../store/authStore";

interface Props {
  open: boolean;
  onClose: () => void;
  amount: number;
  term: string;
  academicYear: string;
  onSuccess: () => void;
}

type Step = "form" | "processing" | "success" | "failed";

const MIN_AMOUNT = 100;

export default function PayOnlineModal({
  open,
  onClose,
  amount,
  term,
  academicYear,
  onSuccess,
}: Props) {
  const { student } = useAuthStore();

  const [step, setStep] = useState<Step>("form");
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [receiptNumber, setReceiptNumber] = useState<string | null>(null);
  const [timedAccountNumber, setTimedAccountNumber] = useState<string | null>(
    null,
  );
  const [expiryDate, setExpiryDate] = useState<string | null>(null);
  const [failureReason, setFailureReason] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  const pollRef = useRef<any>(null);
  const tickRef = useRef<any>(null);

  useEffect(() => {
    if (open) {
      setStep("form");
      setError("");
      setPaymentId(null);
      setReceiptNumber(null);
      setTimedAccountNumber(null);
      setExpiryDate(null);
      setFailureReason(null);
      setElapsed(0);
    }
  }, [open]);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, []);

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (amount < MIN_AMOUNT) {
      setError(`Minimum amount is MWK ${MIN_AMOUNT}`);
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/payments/onekhusa/initiate", {
        studentId: student?.id,
        amount,
        term,
        academicYear,
      });

      const data = res.data.data;
      setPaymentId(data.paymentId);
      setReceiptNumber(data.receiptNumber);
      setTimedAccountNumber(data.timedAccountNumber);
      setExpiryDate(data.expiryDate);
      setStep("processing");

      // Start polling for status
      let tries = 0;
      const MAX_TRIES = 200; // 200 * 5s = ~16 minutes (TAN expires in 15)

      pollRef.current = setInterval(async () => {
        tries++;
        if (tries > MAX_TRIES) {
          stopPolling();
          setStep("failed");
          setFailureReason("Payment request expired. Please try again.");
          return;
        }

        try {
          const statusRes = await api.get(
            `/payments/onekhusa/${data.paymentId}/status`,
          );
          const { status, failureReason: reason } = statusRes.data.data;

          if (status === "VERIFIED") {
            stopPolling();
            setStep("success");
            onSuccess();
          } else if (status === "REJECTED") {
            stopPolling();
            setStep("failed");
            setFailureReason(reason || "Payment was declined.");
          }
        } catch {
          // Network blip — keep polling
        }
      }, 5000);

      tickRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          "Failed to start payment. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (timedAccountNumber) {
      navigator.clipboard?.writeText(timedAccountNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    stopPolling();
    onClose();
  };

  if (!open) return null;

  const minutesLeft = expiryDate
    ? Math.max(
        0,
        Math.ceil((new Date(expiryDate).getTime() - Date.now()) / 60000),
      )
    : 0;

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={handleClose}
    >
      <div
        className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center">
              <Smartphone size={16} className="text-emerald-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-800">
                {step === "form" && "Pay Online"}
                {step === "processing" && "Send your payment"}
                {step === "success" && "Payment confirmed"}
                {step === "failed" && "Payment failed"}
              </h3>
              <p className="text-[11px] text-gray-500">
                {step === "form" && "Instant confirmation via OneKhusa"}
                {step === "processing" &&
                  "Transfer to the account number below"}
                {step === "success" && "Receipt saved to your history"}
                {step === "failed" && "You can try again"}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1 text-gray-400 hover:text-gray-600"
          >
            <X size={18} />
          </button>
        </div>

        {/* ==================== FORM ==================== */}
        {step === "form" && (
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2.5 rounded-lg text-xs">
                {error}
              </div>
            )}

            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-center">
              <p className="text-[11px] text-emerald-700 uppercase tracking-wide font-medium">
                Amount to pay
              </p>
              <p className="text-2xl font-bold text-emerald-700 mt-1">
                MWK {amount.toLocaleString()}
              </p>
              <p className="text-[11px] text-emerald-600 mt-1">
                {term.replace("_", " ")} • {academicYear}
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3.5 flex items-start gap-2.5">
              <Info size={14} className="text-blue-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-blue-800">
                  How it works
                </p>
                <ol className="text-[11px] text-blue-700 mt-1 space-y-0.5 list-decimal list-inside">
                  <li>Click "Get Account Number" below</li>
                  <li>We'll give you a temporary account number</li>
                  <li>Open your bank or mobile money app</li>
                  <li>Send MWK {amount.toLocaleString()} to that number</li>
                  <li>Payment confirms automatically ✅</li>
                </ol>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium py-3 rounded-xl text-sm transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Generating Account Number...
                </>
              ) : (
                <>
                  <Hash size={16} />
                  Get Account Number
                </>
              )}
            </button>
          </form>
        )}

        {/* ==================== PROCESSING — SHOW TAN ==================== */}
        {step === "processing" && timedAccountNumber && (
          <div className="p-5">
            <div className="bg-emerald-50 border-2 border-emerald-300 rounded-xl p-4 mb-4">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle size={16} className="text-emerald-600" />
                <p className="text-xs font-semibold text-emerald-800">
                  Account number ready
                </p>
              </div>

              <p className="text-[11px] text-emerald-700 mb-1">
                Send this exact amount to the account below:
              </p>

              <div className="bg-white rounded-lg p-3 mb-3 border border-emerald-200">
                <p className="text-[10px] text-gray-500 uppercase tracking-wide">
                  Pay Bill / Account Number
                </p>
                <div className="flex items-center justify-between gap-2 mt-1">
                  <p className="text-xl font-bold font-mono text-emerald-700 tracking-wider">
                    {timedAccountNumber}
                  </p>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className={`flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg transition-all ${
                      copied
                        ? "bg-emerald-600 text-white"
                        : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                    }`}
                  >
                    {copied ? (
                      <>
                        <CheckCircle size={11} /> Copied
                      </>
                    ) : (
                      <>
                        <Copy size={11} /> Copy
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-lg p-3 border border-emerald-200">
                <p className="text-[10px] text-gray-500 uppercase tracking-wide">
                  Amount
                </p>
                <p className="text-lg font-bold text-emerald-700 mt-1">
                  MWK {amount.toLocaleString()}
                </p>
              </div>

              <p className="text-[10px] text-emerald-600 mt-3 text-center">
                This account number expires in{" "}
                <strong>
                  {minutesLeft} minute{minutesLeft === 1 ? "" : "s"}
                </strong>
              </p>
            </div>

            {/* 🎯 DETAILED INSTRUCTIONS BLOCK */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-4">
              <p className="text-[11px] font-bold text-slate-700 uppercase tracking-wide mb-3">
                How to pay from your phone:
              </p>

              <div className="space-y-3 text-[11px] text-slate-600">
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1 shrink-0" />
                  <p>
                    <strong>Airtel Money:</strong> Dial{" "}
                    <code className="bg-slate-200 px-1 rounded">*211#</code> →
                    Select <strong>5 (Pay Bill)</strong> → Enter Account Number{" "}
                    <strong>{timedAccountNumber}</strong> → Enter Amount{" "}
                    <strong>{amount.toLocaleString()}</strong> → Enter PIN.
                  </p>
                </div>

                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1 shrink-0" />
                  <p>
                    <strong>TNM Mpamba:</strong> Dial{" "}
                    <code className="bg-slate-200 px-1 rounded">*444#</code> →
                    Select <strong>4 (Pay Bill)</strong> → Enter Account Number{" "}
                    <strong>{timedAccountNumber}</strong> → Enter Amount{" "}
                    <strong>{amount.toLocaleString()}</strong> → Enter PIN.
                  </p>
                </div>

                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1 shrink-0" />
                  <p>
                    <strong>Bank App:</strong> Open your bank app → Select{" "}
                    <strong>Pay Bill / Merchant</strong> → Enter Account Number{" "}
                    <strong>{timedAccountNumber}</strong> → Enter Amount{" "}
                    <strong>{amount.toLocaleString()}</strong>.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 text-xs text-gray-500 mb-4">
              <Loader2 size={12} className="animate-spin" />
              <span>Waiting for your payment... {elapsed}s</span>
            </div>

            <div className="pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={handleClose}
                className="w-full text-xs text-gray-500 hover:text-gray-700 py-2"
              >
                Close (payment will still confirm)
              </button>
            </div>
          </div>
        )}

        {/* ==================== SUCCESS ==================== */}
        {step === "success" && (
          <div className="p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={32} className="text-emerald-600" />
            </div>
            <h3 className="text-base font-semibold text-gray-800 mb-1">
              Payment confirmed
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              Your account has been credited automatically.
            </p>

            {receiptNumber && (
              <div className="bg-gray-50 rounded-xl p-3 mb-4">
                <p className="text-[11px] text-gray-500 uppercase tracking-wide">
                  Receipt Number
                </p>
                <p className="text-sm font-bold font-mono text-gray-800 mt-0.5">
                  {receiptNumber}
                </p>
              </div>
            )}

            <button
              onClick={handleClose}
              className="w-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white font-medium py-3 rounded-xl text-sm transition-all"
            >
              Done
            </button>
          </div>
        )}

        {/* ==================== FAILED ==================== */}
        {step === "failed" && (
          <div className="p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <XCircle size={32} className="text-red-600" />
            </div>
            <h3 className="text-base font-semibold text-gray-800 mb-1">
              Payment not completed
            </h3>
            <p className="text-xs text-gray-500 leading-relaxed mb-4">
              {failureReason || "The payment could not be completed."}
            </p>

            <div className="flex gap-2">
              <button
                onClick={handleClose}
                className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setStep("form");
                  setError("");
                  setFailureReason(null);
                }}
                className="flex-1 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white py-2.5 rounded-xl text-sm font-medium"
              >
                Try Again
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
