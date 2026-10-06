import { useState, useEffect } from "react";
import { X, Loader2, Shield, Check } from "lucide-react";
import api from "../../lib/axios";
import type { Resource, PermissionAction } from "../../types";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

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

const AddRoleModal = ({ open, onClose, onCreated }: Props) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [permissions, setPermissions] = useState<
    Record<string, PermissionAction[]>
  >({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setName("");
        setDescription("");
        setPermissions({});
        setError("");
      }, 200);
    }
  }, [open]);

  const toggle = (resource: Resource, action: PermissionAction) => {
    setPermissions((prev) => {
      const current = prev[resource] || [];
      const next = current.includes(action)
        ? current.filter((a) => a !== action)
        : [...current, action];
      return { ...prev, [resource]: next };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);

    try {
      await api.post("/roles", {
        name: name.trim(),
        description: description.trim() || undefined,
        permissions,
      });
      onCreated();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to create role");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-gray-100">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--color-primary-light)] flex items-center justify-center shrink-0">
              <Shield size={20} className="text-[var(--color-primary)]" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-800">
                Create new role
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Give it a name and tick the permissions
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2.5 rounded-lg text-xs">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              Role Name *
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. HR Manager"
              required
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              Description
            </label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short note about what this role does"
              maxLength={120}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">
              Permissions
            </label>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left font-medium text-gray-500 px-3 py-2">
                      Resource
                    </th>
                    {ACTIONS.map((a) => (
                      <th
                        key={a.value}
                        className="text-center font-medium text-gray-500 px-2 py-2 w-14"
                      >
                        {a.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {RESOURCES.map((res) => {
                    const perms = permissions[res.value] || [];
                    return (
                      <tr key={res.value}>
                        <td className="px-3 py-2 text-gray-700">{res.label}</td>
                        {ACTIONS.map((action) => {
                          const isChecked = perms.includes(action.value);
                          return (
                            <td key={action.value} className="text-center py-2">
                              <button
                                type="button"
                                onClick={() => toggle(res.value, action.value)}
                                className={`w-5 h-5 rounded border-2 inline-flex items-center justify-center transition-colors ${
                                  isChecked
                                    ? "bg-[var(--color-primary)] border-[var(--color-primary)]"
                                    : "border-gray-300 bg-white hover:border-[var(--color-primary)]"
                                }`}
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
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="flex-1 flex items-center justify-center gap-2 bg-[var(--color-primary)] text-white py-2.5 rounded-lg text-sm font-medium hover:bg-[var(--color-primary-dark)] disabled:opacity-40"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              {saving ? "Creating..." : "Create Role"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddRoleModal;
