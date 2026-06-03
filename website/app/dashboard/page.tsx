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

const termLabel = (term: string) => term.replace("_", " ");

export default function DashboardPage() {
  const router = useRouter();
  const { student, isAuthenticated, logout, _hasHydrated } = useAuthStore();
  const [data, setData] = useState<any>(null);
  const [paymentInfo, setPaymentInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "payments" | "info">(
    "overview",
  );

  useEffect(() => {
    if (!_hasHydrated) return;
    if (!isAuthenticated) {
      router.push("/");
      return;
    }
    fetchData();
  }, [_hasHydrated, isAuthenticated]);

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

  const getStatusColor = () => {
    if (summary.totalPaid === 0) return "from-gray-600 to-gray-500";
    if (payments.some((p: any) => p.isDebtor)) return "from-red-600 to-red-500";
    return "from-green-600 to-green-500";
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Compact Header */}
      <div
        className={`bg-gradient-to-r from-blue-900 to-blue-700 text-white sticky top-0 z-10`}
      >
        <div className="max-w-lg mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                <School size={16} />
              </div>
              <div>
                <p className="text-xs text-blue-200 leading-tight">SchoolPay</p>
                <p className="text-xs font-medium truncate max-w-[150px] leading-tight">
                  {student?.school?.name}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-blue-200 hover:text-white text-sm transition-colors"
            >
              <LogOut size={14} />
              <span className="text-xs">Logout</span>
            </button>
          </div>

          {/* Student Info Compact */}
          <div className="flex items-center gap-3 mt-3 pt-1">
            <div className="w-10 h-10 bg-white bg-opacity-20 rounded-xl flex items-center justify-center text-lg font-bold">
              {student?.fullName?.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-base font-bold truncate">
                {student?.fullName}
              </h1>
              <p className="text-blue-200 text-xs">
                {student?.class} • {student?.academicYear}
              </p>
              <p className="text-blue-300 text-[10px] font-mono">
                {student?.studentCode}
              </p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-blue-800">
          <button
            onClick={() => setActiveTab("overview")}
            className={`flex-1 py-2.5 text-xs font-medium transition-all ${
              activeTab === "overview"
                ? "text-white border-b-2 border-white"
                : "text-blue-200"
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab("payments")}
            className={`flex-1 py-2.5 text-xs font-medium transition-all ${
              activeTab === "payments"
                ? "text-white border-b-2 border-white"
                : "text-blue-200"
            }`}
          >
            Payment History
          </button>
          <button
            onClick={() => setActiveTab("info")}
            className={`flex-1 py-2.5 text-xs font-medium transition-all ${
              activeTab === "info"
                ? "text-white border-b-2 border-white"
                : "text-blue-200"
            }`}
          >
            Payment Info
          </button>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
        {/* OVERVIEW TAB */}
        {activeTab === "overview" && (
          <>
            {/* Quick Stats Cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-xl shadow-sm p-3 border border-gray-100">
                <p className="text-xs text-gray-500 mb-1">Total Paid</p>
                <p className="text-xl font-bold text-green-600">
                  MWK {(summary.totalPaid || 0).toLocaleString()}
                </p>
              </div>
              <div
                className={`bg-white rounded-xl shadow-sm p-3 border border-gray-100`}
              >
                <p className="text-xs text-gray-500 mb-1">Pending</p>
                <p
                  className={`text-xl font-bold ${summary.pendingAmount > 0 ? "text-yellow-600" : "text-gray-400"}`}
                >
                  MWK {(summary.pendingAmount || 0).toLocaleString()}
                </p>
              </div>
            </div>

            {/* Notices - Compact */}
            {pendingPayments.length > 0 && (
              <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded-xl p-2.5">
                <Clock size={14} className="text-yellow-600 shrink-0" />
                <p className="text-xs text-yellow-800">
                  {pendingPayments.length} payment(s) awaiting verification
                </p>
              </div>
            )}

            {verifiedPayments.some((p: any) => p.isDebtor) && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl p-2.5">
                <AlertCircle size={14} className="text-red-600 shrink-0" />
                <p className="text-xs text-red-800 font-medium">
                  Outstanding balance! Please pay soon.
                </p>
              </div>
            )}

            {verifiedPayments.some((p: any) => p.overpayment > 0) && (
              <div className="flex items-center gap-2 bg-purple-50 border border-purple-200 rounded-xl p-2.5">
                <Star size={14} className="text-purple-600 shrink-0" />
                <p className="text-xs text-purple-800">
                  Credit balance available
                </p>
              </div>
            )}

            {verifiedPayments.length > 0 &&
              !verifiedPayments.some((p: any) => p.isDebtor) &&
              pendingPayments.length === 0 && (
                <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl p-2.5">
                  <CheckCircle size={14} className="text-green-600 shrink-0" />
                  <p className="text-xs font-medium text-green-800">
                    All fees paid! 🎉
                  </p>
                </div>
              )}

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => router.push("/pay")}
                className="bg-gradient-to-r from-green-600 to-green-500 text-white rounded-xl p-3 shadow-sm"
              >
                <CreditCard size={18} className="mx-auto mb-1" />
                <p className="text-xs font-semibold">Pay Fees</p>
              </button>
              <button
                onClick={() => router.push("/history")}
                className="bg-blue-50 text-blue-700 rounded-xl p-3 border border-blue-100"
              >
                <History size={18} className="mx-auto mb-1" />
                <p className="text-xs font-semibold">View History</p>
              </button>
            </div>

            {/* Recent Activity */}
            {payments.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100">
                  <h2 className="text-sm font-semibold text-gray-800">
                    Recent Activity
                  </h2>
                </div>
                <div className="divide-y divide-gray-50">
                  {payments.slice(0, 2).map((payment: any) => (
                    <div
                      key={payment.id}
                      className="px-4 py-3 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                            payment.status === "VERIFIED"
                              ? "bg-green-100"
                              : "bg-yellow-100"
                          }`}
                        >
                          {payment.status === "VERIFIED" ? (
                            <CheckCircle size={12} className="text-green-600" />
                          ) : (
                            <Clock size={12} className="text-yellow-600" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-800">
                            MWK {payment.amount.toLocaleString()}
                          </p>
                          <p className="text-xs text-gray-400">
                            {termLabel(payment.term)} {payment.academicYear}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          payment.status === "VERIFIED"
                            ? "bg-green-100 text-green-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {payment.status === "VERIFIED" ? "Verified" : "Pending"}
                      </span>
                    </div>
                  ))}
                  {payments.length > 2 && (
                    <button
                      onClick={() => setActiveTab("payments")}
                      className="w-full px-4 py-2 text-xs text-blue-600 font-medium hover:bg-gray-50"
                    >
                      View all {payments.length} payments →
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* School Contact Quick */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3">
              <div className="flex items-center gap-2 text-gray-600">
                <Phone size={14} />
                <p className="text-xs text-gray-500">School Contact</p>
              </div>
              <p className="text-sm font-medium text-gray-800 mt-1">
                {student?.school?.phone}
              </p>
              <p className="text-xs text-gray-500 mt-0.5 truncate">
                {student?.school?.address}
              </p>
            </div>
          </>
        )}

        {/* PAYMENTS TAB */}
        {activeTab === "payments" && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-800">
                All Payments
              </h2>
            </div>
            {payments.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <Receipt size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">No payment history</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {payments.map((payment: any) => (
                  <div key={payment.id} className="px-4 py-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-gray-800">
                        MWK {payment.amount.toLocaleString()}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          payment.status === "VERIFIED"
                            ? "bg-green-100 text-green-700"
                            : payment.status === "PENDING"
                              ? "bg-yellow-100 text-yellow-700"
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
                    <div className="flex items-center justify-between text-xs text-gray-500">
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
                      <p className="text-xs text-gray-400 mt-1 font-mono">
                        Ref: {payment.reference}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* INFO TAB */}
        {activeTab === "info" &&
          paymentInfo &&
          (paymentInfo.airtelMoneyNumber ||
            paymentInfo.mpambaNumber ||
            (paymentInfo.bankAccounts &&
              paymentInfo.bankAccounts.length > 0)) && (
            <div className="space-y-3">
              {/* Reference Number - Always show */}
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl p-3 border border-blue-200">
                <p className="text-xs font-medium text-blue-800">
                  Your Reference Number
                </p>
                <p className="text-base font-bold text-blue-900 font-mono mt-0.5">
                  {student?.studentCode}
                </p>
                <p className="text-[10px] text-blue-600 mt-0.5">
                  Use this for all payments
                </p>
              </div>

              {/* Bank Accounts */}
              {paymentInfo.bankAccounts &&
                paymentInfo.bankAccounts.length > 0 && (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
                      <p className="text-xs font-semibold text-gray-700">
                        Bank Accounts
                      </p>
                    </div>
                    {paymentInfo.bankAccounts.map(
                      (bank: any, index: number) => (
                        <div
                          key={index}
                          className="p-3 border-b border-gray-50"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-semibold text-gray-800">
                                {bank.bankName}
                              </p>
                              <p className="text-xs text-gray-500">
                                {bank.accountName}
                              </p>
                            </div>
                            <button
                              onClick={() =>
                                navigator.clipboard?.writeText(
                                  bank.accountNumber,
                                )
                              }
                              className="text-xs text-blue-600 font-medium px-2 py-1 bg-blue-50 rounded-lg"
                            >
                              Copy
                            </button>
                          </div>
                          <p className="text-xs font-mono text-gray-700 mt-1">
                            {bank.accountNumber}
                          </p>
                        </div>
                      ),
                    )}
                  </div>
                )}

              {/* Mobile Money */}
              {(paymentInfo.airtelMoneyNumber || paymentInfo.mpambaNumber) && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
                    <p className="text-xs font-semibold text-gray-700">
                      Mobile Money
                    </p>
                  </div>
                  {paymentInfo.airtelMoneyNumber && (
                    <div className="p-3 border-b border-gray-50 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-red-600">
                          Airtel Money
                        </p>
                        <p className="text-xs font-mono text-gray-700">
                          {paymentInfo.airtelMoneyNumber}
                        </p>
                      </div>
                      <button
                        onClick={() =>
                          navigator.clipboard?.writeText(
                            paymentInfo.airtelMoneyNumber,
                          )
                        }
                        className="text-xs text-red-600 font-medium px-2 py-1 bg-red-50 rounded-lg"
                      >
                        Copy
                      </button>
                    </div>
                  )}
                  {paymentInfo.mpambaNumber && (
                    <div className="p-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-yellow-600">
                          TNM Mpamba
                        </p>
                        <p className="text-xs font-mono text-gray-700">
                          {paymentInfo.mpambaNumber}
                        </p>
                      </div>
                      <button
                        onClick={() =>
                          navigator.clipboard?.writeText(
                            paymentInfo.mpambaNumber,
                          )
                        }
                        className="text-xs text-yellow-600 font-medium px-2 py-1 bg-yellow-50 rounded-lg"
                      >
                        Copy
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Instructions */}
              {paymentInfo.paymentInstructions && (
                <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
                  <p className="text-xs font-medium text-gray-600 mb-1">
                    📋 Instructions
                  </p>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    {paymentInfo.paymentInstructions}
                  </p>
                </div>
              )}
            </div>
          )}
      </div>
    </div>
  );
}
