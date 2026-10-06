import { useState, useEffect } from "react";
import {
  UserPlus,
  Loader2,
  RefreshCw,
  MoreVertical,
  CheckCircle2,
  Clock,
  AlertCircle,
  Building2,
  UserMinus,
  Edit2,
} from "lucide-react";
import api from "../../lib/axios";
import InviteStaffModal from "../../components/Staff/InviteStaffModal";
import type { Staff, Department } from "../../types";

const StaffPage = () => {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [actionMenu, setActionMenu] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [staffRes, deptRes] = await Promise.all([
        api.get("/staff"),
        api.get("/departments"),
      ]);
      setStaff(staffRes.data.data || []);
      setDepartments(deptRes.data.data || []);
    } catch (err) {
      console.error("Failed to load staff", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  // Close action menu when clicking outside
  useEffect(() => {
    const close = () => setActionMenu(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, []);

  const handleResend = async (id: string) => {
    setBusyId(id);
    try {
      await api.post(`/staff/${id}/resend-invite`);
      await fetchAll();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to resend");
    } finally {
      setBusyId(null);
    }
  };

  const handleRemove = async (id: string, name: string) => {
    if (!confirm(`Deactivate ${name}? They will no longer be able to log in.`))
      return;
    setBusyId(id);
    try {
      await api.delete(`/staff/${id}`);
      await fetchAll();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to remove");
    } finally {
      setBusyId(null);
    }
  };

  const getStatusBadge = (member: Staff) => {
    if (!member.isActive) {
      return (
        <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">
          <UserMinus size={10} /> Deactivated
        </span>
      );
    }
    if (!member.emailVerified && member.invitationExpires) {
      return (
        <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-700">
          <Clock size={10} /> Invite pending
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">
        <CheckCircle2 size={10} /> Active
      </span>
    );
  };

  const formatRole = (role: string) =>
    role.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">
            Staff & Permissions
          </h2>
          <p className="text-sm text-gray-500">
            Invite team members and manage their access
          </p>
        </div>
        <button
          onClick={() => setShowInvite(true)}
          className="flex items-center gap-2 bg-[var(--color-primary)] text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-[var(--color-primary-dark)] transition-colors"
        >
          <UserPlus size={16} />
          Invite Staff
        </button>
      </div>

      {/* Staff list */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 size={24} className="animate-spin text-gray-300" />
          </div>
        ) : staff.length === 0 ? (
          <div className="p-12 text-center">
            <UserPlus size={40} className="mx-auto mb-2 text-gray-300" />
            <p className="text-sm text-gray-400 font-medium">
              No staff members yet
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Click "Invite Staff" to get started
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                    Staff
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                    Role
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                    Department
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {staff.map((member) => (
                  <tr key={member.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[var(--color-primary-light)] text-[var(--color-primary)] flex items-center justify-center text-sm font-bold">
                          {member.fullName.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">
                            {member.fullName}
                          </p>
                          <p className="text-xs text-gray-400 truncate">
                            {member.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-700">
                        {formatRole(member.role)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {member.department ? (
                        <span className="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-md bg-gray-100 text-gray-700">
                          <Building2 size={10} />
                          {member.department.name}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400 italic">
                          Not assigned
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(member)}</td>
                    <td className="px-6 py-4 text-right">
                      <div
                        className="relative inline-block"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() =>
                            setActionMenu(
                              actionMenu === member.id ? null : member.id,
                            )
                          }
                          disabled={busyId === member.id}
                          className="p-1.5 rounded hover:bg-gray-100 text-gray-500 disabled:opacity-40"
                        >
                          {busyId === member.id ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <MoreVertical size={14} />
                          )}
                        </button>
                        {actionMenu === member.id && (
                          <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10 py-1">
                            {!member.emailVerified && (
                              <button
                                onClick={() => {
                                  handleResend(member.id);
                                  setActionMenu(null);
                                }}
                                className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                              >
                                <RefreshCw size={12} />
                                Resend Invitation
                              </button>
                            )}
                            <button
                              disabled
                              className="w-full text-left px-3 py-2 text-sm text-gray-300 cursor-not-allowed flex items-center gap-2"
                            >
                              <Edit2 size={12} />
                              Edit Role (coming soon)
                            </button>
                            {member.isActive && (
                              <button
                                onClick={() => {
                                  handleRemove(member.id, member.fullName);
                                  setActionMenu(null);
                                }}
                                className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                              >
                                <UserMinus size={12} />
                                Deactivate
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Info card */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3">
        <AlertCircle
          size={18}
          className="text-[var(--color-primary)] shrink-0 mt-0.5"
        />
        <div className="text-xs text-blue-800 leading-relaxed">
          <p className="font-medium mb-1">How invitations work</p>
          <p>
            When you invite someone, they'll receive an email with a temporary
            password and a link. They must set their own strong password on
            first login. You can resend invitations or deactivate staff at any
            time.
          </p>
        </div>
      </div>

      {/* Modal */}
      <InviteStaffModal
        open={showInvite}
        onClose={() => setShowInvite(false)}
        onInvited={fetchAll}
        departments={departments}
      />
    </div>
  );
};

export default StaffPage;
