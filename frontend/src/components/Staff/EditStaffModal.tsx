import { useState, useEffect } from "react";
import {
  X,
  Loader2,
  Save,
  ShieldAlert,
  Building2,
  UserCheck,
  UserMinus,
} from "lucide-react";
import api from "../../lib/axios";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { useAuthStore } from "../../store/authStore";
import type { Department, Role, Staff } from "../../types";

interface Props {
  member: Staff | null;
  departments: Department[];
  onClose: () => void;
  onUpdated: () => void;
}

const EditStaffModal = ({ member, departments, onClose, onUpdated }: Props) => {
  const { staff: currentUser } = useAuthStore();

  const [roles, setRoles] = useState<Role[]>([]);
  const [rolesLoading, setRolesLoading] = useState(false);

  const [roleId, setRoleId] = useState<string>("");
  const [departmentId, setDepartmentId] = useState<string>("");
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Load roles when modal opens
  useEffect(() => {
    if (!member) return;
    setRolesLoading(true);
    api
      .get("/roles")
      .then((res) => setRoles(res.data.data || []))
      .catch(() => setRoles([]))
      .finally(() => setRolesLoading(false));
  }, [member]);

  // Populate form from member
  useEffect(() => {
    if (member) {
      setRoleId(member.role?.id || "");
      setDepartmentId(member.department?.id || "");
      setIsActive(member.isActive !== false);
      setError("");
    }
  }, [member]);

  if (!member) return null;

  const isSelf = member.id === currentUser?.id;
  const currentRoleId = member.role?.id || "";
  const roleChanged = roleId !== currentRoleId;
  const deptChanged = (member.department?.id || "") !== departmentId;
  const statusChanged = isActive !== (member.isActive !== false);
  const hasChanges = roleChanged || deptChanged || statusChanged;

  const selectedRole = roles.find((r) => r.id === roleId);

  const handleSave = async () => {
    setError("");

    if (isSelf && roleChanged) {
      setError("You cannot change your own role");
      return;
    }

    setSaving(true);
    try {
      const payload: any = {};
      if (roleChanged) payload.roleId = roleId;
      if (deptChanged) payload.departmentId = departmentId || null;
      if (statusChanged) payload.isActive = isActive;

      await api.put(`/staff/${member.id}`, payload);
      onUpdated();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to update");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-md w-full shadow-xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-[var(--color-primary-light)] text-[var(--color-primary)] flex items-center justify-center text-sm font-bold shrink-0">
              {member.fullName.charAt(0)}
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-gray-800 truncate">
                Edit {member.fullName}
              </h3>
              <p className="text-xs text-gray-400 truncate">{member.email}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2.5 rounded-lg text-xs">
              {error}
            </div>
          )}

          {isSelf && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
              <ShieldAlert
                size={14}
                className="text-amber-600 shrink-0 mt-0.5"
              />
              <p className="text-xs text-amber-800">
                This is your own account. You can change your department and
                status, but not your role.
              </p>
            </div>
          )}

          {/* Role */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              Role
            </label>
            <Select
              value={roleId}
              onValueChange={setRoleId}
              disabled={isSelf || rolesLoading}
            >
              <SelectTrigger
                className={`w-full bg-white border-gray-200 rounded-lg text-sm h-[42px] ${
                  isSelf ? "opacity-60 cursor-not-allowed" : ""
                }`}
              >
                <SelectValue
                  placeholder={
                    rolesLoading ? "Loading roles..." : "Select role"
                  }
                />
              </SelectTrigger>
              <SelectContent className="bg-white">
                {roles.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedRole?.description && (
              <p className="text-xs text-gray-400 mt-1.5">
                {selectedRole.description}
              </p>
            )}
          </div>

          {/* Department */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              Department
            </label>
            <Select
              value={departmentId || "none"}
              onValueChange={(v) => setDepartmentId(v === "none" ? "" : v)}
            >
              <SelectTrigger className="w-full bg-white border-gray-200 rounded-lg text-sm h-[42px]">
                <SelectValue placeholder="No department" />
              </SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="none">No department</SelectItem>
                {departments.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {departments.length === 0 && (
              <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-1">
                <Building2 size={10} />
                No departments yet — add some in Settings
              </p>
            )}
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              Account Status
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setIsActive(true)}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-medium transition-all border ${
                  isActive
                    ? "bg-green-50 border-green-500 text-green-700 ring-2 ring-green-500/20"
                    : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                <UserCheck size={14} />
                Active
              </button>
              <button
                type="button"
                onClick={() => setIsActive(false)}
                disabled={isSelf}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-medium transition-all border ${
                  !isActive
                    ? "bg-red-50 border-red-500 text-red-700 ring-2 ring-red-500/20"
                    : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                } ${isSelf ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <UserMinus size={14} />
                Deactivated
              </button>
            </div>
            {isSelf && (
              <p className="text-xs text-gray-400 mt-1.5">
                You cannot deactivate your own account
              </p>
            )}
            {!isSelf && isActive === false && (
              <p className="text-xs text-red-500 mt-1.5">
                They will be logged out and unable to log in
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-5 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className="flex-1 flex items-center justify-center gap-2 bg-[var(--color-primary)] text-white py-2.5 rounded-lg text-sm font-medium hover:bg-[var(--color-primary-dark)] disabled:opacity-40"
          >
            {saving ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Save size={14} />
            )}
            {saving ? "Saving..." : hasChanges ? "Save Changes" : "No Changes"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditStaffModal;
