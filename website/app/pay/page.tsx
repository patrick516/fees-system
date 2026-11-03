"use client";
import { useEffect, useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Upload,
  CheckCircle,
  Loader2,
  X,
  Zap,
  Smartphone,
  AlertCircle,
  Building2,
} from "lucide-react";
import api from "../../lib/axios";
import { useAuthStore } from "../../store/authStore";
import { getCurrentAcademicYear } from "../../lib/utils";
import { useActiveTerm } from "../../hooks/useActiveTerm";
import PayOnlineModal from "../../components/PayOnlineModal";

type PayMode = "online" | "receipt";

const formatAmount = (val: string) => {
  if (!val) return "";
  const clean = val.replace(/[^0-9]/g, "");
  if (!clean) return "";
  return Number(clean).toLocaleString("en-US");
};

export default function PayPage() {
  const router = useRouter();
  const { isAuthenticated, student, _hasHydrated } = useAuthStore();

  const [mode, setMode] = useState<PayMode | null>(null);

  const [form, setForm] = useState({
    amount: "",
    term: "TERM_1",
    academicYear: getCurrentAcademicYear(),
  });

  const [termStatus, setTermStatus] = useState<any>(null);
  const [termStatusLoading, setTermStatusLoading] = useState(false);
  const [paymentInfo, setPaymentInfo] = useState<any>(null);

  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [receiptMethod, setReceiptMethod] = useState("");
  const [bankReference, setBankReference] = useState("");

  const [showOnlineModal, setShowOnlineModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const isUploadingRef = useRef(false);

  const { academicYear: activeYear, activeTerm: currentTerm } = useActiveTerm();

  // Build the list of available manual methods (Bank, Airtel, TNM)
  // Build the list of available manual methods (Bank, Airtel, TNM)
  const availablePaymentMethods = useMemo(() => {
    if (!paymentInfo) return [];
    const methods = [];

    // 1. Banks First
    if (paymentInfo.bankAccounts && paymentInfo.bankAccounts.length > 0) {
      paymentInfo.bankAccounts.forEach((bank: any) => {
        let enumVal = bank.bankName.toUpperCase().replace(/\s+/g, "_");

        let displayName = bank.bankName;
        if (displayName.toLowerCase().includes("national bank")) {
          displayName = "NBM";
        }

        methods.push({
          value: enumVal,
          label: displayName,
          accountName: bank.accountName,
          iconUrl: bank.logoUrl || null,
        });
      });
    }

    // 2. Mobile Money
    if (paymentInfo.airtelMoneyNumber) {
      methods.push({
        value: "AIRTEL_MONEY",
        label: "Airtel",
        accountName: paymentInfo.airtelMoneyName || "",
        iconUrl: "/images/AirtMoney.jpeg",
      });
    }

    if (paymentInfo.mpambaNumber) {
      methods.push({
        value: "TNM_MPAMBA",
        label: "Mpamba",
        accountName: paymentInfo.mpambaName || "",
        iconUrl: "/images/TNMPAMBA.jpeg",
      });
    }

    return methods;
  }, [paymentInfo]);

  // Automatically select the first manual method if they choose "receipt" mode
  useEffect(() => {
    if (availablePaymentMethods.length > 0 && !receiptMethod) {
      setReceiptMethod(availablePaymentMethods[0].value);
    }
  }, [availablePaymentMethods, receiptMethod]);

  useEffect(() => {
    if (!_hasHydrated) return;
    if (!isAuthenticated) router.push("/login");
  }, [_hasHydrated, isAuthenticated]);

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      academicYear: activeYear || prev.academicYear,
      term: currentTerm || prev.term,
    }));
  }, [activeYear, currentTerm]);

  useEffect(() => {
    if (!student?.id || !form.term) return;
    setTermStatusLoading(true);
    api
      .get(
        `/schools/student-term-status/${student.id}?term=${form.term}&academicYear=${form.academicYear}`,
      )
      .then((res) => setTermStatus(res.data.data))
      .catch(() => setTermStatus(null))
      .finally(() => setTermStatusLoading(false));
  }, [form.term, form.academicYear, student]);

  useEffect(() => {
    if (!student?.school?.id) return;
    api
      .get(`/schools/payment-info/${student.school.id}`)
      .then((res) => setPaymentInfo(res.data.data))
      .catch(() => {});
  }, [student]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError("File too large — max 5MB");
      return;
    }
    setReceiptFile(file);
    const reader = new FileReader();
    reader.onload = () => setReceiptPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const clearReceipt = () => {
    setReceiptFile(null);
    setReceiptPreview(null);
  };

  const handleReceiptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isUploadingRef.current) return;
    setError("");

    const amount = parseFloat(form.amount);
    if (!amount || amount <= 0) {
      setError("Please enter a valid amount");
      return;
    }
    if (!receiptFile) {
      setError("Please upload your payment receipt");
      return;
    }

    setLoading(true);
    isUploadingRef.current = true;
    try {
      const formData = new FormData();
      formData.append("studentId", student?.id || "");
      formData.append("amount", form.amount);
      formData.append("paymentMethod", receiptMethod);
      formData.append("term", form.term);
      formData.append("academicYear", form.academicYear);
      if (bankReference) formData.append("bankReference", bankReference);
      formData.append("receipt", receiptFile);

      await api.post("/payments/submit", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setSuccess(true);
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          "Failed to submit payment. Please try again.",
      );
    } finally {
      setLoading(false);
      isUploadingRef.current = false;
    }
  };

  const handlePayOnlineClick = () => {
    setError("");
    const amount = parseFloat(form.amount);
    if (!amount || amount <= 0) {
      setError("Please enter an amount first");
      return;
    }
    setShowOnlineModal(true);
  };

  const amountNum = parseFloat(form.amount) || 0;
  const canSubmitReceipt = amountNum > 0 && !!receiptFile;
  const canPayOnline = amountNum > 0;

  if (!_hasHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--color-primary)]" />
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-sm border border-gray-100">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={32} className="text-emerald-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Payment Submitted
          </h2>
          <p className="text-sm text-gray-500 mb-6 leading-relaxed">
            {mode === "online"
              ? "Your payment has been confirmed automatically."
              : "Your payment has been submitted. The school will verify it shortly."}
          </p>
          <div className="space-y-3">
            <button
              onClick={() => router.push("/history")}
              className="w-full bg-[var(--color-primary)] text-white py-3.5 rounded-2xl text-sm font-semibold hover:bg-[var(--color-primary-dark)] transition-colors"
            >
              View Payment History
            </button>
            <button
              onClick={() => router.push("/dashboard")}
              className="w-full border border-gray-200 text-gray-600 py-3.5 rounded-2xl text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-40">
      {/* HEADER */}
      <header className="sticky top-0 z-20 bg-white border-b border-gray-100">
        <div className="max-w-lg mx-auto px-4 py-3 relative">
          <button
            onClick={() => router.push("/dashboard")}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-2 -ml-2 hover:bg-gray-100 rounded-xl transition"
            aria-label="Back"
          >
            <ArrowLeft size={20} className="text-gray-700" />
          </button>
          <div className="text-center">
            <h1 className="text-lg font-bold text-gray-900">Pay Fees</h1>
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
        {/* STUDENT CARD */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 bg-blue-50 rounded-full flex items-center justify-center text-[var(--color-primary)] font-bold text-xl shrink-0">
              {student?.fullName?.charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="text-base font-bold text-gray-900 truncate leading-tight">
                {student?.fullName}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {student?.class} • {student?.studentCode}
              </p>
            </div>
          </div>
        </div>

        {/* FEE SUMMARY */}
        <div>
          <h2 className="text-sm font-bold text-gray-900 mb-3 px-1">
            Term Summary
          </h2>

          {termStatusLoading && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center">
              <Loader2
                size={16}
                className="animate-spin text-gray-400 mx-auto"
              />
            </div>
          )}

          {termStatus &&
            !termStatusLoading &&
            termStatus.termStatus.hasFeeStructure && (
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-blue-50 rounded-2xl p-3 border border-blue-100">
                  <p className="text-[10px] font-semibold text-blue-700 uppercase tracking-wide">
                    Required
                  </p>
                  <p className="text-sm font-bold text-gray-900 mt-1">
                    MWK{" "}
                    {Number(
                      termStatus.termStatus.requiredAmount || 0,
                    ).toLocaleString()}
                  </p>
                </div>
                <div className="bg-emerald-50 rounded-2xl p-3 border border-emerald-100">
                  <p className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wide">
                    Paid
                  </p>
                  <p className="text-sm font-bold text-gray-900 mt-1">
                    MWK{" "}
                    {Number(
                      termStatus.termStatus.totalPaidThisTerm || 0,
                    ).toLocaleString()}
                  </p>
                </div>
                <div className="bg-amber-50 rounded-2xl p-3 border border-amber-100">
                  <p className="text-[10px] font-semibold text-amber-700 uppercase tracking-wide">
                    Balance
                  </p>
                  <p className="text-sm font-bold text-gray-900 mt-1">
                    MWK{" "}
                    {Number(
                      termStatus.termStatus.balanceRemaining || 0,
                    ).toLocaleString()}
                  </p>
                </div>
              </div>
            )}
        </div>

        {/* AMOUNT INPUT */}
        <div>
          <h2 className="text-sm font-bold text-gray-900 mb-3 px-1">
            How much are you paying?
          </h2>
          <div className="bg-white rounded-2xl border-2 border-gray-200 p-4 flex items-center gap-3 focus-within:border-[var(--color-primary)] transition-colors">
            <span className="text-base font-bold text-[var(--color-primary)] shrink-0">
              MWK
            </span>
            <div className="w-px h-8 bg-gray-200 shrink-0" />
            <input
              type="text"
              inputMode="numeric"
              value={formatAmount(form.amount)}
              onChange={(e) => {
                const raw = e.target.value.replace(/,/g, "");
                if (/^\d*$/.test(raw)) {
                  setForm({ ...form, amount: raw });
                }
              }}
              placeholder="0"
              className="flex-1 min-w-0 border-0 outline-none text-2xl font-bold text-gray-900 placeholder-gray-300 bg-transparent"
            />
          </div>
        </div>

        {/* ERROR */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-sm flex items-start gap-2">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* ============ PAYMENT FLOW ============ */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-gray-900 mb-1 px-1">
            Select Payment Method
          </h2>

          {/* HORIZONTAL SCROLLING LIST (SQUEEZED) */}
          <div className="flex overflow-x-auto gap-2 pb-2 snap-x hide-scrollbar">
            {availablePaymentMethods.map((m) => {
              const isActive = mode === "receipt" && receiptMethod === m.value;
              return (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => {
                    setMode("receipt");
                    setReceiptMethod(m.value);
                  }}
                  className={`relative flex-shrink-0 flex flex-col items-center justify-center gap-1 p-2 w-[80px] h-[84px] rounded-2xl border-2 transition-all snap-start ${
                    isActive
                      ? "border-[var(--color-primary)] bg-blue-50 shadow-sm"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                >
                  {/* 🎯 Dynamic Logo or Fallback Icon */}
                  {m.iconUrl ? (
                    <img
                      src={m.iconUrl}
                      alt={m.label}
                      className="w-8 h-8 object-contain mb-0.5"
                    />
                  ) : (
                    <Building2 size={24} className="text-gray-500 mb-0.5" />
                  )}

                  <span
                    className={`text-[10px] font-bold text-center leading-tight line-clamp-2 ${isActive ? "text-[var(--color-primary)]" : "text-gray-700"}`}
                  >
                    {m.label}
                  </span>

                  {isActive && (
                    <div className="absolute top-1 right-1 bg-white rounded-full">
                      <CheckCircle
                        size={14}
                        className="text-[var(--color-primary)]"
                      />
                    </div>
                  )}
                </button>
              );
            })}

            {/* 2. PAY ONLINE LAST */}
            <button
              type="button"
              onClick={() => setMode("online")}
              className={`relative flex-shrink-0 flex flex-col items-center justify-center gap-1.5 p-2 w-[76px] h-[80px] rounded-2xl border-2 transition-all snap-start ${
                mode === "online"
                  ? "border-emerald-500 bg-emerald-50 shadow-sm"
                  : "border-gray-200 bg-white hover:border-gray-300"
              }`}
            >
              <img
                src="/images/payonline.png"
                alt="Online"
                className="w-7 h-7 object-contain mb-0.5"
              />
              <span
                className={`text-[10px] font-bold text-center leading-tight ${mode === "online" ? "text-emerald-700" : "text-gray-700"}`}
              >
                OnlinePay
              </span>
              {mode === "online" && (
                <CheckCircle
                  size={14}
                  className="absolute top-1 right-1 text-emerald-500"
                />
              )}
            </button>
          </div>

          {/* EMPTY STATE IF NO METHODS EXIST */}
          {availablePaymentMethods.length === 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center mt-2">
              <AlertCircle size={20} className="text-amber-600 mx-auto mb-2" />
              <p className="text-sm font-semibold text-amber-900">
                No manual methods available
              </p>
              <p className="text-xs text-amber-700 mt-1">
                Your school has not added bank or mobile money details yet.
              </p>
            </div>
          )}
        </div>

        {/* 3. DYNAMIC FORMS BASED ON SELECTION */}
        <div className="pt-2">
          {/* IF RECEIPT MODE IS SELECTED */}
          {mode === "receipt" && (
            <div className="space-y-4 animate-fade-in">
              {/* Compact Payment Details */}
              {/* Compact Payment Details */}
              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
                <p className="text-xs font-semibold text-blue-900 mb-2">
                  Send payment to:
                </p>

                {/* 🎯 Dynamic rendering based on selection */}
                {availablePaymentMethods.find((m) => m.value === receiptMethod)
                  ?.accountName && (
                  <p className="text-sm text-blue-900 font-bold mb-1 border-b border-blue-200 pb-1">
                    Name:{" "}
                    {
                      availablePaymentMethods.find(
                        (m) => m.value === receiptMethod,
                      )?.accountName
                    }
                  </p>
                )}

                {receiptMethod === "AIRTEL_MONEY" &&
                  paymentInfo?.airtelMoneyNumber && (
                    <p className="text-sm text-blue-800">
                      Airtel:{" "}
                      <strong className="font-mono bg-white px-1 rounded">
                        {paymentInfo.airtelMoneyNumber}
                      </strong>
                    </p>
                  )}
                {receiptMethod === "TNM_MPAMBA" &&
                  paymentInfo?.mpambaNumber && (
                    <p className="text-sm text-blue-800">
                      Mpamba:{" "}
                      <strong className="font-mono bg-white px-1 rounded">
                        {paymentInfo.mpambaNumber}
                      </strong>
                    </p>
                  )}
                {receiptMethod.includes("BANK") &&
                  paymentInfo?.bankAccounts && (
                    <div className="space-y-1">
                      {paymentInfo.bankAccounts
                        .filter(
                          (b: any) =>
                            b.bankName.toUpperCase().replace(/\s+/g, "_") ===
                            receiptMethod,
                        )
                        .map((b: any, i: number) => (
                          <p key={i} className="text-sm text-blue-800">
                            Account:{" "}
                            <strong className="font-mono bg-white px-1 rounded">
                              {b.accountNumber}
                            </strong>
                          </p>
                        ))}
                    </div>
                  )}
                <p className="text-xs text-blue-700 mt-3 pt-2 border-t border-blue-200">
                  Reference:{" "}
                  <strong className="font-mono">{student?.studentCode}</strong>
                </p>
              </div>

              <input
                value={bankReference}
                onChange={(e) => setBankReference(e.target.value)}
                placeholder="Transaction reference / Receipt No. (optional)"
                className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors"
              />

              {!receiptPreview ? (
                <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-gray-300 rounded-2xl cursor-pointer hover:border-[var(--color-primary)] hover:bg-blue-50/30 transition-all">
                  <Upload size={22} className="text-gray-400 mb-1.5" />
                  <p className="text-sm font-semibold text-gray-600">
                    Upload Receipt
                  </p>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    JPG, PNG or PDF • max 5MB
                  </p>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleFileChange}
                    className="hidden"
                    capture="environment"
                  />
                </label>
              ) : (
                <div className="relative">
                  {receiptFile?.type === "application/pdf" ? (
                    <div className="w-full h-56 rounded-2xl border border-gray-200 overflow-hidden bg-gray-50">
                      <embed
                        src={receiptPreview || undefined}
                        type="application/pdf"
                        className="w-full h-full"
                      />
                    </div>
                  ) : (
                    <img
                      src={receiptPreview}
                      alt="Receipt preview"
                      className="w-full h-48 object-cover rounded-2xl border border-gray-200"
                    />
                  )}
                  <button
                    type="button"
                    onClick={clearReceipt}
                    className="absolute top-2 right-2 w-8 h-8 bg-red-600 text-white rounded-full flex items-center justify-center hover:bg-red-700 shadow-md"
                  >
                    <X size={14} />
                  </button>
                  <p className="text-[11px] text-gray-500 mt-2 text-center truncate px-8">
                    {receiptFile?.name}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* IF ONLINE MODE IS SELECTED */}
          {mode === "online" && (
            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 space-y-3 animate-fade-in">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                  <Smartphone size={18} className="text-emerald-700" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-emerald-900">
                    Instant Payment
                  </h3>
                  <p className="text-[11px] text-emerald-700 mt-0.5 leading-relaxed">
                    Pay instantly with Airtel Money or TNM Mpamba. Click the
                    green button below to generate a prompt on your phone.
                  </p>
                </div>
              </div>
              <div className="space-y-1.5 pt-2 border-t border-emerald-200">
                <div className="flex items-center gap-2 text-xs text-emerald-800">
                  <CheckCircle size={12} className="shrink-0" />
                  <span>Payment confirms automatically in seconds</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-emerald-800">
                  <CheckCircle size={12} className="shrink-0" />
                  <span>Balance updates instantly</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-emerald-800">
                  <CheckCircle size={12} className="shrink-0" />
                  <span>Receipt sent via SMS &amp; email</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* STICKY BOTTOM BAR */}
      <div className="fixed bottom-0 left-0 right-0 z-20 bg-white border-t border-gray-100 p-4">
        <div className="max-w-lg mx-auto">
          {mode === "receipt" && (
            <button
              type="button"
              onClick={handleReceiptSubmit}
              disabled={loading || !canSubmitReceipt}
              className="w-full flex items-center justify-center gap-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white py-3.5 rounded-2xl font-bold text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Submitting...
                </>
              ) : (
                <>
                  <Upload size={16} /> Upload Receipt
                </>
              )}
            </button>
          )}

          {mode === "online" && (
            <button
              type="button"
              onClick={handlePayOnlineClick}
              disabled={!canPayOnline}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-br from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white py-3.5 rounded-2xl font-bold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
            >
              <Zap size={16} />
              {canPayOnline
                ? `Pay MWK ${amountNum.toLocaleString()} Online`
                : "Enter an amount to continue"}
            </button>
          )}

          {!mode && (
            <button
              disabled
              className="w-full flex items-center justify-center gap-2 bg-gray-200 text-gray-400 py-3.5 rounded-2xl font-bold text-sm cursor-not-allowed"
            >
              Select a payment method above
            </button>
          )}
        </div>
      </div>

      <PayOnlineModal
        open={showOnlineModal}
        onClose={() => setShowOnlineModal(false)}
        amount={amountNum}
        term={form.term}
        academicYear={form.academicYear}
        onSuccess={() => {
          if (student?.id && form.term) {
            api
              .get(
                `/schools/student-term-status/${student.id}?term=${form.term}&academicYear=${form.academicYear}`,
              )
              .then((res) => setTermStatus(res.data.data))
              .catch(() => {});
          }
          setShowOnlineModal(false);
          setSuccess(true);
        }}
      />
    </div>
  );
}
