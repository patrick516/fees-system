// frontend/src/pages/Platform/Subscriptions.tsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Activity,
  Clock,
  AlertTriangle,
  DollarSign,
  Info,
} from "lucide-react";
import platformApi from "../../lib/platformApi";
import { toast } from "../../lib/toast";

interface SubSchool {
  id: string;
  name: string;
  email: string | null;
  isActive: boolean;
  setupCompleted: boolean;
  subscriptionStatus:
    | "TRIAL"
    | "ACTIVE"
    | "GRACE"
    | "READONLY"
    | "LOCKED"
    | "SUSPENDED";
  trialEndsAt: string | null;
  subscriptionEndsAt: string | null;
  studentCount: number;
  daysRemaining: number | null;
  effectiveEndDate: string | null;
  termPrice: number;
  currency: string;
}

interface Defaults {
  termPrice: number;
  currency: string;
  defaultTrialDays: number;
  defaultTermDays: number;
}

const statusColor: Record<string, string> = {
  TRIAL: "bg-blue-100 text-blue-700",
  ACTIVE: "bg-green-100 text-green-700",
  GRACE: "bg-yellow-100 text-yellow-800",
  READONLY: "bg-orange-100 text-orange-700",
  LOCKED: "bg-red-100 text-red-700",
  SUSPENDED: "bg-red-100 text-red-700",
};

