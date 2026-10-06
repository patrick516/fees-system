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
  X,
  ShieldAlert,
} from "lucide-react";
import api from "../../lib/axios";
import InviteStaffModal from "../../components/Staff/InviteStaffModal";
import EditStaffModal from "../../components/Staff/EditStaffModal";
import { useAuthStore } from "../../store/authStore";
import type { Staff, Department } from "../../types";

const StaffPage = () => {
  const { staff: currentUser } = useAuthStore();

  const [staff, setStaff] = useState<Staff[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);

  // Modal state — replaces the old dropdown
  const [selectedMember, setSelectedMember] = useState<Staff | null>(null);
  const [editMember, setEditMember] = useState<Staff | null>(null);
  const [confirmDeactivate, setConfirmDeactivate] = useState<Staff | null>(
    null,
  );
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

  const handleResend = async (id: string) => {
    setBusyId(id);
    try {
      await api.post(`/staff/${id}/resend-invite`);
      await fetchAll();
      setSelectedMember(null);
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to resend");
    } finally {
      setBusyId(null);
    }
  };

  const confirmRemove = async () => {
    if (!confirmDeactivate) return;
    const id = confirmDeactivate.id;
    setBusyId(id);
    try {
      await api.delete(`/staff/${id}`);
      await fetchAll();
      setConfirmDeactivate(null);
      setSelectedMember(null);
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

  const isSelf = (member: Staff) => member.id === currentUser?.id;

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
                          <p className="text-sm font-medium text-gray-800 truncate flex items-center gap-2">
                            {member.fullName}
                            {isSelf(member) && (
                              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-[var(--color-primary-light)] text-[var(--color-primary)]">
                                You
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-gray-400 truncate">
                            {member.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-700">
                        {member.role?.name || "—"}
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
                      <button
                        onClick={() => setSelectedMember(member)}
                        disabled={busyId === member.id}
                        className="p-1.5 rounded hover:bg-gray-100 text-gray-500 disabled:opacity-40"
                        title="Manage"
                      >
                        {busyId === member.id ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <MoreVertical size={16} />
                        )}
                      </button>
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

      {/* Invite modal */}
      <InviteStaffModal
        open={showInvite}
        onClose={() => setShowInvite(false)}
        onInvited={fetchAll}
        departments={departments}
      />
      {/* Edit modal */}
      <EditStaffModal
        member={editMember}
        departments={departments}
        onClose={() => setEditMember(null)}
        onUpdated={fetchAll}
      />

      {/* ==================== MANAGE MEMBER MODAL ==================== */}
      {selectedMember && !confirmDeactivate && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedMember(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-sm w-full shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between p-5 border-b border-gray-100">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-[var(--color-primary-light)] text-[var(--color-primary)] flex items-center justify-center text-sm font-bold shrink-0">
                  {selectedMember.fullName.charAt(0)}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">
                    {selectedMember.fullName}
                  </p>
                  <p className="text-xs text-gray-400 truncate">
                    {selectedMember.email}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedMember(null)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded shrink-0"
              >
                <X size={16} />
              </button>
            </div>

            {/* Actions */}
            <div className="p-3 space-y-1">
              {!selectedMember.emailVerified && (
                <button
                  onClick={() => handleResend(selectedMember.id)}
                  disabled={busyId === selectedMember.id}
                  className="w-full text-left px-3 py-3 text-sm text-gray-700 hover:bg-gray-50 rounded-lg flex items-center gap-3 disabled:opacity-50"
                >
                  {busyId === selectedMember.id ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <RefreshCw size={16} className="text-gray-400" />
                  )}
                  <div>
                    <p className="font-medium">Resend Invitation</p>
                    <p className="text-xs text-gray-400">
                      Send a fresh invite with a new password
                    </p>
                  </div>
                </button>
              )}

              <button
                onClick={() => {
                  setEditMember(selectedMember);
                  setSelectedMember(null);
                }}
                className="w-full text-left px-3 py-3 text-sm text-gray-700 hover:bg-gray-50 rounded-lg flex items-center gap-3"
              >
                <Edit2 size={16} className="text-gray-400" />
                <div>
                  <p className="font-medium">Edit Role & Department</p>
                  <p className="text-xs text-gray-400">
                    Change access level or reassign department
                  </p>
                </div>
              </button>

              {isSelf(selectedMember) ? (
                // Self — cannot deactivate
                <div className="px-3 py-3 rounded-lg bg-gray-50 border border-gray-100 flex items-start gap-3">
                  <ShieldAlert
                    size={16}
                    className="text-gray-400 shrink-0 mt-0.5"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      This is your account
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      You cannot deactivate yourself. Ask another admin to do
                      this if needed.
                    </p>
                  </div>
                </div>
              ) : (
                selectedMember.isActive && (
                  <button
                    onClick={() => setConfirmDeactivate(selectedMember)}
                    disabled={busyId === selectedMember.id}
                    className="w-full text-left px-3 py-3 text-sm text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-3 disabled:opacity-50"
                  >
                    <UserMinus size={16} />
                    <div>
                      <p className="font-medium">Deactivate</p>
                      <p className="text-xs text-red-400">
                        They will no longer be able to log in
                      </p>
                    </div>
                  </button>
                )
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-gray-100">
              <button
                onClick={() => setSelectedMember(null)}
                className="w-full py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== CONFIRM DEACTIVATE MODAL ==================== */}
      {confirmDeactivate && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setConfirmDeactivate(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col items-center text-center mb-4">
              <div className="w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center mb-3">
                <UserMinus size={22} className="text-red-600" />
              </div>
              <h3 className="text-base font-semibold text-gray-800">
                Deactivate {confirmDeactivate.fullName}?
              </h3>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                They will no longer be able to log in. Their records and history
                will remain intact, and you can reactivate them later if needed.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setConfirmDeactivate(null)}
                disabled={busyId === confirmDeactivate.id}
                className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                onClick={confirmRemove}
                disabled={busyId === confirmDeactivate.id}
                className="flex-1 flex items-center justify-center gap-2 bg-red-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-40"
              >
                {busyId === confirmDeactivate.id && (
                  <Loader2 size={14} className="animate-spin" />
                )}
                Yes, Deactivate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffPage;
