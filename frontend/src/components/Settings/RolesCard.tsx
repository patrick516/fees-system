import { useState, useEffect } from "react";
import {
  Shield,
  Loader2,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  Lock,
  Users,
  Check,
} from "lucide-react";
import api from "../../lib/axios";
import AddRoleModal from "./AddRoleModal";
import type { Role, Resource, PermissionAction } from "../../types";

const RESOURCES: { value: Resource; label: string }[] = [
  { value: "dashboard", label: "Dashboard" },
  { value: "students", label: "Students" },
  { value: "payments", label: "Payments" },
  { value: "classes", label: "Classes" },
  { value: "reports", label: "Reports" },
  { value: "sms", label: "Send SMS" },
  { value: "results", label: "Exam Results" },
  { value: "staff", label: "Staff" },
  { value: "settings", label: "Settings" },
];

const ACTIONS: { value: PermissionAction; label: string }[] = [
  { value: "read", label: "Read" },
  { value: "write", label: "Write" },
  { value: "verify", label: "Verify" },
  { value: "delete", label: "Delete" },
];

const RolesCard = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [error, setError] = useState("");

  const fetchRoles = async () => {
    setLoading(true);
    try {
      const res = await api.get("/roles");
      setRoles(res.data.data || []);
      // Auto-expand the first non-system role to hint at the UI
      if (res.data.data?.length > 0) {
        const firstEditable = res.data.data.find(
          (r: Role) => r.name !== "School Admin",
        );
        if (firstEditable) setExpandedId(firstEditable.id);
      }
    } catch (err) {
      console.error("Failed to load roles");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  // Toggle a single permission (debounced save)
  const togglePermission = async (
    role: Role,
    resource: Resource,
    action: PermissionAction,
  ) => {
    if (role.name === "School Admin") return;

    const current = role.permissions?.[resource] || [];
    const next = current.includes(action)
      ? current.filter((a) => a !== action)
      : [...current, action];

    const updatedPermissions = {
      ...role.permissions,
      [resource]: next,
    };

    // Optimistic update
    setRoles((prev) =>
      prev.map((r) =>
        r.id === role.id ? { ...r, permissions: updatedPermissions } : r,
      ),
    );

    setSavingId(role.id);
    try {
      await api.put(`/roles/${role.id}`, {
        permissions: updatedPermissions,
      });
      // Silently succeed — no UI change needed since optimistic update already ran
    } catch (err: any) {
      // Revert on failure
      setRoles((prev) =>
        prev.map((r) =>
          r.id === role.id ? { ...r, permissions: role.permissions } : r,
        ),
      );
      setError(err.response?.data?.message || "Failed to save");
      setTimeout(() => setError(""), 3000);
    } finally {
      setSavingId(null);
    }
  };

  const handleDelete = async (role: Role) => {
    if (!confirm(`Delete the "${role.name}" role? This cannot be undone.`))
      return;

    try {
      await api.delete(`/roles/${role.id}`);
      await fetchRoles();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to delete role");
      setTimeout(() => setError(""), 4000);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Shield size={16} className="text-gray-400" />
          <div>
            <h3 className="font-medium text-gray-800">Roles & Permissions</h3>
            <p className="text-xs text-gray-500">
              Control what each role can see and do across the system
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 text-sm text-[var(--color-primary)] font-medium hover:text-[var(--color-primary-dark)]"
        >
          <Plus size={14} />
          Add Role
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 rounded-lg text-sm mb-4">
          {error}
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center h-24">
          <Loader2 size={18} className="animate-spin text-gray-300" />
        </div>
      ) : roles.length === 0 ? (
        <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center">
          <p className="text-sm text-gray-400">No roles defined</p>
        </div>
      ) : (
        <div className="space-y-2">
          {roles.map((role) => {
            const isProtected = role.name === "School Admin";
            const isExpanded = expandedId === role.id;
            const isSaving = savingId === role.id;

            return (
              <div
                key={role.id}
                className="border border-gray-200 rounded-lg overflow-hidden"
              >
                {/* Role header row */}
                <div
                  className={`flex items-center gap-3 px-4 py-3 ${
                    isProtected
                      ? "bg-gray-50"
                      : "cursor-pointer hover:bg-gray-50"
                  }`}
                  onClick={() =>
                    !isProtected && setExpandedId(isExpanded ? null : role.id)
                  }
                >
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      isProtected
                        ? "bg-gray-200 text-gray-500"
                        : "bg-[var(--color-primary-light)] text-[var(--color-primary)]"
                    }`}
                  >
                    {isProtected ? <Lock size={14} /> : <Shield size={14} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 flex items-center gap-2">
                      {role.name}
                      {isProtected && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-gray-200 text-gray-600">
                          LOCKED
                        </span>
                      )}
                      {isSaving && (
                        <Loader2
                          size={12}
                          className="animate-spin text-gray-400"
                        />
                      )}
                    </p>
                    {role.description && (
                      <p className="text-xs text-gray-500 truncate">
                        {role.description}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-gray-500 shrink-0 flex items-center gap-1">
                    <Users size={10} />
                    {role._count?.staff || 0}
                  </span>
                  {!role.isSystem && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(role);
                      }}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                      title="Delete role"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                  {!isProtected &&
                    (isExpanded ? (
                      <ChevronUp size={16} className="text-gray-400" />
                    ) : (
                      <ChevronDown size={16} className="text-gray-400" />
                    ))}
                </div>

                {/* Permission matrix */}
                {isExpanded && !isProtected && (
                  <div className="border-t border-gray-200 bg-gray-50 p-4 overflow-x-auto">
                    <table className="w-full min-w-[500px] text-xs">
                      <thead>
                        <tr>
                          <th className="text-left font-medium text-gray-500 pb-2">
                            Resource
                          </th>
                          {ACTIONS.map((a) => (
                            <th
                              key={a.value}
                              className="text-center font-medium text-gray-500 pb-2 w-16"
                            >
                              {a.label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {RESOURCES.map((res) => {
                          const perms = role.permissions?.[res.value] || [];
                          return (
                            <tr key={res.value} className="hover:bg-white">
                              <td className="py-2 text-gray-700">
                                {res.label}
                              </td>
                              {ACTIONS.map((action) => {
                                const isChecked = perms.includes(action.value);
                                return (
                                  <td
                                    key={action.value}
                                    className="text-center py-2"
                                  >
                                    <button
                                      onClick={() =>
                                        togglePermission(
                                          role,
                                          res.value,
                                          action.value,
                                        )
                                      }
                                      disabled={isSaving}
                                      className={`w-5 h-5 rounded border-2 inline-flex items-center justify-center transition-colors ${
                                        isChecked
                                          ? "bg-[var(--color-primary)] border-[var(--color-primary)]"
                                          : "border-gray-300 bg-white hover:border-[var(--color-primary)]"
                                      } disabled:opacity-50`}
                                    >
                                      {isChecked && (
                                        <Check
                                          size={12}
                                          className="text-white"
                                          strokeWidth={3}
                                        />
                                      )}
                                    </button>
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Info note */}
      <div className="mt-4 flex items-start gap-2 text-xs text-gray-500 leading-relaxed">
        <Lock size={12} className="mt-0.5 shrink-0" />
        <p>
          The <strong>School Admin</strong> role always has full access and
          cannot be modified. Toggle any checkbox to update a role — changes
          save automatically and apply to everyone with that role.
        </p>
      </div>

      <AddRoleModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onCreated={fetchRoles}
      />
    </div>
  );
};

export default RolesCard;
