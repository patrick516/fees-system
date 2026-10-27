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
  Cake,
  Printer,
  Percent,
  Plus,
  Trash2,
  Loader2,
} from "lucide-react";
import api from "../../lib/axios";
import { usePermission } from "../../hooks/usePermission";
import { useAuthStore } from "../../store/authStore";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";

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
  const { can } = usePermission();
  const { staff } = useAuthStore();
  const schoolLogo = staff?.school?.logo;
  const [student, setStudent] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // State for printing
  const [receiptToPrint, setReceiptToPrint] = useState<any>(null);

  // Discount Modal State
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [discountForm, setDiscountForm] = useState({
    amount: "",
    reason: "",
    term: "TERM_1",
    academicYear: "",
  });
  const [applyingDiscount, setApplyingDiscount] = useState(false);

  //  Apply discount error (replaces alert)
  const [discountError, setDiscountError] = useState("");

  //  Remove discount confirmation modal state
  const [removeDiscountModal, setRemoveDiscountModal] = useState<{
    open: boolean;
    discountId: string | null;
    termLabel: string;
    amount: number;
    error: string | null;
    deleting: boolean;
  }>({
    open: false,
    discountId: null,
    termLabel: "",
    amount: 0,
    error: null,
    deleting: false,
  });

  const fetchStudent = () => {
    setLoading(true);
    api
      .get(`/students/${id}`)
      .then((res) => {
        setStudent(res.data.data);
        // Pre-fill academic year for discount form
        setDiscountForm((prev) => ({
          ...prev,
          academicYear: res.data.data.academicYear || "",
        }));
      })
      .catch(() => navigate("/students"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchStudent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handlePrint = (payment: any) => {
    setReceiptToPrint(payment);
    setTimeout(() => {
      window.print();
      setReceiptToPrint(null);
    }, 150);
  };
  const handleApplyDiscount = async (e: React.FormEvent) => {
    e.preventDefault();
    setDiscountError("");
    setApplyingDiscount(true);
    try {
      await api.post(`/students/${id}/discounts`, discountForm);
      setShowDiscountModal(false);
      setDiscountForm({ ...discountForm, amount: "", reason: "" });
      fetchStudent();
    } catch (err: any) {
      setDiscountError(
        err.response?.data?.message || "Failed to apply discount",
      );
    } finally {
      setApplyingDiscount(false);
    }
  };

  const openRemoveDiscountModal = (d: any) => {
    setRemoveDiscountModal({
      open: true,
      discountId: d.id,
      termLabel: `${termLabel(d.term)} ${d.academicYear}`,
      amount: Number(d.amount),
      error: null,
      deleting: false,
    });
  };

  const handleRemoveDiscount = async () => {
    if (!removeDiscountModal.discountId) return;
    setRemoveDiscountModal((prev) => ({
      ...prev,
      deleting: true,
      error: null,
    }));
    try {
      await api.delete(
        `/students/${id}/discounts/${removeDiscountModal.discountId}`,
      );
      setRemoveDiscountModal({
        open: false,
        discountId: null,
        termLabel: "",
        amount: 0,
        error: null,
        deleting: false,
      });
      fetchStudent();
    } catch (err: any) {
      setRemoveDiscountModal((prev) => ({
        ...prev,
        deleting: false,
        error: err.response?.data?.message || "Failed to remove discount",
      }));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-primary)]" />
      </div>
    );
  }

  if (!student) return null;

  const { summary, feeStructures, payments, discounts } = student;
  const verifiedPayments = payments.filter((p: any) => p.status === "VERIFIED");
  const pendingPayments = payments.filter((p: any) => p.status === "PENDING");
  const rejectedPayments = payments.filter((p: any) => p.status === "REJECTED");
  const creditBalance = Number(student.creditBalance) || 0;
  const isDebtor = summary?.isDebtor && creditBalance === 0;

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
    <>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print-receipt, .print-receipt * { visibility: visible; }
          .print-receipt { position: absolute; left: 0; top: 0; width: 100%; padding: 20px; }
          @page { margin: 15mm; size: auto; }
        }
      `}</style>

      <div className="max-w-5xl mx-auto space-y-6 print:hidden">
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

        {/* Top Section */}
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
                        : "bg-[var(--color-primary-light)] text-[var(--color-primary)]"
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
                  {student.gender === "MALE" ? "Male" : "Female"} • Academic
                  Year {student.academicYear}
                </span>
              </div>
              <div className="flex items-center gap-3 text-gray-600">
                <Cake size={15} className="text-gray-400 shrink-0" />
                <span>
                  Born{" "}
                  {new Date(student.dateOfBirth).toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
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

            {can("payments", "write") && (
              <button
                onClick={() =>
                  navigate("/payments/record", {
                    state: {
                      studentId: student.id,
                      studentName: student.fullName,
                    },
                  })
                }
                className="mt-5 w-full flex items-center justify-center gap-2 bg-[var(--color-primary)] text-white py-2.5 rounded-xl text-sm font-medium hover:bg-[var(--color-primary-dark)] transition-colors"
              >
                <CreditCard size={16} />
                Record Payment
              </button>
            )}
          </div>

          {/* Right — Stats + Fee Structures + Discounts */}
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
                      This student overpaid in a previous term. When the next
                      term is activated by the admin, MWK{" "}
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
                      This student has not paid the full required fees for one
                      or more terms. Please follow up with the parent.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Fee Structures for this class */}
            {feeStructures && feeStructures.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
                  <TrendingUp
                    size={16}
                    className="text-[var(--color-primary)]"
                  />
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
                      (sum: number, p: any) => sum + Number(p.amount),
                      0,
                    );

                    // 🎯 Check if there's a discount for this term
                    const termDiscount = discounts?.find(
                      (d: any) =>
                        d.term === fee.term &&
                        d.academicYear === fee.academicYear,
                    );
                    const discountAmount = termDiscount
                      ? Number(termDiscount.amount)
                      : 0;

                    const baseRequired = Number(fee.totalAmount);
                    const netRequired = Math.max(
                      0,
                      baseRequired - discountAmount,
                    );
                    const balance = Math.max(0, netRequired - paidForTerm);
                    const isTermPaid = balance === 0;
                    const isTermDebtor = paidForTerm > 0 && balance > 0;

                    return (
                      <div key={fee.id} className="px-5 py-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2 flex-wrap">
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
                            {discountAmount > 0 && (
                              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">
                                <Percent size={10} className="inline mr-1" />
                                Discount Applied
                              </span>
                            )}
                          </div>
                          <div className="text-right">
                            {discountAmount > 0 && (
                              <p className="text-xs text-gray-400 line-through">
                                MWK {baseRequired.toLocaleString()}
                              </p>
                            )}
                            <span className="text-sm font-bold text-gray-800">
                              MWK {netRequired.toLocaleString()}
                            </span>
                          </div>
                        </div>

                        {/* Progress bar */}
                        <div className="w-full bg-gray-100 rounded-full h-2 mb-3">
                          <div
                            className={`h-2 rounded-full transition-all ${isTermPaid ? "bg-green-500" : "bg-[var(--color-primary)]"}`}
                            style={{
                              width: `${Math.min(100, (paidForTerm / (netRequired || 1)) * 100)}%`,
                            }}
                          />
                        </div>

                        <div className="grid grid-cols-3 gap-3 text-center">
                          <div>
                            <p className="text-xs text-gray-400">
                              Net Required
                            </p>
                            <p className="text-sm font-semibold text-gray-700">
                              MWK {netRequired.toLocaleString()}
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
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 🎯 DISCOUNTS / BURSARIES CARD */}
            <div className="bg-white rounded-xl border border-purple-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-purple-50 bg-purple-50/30 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Percent size={16} className="text-purple-600" />
                  <h3 className="font-medium text-gray-800">
                    Financial Aid & Discounts
                  </h3>
                </div>
                {can("payments", "write") && (
                  <button
                    onClick={() => setShowDiscountModal(true)}
                    className="text-xs flex items-center gap-1 font-semibold text-purple-700 bg-purple-100 hover:bg-purple-200 px-2.5 py-1.5 rounded-lg transition-colors"
                  >
                    <Plus size={12} /> Apply Discount
                  </button>
                )}
              </div>
              <div className="p-5">
                {!discounts || discounts.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-2">
                    No discounts or bursaries applied to this student.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {discounts.map((d: any) => (
                      <div
                        key={d.id}
                        className="flex items-center justify-between p-3 bg-purple-50 border border-purple-100 rounded-lg"
                      >
                        <div>
                          <p className="text-sm font-semibold text-purple-900">
                            {termLabel(d.term)} {d.academicYear}
                          </p>
                          <p className="text-xs text-purple-700 mt-0.5">
                            {d.reason || "Scholarship / Waiver"}
                          </p>
                        </div>
                        <div className="text-right flex items-center gap-3">
                          <p className="text-sm font-bold text-purple-800">
                            - MWK {Number(d.amount).toLocaleString()}
                          </p>
                          {can("payments", "write") && (
                            <button
                              onClick={() => openRemoveDiscountModal(d)}
                              className="p-1.5 text-purple-400 hover:text-red-500 hover:bg-white rounded transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Payment History — Full Width */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Receipt size={16} className="text-[var(--color-primary)]" />
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
                const isCredit = Number(payment.creditApplied) > 0;
                const hasOverpayment = Number(payment.overpayment) > 0;

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
                              MWK {Number(payment.amount).toLocaleString()}
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
                                +MWK{" "}
                                {Number(payment.overpayment).toLocaleString()} →
                                next term credit
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

                      <div className="text-right shrink-0 ml-4 flex flex-col items-end">
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
                              {Number(payment.balance) === 0 ? (
                                <span className="text-xs text-green-600 font-medium">
                                  ✓ Term cleared
                                </span>
                              ) : Number(payment.balance) > 0 ? (
                                <span className="text-xs text-red-500">
                                  MWK {Number(payment.balance).toLocaleString()}{" "}
                                  still owed
                                </span>
                              ) : null}
                            </div>
                          )}
                        {payment.recordedBy && (
                          <p className="text-xs text-gray-400 mt-1">
                            By: {payment.recordedBy.fullName}
                          </p>
                        )}

                        {payment.status === "VERIFIED" && (
                          <button
                            onClick={() => handlePrint(payment)}
                            className="mt-2 flex items-center gap-1 text-xs font-semibold text-[var(--color-primary)] hover:text-[var(--color-primary-dark)] bg-[var(--color-primary-light)] hover:bg-blue-100 px-2 py-1 rounded transition-colors"
                          >
                            <Printer size={12} /> Print Receipt
                          </button>
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

      {/* 🎯 APPLY DISCOUNT MODAL */}
      {showDiscountModal && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowDiscountModal(false)}
        >
          <div
            className="bg-white rounded-xl w-full max-w-md p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-gray-900 mb-1">
              Apply Financial Aid
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              Deduct this amount from the student's required fees for this term.
            </p>
            <form onSubmit={handleApplyDiscount} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Term
                </label>
                <Select
                  value={discountForm.term}
                  onValueChange={(val) =>
                    setDiscountForm({ ...discountForm, term: val })
                  }
                  required
                >
                  <SelectTrigger className="w-full bg-white border-gray-300 rounded-lg text-sm h-[38px]">
                    <SelectValue placeholder="Select term" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="TERM_1" className="cursor-pointer">
                      Term 1
                    </SelectItem>
                    <SelectItem value="TERM_2" className="cursor-pointer">
                      Term 2
                    </SelectItem>
                    <SelectItem value="TERM_3" className="cursor-pointer">
                      Term 3
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Discount Amount (MWK)
                </label>
                <input
                  type="number"
                  value={discountForm.amount}
                  onChange={(e) =>
                    setDiscountForm({ ...discountForm, amount: e.target.value })
                  }
                  placeholder="e.g. 50000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-purple-500 outline-none"
                  required
                  min="1"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Reason (Optional)
                </label>
                <input
                  value={discountForm.reason}
                  onChange={(e) =>
                    setDiscountForm({ ...discountForm, reason: e.target.value })
                  }
                  placeholder="e.g. OVC Bursary, Staff Child"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>
              {discountError && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-xs">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  <span>{discountError}</span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowDiscountModal(false);
                    setDiscountError("");
                  }}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={applyingDiscount}
                  className="px-4 py-2 text-sm bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg disabled:opacity-50 transition-colors"
                >
                  {applyingDiscount ? "Applying..." : "Apply Discount"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* HIDDEN RECEIPT PRINT LAYOUT */}
      {receiptToPrint && (
        <div className="print-receipt hidden print:block">
          <div className="max-w-3xl mx-auto p-8 bg-white">
            <div className="text-center border-b-2 border-gray-300 pb-6 mb-6 flex flex-col items-center">
              {schoolLogo && (
                <img
                  src={schoolLogo}
                  alt="School Logo"
                  className="h-20 w-20 object-contain mb-3"
                />
              )}
              <h1 className="text-3xl font-bold text-gray-900 mb-1">
                {student.school?.name || "SchoolPay"}
              </h1>
              <p className="text-sm text-gray-500">
                {student.school?.address || "Blantyre, Malawi"}
              </p>
              <p className="text-sm text-gray-500">
                Tel: {student.school?.phone || "+265 000 000 000"}
              </p>
              <h2 className="text-xl font-semibold mt-4 text-gray-800">
                OFFICIAL PAYMENT RECEIPT
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-8 mb-8 text-sm">
              <div>
                <p className="text-gray-500 mb-1">Receipt Number</p>
                <p className="font-mono font-bold text-lg text-gray-900">
                  {receiptToPrint.receiptNumber}
                </p>
                <p className="text-gray-500 mt-3 mb-1">Date</p>
                <p className="font-medium text-gray-900">
                  {new Date(receiptToPrint.createdAt).toLocaleString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              <div>
                <p className="text-gray-500 mb-1">Received From</p>
                <p className="font-medium text-gray-900">
                  {student.parentName}
                </p>
                <p className="text-gray-500 mt-3 mb-1">Student</p>
                <p className="font-medium text-gray-900">
                  {student.fullName} ({student.studentCode})
                </p>
                <p className="text-gray-500 mt-3 mb-1">Class</p>
                <p className="font-medium text-gray-900">
                  {student.class.name}
                </p>
              </div>
            </div>

            <table className="w-full text-sm mb-8">
              <thead>
                <tr className="border-b-2 border-gray-300">
                  <th className="text-left py-2">Description</th>
                  <th className="text-right py-2">Amount (MWK)</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-200">
                  <td className="py-3">
                    <p className="font-medium text-gray-900">
                      School Fees Payment
                    </p>
                    <p className="text-xs text-gray-500">
                      {termLabel(receiptToPrint.term)}{" "}
                      {receiptToPrint.academicYear} •{" "}
                      {methodLabel(receiptToPrint.paymentMethod)}
                    </p>
                  </td>
                  <td className="text-right py-3 font-medium text-gray-900">
                    {Number(receiptToPrint.amount).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                    })}
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr className="bg-gray-50">
                  <td className="py-3 px-4 font-bold text-gray-900">
                    Total Paid
                  </td>
                  <td className="text-right py-3 px-4 font-bold text-lg text-green-700">
                    {Number(receiptToPrint.amount).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                    })}
                  </td>
                </tr>
              </tfoot>
            </table>

            <div className="bg-gray-50 rounded-lg p-4 mb-12">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Term Required</p>
                  <p className="font-semibold text-gray-800">
                    {receiptToPrint.requiredAmount
                      ? `MWK ${Number(receiptToPrint.requiredAmount).toLocaleString()}`
                      : "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">
                    Balance After Payment
                  </p>
                  <p
                    className={`font-semibold ${Number(receiptToPrint.balance) <= 0 ? "text-green-600" : "text-red-600"}`}
                  >
                    {receiptToPrint.balance !== null
                      ? Number(receiptToPrint.balance) <= 0
                        ? "FULLY PAID"
                        : `MWK ${Number(receiptToPrint.balance).toLocaleString()}`
                      : "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Received By</p>
                  <p className="font-semibold text-gray-800">
                    {receiptToPrint.recordedBy?.fullName || "System"}
                  </p>
                </div>
              </div>
            </div>

            <div className="text-center text-xs text-gray-400 mt-16 pt-4 border-t border-gray-200">
              <p>
                This is a computer-generated receipt. No signature is required.
              </p>
              <p className="mt-1 font-semibold text-gray-500">
                Thank you for your payment.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ==================== REMOVE DISCOUNT MODAL ==================== */}
      {removeDiscountModal.open && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() =>
            !removeDiscountModal.deleting &&
            setRemoveDiscountModal((prev) => ({ ...prev, open: false }))
          }
        >
          <div
            className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
              <Percent size={22} className="text-red-600" />
            </div>
            <h3 className="text-base font-bold text-gray-900 text-center mb-2">
              Remove this discount?
            </h3>
            <p className="text-sm text-gray-500 text-center mb-1 leading-relaxed">
              <span className="font-semibold text-gray-800">
                {removeDiscountModal.termLabel}
              </span>
            </p>
            <p className="text-sm text-gray-500 text-center mb-4 leading-relaxed">
              The discount of{" "}
              <span className="font-semibold text-purple-700">
                MWK {removeDiscountModal.amount.toLocaleString()}
              </span>{" "}
              will be removed. The student&apos;s balance will increase back to
              the full amount.
            </p>
            {removeDiscountModal.error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-xs mb-3 text-center">
                {removeDiscountModal.error}
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={() =>
                  setRemoveDiscountModal((prev) => ({ ...prev, open: false }))
                }
                disabled={removeDiscountModal.deleting}
                className="flex-1 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                onClick={handleRemoveDiscount}
                disabled={removeDiscountModal.deleting}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 disabled:opacity-50"
              >
                {removeDiscountModal.deleting ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Trash2 size={14} />
                )}
                {removeDiscountModal.deleting ? "Removing..." : "Yes, Remove"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default StudentDetail;
