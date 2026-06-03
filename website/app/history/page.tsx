"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle, Clock, XCircle, Star } from "lucide-react";
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-900" />
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
            <h1 className="text-lg font-semibold">Payment History</h1>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-4">
        {/* Summary */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-xl p-4 text-center shadow-sm border border-gray-100">
            <p className="text-lg font-bold text-green-600">
              MWK {(summary.totalPaid || 0).toLocaleString()}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">Total Verified</p>
          </div>
          <div className="bg-white rounded-xl p-4 text-center shadow-sm border border-gray-100">
            <p className="text-lg font-bold text-gray-700">
              {summary.totalPayments || 0}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">Total Transactions</p>
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
                  : "bg-white text-gray-600 border border-gray-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Payments List */}
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 text-center border border-gray-100">
            <p className="text-gray-400 text-sm">No payments found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((payment: any) => (
              <div
                key={payment.id}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-base font-bold text-gray-800">
                      MWK {payment.amount.toLocaleString()}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${
                        payment.status === "VERIFIED"
                          ? "bg-green-100 text-green-700"
                          : payment.status === "PENDING"
                            ? "bg-yellow-100 text-yellow-700"
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
                  <span className="text-xs text-gray-400 shrink-0 ml-2">
                    {new Date(payment.createdAt).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 mb-3">
                  <div>
                    <span className="text-gray-400">Term</span>
                    <p className="font-medium text-gray-700">
                      {termLabel(payment.term)} {payment.academicYear}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-400">Method</span>
                    <p className="font-medium text-gray-700">
                      {methodLabel(payment.paymentMethod)}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-400">Receipt</span>
                    <p className="font-mono text-gray-700">
                      {payment.receiptNumber}
                    </p>
                  </div>
                  {payment.requiredAmount && (
                    <div>
                      <span className="text-gray-400">Required</span>
                      <p className="font-medium text-gray-700">
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
                        ? "bg-green-50 text-green-700"
                        : payment.isDebtor
                          ? "bg-red-50 text-red-700"
                          : "bg-gray-50 text-gray-600"
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
