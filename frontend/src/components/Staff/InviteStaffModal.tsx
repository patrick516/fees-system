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
import type { Department, StaffRole } from "../../types";

interface Props {
  open: boolean;
  onClose: () => void;
  onInvited: () => void;
  departments: Department[];
}

const ROLES: { value: StaffRole; label: string; hint: string }[] = [
  {
    value: "BURSAR",
    label: "Bursar",
    hint: "Records payments and manages finance",
  },
  {
    value: "FINANCE",
    label: "Finance",
    hint: "Views reports and reconciles accounts",
  },
  {
    value: "REGISTRAR",
    label: "Registrar",
    hint: "Manages students and enrollment",
  },
  {
    value: "TEACHER",
    label: "Teacher",
    hint: "Views results and student records",
  },
  { value: "OTHER", label: "Other", hint: "Custom role" },
];

const InviteStaffModal = ({ open, onClose, onInvited, departments }: Props) => {
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    role: "BURSAR" as StaffRole,
    departmentId: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Reset when modal closes
  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setForm({
          fullName: "",
          email: "",
          phone: "",
          role: "BURSAR",
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
        fullName: form.fullName,
        email: form.email,
        phone: form.phone,
        role: form.role,
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

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Full Name *
              </label>
              <input
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                placeholder="John Banda"
                required
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              />
            </div>

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

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Phone *
              </label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+265 991 234 567"
                required
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Role *
              </label>
              <Select
                value={form.role}
                onValueChange={(v) =>
                  setForm({ ...form, role: v as StaffRole })
                }
              >
                <SelectTrigger className="w-full bg-white border-gray-200 rounded-lg text-sm h-[42px]">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  {ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-400 mt-1.5">
                {ROLES.find((r) => r.value === form.role)?.hint}
              </p>
            </div>

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
                disabled={loading}
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
