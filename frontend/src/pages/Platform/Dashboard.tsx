// frontend/src/pages/Platform/Dashboard.tsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Building2,
  Users,
  Activity,
  School,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Clock,
} from "lucide-react";
import platformApi from "../../lib/platformApi";
import type { PlatformSchool } from "../../types/platform";
import InviteSchoolModal from "../../components/Platform/InviteSchoolModal";

const StatusBadge = ({ s }: { s: PlatformSchool }) => {
  if (!s.isActive)
    return (
      <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-red-100 text-red-700">
        Suspended
      </span>
    );
  const map: Record<string, string> = {
    TRIAL: "bg-blue-100 text-blue-700",
    ACTIVE: "bg-green-100 text-green-700",
    GRACE: "bg-yellow-100 text-yellow-800",
    READONLY: "bg-orange-100 text-orange-700",
    LOCKED: "bg-red-100 text-red-700",
    SUSPENDED: "bg-red-100 text-red-700",
  };
  return (
    <span
      className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${map[s.subscriptionStatus] || "bg-slate-100 text-slate-600"}`}
    >
      {s.subscriptionStatus}
    </span>
  );
};

export default function PlatformDashboard() {
  const [schools, setSchools] = useState<PlatformSchool[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 15;

  const load = async () => {
    try {
      const [schoolsRes, analyticsRes] = await Promise.all([
        platformApi.get("/platform/schools"),
        platformApi.get("/platform/subscriptions/analytics"),
      ]);
      setSchools(schoolsRes.data.data || []);
      setAnalytics(analyticsRes.data.data || null);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const totalStudents = schools.reduce((s, x) => s + x.studentCount, 0);
  const activeCount = schools.filter((s) => s.isActive).length;

  // Pagination Logic
  const totalPages = Math.ceil(schools.length / ITEMS_PER_PAGE);
  const paginatedSchools = schools.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  if (loading) {
    return (
      <div className="p-8 text-sm text-slate-500">Loading dashboard...</div>
    );
  }

  return (
    <>
      <div className="p-8 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
            <p className="text-sm text-slate-500 mt-1">
              Overview of your platform performance and schools
            </p>
          </div>
          <button
            onClick={() => setInviteOpen(true)}
            className="rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold px-5 py-2.5 transition-colors"
          >
            + Add School
          </button>
        </div>

        {error && (
          <div className="text-sm rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-3 mb-6">
            {error}
          </div>
        )}

        {/* ==================== 1. REVENUE & COLLECTION ==================== */}
        {analytics && (
          <div className="mb-8">
            <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wide mb-3">
              Revenue & Collection
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Total Revenue */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 lg:col-span-2">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Total Revenue
                  </p>
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                    <DollarSign className="text-emerald-600" size={16} />
                  </div>
                </div>
                <p className="text-3xl font-bold text-slate-900">
                  {analytics.currency}{" "}
                  {Number(analytics.stats.totalRevenue).toLocaleString()}
                </p>
                <div className="flex items-center gap-4 mt-3 text-[11px] font-medium">
                  <span className="flex items-center gap-1 text-blue-600">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    OneKhusa:{" "}
                    {Number(analytics.stats.onekhusaRevenue).toLocaleString()}
                  </span>
                  <span className="flex items-center gap-1 text-slate-500">
                    <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                    Manual:{" "}
                    {Number(analytics.stats.manualRevenue).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Fully Paid */}
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Fully Paid
                  </p>
                  <CheckCircle2 className="text-green-500" size={18} />
                </div>
                <p className="text-2xl font-bold text-slate-900">
                  {analytics.stats.fullyPaidCount}
                </p>
                <p className="text-[11px] text-slate-500 mt-2">
                  Schools fully paid for term
                </p>
              </div>

              {/* Partially Paid */}
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Partially Paid
                  </p>
                  <Clock className="text-orange-500" size={18} />
                </div>
                <p className="text-2xl font-bold text-slate-900">
                  {analytics.stats.partiallyPaidCount}
                </p>
                <p className="text-[11px] text-slate-500 mt-2">
                  Schools with pending balance
                </p>
              </div>

              {/* Unpaid */}
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Unpaid / Trial
                  </p>
                  <AlertTriangle className="text-red-500" size={18} />
                </div>
                <p className="text-2xl font-bold text-slate-900">
                  {analytics.stats.unpaidCount}
                </p>
                <p className="text-[11px] text-slate-500 mt-2">
                  Schools that haven't paid
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ==================== 2. PARTIAL PAYMENTS TABLE ==================== */}
        {analytics?.partialSchools?.length > 0 && (
          <div className="mb-8">
            <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wide mb-3">
              Outstanding Balances (Action Required)
            </h2>
            <div className="bg-white rounded-xl border border-orange-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-orange-50 text-orange-800 text-[11px] uppercase text-left">
                  <tr>
                    <th className="px-5 py-3 font-medium">School</th>
                    <th className="px-5 py-3 font-medium">Term</th>
                    <th className="px-5 py-3 font-medium text-right">
                      Expected
                    </th>
                    <th className="px-5 py-3 font-medium text-right">Paid</th>
                    <th className="px-5 py-3 font-medium text-right">
                      Balance
                    </th>
                    <th className="px-5 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {analytics.partialSchools.map((s: any) => (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className="px-5 py-3 font-medium text-slate-900">
                        {s.name}
                      </td>
                      <td className="px-5 py-3 text-slate-600">
                        {s.term.replace("_", " ")} {s.academicYear}
                      </td>
                      <td className="px-5 py-3 text-right font-mono text-slate-500">
                        {analytics.currency}{" "}
                        {Number(analytics.expectedAmount).toLocaleString()}
                      </td>
                      <td className="px-5 py-3 text-right font-mono text-green-600">
                        {analytics.currency} {Number(s.paid).toLocaleString()}
                      </td>
                      <td className="px-5 py-3 text-right font-mono font-semibold text-red-600">
                        {analytics.currency}{" "}
                        {Number(s.balance).toLocaleString()}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Link
                          to={`/platform/schools/${s.id}`}
                          className="text-xs font-semibold text-blue-700 hover:underline"
                        >
                          Manage
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ==================== 3. PLATFORM STATS ==================== */}
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wide mb-3">
            Platform Stats
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                <Building2 className="text-indigo-600" size={20} />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                  Total Schools
                </p>
                <p className="text-xl font-bold text-slate-900">
                  {schools.length}
                </p>
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center shrink-0">
                <Activity className="text-green-600" size={20} />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                  Active Schools
                </p>
                <p className="text-xl font-bold text-slate-900">
                  {activeCount}
                </p>
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center shrink-0">
                <Users className="text-purple-600" size={20} />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                  Total Students
                </p>
                <p className="text-xl font-bold text-slate-900">
                  {totalStudents}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ==================== 4. YOUR SCHOOLS ==================== */}
        <div>
          <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wide mb-3">
            Your Schools
          </h2>

          {schools.length === 0 ? (
            <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-12 text-center">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <School className="text-slate-400" size={32} />
              </div>
              <p className="text-slate-600 text-sm mb-4">
                No schools on the platform yet.
              </p>
              <button
                onClick={() => setInviteOpen(true)}
                className="text-sm font-semibold text-blue-700 hover:underline"
              >
                Invite your first school →
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {paginatedSchools.map((s) => (
                  <div
                    key={s.id}
                    className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col hover:shadow-md transition-shadow duration-200"
                  >
                    <div className="flex flex-col items-center text-center mb-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center mb-2 overflow-hidden">
                        <Building2 className="text-slate-400" size={18} />
                      </div>
                      <h3
                        className="text-sm font-semibold text-slate-900 line-clamp-1 w-full"
                        title={s.name}
                      >
                        {s.name}
                      </h3>
                      <p
                        className="text-[11px] text-slate-500 mt-0.5 line-clamp-1 w-full"
                        title={s.admin?.email || "No admin"}
                      >
                        {s.admin?.email || "No admin"}
                      </p>
                    </div>

                    <div className="flex-1 space-y-1.5 mb-4 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Status</span>
                        <StatusBadge s={s} />
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Students</span>
                        <span className="font-medium text-slate-900">
                          {s.studentCount}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">OneKhusa</span>
                        {s.onekhusaConfigured ? (
                          <span className="text-[10px] font-medium text-green-700 bg-green-50 px-1.5 py-0.5 rounded">
                            Configured
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded">
                            Not set
                          </span>
                        )}
                      </div>
                    </div>

                    <Link
                      to={`/platform/schools/${s.id}`}
                      className="w-full block text-center bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold py-1.5 rounded-lg transition-colors mt-auto"
                    >
                      Manage
                    </Link>
                  </div>
                ))}
              </div>

              {/* PAGINATION FOOTER */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-8 bg-white border border-slate-200 rounded-xl px-5 py-3">
                  <span className="text-xs text-slate-500">
                    Showing{" "}
                    <span className="font-medium">
                      {(currentPage - 1) * ITEMS_PER_PAGE + 1}
                    </span>{" "}
                    to{" "}
                    <span className="font-medium">
                      {Math.min(currentPage * ITEMS_PER_PAGE, schools.length)}
                    </span>{" "}
                    of <span className="font-medium">{schools.length}</span>{" "}
                    schools
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed text-slate-600"
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
                      className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed text-slate-600"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <InviteSchoolModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onInvited={load}
      />
    </>
  );
}
