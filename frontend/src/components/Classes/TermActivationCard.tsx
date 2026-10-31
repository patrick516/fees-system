import { useState, useEffect } from "react";
import { CheckCircle, AlertCircle, Edit2, Loader2 } from "lucide-react";
import api from "../../lib/axios";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { getCurrentAcademicYear } from "../../lib/utils";
import { usePermission } from "../../hooks/usePermission";
import { DatePicker } from "../ui/date-picker";

const terms = [
  { value: "TERM_1", label: "Term 1" },
  { value: "TERM_2", label: "Term 2" },
  { value: "TERM_3", label: "Term 3" },
];

const ITEM_CLASS =
  "cursor-pointer mx-1 my-0.5 rounded-md pl-3 pr-7 focus:bg-gray-100 focus:text-gray-900 data-[highlighted]:bg-gray-100 data-[highlighted]:text-gray-900";

const formatDate = (iso?: string | null) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const termLabel = (t?: string | null) =>
  t ? t.replace("_", " ").replace("TERM", "Term") : "";

interface Props {
  activeTerm: any;
  onUpdated: () => void;
}

export default function TermActivationCard({ activeTerm, onUpdated }: Props) {
  const { can } = usePermission();
  const [showForm, setShowForm] = useState(false);
  const [activating, setActivating] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    term: "TERM_1",
    academicYear: getCurrentAcademicYear(),
    startDate: "",
    endDate: "",
  });

  useEffect(() => {
    if (activeTerm) {
      setForm({
        term: activeTerm.activeTerm || "TERM_1",
        academicYear: activeTerm.activeAcademicYear || getCurrentAcademicYear(),
        startDate: activeTerm.activeTermStartDate?.slice(0, 10) || "",
        endDate: activeTerm.activeTermEndDate?.slice(0, 10) || "",
      });
    }
  }, [activeTerm]);

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.startDate && form.endDate && form.endDate < form.startDate) {
      setError("End date must be after start date");
      return;
    }
    setActivating(true);
    setError("");
    try {
      await api.post("/schools/activate-term", form);
      setShowForm(false);
      onUpdated();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to activate term");
    } finally {
      setActivating(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h3 className="font-medium text-gray-800">Active Term</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Sets the default term and academic year across the whole system
          </p>
        </div>
        {activeTerm && !showForm && can("settings", "write") && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 text-sm font-medium text-[var(--color-primary)] hover:text-[var(--color-primary-dark)] transition-colors"
          >
            <Edit2 size={14} /> Change
          </button>
        )}
      </div>

      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-100">
          <tr className="text-left text-gray-500">
            <th className="px-6 py-2.5 font-medium">Term</th>
            <th className="px-6 py-2.5 font-medium">Academic Year</th>
            <th className="px-6 py-2.5 font-medium">Term Dates</th>
            <th className="px-6 py-2.5 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {activeTerm ? (
            <tr className="border-t border-gray-100">
              <td className="px-6 py-3 font-medium text-gray-800">
                {termLabel(activeTerm.activeTerm)}
              </td>
              <td className="px-6 py-3 text-gray-700">
                {activeTerm.activeAcademicYear}
              </td>
              <td className="px-6 py-3 text-gray-600 text-xs">
                {formatDate(activeTerm.activeTermStartDate)} —{" "}
                {formatDate(activeTerm.activeTermEndDate)}
              </td>
              <td className="px-6 py-3">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium">
                  <CheckCircle size={12} /> Active
                </span>
              </td>
            </tr>
          ) : (
            <tr className="border-t border-gray-100">
              <td colSpan={4} className="px-6 py-8 text-center">
                <AlertCircle
                  size={24}
                  className="mx-auto mb-2 text-yellow-400"
                />
                <p className="text-sm text-gray-500 font-medium">
                  No active term set
                </p>
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {(!activeTerm || showForm) && (
        <form
          onSubmit={handleActivate}
          className="border-t border-gray-100 bg-gray-50 p-5 space-y-3"
        >
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Term
              </label>
              <Select
                value={form.term}
                onValueChange={(v) => setForm({ ...form, term: v })}
              >
                <SelectTrigger className="w-[130px] bg-white h-[38px]">
                  <SelectValue placeholder="Select term" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  {terms.map((t) => (
                    <SelectItem
                      key={t.value}
                      value={t.value}
                      className={ITEM_CLASS}
                    >
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Academic Year
              </label>
              <input
                value={form.academicYear}
                onChange={(e) =>
                  setForm({ ...form, academicYear: e.target.value })
                }
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm w-32 bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Start Date
              </label>
              <DatePicker
                value={form.startDate}
                onChange={(v) => setForm({ ...form, startDate: v })}
                className="w-[150px]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                End Date
              </label>
              <DatePicker
                value={form.endDate}
                onChange={(v) => setForm({ ...form, endDate: v })}
                min={form.startDate || undefined}
                className="w-[150px]"
              />
            </div>
            <button
              type="submit"
              disabled={activating}
              className="flex items-center gap-2 bg-[var(--color-primary)] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[var(--color-primary-dark)] disabled:opacity-40"
            >
              {activating ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <CheckCircle size={14} />
              )}
              {activating ? "Activating..." : "Activate Term"}
            </button>
            {activeTerm && (
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-white"
              >
                Cancel
              </button>
            )}
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
        </form>
      )}
    </div>
  );
}
