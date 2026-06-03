"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Upload, CheckCircle, Loader2, X } from "lucide-react";
import api from "../../lib/axios";
import { useAuthStore } from "../../store/authStore";

const paymentMethods = [
  { value: "AIRTEL_MONEY", label: "Airtel Money" },
  { value: "TNM_MPAMBA", label: "TNM Mpamba" },
  { value: "NATIONAL_BANK", label: "National Bank" },
  { value: "STANDARD_BANK", label: "Standard Bank" },
  { value: "FDH_BANK", label: "FDH Bank" },
  { value: "NBS_BANK", label: "NBS Bank" },
  { value: "OTHER_BANK", label: "Other Bank" },
];

const terms = [
  { value: "TERM_1", label: "Term 1" },
  { value: "TERM_2", label: "Term 2" },
  { value: "TERM_3", label: "Term 3" },
];

export default function PayPage() {
  const router = useRouter();
  const { isAuthenticated, student, token, _hasHydrated } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [termStatus, setTermStatus] = useState<any>(null);
  const [termStatusLoading, setTermStatusLoading] = useState(false);
  const [paymentInfo, setPaymentInfo] = useState<any>(null);

  const [form, setForm] = useState({
    amount: "",
    paymentMethod: "AIRTEL_MONEY",
    term: "TERM_1",
    academicYear: "2025",
    bankReference: "",
  });
  useEffect(() => {
    if (!_hasHydrated) return;
    if (!isAuthenticated) router.push("/");
  }, [_hasHydrated, isAuthenticated]);

  // Fetch term status when term changes
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
    setReceiptFile(file);
    const reader = new FileReader();
    reader.onload = () => setReceiptPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiptFile) {
      setError("Please upload your payment receipt");
      return;
    }
    setError("");
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("studentId", student?.id || "");
      formData.append("amount", form.amount);
      formData.append("paymentMethod", form.paymentMethod);
      formData.append("term", form.term);
      formData.append("academicYear", form.academicYear);
      if (form.bankReference)
        formData.append("bankReference", form.bankReference);
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
  if (!_hasHydrated)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-900" />
      </div>
    );

  if (success)
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-sm border border-gray-100">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={32} className="text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">
            Payment Submitted!
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            Your payment has been submitted successfully. The school will verify
            it and you'll receive confirmation.
          </p>
          <div className="space-y-3">
            <button
              onClick={() => router.push("/history")}
              className="w-full bg-blue-900 text-white py-3 rounded-xl text-sm font-medium hover:bg-blue-800"
            >
              View Payment History
            </button>
            <button
              onClick={() => router.push("/dashboard")}
              className="w-full border border-gray-200 text-gray-600 py-3 rounded-xl text-sm hover:bg-gray-50"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-blue-900 text-white">
        <div className="max-w-lg mx-auto px-4 py-5">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/dashboard")}
              className="p-2 hover:bg-blue-800 rounded-xl transition-colors"
            >
              <ArrowLeft size={18} />
            </button>
            <h1 className="text-lg font-semibold">Submit Payment</h1>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-4">
        {/* Student Info */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-900 font-bold">
              {student?.fullName?.charAt(0)}
            </div>
            <div>
              <p className="font-medium text-gray-800">{student?.fullName}</p>
              <p className="text-xs text-gray-500">
                {student?.class} • {student?.studentCode}
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Term Selection */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-4">
            <h2 className="font-medium text-gray-800">Payment Details</h2>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  Term *
                </label>
                <select
                  value={form.term}
                  onChange={(e) => setForm({ ...form, term: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {terms.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  Academic Year *
                </label>
                <input
                  value={form.academicYear}
                  onChange={(e) =>
                    setForm({ ...form, academicYear: e.target.value })
                  }
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Fee Info */}
            {termStatusLoading && (
              <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-400 text-center">
                Loading fee information...
              </div>
            )}
            {termStatus &&
              !termStatusLoading &&
              termStatus.termStatus.hasFeeStructure && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <p className="text-sm font-semibold text-blue-900 mb-2">
                    Required: MWK{" "}
                    {termStatus.termStatus.requiredAmount?.toLocaleString()}
                  </p>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div>
                      <p className="text-gray-400">Paid</p>
                      <p className="font-medium text-green-600">
                        MWK{" "}
                        {termStatus.termStatus.totalPaidThisTerm.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-400">Balance</p>
                      <p
                        className={`font-medium ${termStatus.termStatus.balanceRemaining === 0 ? "text-green-600" : "text-red-600"}`}
                      >
                        {termStatus.termStatus.balanceRemaining === 0
                          ? "✓ Paid"
                          : `MWK ${termStatus.termStatus.balanceRemaining?.toLocaleString()}`}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-400">Credit</p>
                      <p
                        className={`font-medium ${termStatus.termStatus.creditBalance > 0 ? "text-purple-600" : "text-gray-400"}`}
                      >
                        {termStatus.termStatus.creditBalance > 0
                          ? `MWK ${termStatus.termStatus.creditBalance.toLocaleString()}`
                          : "None"}
                      </p>
                    </div>
                  </div>
                </div>
              )}

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Amount Paid (MWK) *
              </label>
              <input
                type="number"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                required
                min="1"
                placeholder="eg. 150000"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Payment Method *
              </label>
              <div className="grid grid-cols-2 gap-2">
                {paymentMethods.map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setForm({ ...form, paymentMethod: m.value })}
                    className={`py-2.5 px-3 rounded-xl text-sm font-medium border transition-all ${
                      form.paymentMethod === m.value
                        ? "bg-blue-900 text-white border-blue-900"
                        : "bg-white text-gray-600 border-gray-200 hover:border-blue-300"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Transaction Reference{" "}
                <span className="text-gray-400">(optional)</span>
              </label>
              <input
                value={form.bankReference}
                onChange={(e) =>
                  setForm({ ...form, bankReference: e.target.value })
                }
                placeholder="eg. TXN12345678"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          {/* Payment Account Details */}
          {paymentInfo &&
            (paymentInfo.airtelMoneyNumber ||
              paymentInfo.mpambaNumber ||
              paymentInfo.nationalBankAccount) && (
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <h2 className="font-medium text-gray-800 mb-3">
                  Pay To These Accounts
                </h2>
                <div className="space-y-2">
                  {paymentInfo.airtelMoneyNumber && (
                    <div className="flex items-center justify-between p-3 bg-red-50 rounded-xl">
                      <div>
                        <p className="text-xs text-gray-500">Airtel Money</p>
                        <p className="text-sm font-bold text-gray-800">
                          {paymentInfo.airtelMoneyNumber}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          navigator.clipboard?.writeText(
                            paymentInfo.airtelMoneyNumber,
                          )
                        }
                        className="text-xs text-red-600 font-medium px-3 py-1 bg-red-100 rounded-lg"
                      >
                        Copy
                      </button>
                    </div>
                  )}
                  {paymentInfo.mpambaNumber && (
                    <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-xl">
                      <div>
                        <p className="text-xs text-gray-500">TNM Mpamba</p>
                        <p className="text-sm font-bold text-gray-800">
                          {paymentInfo.mpambaNumber}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          navigator.clipboard?.writeText(
                            paymentInfo.mpambaNumber,
                          )
                        }
                        className="text-xs text-yellow-600 font-medium px-3 py-1 bg-yellow-100 rounded-lg"
                      >
                        Copy
                      </button>
                    </div>
                  )}
                  {paymentInfo.nationalBankAccount && (
                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-xl">
                      <div>
                        <p className="text-xs text-gray-500">
                          National Bank • {paymentInfo.nationalBankName}
                        </p>
                        <p className="text-sm font-bold text-gray-800">
                          {paymentInfo.nationalBankAccount}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          navigator.clipboard?.writeText(
                            paymentInfo.nationalBankAccount,
                          )
                        }
                        className="text-xs text-blue-600 font-medium px-3 py-1 bg-blue-100 rounded-lg"
                      >
                        Copy
                      </button>
                    </div>
                  )}
                  <div className="bg-gray-50 rounded-xl p-3 mt-1">
                    <p className="text-xs text-gray-500">
                      Reference:{" "}
                      <span className="font-bold text-gray-700 font-mono">
                        {student?.studentCode}
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            )}
          {/* Receipt Upload */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h2 className="font-medium text-gray-800 mb-3">Upload Receipt *</h2>
            <p className="text-xs text-gray-400 mb-4">
              Take a photo of your Airtel Money/Mpamba/bank receipt and upload
              it here.
            </p>

            {!receiptPreview ? (
              <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all">
                <Upload size={24} className="text-gray-400 mb-2" />
                <p className="text-sm font-medium text-gray-600">
                  Tap to upload receipt
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  JPG, PNG or PDF up to 5MB
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
                <img
                  src={receiptPreview}
                  alt="Receipt preview"
                  className="w-full h-48 object-cover rounded-xl border border-gray-200"
                />
                <button
                  type="button"
                  onClick={() => {
                    setReceiptFile(null);
                    setReceiptPreview(null);
                  }}
                  className="absolute top-2 right-2 w-8 h-8 bg-red-600 text-white rounded-full flex items-center justify-center hover:bg-red-700"
                >
                  <X size={14} />
                </button>
                <p className="text-xs text-gray-500 mt-2 text-center">
                  {receiptFile?.name}
                </p>
              </div>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !receiptFile}
            className="w-full flex items-center justify-center gap-2 bg-blue-900 text-white py-4 rounded-xl font-medium text-sm hover:bg-blue-800 disabled:bg-blue-300 transition-colors"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Submitting...
              </>
            ) : (
              `Submit Payment — MWK ${form.amount ? parseFloat(form.amount).toLocaleString() : "0"}`
            )}
          </button>

          <p className="text-center text-xs text-gray-400">
            After submitting, the school will verify your receipt and confirm
            your payment.
          </p>
        </form>
      </div>
    </div>
  );
}