const formatDate = (iso: string | null) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export default function PlatformSubscriptions() {
  const [schools, setSchools] = useState<SubSchool[]>([]);
  const [defaults, setDefaults] = useState<Defaults | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters & Pagination
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // Modals
  const [paying, setPaying] = useState<SubSchool | null>(null);
  const [payTerm, setPayTerm] = useState("TERM_1");
  const [payYear, setPayYear] = useState("2026-2027");
  const [payDays, setPayDays] = useState(90);
  const [payAmount, setPayAmount] = useState(0);
  const [payNotes, setPayNotes] = useState("");
  const [paySubmitting, setPaySubmitting] = useState(false);
  const [pendingDisputes, setPendingDisputes] = useState<Record<string, any>>(
    {},
  );

  //  Adjust Trial Modal state

  //  Adjust Trial Modal state
  const [extending, setExtending] = useState<SubSchool | null>(null);
  const [extendDays, setExtendDays] = useState<number | "">("");
  const [extendSubmitting, setExtendSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [subsRes, notifRes] = await Promise.all([
        platformApi.get("/platform/subscriptions"),
        platformApi.get("/platform/notifications?status=UNREAD,READ"),
      ]);

      setSchools(subsRes.data.data.schools || []);
      setDefaults(subsRes.data.data.defaults || null);

      //  Map disputes by schoolId
      const disputes: Record<string, any> = {};
      (notifRes.data.data || [])
        .filter((n: any) => n.type === "SUBSCRIPTION_MANUAL_CONFIRM_REQUEST")
        .forEach((n: any) => {
          disputes[n.payload.schoolId] = n;
        });
      setPendingDisputes(disputes);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to load subscriptions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  //  ACTIONS
  const openPayModal = (s: SubSchool) => {
    setPaying(s);
    setPayTerm("TERM_1");
    setPayYear("2026-2027");
    setPayDays(defaults?.defaultTermDays || 90);
    setPayAmount(s.termPrice || defaults?.termPrice || 0);
    setPayNotes("");

    //  Pre-fill from dispute
    const dispute = pendingDisputes[s.id];
    if (dispute?.payload) {
      if (dispute.payload.amount) setPayAmount(dispute.payload.amount);
      let note = "";
      if (dispute.payload.requesterReference)
        note += `Ref: ${dispute.payload.requesterReference}. `;
      if (dispute.payload.requesterMessage)
        note += dispute.payload.requesterMessage;
      setPayNotes(note.trim());
    }
  };
  const submitMarkPaid = async () => {
    if (!paying) return;
    setPaySubmitting(true);
    try {
      await platformApi.post(`/platform/subscriptions/${paying.id}/mark-paid`, {
        term: payTerm,
        academicYear: payYear,
        daysToAdd: payDays,
        amount: payAmount,
        notes: payNotes || undefined,
      });

      // 🎯 Resolve dispute if one exists
      const dispute = pendingDisputes[paying.id];
      if (dispute) {
        try {
          await platformApi.post(
            `/platform/notifications/${dispute.id}/resolve`,
            { action: "approve" },
          );
        } catch (e) {
          console.error("Failed to resolve dispute:", e);
        }
      }

      toast.success(`${paying.name} marked as paid`);
      setPaying(null);
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to mark as paid");
    } finally {
      setPaySubmitting(false);
    }
  };

  const openExtendModal = (s: SubSchool) => {
    setExtending(s);
    setExtendDays("");
  };

  const submitExtendTrial = async () => {
    if (!extending) return;
    if (extendDays === "" || extendDays === 0) {
      toast.error("Enter a number of days to add or reduce");
      return;
    }
    setExtendSubmitting(true);
    try {
      await platformApi.post(
        `/platform/subscriptions/${extending.id}/extend-trial`,
        { days: Number(extendDays) },
      );
      toast.success(
        `Trial adjusted by ${extendDays > 0 ? "+" : ""}${extendDays} days`,
      );
      setExtending(null);
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to extend trial");
    } finally {
      setExtendSubmitting(false);
    }
  };

  // 🎯 Compute preview of new end date as the user types
  const previewEndDate = (s: SubSchool, days: number | "") => {
    if (days === "" || days === 0) return null;
    const base =
      s.effectiveEndDate && new Date(s.effectiveEndDate) > new Date()
        ? new Date(s.effectiveEndDate)
        : new Date();
    const n = Number(days);
    const newEnd = new Date(base.getTime() + n * 24 * 60 * 60 * 1000);
    return newEnd;
  };

  // ==================== FILTERING & STATS ====================
  const filteredSchools = schools.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.email && s.email.toLowerCase().includes(searchQuery.toLowerCase()));
    if (!matchesSearch) return false;
    if (filterStatus === "ALL") return true;
    if (filterStatus === "ACTIVE") return s.subscriptionStatus === "ACTIVE";
    if (filterStatus === "TRIAL") return s.subscriptionStatus === "TRIAL";
    if (filterStatus === "AT_RISK")
      return ["GRACE", "READONLY", "LOCKED"].includes(s.subscriptionStatus);
    return true;
  });

  const totalPages = Math.ceil(filteredSchools.length / ITEMS_PER_PAGE);
  const paginatedSchools = filteredSchools.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  const activeCount = schools.filter(
    (s) => s.subscriptionStatus === "ACTIVE",
  ).length;
  const trialCount = schools.filter(
    (s) => s.subscriptionStatus === "TRIAL",
  ).length;
  const atRiskCount = schools.filter((s) =>
    ["GRACE", "READONLY", "LOCKED"].includes(s.subscriptionStatus),
  ).length;

  const expectedRevenue = schools
    .filter((s) => s.subscriptionStatus === "ACTIVE")
    .reduce((sum, s) => sum + (s.termPrice || 0), 0);

  if (loading) {
    return (
      <div className="p-8 text-sm text-slate-500">Loading subscriptions...</div>
    );
  }

  return (
    <div className="p-8 w-full max-w-7xl mx-auto">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Subscriptions
          </h1>
          <p className="text-sm text-slate-500">
            Track each school's term coverage and days remaining
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-4 text-sm rounded-lg bg-red-50 border border-red-200 text-red-700 px-3 py-2">
          {error}
        </div>
      )}

      {/* STATS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center shrink-0">
            <Activity className="text-green-600" size={20} />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
              Active Subs
            </p>
            <p className="text-xl font-bold text-slate-900">{activeCount}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
            <Clock className="text-blue-600" size={20} />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
              On Trial
            </p>
            <p className="text-xl font-bold text-slate-900">{trialCount}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
            <AlertTriangle className="text-red-600" size={20} />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
              At Risk / Expired
            </p>
            <p className="text-xl font-bold text-slate-900">{atRiskCount}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
            <DollarSign className="text-emerald-600" size={20} />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
              Active Revenue
            </p>
            <p className="text-xl font-bold text-slate-900">
              {defaults?.currency || "MWK"} {expectedRevenue.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* TOOLBAR */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
        <div className="relative w-full sm:w-80">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            placeholder="Search by school name or email..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg">
          {[
            { id: "ALL", label: "All" },
            { id: "ACTIVE", label: "Active" },
            { id: "TRIAL", label: "Trial" },
            { id: "AT_RISK", label: "At Risk" },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => {
                setFilterStatus(f.id);
                setCurrentPage(1);
              }}
              className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                filterStatus === f.id
                  ? "bg-white text-slate-800 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-[11px] uppercase text-left border-b border-slate-200">
              <tr>
                <th className="px-5 py-3 font-medium">School</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Coverage Progress</th>
                <th className="px-5 py-3 font-medium">Term Price</th>
                <th className="px-5 py-3 font-medium text-center">Students</th>
                <th className="px-5 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedSchools.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-12 text-center text-slate-500"
                  >
                    No schools match your search or filter.
                  </td>
                </tr>
              ) : (
                paginatedSchools.map((s) => {
                  const days = s.daysRemaining ?? 0;
                  const isTrial = s.subscriptionStatus === "TRIAL";
                  const totalDays = isTrial
                    ? defaults?.defaultTrialDays || 30
                    : defaults?.defaultTermDays || 90;
                  const percentageLeft = Math.max(
                    0,
                    Math.min(100, (days / totalDays) * 100),
                  );
                  let barColor = "bg-green-500";
                  if (days <= 7) barColor = "bg-red-500";
                  else if (days <= 14) barColor = "bg-orange-500";

                  return (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className="px-5 py-4">
                        <Link
                          to={`/platform/schools/${s.id}`}
                          className="font-medium text-slate-900 hover:text-blue-700"
                        >
                          {s.name}
                        </Link>
                        {pendingDisputes[s.id] && (
                          <span className="ml-2 text-[10px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">
                            ⚠️ DISPUTE
                          </span>
                        )}
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {s.email || "No admin email"}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                            statusColor[s.subscriptionStatus] ||
                            "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {s.subscriptionStatus}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="w-full max-w-[160px]">
                          <div className="flex justify-between text-[11px] mb-1">
                            <span className="text-slate-500">
                              {formatDate(s.effectiveEndDate)}
                            </span>
                            <span className="font-semibold text-slate-700">
                              {days} days
                            </span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full ${barColor}`}
                              style={{ width: `${percentageLeft}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 font-mono text-slate-700">
                        {s.currency}{" "}
                        {Number(
                          s.termPrice || defaults?.termPrice || 0,
                        ).toLocaleString()}
                      </td>
                      <td className="px-5 py-4 text-center text-slate-700">
                        {s.studentCount}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openExtendModal(s)}
                            className="text-xs font-medium text-slate-600 hover:text-slate-900 border border-slate-200 rounded px-2.5 py-1.5 transition bg-white"
                          >
                            Adjust Trial
                          </button>
                          <button
                            onClick={() => openPayModal(s)}
                            className="text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded px-2.5 py-1.5 transition"
                          >
                            Mark Paid
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-200 bg-slate-50">
            <span className="text-xs text-slate-500">
              Showing{" "}
              <span className="font-medium">
                {(currentPage - 1) * ITEMS_PER_PAGE + 1}
              </span>{" "}
              to{" "}
              <span className="font-medium">
                {Math.min(currentPage * ITEMS_PER_PAGE, filteredSchools.length)}
              </span>{" "}
              of <span className="font-medium">{filteredSchools.length}</span>{" "}
              schools
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed text-slate-600 bg-white"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="text-xs font-medium text-slate-700">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed text-slate-600 bg-white"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ==================== MARK-PAID MODAL ==================== */}
      {paying && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4"
          onClick={() => !paySubmitting && setPaying(null)}
        >
          <div
            className="bg-white rounded-xl w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-slate-900 mb-1">
              Mark as Paid
            </h3>
            <p className="text-xs text-slate-500 mb-4">{paying.name}</p>

            {/* 🎯 Dispute details */}
            {pendingDisputes[paying.id]?.payload && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 text-xs text-amber-800 space-y-1.5">
                <p className="font-semibold">School's verification request:</p>
                {pendingDisputes[paying.id].payload.requesterMessage && (
                  <p className="italic">
                    "{pendingDisputes[paying.id].payload.requesterMessage}"
                  </p>
                )}
                {pendingDisputes[paying.id].payload.requesterReference && (
                  <p className="font-mono text-[11px]">
                    Ref: {pendingDisputes[paying.id].payload.requesterReference}
                  </p>
                )}
                {pendingDisputes[paying.id].payload.proofImageUrl && (
                  <a
                    href={pendingDisputes[paying.id].payload.proofImageUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-block text-amber-700 underline font-semibold"
                  >
                    View uploaded proof →
                  </a>
                )}
              </div>
            )}

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Term
                  </label>
                  <select
                    value={payTerm}
                    onChange={(e) => setPayTerm(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white"
                  >
                    <option value="TERM_1">Term 1</option>
                    <option value="TERM_2">Term 2</option>
                    <option value="TERM_3">Term 3</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Academic Year
                  </label>
                  <input
                    value={payYear}
                    onChange={(e) => setPayYear(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Days to Add
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={payDays}
                    onChange={(e) => setPayDays(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Amount ({defaults?.currency || "MWK"})
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={payAmount}
                    onChange={(e) => setPayAmount(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Notes (optional)
                </label>
                <input
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  placeholder="Bank transfer ref #123"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 mt-5">
              <button
                onClick={() => setPaying(null)}
                disabled={paySubmitting}
                className="rounded-lg border border-slate-300 hover:bg-slate-50 text-sm font-medium px-4 py-2"
              >
                Cancel
              </button>
              <button
                onClick={submitMarkPaid}
                disabled={paySubmitting}
                className="rounded-lg bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white text-sm font-semibold px-4 py-2"
              >
                {paySubmitting ? "Saving..." : "Mark as Paid"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== ADJUST TRIAL MODAL ==================== */}
      {extending &&
        (() => {
          const preview = previewEndDate(extending, extendDays);
          const currentDays = extending.daysRemaining ?? 0;
          return (
            <div
              className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4"
              onClick={() => !extendSubmitting && setExtending(null)}
            >
              <div
                className="bg-white rounded-xl w-full max-w-md p-6"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="text-lg font-semibold text-slate-900 mb-1">
                  Adjust Trial
                </h3>
                <p className="text-xs text-slate-500 mb-4">{extending.name}</p>

                {/* 🎯 Current state */}
                <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 mb-4 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Current status</span>
                    <span className="font-semibold text-slate-800">
                      {extending.subscriptionStatus}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Trial ends</span>
                    <span className="font-semibold text-slate-800">
                      {formatDate(extending.trialEndsAt)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Days remaining</span>
                    <span
                      className={`font-semibold ${currentDays <= 0 ? "text-red-600" : currentDays <= 7 ? "text-amber-600" : "text-green-600"}`}
                    >
                      {currentDays <= 0 ? "Expired" : `${currentDays} days`}
                    </span>
                  </div>
                </div>

                {/* 🎯 Input + quick presets */}
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Adjust by (days)
                </label>
                <input
                  type="number"
                  value={extendDays}
                  onChange={(e) =>
                    setExtendDays(
                      e.target.value === "" ? "" : Number(e.target.value),
                    )
                  }
                  placeholder="e.g. 30"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 mb-2"
                />
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {[7, 14, 30, 60, 90].map((d) => (
                    <button
                      key={d}
                      onClick={() => setExtendDays(d)}
                      className="text-[11px] font-medium px-2 py-1 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50"
                    >
                      +{d}d
                    </button>
                  ))}
                  {[7, 14, 30].map((d) => (
                    <button
                      key={`neg-${d}`}
                      onClick={() => setExtendDays(-d)}
                      className="text-[11px] font-medium px-2 py-1 rounded-md border border-red-200 text-red-600 hover:bg-red-50"
                    >
                      -{d}d
                    </button>
                  ))}
                </div>

                {/* 🎯 Preview */}
                {preview && (
                  <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 mb-3">
                    <Info size={14} className="text-blue-600 shrink-0 mt-0.5" />
                    <div className="text-[11px] text-blue-800 leading-relaxed">
                      New trial end:{" "}
                      <strong>
                        {preview.toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </strong>
                      <br />
                      That's{" "}
                      <strong>
                        {Math.max(
                          0,
                          Math.round(
                            (preview.getTime() - Date.now()) /
                              (1000 * 60 * 60 * 24),
                          ),
                        )}{" "}
                        days
                      </strong>{" "}
                      from today.
                    </div>
                  </div>
                )}

                <p className="text-[10px] text-slate-500 leading-relaxed">
                  Use a positive number to extend, or a negative number to
                  reduce days. If the trial already expired, the new date is
                  calculated from today.
                </p>

                <div className="flex items-center justify-end gap-2 mt-5">
                  <button
                    onClick={() => setExtending(null)}
                    disabled={extendSubmitting}
                    className="rounded-lg border border-slate-300 hover:bg-slate-50 text-sm font-medium px-4 py-2"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={submitExtendTrial}
                    disabled={
                      extendSubmitting || extendDays === "" || extendDays === 0
                    }
                    className="rounded-lg bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white text-sm font-semibold px-4 py-2"
                  >
                    {extendSubmitting ? "Saving..." : "Adjust Trial"}
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
    </div>
  );
}
