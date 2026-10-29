import { useEffect, useState } from "react";
import {
  Wallet,
  Loader2,
  Play,
  CheckCircle2,
  Clock,
  X,
  Trash2,
  Printer,
  CheckSquare,
  Lock,
} from "lucide-react";
import api from "../../lib/axios";
import type { PayrollRecord } from "../../types";
import { toast } from "../../lib/toast";
import { useSchoolSettings } from "../../hooks/useSchoolSettings";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { Calendar as CalendarIcon } from "lucide-react";

const formatMWK = (n: number) => `MWK ${Number(n || 0).toLocaleString()}`;
const currentMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

const monthLabel = (m: string) => {
  if (!m) return "";
  const [y, mm] = m.split("-");
  const date = new Date(parseInt(y), parseInt(mm) - 1, 1);
  return date.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
};

export default function PayrollPage() {
  const { settings } = useSchoolSettings();
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

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkProcessing, setBulkProcessing] = useState(false);

  const load = async () => {
    setLoading(true);
    setSelectedIds([]);
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

  const markSelectedPaid = async () => {
    if (selectedIds.length === 0) return;
    setBulkProcessing(true);
    try {
      await Promise.all(
        selectedIds.map((id) => api.put(`/payroll/${id}`, { status: "PAID" })),
      );
      toast.success(`${selectedIds.length} payroll record(s) marked as paid`);
      load();
    } catch (err: any) {
      toast.error("Failed to mark some records as paid.");
    } finally {
      setBulkProcessing(false);
    }
  };
  const deleteRecord = async () => {
    if (!deletingId) return;
    try {
      await api.delete(`/payroll/${deletingId}`);
      toast.success("Payroll record deleted");
      setDeletingId(null);
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to delete");
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const toggleSelectAll = () => {
    const pendingIds = records
      .filter((r) => r.status !== "PAID")
      .map((r) => r.id);
    if (selectedIds.length === pendingIds.length && pendingIds.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(pendingIds);
    }
  };

  const exportToPDF = () => {
    if (records.length === 0) return;
    const brand = settings?.primaryColor || "#1e3a5f";
    const logoUrl = settings?.logo
      ? settings.logo.startsWith("http") || settings.logo.startsWith("data:")
        ? settings.logo
        : `${(import.meta.env.VITE_API_URL || "").replace(/\/api\/?$/, "")}${settings.logo}`
      : null;
    const today = new Date().toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

    const rowsHtml = records
      .map(
        (r) => `
      <tr>
        <td><div style="font-weight:600;color:#334155;">${r.employee?.fullName}</div><div style="font-size:8px;color:#94a3b8;">${r.employee?.jobTitle || "—"}</div></td>
        <td class="right">${formatMWK(r.basicSalary)}</td>
        <td class="right">${formatMWK(Number(r.housingAllowance) + Number(r.transportAllowance) + Number(r.otherAllowances))}</td>
        <td class="right bold">${formatMWK(r.grossSalary)}</td>
        <td class="right red">- ${formatMWK(r.payeTax)}</td>
        <td class="right red">- ${formatMWK(Number(r.pensionDeduction) + Number(r.otherDeductions) + Number(r.extraDeduction || 0))}</td>
        <td class="right green">+ ${formatMWK(r.bonus)}</td>
        <td class="right bold purple">${formatMWK(r.netSalary)}</td>
        <td class="center">${r.status === "PAID" ? "PAID" : "PENDING"}</td>
      </tr>`,
      )
      .join("");

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${settings?.name || "School"} — Payroll Report</title>
  <style>
    @page { size: A4 landscape; margin: 12mm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 9px; color: #1e293b; line-height: 1.4; background: white; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .header { display: flex; align-items: center; gap: 16px; padding-bottom: 14px; border-bottom: 3px solid ${brand}; margin-bottom: 18px; }
    .header-logo { width: 60px; height: 60px; object-fit: contain; flex-shrink: 0; }
    .header-logo-placeholder { width: 60px; height: 60px; background: #f1f5f9; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: #94a3b8; font-size: 9px; font-weight: 600; flex-shrink: 0; }
    .header-content { flex: 1; min-width: 0; }
    .school-name { font-size: 18px; font-weight: 800; color: ${brand}; line-height: 1.15; }
    .school-motto { font-size: 10px; color: #64748b; font-style: italic; margin-top: 2px; }
    .report-title { font-size: 11px; font-weight: 600; color: #334155; margin-top: 6px; text-transform: uppercase; letter-spacing: 1px; }
    .header-meta { text-align: right; font-size: 9px; color: #64748b; line-height: 1.6; white-space: nowrap; }
    .header-meta strong { color: ${brand}; font-weight: 700; }
    .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 18px; }
    .stat-card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px; background: #ffffff; }
    .stat-label { font-size: 8px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
    .stat-value { font-size: 16px; font-weight: 800; line-height: 1; }
    .stat-value.green { color: #16a34a; }
    .stat-value.red { color: #dc2626; }
    .stat-value.blue { color: ${brand}; }
    .stat-value.purple { color: #7e22ce; }
    table { width: 100%; border-collapse: collapse; font-size: 8.5px; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0; }
    thead th { background: ${brand}; color: #ffffff; font-size: 8px; font-weight: 700; text-transform: uppercase; padding: 8px 6px; text-align: left; white-space: nowrap; }
    thead th.right { text-align: right; }
    thead th.center { text-align: center; }
    tbody td { padding: 6px; border-top: 1px solid #f1f5f9; vertical-align: middle; }
    tbody tr:nth-child(even) td { background: #f8fafc; }
    tbody td.right { text-align: right; }
    tbody td.center { text-align: center; font-weight: 600; font-size: 7.5px; }
    tbody td.bold { font-weight: 700; color: #1e293b; }
    tbody td.green { color: #16a34a; }
    tbody td.red { color: #dc2626; }
    tbody td.purple { color: #7e22ce; }
    .footer { margin-top: 30px; padding-top: 15px; border-top: 1px dashed #cbd5e1; display: flex; justify-content: space-between; align-items: flex-end; }
    .signature-block { text-align: center; width: 200px; }
    .signature-line { border-bottom: 1px solid #64748b; height: 30px; margin-bottom: 5px; }
    .signature-label { font-size: 9px; font-weight: 600; color: #64748b; text-transform: uppercase; }
  </style>
</head>
<body>
  <div class="header">
    ${logoUrl ? `<img src="${logoUrl}" alt="Logo" class="header-logo" />` : `<div class="header-logo-placeholder">LOGO</div>`}
    <div class="header-content">
      <div class="school-name">${settings?.name || "School Name"}</div>
      ${settings?.motto ? `<div class="school-motto">"${settings.motto}"</div>` : ""}
      <div class="report-title">Monthly Payroll Report</div>
    </div>
    <div class="header-meta">
      <div>Payroll Month</div>
      <div><strong>${monthLabel(month)}</strong></div>
      <div style="margin-top:6px;">Generated On</div>
      <div><strong>${today}</strong></div>
    </div>
  </div>
  <div class="stats-grid">
    <div class="stat-card"><div class="stat-label">Total Employees</div><div class="stat-value blue">${records.length}</div></div>
    <div class="stat-card"><div class="stat-label">Total Gross</div><div class="stat-value blue">${formatMWK(summary.gross)}</div></div>
    <div class="stat-card"><div class="stat-label">Total Deductions</div><div class="stat-value red">- ${formatMWK(summary.deductions)}</div></div>
    <div class="stat-card"><div class="stat-label">Total Net Payable</div><div class="stat-value purple">${formatMWK(summary.net)}</div></div>
  </div>
  <table>
    <thead>
      <tr>
        <th>Employee Name</th>
        <th class="right">Basic Salary</th>
        <th class="right">Allowances</th>
        <th class="right">Gross Pay</th>
        <th class="right">PAYE Tax</th>
        <th class="right">Other Deductions</th>
        <th class="right">Bonus</th>
        <th class="right">Net Pay</th>
        <th class="center">Status</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
    </tbody>
  </table>
  <div class="footer">
    <div><p style="font-size:8px;color:#94a3b8;">This is a system-generated report. Valid without signature.</p></div>
    <div style="display:flex;gap:40px;">
      <div class="signature-block"><div class="signature-line"></div><div class="signature-label">Prepared By (Bursar)</div></div>
      <div class="signature-block"><div class="signature-line"></div><div class="signature-label">Approved By (Headmaster)</div></div>
    </div>
  </div>
</body>
</html>`;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 600);
  };

  const pendingRecords = records.filter((r) => r.status !== "PAID");

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
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg p-1">
            <div className="pl-2 text-gray-400">
              <CalendarIcon size={16} />
            </div>
            <Select
              value={month.split("-")[1]}
              onValueChange={(val) => setMonth(`${month.split("-")[0]}-${val}`)}
            >
              <SelectTrigger className="w-[120px] border-0 bg-transparent shadow-none focus:ring-0 h-8 text-sm font-medium">
                <SelectValue placeholder="Month" />
              </SelectTrigger>
              <SelectContent className="bg-white">
                {[
                  { v: "01", l: "January" },
                  { v: "02", l: "February" },
                  { v: "03", l: "March" },
                  { v: "04", l: "April" },
                  { v: "05", l: "May" },
                  { v: "06", l: "June" },
                  { v: "07", l: "July" },
                  { v: "08", l: "August" },
                  { v: "09", l: "September" },
                  { v: "10", l: "October" },
                  { v: "11", l: "November" },
                  { v: "12", l: "December" },
                ].map((m) => (
                  <SelectItem key={m.v} value={m.v}>
                    {m.l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={month.split("-")[0]}
              onValueChange={(val) => setMonth(`${val}-${month.split("-")[1]}`)}
            >
              <SelectTrigger className="w-[90px] border-0 bg-transparent shadow-none focus:ring-0 h-8 text-sm font-medium">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent className="bg-white max-h-[200px]">
                {Array.from(
                  { length: 5 },
                  (_, i) => new Date().getFullYear() - 2 + i,
                ).map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {records.length > 0 ? (
            <button
              onClick={exportToPDF}
              className="flex items-center gap-2 bg-gray-800 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-900 transition-colors"
            >
              <Printer size={16} /> Export PDF
            </button>
          ) : (
            !loading && (
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
            )
          )}
        </div>
      </div>

      {message && (
        <div
          className={`flex items-start gap-2 px-4 py-3 rounded-lg text-sm ${message.kind === "success" ? "bg-green-50 border border-green-200 text-green-800" : "bg-red-50 border border-red-200 text-red-800"}`}
        >
          {message.kind === "success" ? (
            <CheckCircle2 size={16} />
          ) : (
            <X size={16} />
          )}
          {message.text}
        </div>
      )}

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

      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 border border-green-200 text-green-800 rounded-lg font-medium">
            <CheckCircle2 size={14} /> {summary.paid} Paid
          </span>
          <span className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg font-medium">
            <Clock size={14} /> {summary.pending} Pending
          </span>
        </div>

        {selectedIds.length > 0 && (
          <button
            onClick={markSelectedPaid}
            disabled={bulkProcessing}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors animate-in fade-in slide-in-from-top-2"
          >
            {bulkProcessing ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <CheckSquare size={16} />
            )}
            Mark {selectedIds.length} Selected as Paid
          </button>
        )}
      </div>

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
                  <th className="px-5 py-3 w-10 text-center">
                    {pendingRecords.length > 0 && (
                      <input
                        type="checkbox"
                        checked={
                          selectedIds.length === pendingRecords.length &&
                          pendingRecords.length > 0
                        }
                        onChange={toggleSelectAll}
                        className="w-4 h-4 text-[var(--color-primary)] rounded border-gray-300 focus:ring-[var(--color-primary)] cursor-pointer"
                      />
                    )}
                  </th>
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
                    <td className="px-5 py-3 text-center">
                      {r.status !== "PAID" && (
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(r.id)}
                          onChange={() => toggleSelect(r.id)}
                          className="w-4 h-4 text-[var(--color-primary)] rounded border-gray-300 focus:ring-[var(--color-primary)] cursor-pointer"
                        />
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <p className="text-sm font-medium text-gray-800">
                        {r.employee?.fullName}
                      </p>
                      <p className="text-xs text-gray-400">
                        {r.employee?.jobTitle || "—"}
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
                      {/* 🎯 LOCKED IF PAID */}
                      {r.status === "PAID" ? (
                        <span
                          className="inline-flex items-center gap-1 text-xs font-medium text-gray-400 cursor-not-allowed"
                          title="Paid records are locked for auditing"
                        >
                          <Lock size={12} /> Locked
                        </span>
                      ) : (
                        <>
                          <button
                            onClick={() => setEditingRecord(r)}
                            className="text-xs font-semibold text-[var(--color-primary)] hover:underline"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => setDeletingId(r.id)}
                            className="text-xs text-red-600 hover:underline"
                          >
                            Delete
                          </button>
                        </>
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
    if (record.status === "PAID") return; // Safety check
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
      toast.error(err.response?.data?.message || "Failed to save");
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
