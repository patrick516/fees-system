// frontend/src/pages/Platform/Dashboard.tsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import platformApi from "../../lib/platformApi";
import type { PlatformSchool } from "../../types/platform";
import InviteSchoolModal from "../../components/Platform/InviteSchoolModal";

const StatusBadge = ({ s }: { s: PlatformSchool }) => {
  if (!s.isActive)
    return (
      <span className="text-[11px] px-2 py-0.5 rounded-full bg-red-100 text-red-700">
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
      className={`text-[11px] px-2 py-0.5 rounded-full ${map[s.subscriptionStatus] || "bg-slate-100 text-slate-600"}`}
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

  return (
    <>
      <div className="p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Schools</h1>
            <p className="text-sm text-slate-500">
              {schools.length} school{schools.length === 1 ? "" : "s"} on the
              platform
            </p>
          </div>
          <button
            onClick={() => setInviteOpen(true)}
            className="rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold px-4 py-2"
          >
            + Add School
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <p className="text-xs text-slate-500">Total Schools</p>
            <p className="text-2xl font-semibold text-slate-900 mt-1">
              {schools.length}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <p className="text-xs text-slate-500">Active</p>
            <p className="text-2xl font-semibold text-slate-900 mt-1">
              {activeCount}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <p className="text-xs text-slate-500">Students</p>
            <p className="text-2xl font-semibold text-slate-900 mt-1">
              {totalStudents}
            </p>
          </div>
        </div>

        {loading && <p className="text-sm text-slate-500">Loading...</p>}
        {error && (
          <div className="text-sm rounded-lg bg-red-50 border border-red-200 text-red-700 px-3 py-2">
            {error}
          </div>
        )}

        {!loading && schools.length === 0 && (
          <div className="bg-white border border-dashed border-slate-300 rounded-xl p-10 text-center">
            <p className="text-slate-600 text-sm">No schools yet.</p>
            <button
              onClick={() => setInviteOpen(true)}
              className="inline-block mt-3 text-sm font-semibold text-blue-700 hover:underline"
            >
              Invite your first school →
            </button>
          </div>
        )}

        {!loading && schools.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                <tr>
                  <th className="text-left px-5 py-3 font-medium">School</th>
                  <th className="text-left px-5 py-3 font-medium">Admin</th>
                  <th className="text-left px-5 py-3 font-medium">Students</th>
                  <th className="text-left px-5 py-3 font-medium">Status</th>
                  <th className="text-left px-5 py-3 font-medium">OneKhusa</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {schools.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3">
                      <p className="font-medium text-slate-900">{s.name}</p>
                      <p className="text-xs text-slate-500">
                        {s.setupCompleted ? "Configured" : "Setup pending"}
                      </p>
                    </td>
                    <td className="px-5 py-3">
                      {s.admin ? (
                        <>
                          <p className="text-slate-700 text-xs">
                            {s.admin.email}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {s.admin.invitePending
                              ? "Invite pending"
                              : "Active"}
                          </p>
                        </>
                      ) : (
                        <span className="text-slate-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-slate-700">
                      {s.studentCount}
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge s={s} />
                    </td>
                    <td className="px-5 py-3">
                      {s.onekhusaConfigured ? (
                        <span className="text-xs text-green-700">
                          ✅ Configured
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">Not set</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Link
                        to={`/platform/schools/${s.id}`}
                        className="text-xs font-semibold text-blue-700 hover:underline"
                      >
                        Manage →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
