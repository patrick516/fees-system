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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);

  // 🎯 Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 15;

  const load = async () => {
    try {
      const res = await platformApi.get("/platform/schools");
      setSchools(res.data.data || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to load schools");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const totalStudents = schools.reduce((s, x) => s + x.studentCount, 0);
  const activeCount = schools.filter((s) => s.isActive).length;

  // 🎯 Pagination Logic
  const totalPages = Math.ceil(schools.length / ITEMS_PER_PAGE);
  const paginatedSchools = schools.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  return (
    <>
      <div className="p-8 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Schools</h1>
            <p className="text-sm text-slate-500 mt-1">
              {schools.length} school{schools.length === 1 ? "" : "s"} on the
              platform
            </p>
          </div>
          <button
            onClick={() => setInviteOpen(true)}
            className="rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold px-5 py-2.5 transition-colors"
          >
            + Add School
          </button>
        </div>

        {/* Top Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
              <Building2 className="text-blue-600" size={20} />
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
              <p className="text-xl font-bold text-slate-900">{activeCount}</p>
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

        {loading && (
          <p className="text-sm text-slate-500">Loading schools...</p>
        )}
        {error && (
          <div className="text-sm rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-3">
            {error}
          </div>
        )}

        {!loading && schools.length === 0 && (
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
        )}

        {/* Compact School Cards Grid */}
        {!loading && schools.length > 0 && (
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

            {/* 🎯 PAGINATION FOOTER */}
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

      <InviteSchoolModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onInvited={load}
      />
    </>
  );
}
