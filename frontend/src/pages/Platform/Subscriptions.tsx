// frontend/src/pages/Platform/Subscriptions.tsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import platformApi from "../../lib/platformApi";

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

export default function PlatformSubscriptions() {
  const [schools, setSchools] = useState<SubSchool[]>([]);
  const [defaults, setDefaults] = useState<Defaults | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // 🎯 Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 15;

  // Mark-paid modal
  const [paying, setPaying] = useState<SubSchool | null>(null);
  const [payTerm, setPayTerm] = useState("TERM_1");
  const [payYear, setPayYear] = useState("2026-2027");
  const [payDays, setPayDays] = useState(90);
  const [payAmount, setPayAmount] = useState(0);
  const [payNotes, setPayNotes] = useState("");
  const [paySubmitting, setPaySubmitting] = useState(false);

  // Extend-trial modal
  const [extending, setExtending] = useState<SubSchool | null>(null);
  const [extendDays, setExtendDays] = useState(30);
  const [extendSubmitting, setExtendSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await platformApi.get("/platform/subscriptions");
      setSchools(res.data.data.schools || []);
      setDefaults(res.data.data.defaults || null);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to load subscriptions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openPayModal = (s: SubSchool) => {
    setPaying(s);
    setPayTerm("TERM_1");
    setPayYear("2026-2027");
    setPayDays(defaults?.defaultTermDays || 90);
    setPayAmount(s.termPrice || defaults?.termPrice || 0);
    setPayNotes("");
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
      setPaying(null);
      load();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to mark as paid");
    } finally {
      setPaySubmitting(false);
    }
  };

  const openExtendModal = (s: SubSchool) => {
    setExtending(s);
    setExtendDays(defaults?.defaultTrialDays || 30);
  };

  const submitExtendTrial = async () => {
    if (!extending) return;
    setExtendSubmitting(true);
    try {
      await platformApi.post(
        `/platform/subscriptions/${extending.id}/extend-trial`,
        { days: extendDays },
      );
      setExtending(null);
      load();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to extend trial");
    } finally {
      setExtendSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-sm text-slate-500">Loading subscriptions...</div>
    );
  }

  // 🎯 Pagination Logic
  const totalPages = Math.ceil(schools.length / ITEMS_PER_PAGE);
  const paginatedSchools = schools.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Subscriptions
          </h1>
          <p className="text-sm text-slate-500">
            Track each school&apos;s term coverage and days remaining
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-4 text-sm rounded-lg bg-red-50 border border-red-200 text-red-700 px-3 py-2">
          {error}
        </div>
      )}

      {schools.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-300 rounded-xl p-10 text-center">
          <p className="text-slate-600 text-sm">
            No schools yet. Add one from the dashboard.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase text-left">
                <tr>
                  <th className="px-5 py-3 font-medium">School</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">End Date</th>
                  <th className="px-5 py-3 font-medium">Days Left</th>
                  <th className="px-5 py-3 font-medium">Students</th>
                  <th className="px-5 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedSchools.map((s) => {
                  const days = s.daysRemaining;
                  const daysColor =
                    days === null
                      ? "text-slate-400"
                      : days < 0
                        ? "text-red-600 font-semibold"
                        : days <= 7
                          ? "text-orange-600 font-semibold"
                          : days <= 14
                            ? "text-yellow-700"
                            : "text-slate-700";
                  return (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className="px-5 py-3">
                        <Link
                          to={`/platform/schools/${s.id}`}
                          className="font-medium text-slate-900 hover:text-blue-700"
                        >
                          {s.name}
                        </Link>
                        <p className="text-[11px] text-slate-400">
                          {s.email || "—"}
                        </p>
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`text-[11px] px-2 py-0.5 rounded-full ${statusColor[s.subscriptionStatus] || "bg-slate-100 text-slate-600"}`}
                        >
                          {s.subscriptionStatus}
                        </span>
                        {!s.isActive && (
                          <span className="ml-2 text-[11px] px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                            Suspended
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-slate-700">
                        {s.effectiveEndDate
                          ? new Date(s.effectiveEndDate).toLocaleDateString()
                          : "—"}
                      </td>
                      <td className={`px-5 py-3 ${daysColor}`}>
                        {days === null ? "—" : days}
                      </td>
                      <td className="px-5 py-3 text-slate-700">
                        {s.studentCount}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openExtendModal(s)}
                            className="text-xs font-medium text-slate-600 hover:text-slate-900 border border-slate-200 rounded px-2 py-1"
                          >
                            Extend Trial
                          </button>
                          <button
                            onClick={() => openPayModal(s)}
                            className="text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded px-2 py-1"
                          >
                            Mark Paid
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* 🎯 PAGINATION FOOTER */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-4 border-t border-slate-200 bg-slate-50">
              <span className="text-xs text-slate-500">
                Showing{" "}
                <span className="font-medium">
                  {(currentPage - 1) * ITEMS_PER_PAGE + 1}
                </span>{" "}
                to{" "}
                <span className="font-medium">
                  {Math.min(currentPage * ITEMS_PER_PAGE, schools.length)}
                </span>{" "}
                of <span className="font-medium">{schools.length}</span> schools
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed text-slate-600 bg-white"
                >
                  <ChevronLeft size={16} />
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
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Mark-Paid Modal */}
      {paying && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-1">
              Mark as Paid
            </h3>
            <p className="text-xs text-slate-500 mb-4">{paying.name}</p>
            {/* ... modal content ... */}
          </div>
        </div>
      )}

      {/* Extend-Trial Modal */}
      {extending && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4">
          <div className="bg-white rounded-xl w-full max-w-sm p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-1">
              Adjust Trial
            </h3>
            <p className="text-xs text-slate-500 mb-4">{extending.name}</p>
            {/* ... modal content ... */}
          </div>
        </div>
      )}
    </div>
  );
}
