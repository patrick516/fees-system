import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Wallet,
  Receipt,
  Pencil,
  CheckCircle2,
  Building2,
} from "lucide-react";
import platformApi from "../../lib/platformApi";

interface SchoolDetail {
  id: string;
  name: string;
  logo: string | null;
  slug: string | null;
  email: string | null;
  address: string;
  city: string;
  phone: string;
  isActive: boolean;
  setupCompleted: boolean;
  subscriptionStatus: string;
  trialEndsAt: string | null;
  subscriptionEndsAt: string | null;
  onekhusaMerchantAccount: string | null;
  onekhusaWebhookSecretSuccess: string | null;
  onekhusaWebhookSecretReversed: string | null;
  settlementBankName: string | null;
  settlementAccountName: string | null;
  settlementAccountNumber: string | null;
  settlementBranch: string | null;
  studentCount: number;
  staffCount: number;
  admin: {
    id: string;
    email: string;
    fullName: string;
    phone: string;
    lastLogin: string | null;
    emailVerified: boolean;
  } | null;
}

interface Payment {
  id: string;
  amount: number;
  currency: string;
  term: string;
  academicYear: string;
  method: string;
  status: string;
  paidAt: string | null;
  createdAt: string;
  notes: string | null;
  onekhusaTransactionRef: string | null;
  markedBy: { fullName: string } | null;
}

