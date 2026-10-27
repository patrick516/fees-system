"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle,
  Clock,
  XCircle,
  Star,
  Check,
  FileText,
} from "lucide-react";
import api from "../../lib/axios";
import { useAuthStore } from "../../store/authStore";

const termLabel = (term: string) => term.replace("_", " ");
const methodLabel = (method: string) => method.replace(/_/g, " ");

export default function HistoryPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [payments, setPayments] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/");
      return;
    }
    api
      .get("/payments/my-child")
      .then((res) => {
        setPayments(res.data.data.payments);
        setSummary(res.data.data.summary);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isAuthenticated]);

  const filtered = filter
    ? payments.filter((p) => p.status === filter)
    : payments;

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-900" />
      </div>
    );

  return (
    <div className="min-h-screen bg-slate-50 py-4 px-3 sm:py-6 sm:px-6 lg:py-8">
      <div className="max-w-3xl mx-auto space-y-4">
        {/* Header */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-4 py-3 lg:px-6 lg:py-4 flex items-center gap-3">
          <button
            onClick={() => router.push("/dashboard")}
            className="p-2.5 rounded-xl border border-slate-200 bg-white text-blue-900 hover:bg-slate-50 transition-colors"
            aria-label="Back to dashboard"
          >
            <ArrowLeft size={16} />
          </button>
          <img
            src="/images/SchoolPayLogo.jpg"
            alt="SchoolPay"
            className="h-10 w-10 object-contain rounded-lg shrink-0"
          />
          <div className="min-w-0">
            <h1 className="text-lg lg:text-xl font-bold text-blue-950 leading-tight">
              Payment History
            </h1>
            <p className="text-xs text-slate-500">SchoolPay</p>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <Check size={16} />
              </div>
              <p className="text-xs font-medium text-slate-700">
                Total Verified
              </p>
            </div>
            <p className="text-base lg:text-xl font-bold text-emerald-800">
              MWK {(summary.totalPaid || 0).toLocaleString()}
            </p>
          </div>
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                <FileText size={16} />
              </div>
              <p className="text-xs font-medium text-slate-700">
                Total Transactions
              </p>
            </div>
            <p className="text-base lg:text-xl font-bold text-blue-950">
              {summary.totalPayments || 0}
            </p>
          </div>
        </div>

        {/* Filter */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {[
            { value: "", label: "All" },
            { value: "VERIFIED", label: "✓ Verified" },
            { value: "PENDING", label: "⏳ Pending" },
            { value: "REJECTED", label: "✕ Rejected" },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setFilter(tab.value)}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
                filter === tab.value
                  ? "bg-blue-900 text-white"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Payments List */}
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 text-center border border-slate-200 shadow-sm">
            <p className="text-slate-400 text-sm">No payments found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((payment: any) => (
              <div
                key={payment.id}
                className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-base font-bold text-blue-950">
                      MWK {payment.amount.toLocaleString()}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${
                        payment.status === "VERIFIED"
                          ? "bg-emerald-100 text-emerald-700"
                          : payment.status === "PENDING"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-red-100 text-red-700"
                      }`}
                    >
                      {payment.status === "VERIFIED" ? (
                        <CheckCircle size={10} />
                      ) : payment.status === "PENDING" ? (
                        <Clock size={10} />
                      ) : (
                        <XCircle size={10} />
                      )}
                      {payment.status === "VERIFIED"
                        ? "Verified"
                        : payment.status === "PENDING"
                          ? "Pending"
                          : "Rejected"}
                    </span>
                    {payment.overpayment > 0 && (
                      <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Star size={10} />
                        +MWK {payment.overpayment.toLocaleString()} credit
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-slate-400 shrink-0 ml-2">
                    {new Date(payment.createdAt).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 mb-3">
                  <div>
                    <span className="text-slate-400">Term</span>
                    <p className="font-medium text-slate-700">
                      {termLabel(payment.term)} {payment.academicYear}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400">Method</span>
                    <p className="font-medium text-slate-700">
                      {methodLabel(payment.paymentMethod)}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400">Receipt</span>
                    <p className="font-mono text-slate-700">
                      {payment.receiptNumber}
                    </p>
                  </div>
                  {payment.requiredAmount && (
                    <div>
                      <span className="text-slate-400">Required</span>
                      <p className="font-medium text-slate-700">
                        MWK {payment.requiredAmount.toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>

                {/* Balance info */}
                {payment.status === "VERIFIED" && payment.requiredAmount && (
                  <div
                    className={`rounded-xl p-3 text-xs ${
                      payment.balance === 0
                        ? "bg-emerald-50 text-emerald-700"
                        : payment.isDebtor
                          ? "bg-amber-50 text-amber-900"
                          : "bg-slate-50 text-slate-600"
                    }`}
                  >
                    {payment.balance === 0
                      ? "✓ Term fees fully cleared"
                      : payment.isDebtor
                        ? `Balance remaining: MWK ${payment.balance.toLocaleString()}`
                        : "Payment recorded"}
                  </div>
                )}

                {payment.rejectionReason && (
                  <div className="bg-red-50 rounded-xl p-3 text-xs text-red-700 mt-2">
                    <span className="font-medium">Rejected: </span>
                    {payment.rejectionReason}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
