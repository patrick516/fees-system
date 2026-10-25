import { useEffect, useState } from "react";
import {
  Wallet,
  Loader2,
  //   Plus,
  Play,
  CheckCircle2,
  Clock,
  //   TrendingUp,
  X,
  Trash2,
} from "lucide-react";
import api from "../../lib/axios";
import type { PayrollRecord } from "../../types";

const formatMWK = (n: number) => `MWK ${Number(n || 0).toLocaleString()}`;
const currentMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

export default function PayrollPage() {
  const [month, setMonth] = useState(currentMonth());
  const [records, setRecords] = useState<PayrollRecord[]>([]);
  const [summary, setSummary] = useState<any>({
    gross: 0,
    deductions: 0,
    bonus: 0,
    net: 0,
    paid: 0,
    pending: 0,
    count: 0,
  });
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState<{
    kind: "success" | "error";
    text: string;
  } | null>(null);

  const [editingRecord, setEditingRecord] = useState<PayrollRecord | null>(
    null,
  );
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/payroll?month=${month}`);
      setRecords(res.data.data || []);
      setSummary(
        res.data.summary || {
          gross: 0,
          deductions: 0,
          bonus: 0,
          net: 0,
          paid: 0,
          pending: 0,
          count: 0,
        },
      );
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month]);

  const generate = async () => {
    setGenerating(true);
    setMessage(null);
    try {
      const res = await api.post("/payroll/generate", { month });
      setMessage({ kind: "success", text: res.data.message });
      load();
    } catch (err: any) {
      setMessage({
        kind: "error",
        text: err.response?.data?.message || "Failed to generate",
      });
    } finally {
      setGenerating(false);
    }
  };

  const markPaid = async (r: PayrollRecord) => {
    try {
      await api.put(`/payroll/${r.id}`, {
        status: r.status === "PAID" ? "PENDING" : "PAID",
      });
      load();
    } catch (err: any) {
      setMessage({
        kind: "error",
        text: err.response?.data?.message || "Failed",
      });
    }
  };

  const deleteRecord = async () => {
    if (!deletingId) return;
    try {
      await api.delete(`/payroll/${deletingId}`);
      setDeletingId(null);
      load();
    } catch (err: any) {
      setMessage({
        kind: "error",
        text: err.response?.data?.message || "Failed to delete",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <Wallet size={18} className="text-[var(--color-primary)]" /> Payroll
          </h2>
          <p className="text-sm text-gray-500">
            Generate and track monthly salary payments
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          />
          {records.length === 0 && !loading && (
            <button
              onClick={generate}
              disabled={generating}
              className="flex items-center gap-2 bg-[var(--color-primary)] text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-[var(--color-primary-dark)] disabled:opacity-50"
            >
              {generating ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Play size={16} />
              )}
              {generating ? "Generating..." : "Generate Payroll"}
            </button>
          )}
        </div>
      </div>

      {message && (
        <div
          className={`flex items-start gap-2 px-4 py-3 rounded-lg text-sm ${
            message.kind === "success"
              ? "bg-green-50 border border-green-200 text-green-800"
              : "bg-red-50 border border-red-200 text-red-800"
          }`}
        >
          {message.kind === "success" ? (
            <CheckCircle2 size={16} />
          ) : (
            <X size={16} />
          )}
          {message.text}
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
            Gross Payroll
          </p>
          <p className="text-lg font-bold text-gray-800">
            {formatMWK(summary.gross)}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
            Deductions
          </p>
          <p className="text-lg font-bold text-red-600">
            - {formatMWK(summary.deductions)}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
            Bonuses
          </p>
          <p className="text-lg font-bold text-green-600">
            + {formatMWK(summary.bonus)}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
            Net Payroll
          </p>
          <p className="text-lg font-bold text-purple-700">
            {formatMWK(summary.net)}
          </p>
        </div>
      </div>

      {/* Status counters */}
      <div className="flex items-center gap-3 text-sm">
        <span className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 border border-green-200 text-green-800 rounded-lg font-medium">
          <CheckCircle2 size={14} /> {summary.paid} Paid
        </span>
        <span className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg font-medium">
          <Clock size={14} /> {summary.pending} Pending
        </span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 size={24} className="animate-spin text-gray-300" />
          </div>
        ) : records.length === 0 ? (
          <div className="p-12 text-center">
            <Wallet size={40} className="mx-auto mb-3 text-gray-300" />
            <p className="text-sm font-medium text-gray-500">
              No payroll for {month}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Click "Generate Payroll" to create records for all active
              employees
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                    Employee
                  </th>
                  <th className="text-right px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                    Gross
                  </th>
                  <th className="text-right px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                    Deductions
                  </th>
                  <th className="text-right px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                    Bonus
                  </th>
                  <th className="text-right px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                    Net
                  </th>
                  <th className="text-center px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                    Status
                  </th>
                  <th className="text-right px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {records.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3">
                      <p className="text-sm font-medium text-gray-800">
                        {r.employee?.fullName}
                      </p>
                      <p className="text-xs text-gray-400">
                        {r.employee?.title || "—"}
                        {r.employee?.department
                          ? ` · ${r.employee.department.name}`
                          : ""}
                      </p>
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-sm text-gray-700">
                      {formatMWK(r.grossSalary)}
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-sm text-red-600">
                      - {formatMWK(r.totalDeductions)}
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-sm text-green-600">
                      + {formatMWK(r.bonus)}
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-sm font-semibold text-purple-700">
                      {formatMWK(r.netSalary)}
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span
                        className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full ${r.status === "PAID" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right space-x-3">
                      <button
                        onClick={() => setEditingRecord(r)}
                        className="text-xs font-semibold text-[var(--color-primary)] hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => markPaid(r)}
                        className="text-xs font-semibold text-gray-600 hover:underline"
                      >
                        {r.status === "PAID" ? "Unmark" : "Mark Paid"}
                      </button>
                      {r.status !== "PAID" && (
                        <button
                          onClick={() => setDeletingId(r.id)}
                          className="text-xs text-red-600 hover:underline"
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editingRecord && (
        <EditPayrollModal
          record={editingRecord}
          onClose={() => setEditingRecord(null)}
          onSaved={() => {
            setEditingRecord(null);
            load();
          }}
        />
      )}

      {deletingId && (
        <ConfirmDeleteModal
          onCancel={() => setDeletingId(null)}
          onConfirm={deleteRecord}
        />
      )}
    </div>
  );
}

// ==================== EDIT MODAL ====================

function EditPayrollModal({
  record,
  onClose,
  onSaved,
}: {
  record: PayrollRecord;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [bonus, setBonus] = useState(String(record.bonus));
  const [bonusReason, setBonusReason] = useState(record.bonusReason || "");
  const [extraDeduction, setExtraDeduction] = useState(
    String(record.extraDeduction),
  );
  const [extraDeductionReason, setExtraDeductionReason] = useState(
    record.extraDeductionReason || "",
  );
  const [saving, setSaving] = useState(false);

  const gross = Number(record.grossSalary);
  const baseDeductions =
    Number(record.payeTax) +
    Number(record.pensionDeduction) +
    Number(record.otherDeductions);
  const totalDeductions = baseDeductions + Number(extraDeduction || 0);
  const net = gross + Number(bonus || 0) - totalDeductions;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put(`/payroll/${record.id}`, {
        bonus: Number(bonus) || 0,
        bonusReason: bonusReason || null,
        extraDeduction: Number(extraDeduction) || 0,
        extraDeductionReason: extraDeductionReason || null,
      });
      onSaved();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to save");
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
        className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gray-800">
            Edit {record.employee?.fullName} — {record.month}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={save} className="space-y-3">
          <div className="bg-slate-50 rounded-lg p-3 text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-500">Gross:</span>
              <span className="font-mono">{formatMWK(gross)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Base Deductions:</span>
              <span className="font-mono text-red-600">
                - {formatMWK(baseDeductions)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs text-gray-600">
              Bonus
              <input
                type="number"
                value={bonus}
                onChange={(e) => setBonus(e.target.value)}
                className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono"
              />
            </label>
            <label className="text-xs text-gray-600">
              Bonus Reason
              <input
                value={bonusReason}
                onChange={(e) => setBonusReason(e.target.value)}
                placeholder="Optional"
                className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
            </label>
            <label className="text-xs text-gray-600">
              Extra Deduction
              <input
                type="number"
                value={extraDeduction}
                onChange={(e) => setExtraDeduction(e.target.value)}
                className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono"
              />
            </label>
            <label className="text-xs text-gray-600">
              Deduction Reason
              <input
                value={extraDeductionReason}
                onChange={(e) => setExtraDeductionReason(e.target.value)}
                placeholder="Optional"
                className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
            </label>
          </div>

          <div className="bg-purple-50 border border-purple-100 rounded-lg p-3 flex justify-between text-base font-bold">
            <span className="text-purple-800">New Net:</span>
            <span className="font-mono text-purple-700">{formatMWK(net)}</span>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 bg-[var(--color-primary)] text-white py-2.5 rounded-lg text-sm font-medium disabled:opacity-40"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ConfirmDeleteModal({
  onCancel,
  onConfirm,
}: {
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center">
          <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Trash2 size={22} className="text-red-600" />
          </div>
          <h3 className="text-base font-semibold text-gray-800 mb-1">
            Delete this payroll record?
          </h3>
          <p className="text-xs text-gray-500 mb-4">
            This can only be done for records that haven't been marked as paid.
          </p>
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg text-sm font-medium"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 bg-red-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-red-700"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
