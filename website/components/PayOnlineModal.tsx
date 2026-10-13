"use client";
import { useState, useEffect, useRef } from "react";
import {
  X,
  Loader2,
  Smartphone,
  CheckCircle,
  XCircle,
  Clock,
  Phone,
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

const MOBILE_METHODS = [
  { value: "AIRTEL", label: "Airtel Money", color: "red", emoji: "🔴" },
  { value: "MPAMBA", label: "TNM Mpamba", color: "amber", emoji: "🟡" },
];

const MIN_AMOUNT = 50;

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
  const [method, setMethod] = useState<"AIRTEL" | "MPAMBA">("AIRTEL");
  const [phone, setPhone] = useState("");
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [receiptNumber, setReceiptNumber] = useState<string | null>(null);
  const [failureReason, setFailureReason] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [elapsed, setElapsed] = useState(0);

  const pollRef = useRef<any>(null);
  const tickRef = useRef<any>(null);

  // Reset on open
  useEffect(() => {
    if (open) {
      setStep("form");
      setPhone(student?.parentPhone || "");
      setError("");
      setPaymentId(null);
      setReceiptNumber(null);
      setFailureReason(null);
      setElapsed(0);
    }
  }, [open, student?.parentPhone]);

  // Cleanup on unmount / close
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

    const cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length < 9) {
      setError("Enter a valid phone number");
      return;
    }

    if (amount < MIN_AMOUNT) {
      setError(`Minimum amount is MWK ${MIN_AMOUNT}`);
      return;
    }

    try {
      const res = await api.post("/payments/malipo/initiate", {
        studentId: student?.id,
        amount,
        method,
        phone: `+265${cleanPhone.slice(-9)}`,
        term,
        academicYear,
      });

      setPaymentId(res.data.data.paymentId);
      setReceiptNumber(res.data.data.receiptNumber);
      setStep("processing");

      // Start polling
      let tries = 0;
      const MAX_TRIES = 60; // ~3 min at 3s interval

      pollRef.current = setInterval(async () => {
        tries++;
        if (tries > MAX_TRIES) {
          stopPolling();
          setStep("failed");
          setFailureReason("Payment timed out. Please try again.");
          return;
        }

        try {
          const statusRes = await api.get(
            `/payments/malipo/${res.data.data.paymentId}/status`,
          );
          const {
            status,
            malipoStatus,
            failureReason: reason,
          } = statusRes.data.data;

          if (status === "VERIFIED") {
            stopPolling();
            setStep("success");
            onSuccess();
          } else if (status === "REJECTED") {
            stopPolling();
            setStep("failed");
            setFailureReason(reason || "Payment was declined.");
          }
          // else: still PENDING or Processing → keep polling
        } catch (err) {
          // Network blip — keep polling
        }
      }, 3000);

      // Elapsed counter (updates the "waiting" text)
      tickRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          "Failed to start payment. Please try again.",
      );
    }
  };

  const handleClose = () => {
    stopPolling();
    onClose();
  };

  const handleRetry = () => {
    setStep("form");
    setError("");
    setFailureReason(null);
    setElapsed(0);
  };

  if (!open) return null;

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
                {step === "processing" && "Waiting for confirmation"}
                {step === "success" && "Payment confirmed"}
                {step === "failed" && "Payment failed"}
              </h3>
              <p className="text-[11px] text-gray-500">
                {step === "form" && "Pay instantly with mobile money"}
                {step === "processing" && "Check your phone"}
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

            {/* Amount display */}
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

            {/* Method picker */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Mobile Money Provider
              </label>
              <div className="grid grid-cols-2 gap-2">
                {MOBILE_METHODS.map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setMethod(m.value as "AIRTEL" | "MPAMBA")}
                    className={`py-3 px-3 rounded-xl text-sm font-medium border-2 transition-all flex items-center gap-2 justify-center ${
                      method === m.value
                        ? "border-[var(--color-primary)] bg-[var(--color-primary-light)] text-[var(--color-primary)]"
                        : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                    }`}
                  >
                    <span>{m.emoji}</span>
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Phone Number
              </label>
              <div className="flex">
                <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-gray-200 bg-gray-50 text-sm text-gray-600 font-medium">
                  +265
                </span>
                <input
                  type="tel"
                  inputMode="numeric"
                  value={phone}
                  onChange={(e) =>
                    setPhone(e.target.value.replace(/\D/g, "").slice(0, 9))
                  }
                  placeholder="995049331"
                  required
                  maxLength={9}
                  className="flex-1 min-w-0 px-3 py-2.5 border border-gray-200 rounded-r-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                />
              </div>
              <p className="text-[11px] text-gray-400 mt-1">
                Enter the number that will receive the prompt
              </p>
            </div>

            <button
              type="submit"
              className="w-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white font-medium py-3 rounded-xl text-sm transition-all flex items-center justify-center gap-2"
            >
              <Smartphone size={16} />
              Pay MWK {amount.toLocaleString()}
            </button>

            <p className="text-[11px] text-gray-400 text-center leading-relaxed">
              You'll receive a USSD prompt on your phone. Enter your PIN to
              confirm. The payment confirms automatically — no receipt upload
              needed.
            </p>
          </form>
        )}

        {/* ==================== PROCESSING ==================== */}
        {step === "processing" && (
          <div className="p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-[var(--color-primary-light)] flex items-center justify-center mx-auto mb-4">
              <Loader2
                size={28}
                className="animate-spin text-[var(--color-primary)]"
              />
            </div>
            <h3 className="text-base font-semibold text-gray-800 mb-1">
              Check your phone
            </h3>
            <p className="text-xs text-gray-500 leading-relaxed mb-4">
              A prompt was sent to <strong>{phone}</strong>. Enter your PIN to
              confirm the payment of{" "}
              <strong>MWK {amount.toLocaleString()}</strong>.
            </p>

            <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
              <Clock size={12} />
              <span>Waiting... {elapsed}s</span>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={handleClose}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                Close (payment will still confirm in background)
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
              Payment failed
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
                onClick={handleRetry}
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
