"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  School,
  LogOut,
  CreditCard,
  Clock,
  CheckCircle,
  AlertCircle,
  Star,
  ChevronRight,
  TrendingUp,
  Receipt,
  Home,
  History,
  Banknote,
  Phone,
} from "lucide-react";
import api from "../../lib/axios";
import { useAuthStore } from "../../store/authStore";
import { useActiveTerm } from "../../hooks/useActiveTerm";
import ResultsView from "./ResultsView";

const termLabel = (term?: string | null) => (term || "").replace("_", " ");

export default function DashboardPage() {
  const router = useRouter();
  const { student, isAuthenticated, logout, _hasHydrated } = useAuthStore();
  const [data, setData] = useState<any>(null);
  const [paymentInfo, setPaymentInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    "overview" | "payments" | "info" | "results"
  >("overview");

  const [resultsAvailable, setResultsAvailable] = useState(false);
  const [termStatus, setTermStatus] = useState<any>(null);

  // Active term — same source of truth as admin
  const { academicYear: activeYear, activeTerm: currentTerm } = useActiveTerm();

  useEffect(() => {
    if (!_hasHydrated) return;
    if (!isAuthenticated) {
      router.push("/");
      return;
    }
    fetchData();
  }, [_hasHydrated, isAuthenticated]);

  // Fetch term status (required fee + balance) whenever the student or active term is known
  useEffect(() => {
    if (!student?.id || !currentTerm || !activeYear) return;
    api
      .get(
        `/schools/student-term-status/${student.id}?term=${currentTerm}&academicYear=${activeYear}`,
      )
      .then((res) => setTermStatus(res.data.data))
      .catch(() => setTermStatus(null));
  }, [student?.id, currentTerm, activeYear]);

  const fetchData = async () => {
    try {
      const [paymentsRes] = await Promise.all([api.get("/payments/my-child")]);
      setData({ payments: paymentsRes.data.data });

      if (student?.school?.id) {
        try {
          const infoRes = await api.get(
            `/schools/payment-info/${student.school.id}`,
          );
          setPaymentInfo(infoRes.data.data);
        } catch {}
      }

      try {
        const activePeriodRes = await api.get("/exams/active-period");
        setResultsAvailable(!!activePeriodRes.data.data);
      } catch {}
    } catch {
      console.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  if (!_hasHydrated || loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-900" />
      </div>
    );

  const payments = data?.payments?.payments || [];
  const summary = data?.payments?.summary || {};
  const verifiedPayments = payments.filter((p: any) => p.status === "VERIFIED");
  const pendingPayments = payments.filter((p: any) => p.status === "PENDING");

  // Pull values from termStatus — the amount required, what's been paid for the
  // active term, and the remaining balance
  const requiredAmount = termStatus?.termStatus?.requiredAmount || 0;
  const paidThisTerm = termStatus?.termStatus?.totalPaidThisTerm || 0;
  const balanceRemaining = termStatus?.termStatus?.balanceRemaining || 0;
  const creditBalance = termStatus?.termStatus?.creditBalance || 0;
  const hasFeeStructure = termStatus?.termStatus?.hasFeeStructure === true;
  const isClear = hasFeeStructure && balanceRemaining === 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 to-slate-50 py-4 px-3 sm:py-6 sm:px-6 lg:py-10 lg:px-10">
      <div className="max-w-4xl mx-auto w-full lg:max-w-6xl">
        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
          {/* Blue Header Section */}
          <div className="bg-[var(--color-primary)] text-white px-5 pt-5 pb-4">
            {/* Top row: Logo + School name + Logout */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center overflow-hidden shrink-0">
                  {student?.school?.logo ? (
                    <img
                      src={student.school.logo}
                      alt={student.school.name}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <School size={18} />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] text-blue-200 font-medium leading-none">
                    SchoolPay
                  </p>
                  <p className="text-sm font-semibold truncate leading-tight mt-0.5">
                    {student?.school?.name}
                  </p>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 text-blue-100 hover:text-white text-xs font-medium transition-colors"
              >
                <LogOut size={14} />
                <span>Logout</span>
              </button>
            </div>

            {/* Student Info */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-lg font-bold shrink-0">
                {student?.fullName?.charAt(0)}
              </div>
              <div className="min-w-0">
                <h1 className="text-base font-bold truncate leading-tight">
                  {student?.fullName}
                </h1>
                <p className="text-blue-200 text-xs mt-0.5">
                  {student?.class} • {student?.academicYear}
                </p>
                <p className="text-blue-300 text-[11px] font-mono mt-0.5">
                  {student?.studentCode}
                </p>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-slate-200 bg-slate-50">
            <button
              onClick={() => setActiveTab("overview")}
              className={`flex-1 py-3 text-xs font-semibold transition-all ${
                activeTab === "overview"
                  ? "text-[var(--color-primary)] border-b-2 border-[var(--color-primary)] bg-white"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab("payments")}
              className={`flex-1 py-3 text-xs font-semibold transition-all ${
                activeTab === "payments"
                  ? "text-blue-700 border-b-2 border-blue-600 bg-white"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Payment History
            </button>
            <button
              onClick={() => setActiveTab("info")}
              className={`flex-1 py-3 text-xs font-semibold transition-all ${
                activeTab === "info"
                  ? "text-blue-700 border-b-2 border-blue-600 bg-white"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Payment Info
            </button>
            {resultsAvailable && (
              <button
                onClick={() => setActiveTab("results")}
                className={`flex-1 py-3 text-xs font-semibold transition-all ${
                  activeTab === "results"
                    ? "text-blue-700 border-b-2 border-blue-600 bg-white"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Results
              </button>
            )}
          </div>

          {/* Content Area */}
          <div className="p-4 lg:p-6 space-y-4">
            {/* ==================== OVERVIEW TAB ==================== */}
            {activeTab === "overview" && (
              <div className="lg:grid lg:grid-cols-3 lg:gap-5 space-y-4 lg:space-y-0">
                <div className="lg:col-span-2 space-y-4">
                  {/* Fee Summary — Required / Paid / Balance */}
                  {hasFeeStructure && currentTerm && (
                    <div>
                      <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-2">
                        {termLabel(currentTerm)} • {activeYear}
                      </p>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-blue-50 rounded-xl p-3.5 border border-blue-100">
                          <p className="text-[11px] text-blue-700 font-medium mb-1">
                            Required
                          </p>
                          <p className="text-base font-bold text-blue-900">
                            MWK {requiredAmount.toLocaleString()}
                          </p>
                        </div>
                        <div className="bg-emerald-50 rounded-xl p-3.5 border border-emerald-100">
                          <p className="text-[11px] text-emerald-700 font-medium mb-1">
                            Paid
                          </p>
                          <p className="text-base font-bold text-emerald-700">
                            MWK {paidThisTerm.toLocaleString()}
                          </p>
                        </div>
                        <div
                          className={`rounded-xl p-3.5 border ${
                            isClear
                              ? "bg-emerald-50 border-emerald-100"
                              : "bg-red-50 border-red-100"
                          }`}
                        >
                          <p className="text-[11px] font-medium mb-1 text-slate-500">
                            Balance
                          </p>
                          <p
                            className={`text-base font-bold ${
                              isClear ? "text-emerald-600" : "text-red-600"
                            }`}
                          >
                            {isClear
                              ? "✓ Clear"
                              : `MWK ${balanceRemaining.toLocaleString()}`}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Fallback when no fee structure or active term yet */}
                  {!hasFeeStructure && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-emerald-50 rounded-xl p-3.5 border border-emerald-100">
                        <p className="text-[11px] text-emerald-700 font-medium mb-1">
                          Total Paid
                        </p>
                        <p className="text-lg font-bold text-emerald-700">
                          MWK {(summary.totalPaid || 0).toLocaleString()}
                        </p>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200">
                        <p className="text-[11px] text-slate-500 font-medium mb-1">
                          Pending
                        </p>
                        <p
                          className={`text-lg font-bold ${
                            summary.pendingAmount > 0
                              ? "text-amber-600"
                              : "text-slate-400"
                          }`}
                        >
                          MWK {(summary.pendingAmount || 0).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Notices */}
                  {pendingPayments.length > 0 && (
                    <div className="flex items-center gap-2.5 bg-amber-50 border border-amber-200 rounded-xl p-3">
                      <Clock size={15} className="text-amber-600 shrink-0" />
                      <p className="text-xs text-amber-800">
                        {pendingPayments.length} payment(s) awaiting
                        verification
                      </p>
                    </div>
                  )}

                  {hasFeeStructure && !isClear && (
                    <div className="flex items-center gap-2.5 bg-red-50 border border-red-200 rounded-xl p-3">
                      <AlertCircle
                        size={15}
                        className="text-red-600 shrink-0"
                      />
                      <p className="text-xs text-red-800 font-medium">
                        Outstanding balance of MWK{" "}
                        {balanceRemaining.toLocaleString()}. Please pay soon.
                      </p>
                    </div>
                  )}

                  {creditBalance > 0 && (
                    <div className="flex items-center gap-2.5 bg-purple-50 border border-purple-200 rounded-xl p-3">
                      <Star size={15} className="text-purple-600 shrink-0" />
                      <p className="text-xs text-purple-800">
                        Credit balance: MWK {creditBalance.toLocaleString()} —
                        will apply to next term
                      </p>
                    </div>
                  )}

                  {hasFeeStructure &&
                    isClear &&
                    pendingPayments.length === 0 && (
                      <div className="flex items-center gap-2.5 bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                        <CheckCircle
                          size={15}
                          className="text-emerald-600 shrink-0"
                        />
                        <p className="text-xs font-medium text-emerald-800">
                          All fees paid for {termLabel(currentTerm)}! 🎉
                        </p>
                      </div>
                    )}

                  {/* Action Buttons */}
                  <div
                    className={`grid gap-4 ${
                      resultsAvailable ? "grid-cols-3" : "grid-cols-2"
                    }`}
                  >
                    <button
                      onClick={() => router.push("/pay")}
                      className="bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white rounded-xl py-3.5 px-3 shadow-sm transition-all active:scale-[0.98]"
                    >
                      <CreditCard size={18} className="mx-auto mb-1" />
                      <p className="text-xs font-semibold">Pay Fees</p>
                    </button>

                    <button
                      onClick={() => router.push("/history")}
                      className="bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl py-3.5 px-3 border border-slate-200 transition-all active:scale-[0.98]"
                    >
                      <History size={18} className="mx-auto mb-1" />
                      <p className="text-xs font-semibold">View History</p>
                    </button>

                    {resultsAvailable && (
                      <button
                        onClick={() => setActiveTab("results")}
                        className="bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-xl py-3.5 px-3 border border-purple-100 transition-all active:scale-[0.98]"
                      >
                        <Star size={18} className="mx-auto mb-1" />
                        <p className="text-xs font-semibold">View Results</p>
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Recent Activity */}
                  {payments.length > 0 && (
                    <div className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
                      <div className="px-4 py-2.5 border-b border-slate-200">
                        <h2 className="text-xs font-semibold text-slate-700">
                          Recent Activity
                        </h2>
                      </div>
                      <div className="divide-y divide-slate-100">
                        {payments.slice(0, 2).map((payment: any) => (
                          <div
                            key={payment.id}
                            className="px-4 py-3 flex items-center justify-between"
                          >
                            <div className="flex items-center gap-2.5">
                              <div
                                className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                                  payment.status === "VERIFIED"
                                    ? "bg-emerald-100"
                                    : "bg-amber-100"
                                }`}
                              >
                                {payment.status === "VERIFIED" ? (
                                  <CheckCircle
                                    size={13}
                                    className="text-emerald-600"
                                  />
                                ) : (
                                  <Clock size={13} className="text-amber-600" />
                                )}
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-slate-800">
                                  MWK {payment.amount.toLocaleString()}
                                </p>
                                <p className="text-[11px] text-slate-400">
                                  {termLabel(payment.term)}{" "}
                                  {payment.academicYear}
                                </p>
                              </div>
                            </div>
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                                payment.status === "VERIFIED"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-amber-100 text-amber-700"
                              }`}
                            >
                              {payment.status === "VERIFIED"
                                ? "Verified"
                                : "Pending"}
                            </span>
                          </div>
                        ))}
                        {payments.length > 2 && (
                          <button
                            onClick={() => setActiveTab("payments")}
                            className="w-full px-4 py-2.5 text-xs text-blue-600 font-medium hover:bg-slate-100 transition-colors"
                          >
                            View all {payments.length} payments →
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* School Contact */}
                  <div className="bg-slate-50 rounded-xl border border-slate-200 p-3.5">
                    <div className="flex items-center gap-2 text-slate-500 mb-1">
                      <Phone size={14} />
                      <p className="text-xs font-medium">School Contact</p>
                    </div>
                    <p className="text-sm font-semibold text-slate-800">
                      {student?.school?.phone}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5 truncate">
                      {student?.school?.address}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ==================== PAYMENTS TAB ==================== */}
            {activeTab === "payments" && (
              <div className="lg:max-w-2xl lg:mx-auto bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-4 py-2.5 bg-white border-b border-slate-200">
                  <h2 className="text-xs font-semibold text-slate-700">
                    All Payments
                  </h2>
                </div>
                {payments.length === 0 ? (
                  <div className="p-10 text-center text-slate-400">
                    <Receipt size={32} className="mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No payment history</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {payments.map((payment: any) => (
                      <div key={payment.id} className="px-4 py-3 bg-white">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-slate-800">
                            MWK {payment.amount.toLocaleString()}
                          </span>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                              payment.status === "VERIFIED"
                                ? "bg-emerald-100 text-emerald-700"
                                : payment.status === "PENDING"
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-red-100 text-red-700"
                            }`}
                          >
                            {payment.status === "VERIFIED"
                              ? "Verified"
                              : payment.status === "PENDING"
                                ? "Pending"
                                : "Rejected"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-500">
                          <span>
                            {termLabel(payment.term)} • {payment.academicYear}
                          </span>
                          <span>
                            {new Date(payment.createdAt).toLocaleDateString(
                              "en-GB",
                            )}
                          </span>
                        </div>
                        {payment.reference && (
                          <p className="text-[11px] text-slate-400 mt-1 font-mono">
                            Ref: {payment.reference}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ==================== INFO TAB ==================== */}
            {activeTab === "info" &&
              paymentInfo &&
              (paymentInfo.airtelMoneyNumber ||
                paymentInfo.mpambaNumber ||
                (paymentInfo.bankAccounts &&
                  paymentInfo.bankAccounts.length > 0)) && (
                <div className="lg:max-w-2xl lg:mx-auto space-y-3">
                  {/* Reference Number */}
                  <div className="bg-[var(--color-primary-light)] rounded-xl p-3.5 border border-[var(--color-primary-light)]">
                    <p className="text-xs font-medium text-[var(--color-primary)]">
                      Your Reference Number
                    </p>
                    <p className="text-base font-bold text-[var(--color-primary)] font-mono mt-0.5">
                      {student?.studentCode}
                    </p>
                    <p className="text-[10px] text-blue-600 mt-0.5">
                      Use this for all payments
                    </p>
                  </div>

                  {/* Bank Accounts */}
                  {paymentInfo.bankAccounts &&
                    paymentInfo.bankAccounts.length > 0 && (
                      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                        <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200">
                          <p className="text-xs font-semibold text-slate-700">
                            Bank Accounts
                          </p>
                        </div>
                        {paymentInfo.bankAccounts.map(
                          (bank: any, index: number) => (
                            <div
                              key={index}
                              className="p-3.5 border-b border-slate-100 last:border-0"
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm font-semibold text-slate-800">
                                    {bank.bankName}
                                  </p>
                                  <p className="text-xs text-slate-500">
                                    {bank.accountName}
                                  </p>
                                </div>
                                <button
                                  onClick={() =>
                                    navigator.clipboard?.writeText(
                                      bank.accountNumber,
                                    )
                                  }
                                  className="text-xs text-blue-600 font-medium px-2.5 py-1 bg-blue-50 rounded-lg"
                                >
                                  Copy
                                </button>
                              </div>
                              <p className="text-xs font-mono text-slate-700 mt-1">
                                {bank.accountNumber}
                              </p>
                            </div>
                          ),
                        )}
                      </div>
                    )}

                  {/* Mobile Money */}
                  {(paymentInfo.airtelMoneyNumber ||
                    paymentInfo.mpambaNumber) && (
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                      <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200">
                        <p className="text-xs font-semibold text-slate-700">
                          Mobile Money
                        </p>
                      </div>
                      {paymentInfo.airtelMoneyNumber && (
                        <div className="p-3.5 border-b border-slate-100 flex items-center justify-between">
                          <div>
                            <p className="text-sm font-semibold text-red-600">
                              Airtel Money
                            </p>
                            <p className="text-xs font-mono text-slate-700">
                              {paymentInfo.airtelMoneyNumber}
                            </p>
                          </div>
                          <button
                            onClick={() =>
                              navigator.clipboard?.writeText(
                                paymentInfo.airtelMoneyNumber,
                              )
                            }
                            className="text-xs text-red-600 font-medium px-2.5 py-1 bg-red-50 rounded-lg"
                          >
                            Copy
                          </button>
                        </div>
                      )}
                      {paymentInfo.mpambaNumber && (
                        <div className="p-3.5 flex items-center justify-between">
                          <div>
                            <p className="text-sm font-semibold text-amber-600">
                              TNM Mpamba
                            </p>
                            <p className="text-xs font-mono text-slate-700">
                              {paymentInfo.mpambaNumber}
                            </p>
                          </div>
                          <button
                            onClick={() =>
                              navigator.clipboard?.writeText(
                                paymentInfo.mpambaNumber,
                              )
                            }
                            className="text-xs text-amber-600 font-medium px-2.5 py-1 bg-amber-50 rounded-lg"
                          >
                            Copy
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Instructions */}
                  {paymentInfo.paymentInstructions && (
                    <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200">
                      <p className="text-xs font-medium text-slate-600 mb-1">
                        📋 Instructions
                      </p>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        {paymentInfo.paymentInstructions}
                      </p>
                    </div>
                  )}
                </div>
              )}

            {/* ==================== RESULTS TAB ==================== */}
            {activeTab === "results" && student?.id && (
              <ResultsView studentId={student.id} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
