import { useState, useEffect } from "react";
import { X, Loader2, Mail, UserPlus } from "lucide-react";
import api from "../../lib/axios";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import type { Department, Role } from "../../types";

interface Props {
  open: boolean;
  onClose: () => void;
  onInvited: () => void;
  departments: Department[];
}

const TITLES = ["Mr", "Mrs", "Ms", "Miss", "Dr", "Prof"];

// Strip non-digits and any leading 0/+265 — always store the 9-digit local number
const normalizePhone = (raw: string) => {
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("0")) digits = digits.slice(1);
  if (digits.startsWith("265")) digits = digits.slice(3);
  return digits.slice(0, 9);
};

const InviteStaffModal = ({ open, onClose, onInvited, departments }: Props) => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [rolesLoading, setRolesLoading] = useState(false);

  const [form, setForm] = useState({
    title: "",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    roleId: "",
    departmentId: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Fetch roles when modal opens
  useEffect(() => {
    if (!open) return;
    setRolesLoading(true);
    api
      .get("/roles")
      .then((res) => {
        // Exclude School Admin — only one per school, cannot be invited
        const list = (res.data.data || []).filter(
          (r: Role) => r.name !== "School Admin",
        );
        setRoles(list);
        // Default to first non-admin role
        if (list.length > 0) {
          setForm((prev) => ({ ...prev, roleId: list[0].id }));
        }
      })
      .catch(() => setRoles([]))
      .finally(() => setRolesLoading(false));
  }, [open]);

  // Reset when modal closes
  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setForm({
          title: "",
          firstName: "",
          lastName: "",
          email: "",
          phone: "",
          roleId: "",
          departmentId: "",
        });
        setError("");
        setSuccess(false);
      }, 200);
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await api.post("/staff/invite", {
        title: form.title || undefined,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        phone: `+265${form.phone}`,
        roleId: form.roleId,
        departmentId: form.departmentId || undefined,
      });
      setSuccess(true);
      setTimeout(() => {
        onInvited();
        onClose();
      }, 1800);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to send invitation");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  const selectedRole = roles.find((r) => r.id === form.roleId);

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-gray-100">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--color-primary-light)] flex items-center justify-center shrink-0">
              <UserPlus size={20} className="text-[var(--color-primary)]" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-800">
                Invite staff member
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                They'll receive an email with a temporary password
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

        {/* Success */}
        {success ? (
          <div className="p-8 text-center">
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Mail size={24} className="text-green-600" />
            </div>
            <p className="text-sm font-medium text-gray-800">
              Invitation sent!
            </p>
            <p className="text-xs text-gray-500 mt-1">
              We've emailed {form.email} with their temporary password and
              invitation link.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Title + Names */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  Title
                </label>
                <Select
                  value={form.title || "none"}
                  onValueChange={(v) =>
                    setForm({ ...form, title: v === "none" ? "" : v })
                  }
                >
                  <SelectTrigger className="w-full bg-white border-gray-200 rounded-lg text-sm h-[42px]">
                    <SelectValue placeholder="No title" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="none">No title</SelectItem>
                    {TITLES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">
                    First Name *
                  </label>
                  <input
                    value={form.firstName}
                    onChange={(e) =>
                      setForm({ ...form, firstName: e.target.value })
                    }
                    placeholder="John"
                    required
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">
                    Last Name *
                  </label>
                  <input
                    value={form.lastName}
                    onChange={(e) =>
                      setForm({ ...form, lastName: e.target.value })
                    }
                    placeholder="Banda"
                    required
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  />
                </div>
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Email *
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="john@yourschool.mw"
                required
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Phone *
              </label>
              <div className="flex">
                <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-gray-200 bg-gray-50 text-sm text-gray-600 font-medium">
                  +265
                </span>
                <input
                  type="tel"
                  inputMode="numeric"
                  value={form.phone}
                  onChange={(e) =>
                    setForm({ ...form, phone: normalizePhone(e.target.value) })
                  }
                  placeholder="995049331"
                  maxLength={9}
                  required
                  pattern="[0-9]{9}"
                  title="Enter 9 digits (e.g. 995049331)"
                  className="flex-1 min-w-0 px-3 py-2.5 border border-gray-200 rounded-r-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                />
              </div>
            </div>

            {/* Role */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Role *
              </label>
              <Select
                value={form.roleId}
                onValueChange={(v) => setForm({ ...form, roleId: v })}
                disabled={rolesLoading}
              >
                <SelectTrigger className="w-full bg-white border-gray-200 rounded-lg text-sm h-[42px]">
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
                value={form.departmentId || "none"}
                onValueChange={(v) =>
                  setForm({ ...form, departmentId: v === "none" ? "" : v })
                }
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
                disabled={loading || rolesLoading || !form.roleId}
                className="flex-1 flex items-center justify-center gap-2 bg-[var(--color-primary)] text-white py-2.5 rounded-lg text-sm font-medium hover:bg-[var(--color-primary-dark)] disabled:opacity-40"
              >
                {loading && <Loader2 size={14} className="animate-spin" />}
                {loading ? "Sending..." : "Send Invitation"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default InviteStaffModal;
