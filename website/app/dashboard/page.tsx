"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LogOut,
  Wallet,
  FileText,
  Check,
  Copy,
  AlertCircle,
  Clock,
  CheckCircle,
  Star,
  Phone,
  HelpCircle,
  Printer,
  Receipt,
} from "lucide-react";
import api from "../../lib/axios";
import { useAuthStore } from "../../store/authStore";
import { useActiveTerm } from "../../hooks/useActiveTerm";
import ResultsView from "./ResultsView";

type Tab = "overview" | "payments" | "info" | "results";

const termLabel = (term?: string | null) => (term || "").replace("_", " ");
const methodLabel = (method?: string | null) =>
  (method || "").replace(/_/g, " ");

export default function DashboardPage() {
  const router = useRouter();
  const { student, isAuthenticated, logout, _hasHydrated } = useAuthStore();
  const [data, setData] = useState<any>(null);
  const [paymentInfo, setPaymentInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  const [resultsAvailable, setResultsAvailable] = useState(false);
  const [termStatus, setTermStatus] = useState<any>(null);

  const [receiptToPrint, setReceiptToPrint] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  const { academicYear: activeYear, activeTerm: currentTerm } = useActiveTerm();

  useEffect(() => {
    if (!_hasHydrated) return;
    if (!isAuthenticated) {
      router.push("/");
      return;
    }
    fetchData();
  }, [_hasHydrated, isAuthenticated]);

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

      if (student?.id) {
        try {
          const resultsRes = await api.get(
            `/exams/student-results/${student.id}`,
          );
          const hasMarks = resultsRes.data?.data?.results?.length > 0;
          setResultsAvailable(hasMarks);
        } catch {
          setResultsAvailable(false);
        }
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
  const handlePrint = (payment: any) => {
    // Build the receipt HTML as a standalone document
    const logoUrl = student?.school?.logo || "/images/SchoolPayLogo.jpg";
    const receiptHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt ${payment.receiptNumber}</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <style>
            * { box-sizing: border-box; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              margin: 0;
              padding: 24px;
              color: #111;
              background: #fff;
            }
            .header {
              text-align: center;
              border-bottom: 2px solid #d1d5db;
              padding-bottom: 24px;
              margin-bottom: 24px;
            }
            .header img { height: 80px; width: 80px; object-fit: contain; margin-bottom: 12px; }
            .header h1 { font-size: 28px; margin: 0 0 4px; font-weight: 700; }
            .header p { margin: 2px 0; color: #6b7280; font-size: 14px; }
            .header h2 { font-size: 20px; margin-top: 16px; font-weight: 600; }
            .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-bottom: 32px; font-size: 14px; }
            .meta p.label { color: #6b7280; margin: 0 0 4px; }
            .meta p.value { margin: 0 0 12px; font-weight: 500; }
            .meta p.mono { font-family: monospace; font-weight: 700; font-size: 16px; }
            table { width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 32px; }
            th, td { padding: 8px 0; text-align: left; }
            th { border-bottom: 2px solid #d1d5db; }
            td { border-bottom: 1px solid #e5e7eb; }
            .amount { text-align: right; }
            .total-row { background: #f9fafb; }
            .total-row td { padding: 12px 16px; font-weight: 700; }
            .total-amount { text-align: right; color: #15803d; font-size: 18px; }
            .summary { background: #f9fafb; padding: 16px; border-radius: 8px; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; text-align: center; margin-bottom: 48px; font-size: 14px; }
            .summary p.label { color: #6b7280; margin: 0 0 4px; font-size: 12px; }
            .summary p.value { margin: 0; font-weight: 600; }
            .footer { text-align: center; color: #9ca3af; font-size: 12px; margin-top: 64px; padding-top: 16px; border-top: 1px solid #e5e7eb; }
            @media print {
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <img src="${logoUrl}" alt="Logo" />
            <h1>${student?.school?.name || "SchoolPay"}</h1>
            <p>${student?.school?.address || "Blantyre, Malawi"}</p>
            <p>Tel: ${student?.school?.phone || "+265 000 000 000"}</p>
            <h2>OFFICIAL PAYMENT RECEIPT</h2>
          </div>

          <div class="meta">
            <div>
              <p class="label">Receipt Number</p>
              <p class="mono">${payment.receiptNumber}</p>
              <p class="label">Date</p>
              <p class="value">${new Date(payment.createdAt).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
            </div>
            <div>
              <p class="label">Received From</p>
              <p class="value">${student?.parentName}</p>
              <p class="label">Student</p>
              <p class="value">${student?.fullName} (${student?.studentCode})</p>
              <p class="label">Class</p>
              <p class="value">${student?.class}</p>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th class="amount">Amount (MWK)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <p style="margin: 0; font-weight: 500;">School Fees Payment</p>
                  <p style="margin: 2px 0 0; font-size: 12px; color: #6b7280;">${termLabel(payment.term)} ${payment.academicYear} • ${methodLabel(payment.paymentMethod)}</p>
                </td>
                <td class="amount">${Number(payment.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr class="total-row">
                <td>Total Paid</td>
                <td class="total-amount">${Number(payment.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              </tr>
            </tfoot>
          </table>

          <div class="summary">
            <div>
              <p class="label">Term Required</p>
              <p class="value">${payment.requiredAmount ? `MWK ${Number(payment.requiredAmount).toLocaleString()}` : "N/A"}</p>
            </div>
            <div>
              <p class="label">Balance After Payment</p>
              <p class="value" style="color: ${Number(payment.balance) <= 0 ? "#15803d" : "#b91c1c"};">
                ${payment.balance !== null ? (Number(payment.balance) <= 0 ? "FULLY PAID" : `MWK ${Number(payment.balance).toLocaleString()}`) : "N/A"}
              </p>
            </div>
            <div>
              <p class="label">Received By</p>
              <p class="value">${payment.recordedBy?.fullName || "System"}</p>
            </div>
          </div>

          <div class="footer">
            <p style="margin: 0 0 4px;">This is a computer-generated receipt. No signature is required.</p>
            <p style="margin: 0; font-weight: 600;">Thank you for your payment.</p>
          </div>
        </body>
      </html>
    `;

    // Open in a new window
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Please allow pop-ups to print your receipt.");
      return;
    }

    printWindow.document.open();
    printWindow.document.write(receiptHtml);
    printWindow.document.close();

    // Wait for the logo to load, then trigger print
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
      }, 500);
    };
  };
  const copyToClipboard = async (text: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
        return;
      }
    } catch {}

    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      ta.style.top = "0";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      alert(`Please copy manually: ${text}`);
    }
  };

  const handleCopyCode = () => {
    if (!student?.studentCode) return;
    copyToClipboard(student.studentCode);
  };

  if (!_hasHydrated || loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-900" />
      </div>
    );

  const payments = data?.payments?.payments || [];
  const summary = data?.payments?.summary || {};
  const pendingPayments = payments.filter((p: any) => p.status === "PENDING");

  const requiredAmount = termStatus?.termStatus?.requiredAmount || 0;
  const paidThisTerm = termStatus?.termStatus?.totalPaidThisTerm || 0;
  const balanceRemaining = termStatus?.termStatus?.balanceRemaining || 0;
  const creditBalance = termStatus?.termStatus?.creditBalance || 0;
  const hasFeeStructure = termStatus?.termStatus?.hasFeeStructure === true;
  const isClear = hasFeeStructure && balanceRemaining === 0;

  const hasPaymentInfo =
    !!paymentInfo &&
    !!(
      paymentInfo.airtelMoneyNumber ||
      paymentInfo.mpambaNumber ||
      (paymentInfo.bankAccounts && paymentInfo.bankAccounts.length > 0)
    );

  const tabs: { key: Tab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "payments", label: "Payment History" },
    { key: "info", label: "Payment Info" },
    ...(resultsAvailable ? [{ key: "results" as Tab, label: "Results" }] : []),
  ];

  const summaryCards = [
    {
      label: "Required",
      value: `MWK ${Number(requiredAmount).toLocaleString()}`,
      icon: FileText,
      box: "bg-blue-50 border-blue-100",
      circle: "bg-blue-100 text-blue-700",
      valueClass: "text-blue-950",
    },
    {
      label: "Paid",
      value: `MWK ${Number(paidThisTerm).toLocaleString()}`,
      icon: Check,
      box: "bg-emerald-50 border-emerald-100",
      circle: "bg-emerald-100 text-emerald-700",
      valueClass: "text-emerald-800",
    },
    {
      label: "Balance",
      value: isClear
        ? "✓ Clear"
        : `MWK ${Number(balanceRemaining).toLocaleString()}`,
      icon: Wallet,
      box: isClear
        ? "bg-emerald-50 border-emerald-100"
        : "bg-amber-50 border-amber-100",
      circle: isClear
        ? "bg-emerald-100 text-emerald-700"
        : "bg-amber-100 text-amber-700",
      valueClass: isClear ? "text-emerald-800" : "text-amber-900",
    },
  ];

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .print-receipt,
          .print-receipt * { visibility: visible !important; }
          .print-receipt {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            padding: 20px !important;
            background: white !important;
            color: black !important;
            display: block !important;
          }
          .print-receipt table { display: table !important; }
          .print-receipt thead { display: table-header-group !important; }
          .print-receipt tbody { display: table-row-group !important; }
          .print-receipt tfoot { display: table-footer-group !important; }
          .print-receipt tr { display: table-row !important; }
          .print-receipt th,
          .print-receipt td { display: table-cell !important; }
          .print-receipt .flex { display: flex !important; }
          .print-receipt .grid { display: grid !important; }
          .print-receipt img { display: block !important; max-width: 100% !important; }
          @page { margin: 15mm; size: auto; }
        }
      `}</style>

      <div className="min-h-screen bg-slate-50 py-4 px-3 sm:py-6 sm:px-6 lg:py-8 lg:px-8 print:hidden">
        <div className="max-w-6xl mx-auto w-full space-y-4">
          {/* HEADER */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-4 py-3 lg:px-6 lg:py-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <img
                src="/images/SchoolPayLogo.jpg"
                alt="SchoolPay"
                className="h-10 w-10 lg:h-12 lg:w-12 object-contain rounded-lg shrink-0"
              />
              <div className="min-w-0 lg:flex lg:items-center lg:gap-5">
                <p className="text-base lg:text-2xl font-bold text-blue-950 lg:text-blue-700 leading-tight">
                  SchoolPay
                </p>
                <span className="hidden lg:block h-10 w-px bg-slate-200" />
                <p className="flex items-center gap-2 text-xs lg:text-lg text-slate-500 lg:text-blue-950 min-w-0">
                  {student?.school?.logo && (
                    <img
                      src={student.school.logo}
                      alt=""
                      className="h-5 w-5 lg:h-7 lg:w-7 rounded object-contain shrink-0"
                    />
                  )}
                  <span className="truncate">{student?.school?.name}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 lg:gap-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 lg:w-12 lg:h-12 rounded-full bg-blue-100 text-blue-950 flex items-center justify-center text-base lg:text-xl font-bold shrink-0">
                  {student?.fullName?.charAt(0)}
                </div>
                <div className="hidden lg:block min-w-0">
                  <p className="font-bold text-blue-950 leading-tight">
                    {student?.fullName}
                  </p>
                  <p className="text-sm text-slate-500">
                    {student?.class} • {student?.academicYear}
                  </p>
                  <p className="text-sm text-slate-500 flex items-center gap-1.5">
                    Student ID: {student?.studentCode}
                    <button
                      onClick={handleCopyCode}
                      className="text-slate-400 hover:text-blue-700 transition-colors"
                      aria-label="Copy Student ID"
                      title={copied ? "Copied" : "Copy Student ID"}
                    >
                      {copied ? (
                        <Check size={14} className="text-emerald-600" />
                      ) : (
                        <Copy size={14} />
                      )}
                    </button>
                  </p>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white text-blue-900 text-sm font-medium p-2.5 lg:px-4 hover:bg-slate-50 transition-colors"
                aria-label="Logout"
              >
                <LogOut size={16} />
                <span className="hidden lg:inline">Logout</span>
              </button>
            </div>
          </div>

          {/* Mobile student card */}
          <div className="lg:hidden bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-blue-100 text-blue-950 flex items-center justify-center text-2xl font-bold shrink-0">
              {student?.fullName?.charAt(0)}
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-blue-950 leading-tight truncate">
                {student?.fullName}
              </h1>
              <p className="text-sm text-slate-500 mt-0.5">
                {student?.class} • {student?.academicYear}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Student ID: {student?.studentCode}
              </p>
            </div>
          </div>

          {/* TABS */}
          <div className="flex border-b border-slate-200 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 lg:flex-none px-3 lg:px-6 py-3 text-xs sm:text-sm whitespace-nowrap border-b-2 -mb-px transition-colors ${
                  activeTab === tab.key
                    ? "text-blue-950 font-bold border-blue-400"
                    : "text-slate-500 font-medium border-transparent hover:text-slate-700"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* OVERVIEW TAB */}
          {activeTab === "overview" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-5">
              <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6 space-y-4">
                {hasFeeStructure && currentTerm && (
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      {termLabel(currentTerm)} • {activeYear}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {summaryCards.map((c) => (
                        <div
                          key={c.label}
                          className={`rounded-2xl border p-4 ${c.box}`}
                        >
                          <div className="flex items-center gap-3 sm:hidden">
                            <div
                              className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${c.circle}`}
                            >
                              <c.icon size={20} />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-slate-700">
                                {c.label}
                              </p>
                              <p
                                className={`text-xl font-bold ${c.valueClass}`}
                              >
                                {c.value}
                              </p>
                            </div>
                          </div>

                          <div className="hidden sm:block">
                            <div className="flex items-center gap-2.5 mb-3">
                              <div
                                className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${c.circle}`}
                              >
                                <c.icon size={18} />
                              </div>
                              <p className="text-sm font-medium text-slate-700">
                                {c.label}
                              </p>
                            </div>
                            <p
                              className={`text-lg lg:text-2xl font-bold ${c.valueClass}`}
                            >
                              {c.value}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {!hasFeeStructure && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100">
                      <p className="text-sm text-emerald-700 font-medium mb-1">
                        Total Paid
                      </p>
                      <p className="text-lg font-bold text-emerald-800">
                        MWK {(summary.totalPaid || 0).toLocaleString()}
                      </p>
                    </div>
                    <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100">
                      <p className="text-sm text-amber-700 font-medium mb-1">
                        Pending
                      </p>
                      <p
                        className={`text-lg font-bold ${
                          summary.pendingAmount > 0
                            ? "text-amber-900"
                            : "text-slate-400"
                        }`}
                      >
                        MWK {(summary.pendingAmount || 0).toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}

                {hasFeeStructure && !isClear && (
                  <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl p-3.5">
                    <AlertCircle
                      size={20}
                      className="text-amber-600 shrink-0"
                    />
                    <p className="text-sm text-amber-900">
                      Outstanding balance of{" "}
                      <span className="font-bold">
                        MWK {Number(balanceRemaining).toLocaleString()}
                      </span>
                      . Please pay soon.
                    </p>
                  </div>
                )}

                {pendingPayments.length > 0 && (
                  <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl p-3.5">
                    <Clock size={18} className="text-blue-600 shrink-0" />
                    <p className="text-sm text-blue-900">
                      {pendingPayments.length} payment(s) awaiting verification
                    </p>
                  </div>
                )}

                {creditBalance > 0 && (
                  <div className="flex items-center gap-3 bg-purple-50 border border-purple-200 rounded-xl p-3.5">
                    <Star size={18} className="text-purple-600 shrink-0" />
                    <p className="text-sm text-purple-900">
                      Credit balance: MWK{" "}
                      {Number(creditBalance).toLocaleString()} — will apply to
                      next term
                    </p>
                  </div>
                )}

                {hasFeeStructure && isClear && pendingPayments.length === 0 && (
                  <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl p-3.5">
                    <CheckCircle
                      size={18}
                      className="text-emerald-600 shrink-0"
                    />
                    <p className="text-sm font-medium text-emerald-900">
                      All fees paid for {termLabel(currentTerm)}! 🎉
                    </p>
                  </div>
                )}

                <div className="space-y-3">
                  <button
                    onClick={() => router.push("/pay")}
                    className="w-full flex items-center justify-center gap-2 bg-blue-900 hover:bg-blue-950 text-white rounded-xl py-3.5 text-base font-semibold shadow-sm transition-colors active:scale-[0.99]"
                  >
                    <Wallet size={20} /> Pay Fees
                  </button>

                  <button
                    onClick={() => router.push("/history")}
                    className="w-full flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-blue-950 border border-slate-300 rounded-xl py-3.5 text-base font-semibold transition-colors active:scale-[0.99]"
                  >
                    <FileText size={18} /> View History
                  </button>

                  {resultsAvailable && (
                    <button
                      onClick={() => setActiveTab("results")}
                      className="w-full flex items-center justify-center gap-2 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-100 rounded-xl py-3.5 text-base font-semibold transition-colors active:scale-[0.99]"
                    >
                      <Star size={18} /> View Results
                    </button>
                  )}

                  <div className="flex justify-center lg:justify-start pt-1">
                    <button
                      onClick={() => router.push("/support")}
                      className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-blue-900 lg:border lg:border-slate-200 lg:bg-white lg:hover:bg-slate-50 lg:rounded-xl lg:px-4 lg:py-2.5 transition-colors"
                    >
                      <HelpCircle size={18} /> Help &amp; Support
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 lg:p-6">
                  <h3 className="hidden lg:block text-base font-bold text-blue-950 pb-4 mb-4 border-b border-slate-200">
                    School Contact
                  </h3>
                  <div className="flex items-start lg:items-center gap-3 lg:gap-4">
                    <div className="w-11 h-11 lg:w-14 lg:h-14 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
                      <Phone size={20} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-blue-950 lg:hidden">
                        School Contact
                      </p>
                      <p className="flex items-center gap-2 flex-wrap text-sm lg:text-lg font-semibold text-blue-950">
                        {student?.school?.phone}
                        <span className="lg:hidden flex items-center gap-1.5 text-slate-500 font-normal">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          {student?.school?.address}
                        </span>
                      </p>
                      <p className="hidden lg:block text-sm text-slate-500 truncate">
                        {student?.school?.address}
                      </p>
                      <p className="lg:hidden text-xs text-slate-500 mt-1">
                        Need help? We&apos;re here to support you and your child
                        every step of the way.
                      </p>
                    </div>
                  </div>
                  <div className="hidden lg:block border-t border-slate-200 mt-4 pt-4 text-sm text-slate-600 leading-relaxed">
                    <p>We&apos;re here to help.</p>
                    <p>Feel free to reach out.</p>
                  </div>
                </div>

                {payments.length > 0 && (
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-200">
                      <h2 className="text-sm font-semibold text-blue-950">
                        Recent Activity
                      </h2>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {payments.slice(0, 2).map((payment: any) => (
                        <div
                          key={payment.id}
                          className="px-4 py-3 flex flex-col gap-2"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                  payment.status === "VERIFIED"
                                    ? "bg-emerald-100"
                                    : "bg-amber-100"
                                }`}
                              >
                                {payment.status === "VERIFIED" ? (
                                  <CheckCircle
                                    size={14}
                                    className="text-emerald-600"
                                  />
                                ) : (
                                  <Clock size={14} className="text-amber-600" />
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
                            <div className="flex flex-col items-end gap-1">
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
                              {payment.status === "VERIFIED" && (
                                <button
                                  onClick={() => handlePrint(payment)}
                                  className="text-[10px] text-blue-800 hover:underline flex items-center gap-1 mt-1 font-semibold"
                                >
                                  <Printer size={10} /> Receipt
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                      {payments.length > 2 && (
                        <button
                          onClick={() => setActiveTab("payments")}
                          className="w-full px-4 py-2.5 text-xs text-blue-700 font-medium hover:bg-slate-50 transition-colors"
                        >
                          View all {payments.length} payments →
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* PAYMENTS TAB */}
          {activeTab === "payments" && (
            <div className="lg:max-w-2xl lg:mx-auto bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-200">
                <h2 className="text-sm font-semibold text-blue-950">
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
                    <div key={payment.id} className="px-4 py-3.5 bg-white">
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
                      {payment.receiptNumber && (
                        <p className="text-[11px] text-slate-400 mt-1 font-mono">
                          Receipt: {payment.receiptNumber}
                        </p>
                      )}
                      {payment.status === "VERIFIED" && (
                        <div className="mt-2 flex justify-end">
                          <button
                            onClick={() => handlePrint(payment)}
                            className="flex items-center gap-1.5 text-xs font-semibold text-blue-900 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg transition-colors"
                          >
                            <Printer size={12} /> View Receipt
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* INFO TAB */}
          {activeTab === "info" && !hasPaymentInfo && (
            <div className="lg:max-w-2xl lg:mx-auto bg-white rounded-2xl border border-slate-200 shadow-sm p-10 text-center text-slate-400">
              <Wallet size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">
                The school has not added payment details yet.
              </p>
            </div>
          )}

          {activeTab === "info" && hasPaymentInfo && (
            <div className="lg:max-w-2xl lg:mx-auto space-y-3">
              <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100">
                <p className="text-xs font-medium text-blue-800">
                  Your Reference Number
                </p>
                <p className="text-lg font-bold text-blue-950 font-mono mt-0.5">
                  {student?.studentCode}
                </p>
                <p className="text-[11px] text-blue-700 mt-0.5">
                  Use this for all payments
                </p>
              </div>

              {paymentInfo.bankAccounts &&
                paymentInfo.bankAccounts.length > 0 && (
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                      <p className="text-sm font-semibold text-blue-950">
                        Bank Accounts
                      </p>
                    </div>
                    {paymentInfo.bankAccounts.map(
                      (bank: any, index: number) => (
                        <div
                          key={index}
                          className="p-4 border-b border-slate-100 last:border-0"
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
                                copyToClipboard(bank.accountNumber)
                              }
                              className="text-xs text-blue-700 font-semibold px-3 py-1.5 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
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

              {(paymentInfo.airtelMoneyNumber || paymentInfo.mpambaNumber) && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                    <p className="text-sm font-semibold text-blue-950">
                      Mobile Money
                    </p>
                  </div>
                  {paymentInfo.airtelMoneyNumber && (
                    <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-red-600">
                          Airtel Money
                        </p>
                        <p className="text-sm font-mono text-slate-800 mt-0.5">
                          {paymentInfo.airtelMoneyNumber}
                        </p>
                        {paymentInfo.airtelMoneyName && (
                          <p className="text-xs text-slate-500 mt-0.5">
                            {paymentInfo.airtelMoneyName}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() =>
                          copyToClipboard(paymentInfo.airtelMoneyNumber)
                        }
                        className="text-xs text-red-600 font-semibold px-3 py-1.5 bg-red-50 hover:bg-red-100 rounded-lg shrink-0 transition-colors"
                      >
                        Copy
                      </button>
                    </div>
                  )}
                  {paymentInfo.mpambaNumber && (
                    <div className="p-4 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-amber-600">
                          TNM Mpamba
                        </p>
                        <p className="text-sm font-mono text-slate-800 mt-0.5">
                          {paymentInfo.mpambaNumber}
                        </p>
                        {paymentInfo.mpambaName && (
                          <p className="text-xs text-slate-500 mt-0.5">
                            {paymentInfo.mpambaName}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() =>
                          copyToClipboard(paymentInfo.mpambaNumber)
                        }
                        className="text-xs text-amber-600 font-semibold px-3 py-1.5 bg-amber-50 hover:bg-amber-100 rounded-lg shrink-0 transition-colors"
                      >
                        Copy
                      </button>
                    </div>
                  )}
                </div>
              )}

              {paymentInfo.paymentInstructions && (
                <div className="bg-slate-100 rounded-2xl p-4 border border-slate-200">
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

          {activeTab === "results" && student?.id && (
            <div className="lg:max-w-2xl lg:mx-auto">
              <ResultsView studentId={student.id} />
            </div>
          )}
        </div>
      </div>

      {/* HIDDEN RECEIPT PRINT LAYOUT — logo properly placed here */}
      {receiptToPrint && (
        <div className="print-receipt hidden print:block">
          <div className="max-w-3xl mx-auto p-8 bg-white text-black">
            <div className="text-center border-b-2 border-gray-300 pb-6 mb-6 flex flex-col items-center">
              <img
                src={student?.school?.logo || "/images/SchoolPayLogo.jpg"}
                alt="School Logo"
                className="h-20 w-20 object-contain mb-3"
                crossOrigin="anonymous"
              />
              <h1 className="text-3xl font-bold text-gray-900 mb-1">
                {student?.school?.name || "SchoolPay"}
              </h1>
              <p className="text-sm text-gray-500">
                {student?.school?.address || "Blantyre, Malawi"}
              </p>
              <p className="text-sm text-gray-500">
                Tel: {student?.school?.phone || "+265 000 000 000"}
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
                  {student?.parentName}
                </p>
                <p className="text-gray-500 mt-3 mb-1">Student</p>
                <p className="font-medium text-gray-900">
                  {student?.fullName} ({student?.studentCode})
                </p>
                <p className="text-gray-500 mt-3 mb-1">Class</p>
                <p className="font-medium text-gray-900">{student?.class}</p>
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
    </>
  );
}
