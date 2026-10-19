"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Upload,
  CheckCircle,
  Loader2,
  X,
  Zap,
  FileImage,
  Smartphone,
  AlertCircle,
} from "lucide-react";
import api from "../../lib/axios";
import { useAuthStore } from "../../store/authStore";
import { getCurrentAcademicYear } from "../../lib/utils";
import { useActiveTerm } from "../../hooks/useActiveTerm";
import PayOnlineModal from "../../components/PayOnlineModal";

type PayMode = "online" | "receipt";

const paymentMethods = [
  { value: "AIRTEL_MONEY", label: "Airtel Money", emoji: "🔴" },
  { value: "TNM_MPAMBA", label: "TNM Mpamba", emoji: "🟡" },
  { value: "NATIONAL_BANK", label: "National Bank", emoji: "🏦" },
  { value: "STANDARD_BANK", label: "Standard Bank", emoji: "🏦" },
  { value: "FDH_BANK", label: "FDH Bank", emoji: "🏦" },
  { value: "NBS_BANK", label: "NBS Bank", emoji: "🏦" },
  { value: "OTHER_BANK", label: "Other Bank", emoji: "🏦" },
];

export default function PayPage() {
  const router = useRouter();
  const { isAuthenticated, student, _hasHydrated } = useAuthStore();

  const [mode, setMode] = useState<PayMode>("receipt");

  // Shared state
  const [form, setForm] = useState({
    amount: "",
    term: "TERM_1",
    academicYear: getCurrentAcademicYear(),
  });

  // Term status
  const [termStatus, setTermStatus] = useState<any>(null);
  const [termStatusLoading, setTermStatusLoading] = useState(false);
  const [paymentInfo, setPaymentInfo] = useState<any>(null);

  // Receipt-specific state
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [receiptMethod, setReceiptMethod] = useState("AIRTEL_MONEY");
  const [bankReference, setBankReference] = useState("");

  // Modal + submit states
  const [showOnlineModal, setShowOnlineModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  // Active term
  const { academicYear: activeYear, activeTerm: currentTerm } = useActiveTerm();

  // ---------- Effects ----------
  useEffect(() => {
    if (!_hasHydrated) return;
    if (!isAuthenticated) router.push("/");
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

  // ---------- Handlers ----------
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
    }
  };

  const openOnlineModal = () => {
    // We won't reach here since button is disabled, but keep for safety
    if (mode === "online") {
      setError("");
      const amount = parseFloat(form.amount);
      if (!amount || amount <= 0) {
        setError("Enter an amount first");
        return;
      }
      setShowOnlineModal(true);
    }
  };

  // ---------- Derived ----------
  const amountNum = parseFloat(form.amount) || 0;
  const canPayOnline = amountNum > 0 && mode === "online"; // Ensure it's always false if mode isn't online
  const canSubmitReceipt = amountNum > 0 && !!receiptFile;

  // ---------- Guards ----------
  if (!_hasHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-900" />
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-sm border border-gray-100">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={32} className="text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">
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
              className="w-full bg-[var(--color-primary)] text-white py-3 rounded-xl text-sm font-medium hover:bg-[var(--color-primary-dark)] transition-colors"
            >
              View Payment History
            </button>
            <button
              onClick={() => router.push("/dashboard")}
              className="w-full border border-gray-200 text-gray-600 py-3 rounded-xl text-sm hover:bg-gray-50 transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      {/* ============ HEADER ============ */}
      <div className="bg-[var(--color-primary)] text-white sticky top-0 z-20 shadow-md">
        <div className="max-w-lg mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/dashboard")}
              className="p-2 hover:bg-white/10 rounded-xl transition-colors"
              aria-label="Back"
            >
              <ArrowLeft size={18} />
            </button>
            <h1 className="text-lg font-semibold">Pay Fees</h1>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
        {/* ============ STUDENT INFO ============ */}
        <div className="bg-white rounded-2xl p-3.5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-[var(--color-primary-light)] rounded-xl flex items-center justify-center text-[var(--color-primary)] font-bold text-lg">
              {student?.fullName?.charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="text-base font-bold text-gray-800 truncate leading-tight">
                {student?.fullName}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {student?.class} • {student?.studentCode}
              </p>
            </div>
          </div>
        </div>

        {/* ============ FEE SUMMARY ============ */}
        {termStatusLoading && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center">
            <Loader2
              size={16}
              className="animate-spin text-gray-400 mx-auto mb-1"
            />
            <p className="text-xs text-gray-400">Loading fee details...</p>
          </div>
        )}

        {termStatus &&
          !termStatusLoading &&
          termStatus.termStatus.hasFeeStructure && (
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {currentTerm?.replace("_", " ") || "—"} • {activeYear}
                </p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-blue-50 rounded-xl p-3 text-center border border-blue-100">
                  <p className="text-[10px] text-blue-700 font-medium uppercase tracking-wide">
                    Required
                  </p>
                  <p className="text-sm font-bold text-blue-900 mt-1">
                    MWK {termStatus.termStatus.requiredAmount?.toLocaleString()}
                  </p>
                </div>
                <div className="bg-emerald-50 rounded-xl p-3 text-center border border-emerald-100">
                  <p className="text-[10px] text-emerald-700 font-medium uppercase tracking-wide">
                    Paid
                  </p>
                  <p className="text-sm font-bold text-emerald-700 mt-1">
                    MWK{" "}
                    {termStatus.termStatus.totalPaidThisTerm.toLocaleString()}
                  </p>
                </div>
                <div
                  className={`rounded-xl p-3 text-center border ${
                    termStatus.termStatus.balanceRemaining === 0
                      ? "bg-emerald-50 border-emerald-100"
                      : "bg-red-50 border-red-100"
                  }`}
                >
                  <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wide">
                    Balance
                  </p>
                  <p
                    className={`text-sm font-bold mt-1 ${
                      termStatus.termStatus.balanceRemaining === 0
                        ? "text-emerald-700"
                        : "text-red-600"
                    }`}
                  >
                    {termStatus.termStatus.balanceRemaining === 0
                      ? "✓ Clear"
                      : `MWK ${termStatus.termStatus.balanceRemaining?.toLocaleString()}`}
                  </p>
                </div>
              </div>
              {termStatus.termStatus.creditBalance > 0 && (
                <div className="mt-2 bg-purple-50 border border-purple-100 rounded-lg p-2 text-center">
                  <p className="text-[11px] text-purple-700">
                    Credit balance: MWK{" "}
                    {termStatus.termStatus.creditBalance.toLocaleString()} —
                    applies to next term
                  </p>
                </div>
              )}
            </div>
          )}

        {/* ============ AMOUNT INPUT ============ */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <label className="block text-xs font-medium text-gray-600 mb-2">
            How much are you paying?
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-400">
              MWK
            </span>
            <input
              type="number"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              placeholder="0"
              min="1"
              inputMode="numeric"
              className="w-full pl-14 pr-4 py-3.5 border-2 border-gray-200 rounded-xl text-lg font-bold focus:outline-none focus:border-[var(--color-primary)] text-gray-900"
            />
          </div>
          {form.amount && amountNum > 0 && (
            <p className="text-[11px] text-gray-400 mt-1.5 text-center">
              {amountNum.toLocaleString()} Kwacha
            </p>
          )}
        </div>

        {/* ============ PAYMENT MODE SWITCHER ============ */}
        <div className="bg-white rounded-2xl p-1.5 shadow-sm border border-gray-100 flex gap-1.5">
          {/* Upload Receipt (Left / Default) */}
          <button
            type="button"
            onClick={() => setMode("receipt")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all ${
              mode === "receipt"
                ? "bg-[var(--color-primary)] text-white shadow-sm"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            <FileImage size={15} />
            Upload Receipt
          </button>

          {/* Pay Online (Right / Active) */}
          <button
            type="button"
            onClick={() => setMode("online")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all ${
              mode === "online"
                ? "bg-gradient-to-br from-emerald-600 to-emerald-500 text-white shadow-sm"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            <Zap size={15} />
            Pay Online
          </button>
        </div>

        {/* ============ ERROR ============ */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-start gap-2">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* ============ ONLINE MODE (Hidden because disabled) ============ */}
        {mode === "online" && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                <Smartphone size={18} className="text-emerald-600" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-gray-800">
                  Instant Payment
                </h2>
                <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">
                  Pay with Airtel Money or TNM Mpamba. You'll receive a prompt
                  on your phone — no receipt upload needed.
                </p>
              </div>
            </div>

            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 space-y-2">
              <div className="flex items-center gap-2 text-xs text-emerald-800">
                <CheckCircle size={12} className="shrink-0" />
                <span>Payment confirms automatically in seconds</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-emerald-800">
                <CheckCircle size={12} className="shrink-0" />
                <span>Balance updates instantly on your account</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-emerald-800">
                <CheckCircle size={12} className="shrink-0" />
                <span>Receipt sent via SMS & email</span>
              </div>
            </div>
          </div>
        )}

        {/* ============ RECEIPT MODE ============ */}
        {mode === "receipt" && (
          <div className="space-y-3">
            {/* Payment Method */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
              <h2 className="text-sm font-bold text-gray-800">
                How did you pay?
              </h2>
              <div className="grid grid-cols-2 gap-2">
                {paymentMethods.map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setReceiptMethod(m.value)}
                    className={`py-2.5 px-3 rounded-xl text-xs font-medium border-2 transition-all flex items-center gap-2 justify-center ${
                      receiptMethod === m.value
                        ? "border-[var(--color-primary)] bg-[var(--color-primary-light)] text-[var(--color-primary)]"
                        : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                    }`}
                  >
                    <span>{m.emoji}</span>
                    <span className="truncate">{m.label}</span>
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  Transaction Reference{" "}
                  <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  value={bankReference}
                  onChange={(e) => setBankReference(e.target.value)}
                  placeholder="eg. TXN12345678"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                />
              </div>
            </div>

            {/* Accounts to pay to */}
            {paymentInfo &&
              (paymentInfo.airtelMoneyNumber ||
                paymentInfo.mpambaNumber ||
                (paymentInfo.bankAccounts &&
                  paymentInfo.bankAccounts.length > 0)) && (
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-bold text-gray-800">
                      Where to pay
                    </h2>
                    <span className="text-[10px] font-mono text-gray-400">
                      Ref: {student?.studentCode}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {paymentInfo.airtelMoneyNumber && (
                      <PaymentAccountRow
                        label="Airtel Money"
                        value={paymentInfo.airtelMoneyNumber}
                        color="red"
                      />
                    )}
                    {paymentInfo.mpambaNumber && (
                      <PaymentAccountRow
                        label="TNM Mpamba"
                        value={paymentInfo.mpambaNumber}
                        color="amber"
                      />
                    )}
                    {paymentInfo.bankAccounts?.map(
                      (bank: any, index: number) => (
                        <PaymentAccountRow
                          key={index}
                          label={bank.bankName}
                          sub={
                            bank.accountName
                              ? `${bank.accountName}${bank.branch ? ` • ${bank.branch}` : ""}`
                              : bank.branch
                          }
                          value={bank.accountNumber}
                          color="blue"
                        />
                      ),
                    )}
                  </div>
                </div>
              )}

            {/* Receipt upload */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <h2 className="text-sm font-bold text-gray-800 mb-1">
                Upload your receipt
              </h2>
              <p className="text-[11px] text-gray-400 mb-3">
                Photo or screenshot of your payment confirmation
              </p>

              {!receiptPreview ? (
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-light)]/30 transition-all">
                  <Upload size={24} className="text-gray-400 mb-2" />
                  <p className="text-sm font-medium text-gray-600">
                    Tap to upload
                  </p>
                  <p className="text-[11px] text-gray-400 mt-1">
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
                    <div className="w-full h-64 rounded-xl border border-gray-200 overflow-hidden bg-gray-50">
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
                      className="w-full h-48 object-cover rounded-xl border border-gray-200"
                    />
                  )}
                  <button
                    type="button"
                    onClick={clearReceipt}
                    className="absolute top-2 right-2 w-8 h-8 bg-red-600 text-white rounded-full flex items-center justify-center hover:bg-red-700 shadow-md"
                    aria-label="Remove receipt"
                  >
                    <X size={14} />
                  </button>
                  <p className="text-[11px] text-gray-500 mt-2 text-center truncate px-8">
                    {receiptFile?.name}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ============ STICKY SUBMIT BAR ============ */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
        <div className="max-w-lg mx-auto">
          {mode === "receipt" ? (
            <button
              type="button"
              onClick={handleReceiptSubmit}
              disabled={loading || !canSubmitReceipt}
              className="w-full flex items-center justify-center gap-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white py-3.5 rounded-xl font-semibold text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Submitting...
                </>
              ) : (
                <>
                  <CheckCircle size={16} />
                  {canSubmitReceipt
                    ? `Submit Payment — MWK ${amountNum.toLocaleString()}`
                    : !receiptFile
                      ? "Upload a receipt to continue"
                      : "Enter an amount to continue"}
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={openOnlineModal}
              disabled={!canPayOnline}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-br from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white py-3.5 rounded-xl font-semibold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Zap size={16} />
              {canPayOnline
                ? `Pay MWK ${amountNum.toLocaleString()} Online`
                : "Enter an amount to continue"}
            </button>
          )}
        </div>
      </div>

      {/* ============ PAY ONLINE MODAL (Disabled but kept for future) ============ */}
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

// ==================== SUB-COMPONENT ====================
const PaymentAccountRow = ({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  color: "red" | "amber" | "blue";
}) => {
  const colorMap = {
    red: {
      bg: "bg-red-50",
      text: "text-red-700",
      btn: "bg-red-100 text-red-600",
    },
    amber: {
      bg: "bg-amber-50",
      text: "text-amber-700",
      btn: "bg-amber-100 text-amber-600",
    },
    blue: {
      bg: "bg-blue-50",
      text: "text-blue-700",
      btn: "bg-blue-100 text-blue-600",
    },
  };
  const c = colorMap[color];

  const handleCopy = () => {
    navigator.clipboard?.writeText(value);
  };

  return (
    <div className={`flex items-center justify-between p-3 rounded-xl ${c.bg}`}>
      <div className="min-w-0">
        <p className={`text-[11px] font-medium ${c.text}`}>{label}</p>
        <p className="text-sm font-bold text-gray-800 font-mono truncate">
          {value}
        </p>
        {sub && (
          <p className="text-[10px] text-gray-500 truncate mt-0.5">{sub}</p>
        )}
      </div>
      <button
        type="button"
        onClick={handleCopy}
        className={`text-[11px] font-semibold px-3 py-1 rounded-lg ${c.btn} shrink-0 ml-2`}
      >
        Copy
      </button>
    </div>
  );
};