export default function PlatformSchoolDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [school, setSchool] = useState<SchoolDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // OneKhusa Config Mode
  const [khusaMode, setKhusaMode] = useState<"edit" | "view">("view");
  const [merchantAccount, setMerchantAccount] = useState("");
  const [secretSuccess, setSecretSuccess] = useState("");
  const [secretReversed, setSecretReversed] = useState("");
  const [savingKhusa, setSavingKhusa] = useState(false);
  const [khusaSaved, setKhusaSaved] = useState(false);

  // Payment History
  const [payments, setPayments] = useState<Payment[]>([]);
  const [historyPage, setHistoryPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const load = async () => {
    setLoading(true);
    try {
      const [schoolRes, historyRes] = await Promise.all([
        platformApi.get(`/platform/schools/${id}`),
        platformApi.get(`/platform/subscriptions/${id}/history`),
      ]);
      const s = schoolRes.data.data;
      setSchool(s);
      setMerchantAccount(s.onekhusaMerchantAccount || "");
      setPayments(historyRes.data.data.payments || []);

      // If already configured, default to view mode
      if (s.onekhusaMerchantAccount) {
        setKhusaMode("view");
      } else {
        setKhusaMode("edit");
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to load school details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const saveOneKhusa = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingKhusa(true);
    setKhusaSaved(false);
    try {
      await platformApi.put(`/platform/schools/${id}/onekhusa`, {
        merchantAccount: merchantAccount || null,
        secretSuccess: secretSuccess || undefined,
        secretReversed: secretReversed || undefined,
      });
      setSecretSuccess("");
      setSecretReversed("");
      setKhusaSaved(true);
      setKhusaMode("view"); // 🎯 Switch back to view mode on success
      setTimeout(() => setKhusaSaved(false), 3000);
      load();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to save OneKhusa");
    } finally {
      setSavingKhusa(false);
    }
  };

  if (loading)
    return <div className="p-8 text-sm text-slate-500">Loading...</div>;
  if (error && !school)
    return (
      <div className="p-8">
        <div className="text-sm rounded-lg bg-red-50 border border-red-200 text-red-700 px-3 py-2">
          {error}
        </div>
      </div>
    );
  if (!school) return null;

  // Determine which date to show prominently
  const isPaid =
    school.subscriptionStatus === "ACTIVE" ||
    school.subscriptionStatus === "GRACE";
  const expiryDate = isPaid ? school.subscriptionEndsAt : school.trialEndsAt;
  const expiryLabel = isPaid ? "Subscription Ends" : "Trial Ends";

  // Pagination for history
  const totalPages = Math.ceil(payments.length / ITEMS_PER_PAGE);
  const paginatedPayments = payments.slice(
    (historyPage - 1) * ITEMS_PER_PAGE,
    historyPage * ITEMS_PER_PAGE,
  );

  return (
    <div className="p-8 w-full max-w-7xl mx-auto">
      <button
        onClick={() => navigate("/platform/dashboard")}
        className="text-xs text-slate-500 hover:text-slate-700 mb-4 flex items-center gap-1"
      >
        <ChevronLeft size={14} /> Back to Dashboard
      </button>

      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-4">
          {/* 🎯 Show School Logo */}
          {school.logo ? (
            <div className="w-16 h-16 rounded-xl border border-slate-200 bg-white flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
              <img
                src={school.logo}
                alt={school.name}
                className="w-full h-full object-contain"
              />
            </div>
          ) : (
            <div className="w-16 h-16 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center shrink-0">
              <Building2 className="text-slate-400" size={28} />
            </div>
          )}

          <div>
            <h1 className="text-2xl font-semibold text-slate-900 flex items-center gap-3">
              {school.name}
              <span
                className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                  school.subscriptionStatus === "ACTIVE"
                    ? "bg-green-100 text-green-700"
                    : school.subscriptionStatus === "TRIAL"
                      ? "bg-blue-100 text-blue-700"
                      : "bg-red-100 text-red-700"
                }`}
              >
                {school.subscriptionStatus}
              </span>
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              {school.studentCount} students · {school.staffCount} staff
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 text-sm rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-3">
          {error}
        </div>
      )}

      {/* ==================== 1. OVERVIEW TABLE ==================== */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mb-6">
        <div className="flex items-center gap-2 px-5 py-3 border-b border-slate-100 bg-slate-50/50">
          <ShieldCheck size={16} className="text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-800">
            School Overview
          </h2>
        </div>
        <div className="overflow-x-auto">
          <div className="flex divide-x divide-slate-100 min-w-max w-full">
            <div className="px-5 py-4 flex-1">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">
                Admin Email
              </p>
              <p className="text-sm text-slate-900">
                {school.admin?.email || "—"}
              </p>
            </div>
            <div className="px-5 py-4 flex-1">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">
                Admin Last Login
              </p>
              <p className="text-sm text-slate-900">
                {school.admin?.lastLogin
                  ? new Date(school.admin.lastLogin).toLocaleString()
                  : "Never"}
              </p>
            </div>
            <div className="px-5 py-4 flex-1">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">
                Setup Status
              </p>
              <p
                className={`text-sm font-medium ${school.setupCompleted ? "text-green-600" : "text-amber-600"}`}
              >
                {school.setupCompleted ? "Complete" : "Pending"}
              </p>
            </div>
            <div className="px-5 py-4 flex-1 bg-slate-50/30">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">
                {expiryLabel}
              </p>
              <p className="text-sm font-medium text-slate-900">
                {expiryDate ? new Date(expiryDate).toLocaleDateString() : "—"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ==================== 2. SETTLEMENT & ONEKHUSA (COMBINED IN ROW) ==================== */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mb-8">
        {/* Settlement Account Section */}
        <div className="flex items-center gap-2 px-5 py-3 border-b border-slate-100 bg-slate-50/50 border-t-2 border-t-slate-200">
          <Wallet size={16} className="text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-800">
            Settlement Account (School Provided)
          </h2>
        </div>
        <div className="overflow-x-auto border-b border-slate-100">
          {school.settlementAccountNumber ? (
            <div className="flex divide-x divide-slate-100 min-w-max w-full">
              <div className="px-5 py-4 flex-1">
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">
                  Bank Name
                </p>
                <p className="text-sm text-slate-900">
                  {school.settlementBankName}
                </p>
              </div>
              <div className="px-5 py-4 flex-1">
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">
                  Account Name
                </p>
                <p className="text-sm text-slate-900">
                  {school.settlementAccountName}
                </p>
              </div>
              <div className="px-5 py-4 flex-1">
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">
                  Account Number
                </p>
                <p className="text-sm font-mono text-slate-900">
                  {school.settlementAccountNumber}
                </p>
              </div>
              <div className="px-5 py-4 flex-1">
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">
                  Branch
                </p>
                <p className="text-sm text-slate-900">
                  {school.settlementBranch || "—"}
                </p>
              </div>
            </div>
          ) : (
            <div className="px-5 py-4 text-sm text-slate-500">
              School admin hasn't added their settlement account yet.
            </div>
          )}
        </div>

        {/* OneKhusa Section Header with Toggle */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-slate-50/50 border-t-2 border-t-slate-200">
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-slate-500" />
            <h2 className="text-sm font-semibold text-slate-800">
              OneKhusa Integration (Owner Only)
            </h2>
          </div>

          {/* 🎯 Edit Icon only shows in View Mode */}
          {khusaMode === "view" && (
            <button
              onClick={() => setKhusaMode("edit")}
              className="flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:text-blue-900 bg-white border border-blue-200 hover:bg-blue-50 rounded-lg px-3 py-1.5 transition"
              title="Edit settings"
            >
              <Pencil size={12} /> Edit
            </button>
          )}
        </div>

        {/* OneKhusa Body */}
        {khusaMode === "edit" ? (
          <form
            onSubmit={saveOneKhusa}
            className="p-5 border-t border-slate-100"
          >
            <div className="flex flex-col md:flex-row gap-4 items-end">
              <div className="flex-1">
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">
                  Merchant Account Number
                </label>
                <input
                  value={merchantAccount}
                  onChange={(e) => setMerchantAccount(e.target.value)}
                  placeholder="75480583"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
              <div className="flex-1">
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">
                  Webhook Secret — Success
                </label>
                <input
                  type="password"
                  value={secretSuccess}
                  onChange={(e) => setSecretSuccess(e.target.value)}
                  placeholder={
                    school.onekhusaMerchantAccount
                      ? "•••••••• (leave blank to keep)"
                      : "Paste secret"
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
              <div className="flex-1">
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">
                  Webhook Secret — Reversed
                </label>
                <input
                  type="password"
                  value={secretReversed}
                  onChange={(e) => setSecretReversed(e.target.value)}
                  placeholder={
                    school.onekhusaMerchantAccount
                      ? "•••••••• (leave blank to keep)"
                      : "Paste secret"
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
              <div className="shrink-0">
                <button
                  disabled={savingKhusa}
                  className="rounded-lg bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white text-sm font-semibold px-5 py-2 h-[38px] flex items-center gap-2"
                >
                  {savingKhusa ? "Saving..." : "Save OneKhusa"}
                  {khusaSaved && <span className="text-white">✓</span>}
                </button>
              </div>
            </div>
            <div className="mt-3">
              <button
                type="button"
                onClick={() => setKhusaMode("view")}
                className="text-xs text-slate-500 hover:text-slate-800 underline"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="overflow-x-auto">
            <div className="flex divide-x divide-slate-100 min-w-max w-full">
              <div className="px-5 py-4 flex-1">
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">
                  Merchant Account
                </p>
                <p className="text-sm font-mono text-slate-900">
                  {school.onekhusaMerchantAccount || (
                    <span className="text-slate-400 font-sans">Not set</span>
                  )}
                </p>
              </div>
              <div className="px-5 py-4 flex-1">
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">
                  Webhook Secret — Success
                </p>
                {school.onekhusaWebhookSecretSuccess ? (
                  <span className="inline-flex items-center gap-1 text-sm text-green-700 font-medium">
                    <CheckCircle2 size={14} /> Configured
                  </span>
                ) : (
                  <p className="text-sm text-slate-400">Not set</p>
                )}
              </div>
              <div className="px-5 py-4 flex-1">
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">
                  Webhook Secret — Reversed
                </p>
                {school.onekhusaWebhookSecretReversed ? (
                  <span className="inline-flex items-center gap-1 text-sm text-green-700 font-medium">
                    <CheckCircle2 size={14} /> Configured
                  </span>
                ) : (
                  <p className="text-sm text-slate-400">Not set</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ==================== 3. PAYMENT HISTORY TABLE ==================== */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-3 border-b border-slate-100 bg-slate-50/50">
          <Receipt size={16} className="text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-800">
            Payment History
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-[11px] uppercase text-left border-b border-slate-200">
              <tr>
                <th className="px-5 py-3 font-medium">Date & Time</th>
                <th className="px-5 py-3 font-medium">Term / Year</th>
                <th className="px-5 py-3 font-medium">Method</th>
                <th className="px-5 py-3 font-medium">Reference / Notes</th>
                <th className="px-5 py-3 font-medium">Recorded By</th>
                <th className="px-5 py-3 font-medium text-right">Amount</th>
                <th className="px-5 py-3 font-medium text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedPayments.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-8 text-center text-slate-500"
                  >
                    No payments recorded yet.
                  </td>
                </tr>
              ) : (
                paginatedPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 text-slate-600 whitespace-nowrap">
                      {new Date(p.paidAt || p.createdAt).toLocaleString(
                        undefined,
                        {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        },
                      )}
                    </td>
                    <td className="px-5 py-3 text-slate-700 font-medium whitespace-nowrap">
                      {p.term.replace("_", " ")}{" "}
                      <span className="text-slate-400 text-xs">
                        ({p.academicYear})
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          p.method === "ONEKHUSA"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {p.method}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-500 text-xs">
                      {p.onekhusaTransactionRef ? (
                        <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">
                          {p.onekhusaTransactionRef}
                        </span>
                      ) : p.notes ? (
                        <span className="italic">"{p.notes}"</span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-slate-500 text-xs whitespace-nowrap">
                      {p.markedBy?.fullName || "System (Auto)"}
                    </td>
                    <td className="px-5 py-3 text-right font-mono font-medium text-slate-900 whitespace-nowrap">
                      {p.currency} {Number(p.amount).toLocaleString()}
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          p.status === "VERIFIED"
                            ? "bg-green-100 text-green-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-200 bg-slate-50">
            <span className="text-xs text-slate-500">
              Showing{" "}
              <span className="font-medium">
                {(historyPage - 1) * ITEMS_PER_PAGE + 1}
              </span>{" "}
              to{" "}
              <span className="font-medium">
                {Math.min(historyPage * ITEMS_PER_PAGE, payments.length)}
              </span>{" "}
              of <span className="font-medium">{payments.length}</span> payments
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                disabled={historyPage === 1}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed text-slate-600 bg-white"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="text-xs font-medium text-slate-700">
                Page {historyPage} of {totalPages}
              </span>
              <button
                onClick={() =>
                  setHistoryPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={historyPage === totalPages}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed text-slate-600 bg-white"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
