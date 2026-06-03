import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CreditCard,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  Star,
  User,
  Phone,
  Mail,
  GraduationCap,
  TrendingUp,
  Receipt,
  BadgeAlert,
} from "lucide-react";
import api from "../../lib/axios";

const statusConfig = {
  VERIFIED: {
    label: "Verified",
    color: "bg-green-100 text-green-700",
    icon: CheckCircle,
  },
  PENDING: {
    label: "Pending",
    color: "bg-yellow-100 text-yellow-700",
    icon: Clock,
  },
  REJECTED: {
    label: "Rejected",
    color: "bg-red-100 text-red-700",
    icon: XCircle,
  },
};

const termLabel = (term: string) => term.replace("_", " ");
const methodLabel = (method: string) => method.replace(/_/g, " ");

const StudentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get(`/students/${id}`)
      .then((res) => setStudent(res.data.data))
      .catch(() => navigate("/students"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-900" />
      </div>
    );

  if (!student) return null;

  const { summary, feeStructures, payments } = student;
  const verifiedPayments = payments.filter((p: any) => p.status === "VERIFIED");
  const pendingPayments = payments.filter((p: any) => p.status === "PENDING");
  const rejectedPayments = payments.filter((p: any) => p.status === "REJECTED");
  const creditBalance = student.creditBalance || 0;
  const isDebtor = summary?.isDebtor && creditBalance === 0;
  // const hasCreditAndOwes = summary?.isDebtor && creditBalance > 0;

  // Group payments by term
  const paymentsByTerm: Record<string, any[]> = {};
  payments.forEach((p: any) => {
    const key = `${p.term}-${p.academicYear}`;
    if (!paymentsByTerm[key]) paymentsByTerm[key] = [];
    paymentsByTerm[key].push(p);
  });

  // Status badge
  const getStatusBadge = () => {
    if (creditBalance > 0)
      return (
        <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-100 text-purple-700 text-sm font-medium">
          <Star size={14} />
          Has Credit
        </span>
      );
    if (summary?.isDebtor)
      return (
        <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-100 text-red-700 text-sm font-medium">
          <AlertCircle size={14} />
          Debtor
        </span>
      );
    if (summary?.totalPaid > 0)
      return (
        <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-100 text-green-700 text-sm font-medium">
          <CheckCircle size={14} />
          Paid in Full
        </span>
      );
    return (
      <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 text-gray-500 text-sm font-medium">
        No Payment
      </span>
    );
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate("/students")}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft size={20} className="text-gray-600" />
        </button>
        <div>
          <h2 className="text-lg font-semibold text-gray-800">
            Student Profile
          </h2>
          <p className="text-sm text-gray-400">
            Full payment details and fee summary
          </p>
        </div>
      </div>

      {/* Top Section — Identity + Status + Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Identity Card */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="text-center mb-5">
            <div
              className={`w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-bold mx-auto mb-3 ${
                creditBalance > 0
                  ? "bg-purple-100 text-purple-700"
                  : summary?.isDebtor
                    ? "bg-red-100 text-red-700"
                    : summary?.totalPaid > 0
                      ? "bg-green-100 text-green-700"
                      : "bg-blue-100 text-blue-900"
              }`}
            >
              {student.fullName.charAt(0)}
            </div>
            <h3 className="text-lg font-bold text-gray-800">
              {student.fullName}
            </h3>
            <div className="flex items-center justify-center gap-2 mt-1">
              <span className="text-sm text-gray-500">
                {student.class.name}
              </span>
              <span className="text-gray-300">•</span>
              <span className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded text-gray-600">
                {student.studentCode}
              </span>
            </div>
            <div className="mt-3 flex justify-center">{getStatusBadge()}</div>
          </div>

          <div className="space-y-3 text-sm border-t border-gray-100 pt-4">
            <div className="flex items-center gap-3 text-gray-600">
              <User size={15} className="text-gray-400 shrink-0" />
              <span>
                {student.gender === "MALE" ? "Male" : "Female"} • Academic Year{" "}
                {student.academicYear}
              </span>
            </div>
            <div className="flex items-center gap-3 text-gray-600">
              <GraduationCap size={15} className="text-gray-400 shrink-0" />
              <span>
                {student.class.name} — Level {student.class.level || ""}
              </span>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Parent / Guardian
            </p>
            <div className="flex items-center gap-3 text-sm text-gray-700">
              <User size={14} className="text-gray-400" />
              <span className="font-medium">{student.parentName}</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <Phone size={14} className="text-gray-400" />
              <span>{student.parentPhone}</span>
            </div>
            {student.parentPhone2 && (
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <Phone size={14} className="text-gray-400" />
                <span>{student.parentPhone2}</span>
              </div>
            )}
            {student.parentEmail && (
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <Mail size={14} className="text-gray-400" />
                <span>{student.parentEmail}</span>
              </div>
            )}
          </div>

          <button
            onClick={() =>
              navigate("/payments/record", {
                state: { studentId: student.id, studentName: student.fullName },
              })
            }
            className="mt-5 w-full flex items-center justify-center gap-2 bg-blue-900 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-blue-800 transition-colors"
          >
            <CreditCard size={16} />
            Record Payment
          </button>
        </div>

        {/* Right — Stats + Credit + Fee Structures */}
        <div className="lg:col-span-2 space-y-4">
          {/* Quick Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-green-50 border border-green-100 rounded-xl p-4 text-center">
              <p className="text-xl font-bold text-green-600">
                MWK {(summary?.totalPaid || 0).toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 mt-1">Total Paid</p>
            </div>
            <div
              className={`border rounded-xl p-4 text-center ${
                summary?.isDebtor
                  ? "bg-red-50 border-red-100"
                  : "bg-gray-50 border-gray-100"
              }`}
            >
              <p
                className={`text-xl font-bold ${summary?.isDebtor ? "text-red-600" : "text-gray-400"}`}
              >
                MWK {(summary?.outstandingBalance || 0).toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 mt-1">Balance Owed</p>
            </div>
            <div
              className={`border rounded-xl p-4 text-center ${
                creditBalance > 0
                  ? "bg-purple-50 border-purple-100"
                  : "bg-gray-50 border-gray-100"
              }`}
            >
              <p
                className={`text-xl font-bold ${creditBalance > 0 ? "text-purple-600" : "text-gray-400"}`}
              >
                MWK {creditBalance.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 mt-1">Credit Balance</p>
            </div>
            <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-4 text-center">
              <p className="text-xl font-bold text-yellow-600">
                {summary?.pendingCount || 0}
              </p>
              <p className="text-xs text-gray-500 mt-1">Pending</p>
            </div>
          </div>

          {/* Credit Notice */}
          {creditBalance > 0 && (
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <Star size={18} className="text-purple-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-purple-800">
                    Credit Balance: MWK {creditBalance.toLocaleString()}
                  </p>
                  <p className="text-xs text-purple-600 mt-1">
                    This student overpaid in a previous term. When the next term
                    is activated by the admin, MWK{" "}
                    {creditBalance.toLocaleString()} will automatically be
                    applied to their next term fees. No action needed.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Debtor Notice */}
          {isDebtor && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <BadgeAlert
                  size={18}
                  className="text-red-600 shrink-0 mt-0.5"
                />
                <div>
                  <p className="text-sm font-semibold text-red-800">
                    Outstanding Balance: MWK{" "}
                    {(summary?.outstandingBalance || 0).toLocaleString()}
                  </p>
                  <p className="text-xs text-red-600 mt-1">
                    This student has not paid the full required fees for one or
                    more terms. Please follow up with the parent.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Fee Structures for this class */}
          {feeStructures && feeStructures.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
                <TrendingUp size={16} className="text-blue-900" />
                <h3 className="font-medium text-gray-800">
                  Fee Structure — {student.class.name}
                </h3>
              </div>
              <div className="divide-y divide-gray-50">
                {feeStructures.map((fee: any) => {
                  // Find payments for this term
                  const termPayments = verifiedPayments.filter(
                    (p: any) =>
                      p.term === fee.term &&
                      p.academicYear === fee.academicYear,
                  );
                  const paidForTerm = termPayments.reduce(
                    (sum: number, p: any) => sum + p.amount,
                    0,
                  );
                  const balance = Math.max(0, fee.totalAmount - paidForTerm);
                  const isTermPaid = balance === 0;
                  const isTermDebtor = paidForTerm > 0 && balance > 0;

                  return (
                    <div key={fee.id} className="px-5 py-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-gray-700">
                            {termLabel(fee.term)} {fee.academicYear}
                          </span>
                          {isTermPaid ? (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                              ✓ Paid
                            </span>
                          ) : isTermDebtor ? (
                            <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                              Balance owing
                            </span>
                          ) : paidForTerm === 0 ? (
                            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                              Not paid
                            </span>
                          ) : null}
                        </div>
                        <span className="text-sm font-bold text-gray-800">
                          MWK {fee.totalAmount.toLocaleString()}
                        </span>
                      </div>

                      {/* Progress bar */}
                      <div className="w-full bg-gray-100 rounded-full h-2 mb-3">
                        <div
                          className={`h-2 rounded-full transition-all ${isTermPaid ? "bg-green-500" : "bg-blue-500"}`}
                          style={{
                            width: `${Math.min(100, (paidForTerm / fee.totalAmount) * 100)}%`,
                          }}
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-3 text-center">
                        <div>
                          <p className="text-xs text-gray-400">Required</p>
                          <p className="text-sm font-semibold text-gray-700">
                            MWK {fee.totalAmount.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">Paid</p>
                          <p className="text-sm font-semibold text-green-600">
                            MWK {paidForTerm.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">Balance</p>
                          <p
                            className={`text-sm font-semibold ${balance === 0 ? "text-green-600" : "text-red-600"}`}
                          >
                            {balance === 0
                              ? "✓ Clear"
                              : `MWK ${balance.toLocaleString()}`}
                          </p>
                        </div>
                      </div>

                      {/* Fee breakdown if available */}
                      {(fee.tuitionFee || fee.examFee || fee.buildingLevy) && (
                        <div className="mt-3 pt-3 border-t border-gray-50">
                          <p className="text-xs text-gray-400 mb-2">
                            Breakdown
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {fee.tuitionFee && (
                              <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">
                                Tuition: MWK {fee.tuitionFee.toLocaleString()}
                              </span>
                            )}
                            {fee.examFee && (
                              <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">
                                Exam: MWK {fee.examFee.toLocaleString()}
                              </span>
                            )}
                            {fee.buildingLevy && (
                              <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">
                                Building: MWK{" "}
                                {fee.buildingLevy.toLocaleString()}
                              </span>
                            )}
                            {fee.uniformFee && (
                              <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">
                                Uniform: MWK {fee.uniformFee.toLocaleString()}
                              </span>
                            )}
                            {fee.bookFee && (
                              <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">
                                Books: MWK {fee.bookFee.toLocaleString()}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Payment History — Full Width */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt size={16} className="text-blue-900" />
            <h3 className="font-medium text-gray-800">Payment History</h3>
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
              {verifiedPayments.length} Verified
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" />
              {pendingPayments.length} Pending
            </span>
            {rejectedPayments.length > 0 && (
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
                {rejectedPayments.length} Rejected
              </span>
            )}
          </div>
        </div>

        {payments.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-gray-400">
            <CreditCard size={32} className="mb-2 opacity-30" />
            <p className="text-sm">No payments recorded yet</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {payments.map((payment: any) => {
              const config =
                statusConfig[payment.status as keyof typeof statusConfig];
              const Icon = config.icon;
              const isCredit = payment.creditApplied > 0;
              const hasOverpayment = payment.overpayment > 0;

              return (
                <div key={payment.id} className="px-6 py-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                          payment.status === "VERIFIED"
                            ? "bg-green-100"
                            : payment.status === "PENDING"
                              ? "bg-yellow-100"
                              : "bg-red-100"
                        }`}
                      >
                        <CreditCard
                          size={15}
                          className={
                            payment.status === "VERIFIED"
                              ? "text-green-600"
                              : payment.status === "PENDING"
                                ? "text-yellow-600"
                                : "text-red-600"
                          }
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-gray-800">
                            MWK {payment.amount.toLocaleString()}
                          </p>
                          <span
                            className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${config.color}`}
                          >
                            <Icon size={10} />
                            {config.label}
                          </span>
                          {isCredit && (
                            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                              Credit applied
                            </span>
                          )}
                          {hasOverpayment && (
                            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                              +MWK {payment.overpayment.toLocaleString()} → next
                              term credit
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-xs text-gray-400">
                            {termLabel(payment.term)} {payment.academicYear}
                          </span>
                          <span className="text-gray-300 text-xs">•</span>
                          <span className="text-xs text-gray-400">
                            {methodLabel(payment.paymentMethod)}
                          </span>
                          <span className="text-gray-300 text-xs">•</span>
                          <span className="text-xs font-mono text-gray-400">
                            {payment.receiptNumber}
                          </span>
                          {payment.submittedBy === "PARENT" && (
                            <>
                              <span className="text-gray-300 text-xs">•</span>
                              <span className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">
                                Parent submitted
                              </span>
                            </>
                          )}
                        </div>
                        {payment.notes && (
                          <p className="text-xs text-gray-400 mt-1 italic">
                            "{payment.notes}"
                          </p>
                        )}
                        {payment.rejectionReason && (
                          <p className="text-xs text-red-500 mt-1">
                            Rejected: {payment.rejectionReason}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0 ml-4">
                      <p className="text-xs text-gray-400">
                        {new Date(payment.createdAt).toLocaleDateString(
                          "en-GB",
                          {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          },
                        )}
                      </p>
                      {payment.status === "VERIFIED" &&
                        payment.requiredAmount && (
                          <div className="mt-1">
                            {payment.balance === 0 ? (
                              <span className="text-xs text-green-600 font-medium">
                                ✓ Term cleared
                              </span>
                            ) : payment.balance > 0 ? (
                              <span className="text-xs text-red-500">
                                MWK {payment.balance.toLocaleString()} still
                                owed
                              </span>
                            ) : null}
                          </div>
                        )}
                      {payment.recordedBy && (
                        <p className="text-xs text-gray-400 mt-1">
                          By: {payment.recordedBy.fullName}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentDetail;
