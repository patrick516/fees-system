import { useEffect, useState } from "react";
import {
  Download,
  FileSpreadsheet,
  FileText,
  Filter,
  Users,
  CheckCircle,
  AlertCircle,
  Clock,
  // TrendingUp,
  // ChevronDown,
  Loader2,
  BarChart2,
} from "lucide-react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import api from "../../lib/axios";

const termOptions = [
  { value: "", label: "All Terms" },
  { value: "TERM_1", label: "Term 1" },
  { value: "TERM_2", label: "Term 2" },
  { value: "TERM_3", label: "Term 3" },
];

const statusColors: Record<string, string> = {
  PAID_FULL: "bg-green-100 text-green-700",
  PAID_WITH_CREDIT: "bg-purple-100 text-purple-700",
  PARTIAL: "bg-yellow-100 text-yellow-700",
  NO_PAYMENT: "bg-gray-100 text-gray-500",
};

const statusLabels: Record<string, string> = {
  PAID_FULL: "✓ Paid in Full",
  PAID_WITH_CREDIT: "★ Paid + Credit",
  PARTIAL: "⚠ Partial",
  NO_PAYMENT: "○ No Payment",
};

const formatMWK = (amount: number) => `MWK ${(amount || 0).toLocaleString()}`;

export default function ReportsPage() {
  const [classes, setClasses] = useState<any[]>([]);
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);

  const [filters, setFilters] = useState({
    term: "",
    classId: "",
    academicYear: new Date().getFullYear().toString(),
  });

  useEffect(() => {
    api
      .get("/schools/classes")
      .then((res) => setClasses(res.data.data))
      .catch(() => {});
  }, []);

  const generateReport = async () => {
    setLoading(true);
    setGenerated(false);
    try {
      const params = new URLSearchParams({
        academicYear: filters.academicYear,
        ...(filters.term && { term: filters.term }),
        ...(filters.classId && { classId: filters.classId }),
      });
      const res = await api.get(`/reports/fees?${params}`);
      setReport(res.data.data);
      setGenerated(true);
    } catch (err) {
      console.error("Failed to generate report");
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = () => {
    if (!report) return;

    const wb = XLSX.utils.book_new();

    // Sheet 1 — Summary
    const summaryData = [
      ["SCHOOL FEES REPORT"],
      [`Generated: ${new Date().toLocaleDateString("en-GB")}`],
      [`Academic Year: ${filters.academicYear}`],
      [`Term: ${filters.term ? filters.term.replace("_", " ") : "All Terms"}`],
      [],
      ["OVERALL SUMMARY"],
      ["Total Students", report.summary.totalStudents],
      ["Paid in Full", report.summary.paidFull],
      ["Partial Payment", report.summary.partial],
      ["No Payment", report.summary.noPayment],
      ["Debtors", report.summary.debtors],
      [],
      ["Total Collected", report.summary.totalCollected],
      ["Total Outstanding", report.summary.totalOutstanding],
      ["Total Required", report.summary.totalRequired],
    ];
    const ws1 = XLSX.utils.aoa_to_sheet(summaryData);
    ws1["!cols"] = [{ wch: 25 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, ws1, "Summary");

    // Sheet 2 — Class Summary
    const classHeaders = [
      "Class",
      "Total Students",
      "Paid Full",
      "Partial",
      "No Payment",
      "Debtors",
      "Total Collected",
      "Outstanding",
    ];
    const classRows = report.classSummary.map((c: any) => [
      c.className,
      c.totalStudents,
      c.paidFull,
      c.partial,
      c.noPayment,
      c.debtors,
      c.totalCollected,
      c.totalOutstanding,
    ]);
    const ws2 = XLSX.utils.aoa_to_sheet([classHeaders, ...classRows]);
    ws2["!cols"] = classHeaders.map(() => ({ wch: 18 }));
    XLSX.utils.book_append_sheet(wb, ws2, "By Class");

    // Sheet 3 — Detailed Student List
    const detailHeaders = [
      "Student ID",
      "Full Name",
      "Class",
      "Gender",
      "Parent Name",
      "Parent Phone",
      "Required (MWK)",
      "Paid (MWK)",
      "Balance (MWK)",
      "Status",
      "Last Payment Date",
    ];
    const detailRows = report.rows.map((r: any) => [
      r.studentCode,
      r.fullName,
      r.className,
      r.gender,
      r.parentName,
      r.parentPhone,
      r.requiredAmount || 0,
      r.totalPaid,
      r.balance || 0,
      statusLabels[r.paymentStatus] || r.paymentStatus,
      r.lastPaymentDate
        ? new Date(r.lastPaymentDate).toLocaleDateString("en-GB")
        : "N/A",
    ]);
    const ws3 = XLSX.utils.aoa_to_sheet([detailHeaders, ...detailRows]);
    ws3["!cols"] = [
      { wch: 14 },
      { wch: 22 },
      { wch: 12 },
      { wch: 8 },
      { wch: 20 },
      { wch: 16 },
      { wch: 16 },
      { wch: 14 },
      { wch: 14 },
      { wch: 18 },
      { wch: 18 },
    ];
    XLSX.utils.book_append_sheet(wb, ws3, "Student Details");

    // Save
    const fileName = `SchoolPay_Report_${filters.academicYear}_${filters.term || "AllTerms"}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    saveAs(blob, fileName);
  };

  const exportToPDF = () => {
    if (!report) return;

    const termLabel = filters.term
      ? filters.term.replace("_", " ")
      : "All Terms";
    const classLabel = filters.classId
      ? classes.find((c) => c.id === filters.classId)?.name || "All Classes"
      : "All Classes";

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>School Fees Report</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 11px; color: #1a1a1a; padding: 24px; }
    .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #1e3a5f; padding-bottom: 12px; }
    .header h1 { font-size: 20px; color: #1e3a5f; }
    .header p { color: #666; font-size: 11px; margin-top: 4px; }
    .meta { display: flex; gap: 24px; margin-bottom: 16px; font-size: 11px; }
    .meta span { background: #f0f4ff; padding: 4px 10px; border-radius: 4px; }
    .section-title { font-size: 13px; font-weight: bold; color: #1e3a5f; margin: 16px 0 8px; border-left: 3px solid #1e3a5f; padding-left: 8px; }
    .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 16px; }
    .summary-card { border: 1px solid #e5e7eb; border-radius: 6px; padding: 8px 12px; text-align: center; }
    .summary-card .value { font-size: 18px; font-weight: bold; color: #1e3a5f; }
    .summary-card .label { font-size: 10px; color: #666; margin-top: 2px; }
    .money-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 16px; }
    .money-card { border: 1px solid #e5e7eb; border-radius: 6px; padding: 8px 12px; }
    .money-card .value { font-size: 14px; font-weight: bold; }
    .money-card .label { font-size: 10px; color: #666; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    th { background: #1e3a5f; color: white; padding: 6px 8px; text-align: left; font-size: 10px; }
    td { padding: 5px 8px; border-bottom: 1px solid #f0f0f0; font-size: 10px; }
    tr:nth-child(even) { background: #fafafa; }
    .badge { display: inline-block; padding: 2px 6px; border-radius: 10px; font-size: 9px; font-weight: bold; }
    .badge-green { background: #dcfce7; color: #166534; }
    .badge-yellow { background: #fef9c3; color: #854d0e; }
    .badge-gray { background: #f3f4f6; color: #6b7280; }
    .badge-purple { background: #f3e8ff; color: #7e22ce; }
    .footer { text-align: center; color: #999; font-size: 10px; margin-top: 24px; border-top: 1px solid #e5e7eb; padding-top: 12px; }
    @media print { body { padding: 12px; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>School Fees Report</h1>
    <p>Academic Year: ${filters.academicYear} &nbsp;|&nbsp; ${termLabel} &nbsp;|&nbsp; ${classLabel}</p>
    <p>Generated: ${new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}</p>
  </div>

  <div class="section-title">Overall Summary</div>
  <div class="summary-grid">
    <div class="summary-card">
      <div class="value">${report.summary.totalStudents}</div>
      <div class="label">Total Students</div>
    </div>
    <div class="summary-card">
      <div class="value" style="color:#16a34a">${report.summary.paidFull}</div>
      <div class="label">Paid in Full</div>
    </div>
    <div class="summary-card">
      <div class="value" style="color:#ca8a04">${report.summary.partial}</div>
      <div class="label">Partial</div>
    </div>
    <div class="summary-card">
      <div class="value" style="color:#dc2626">${report.summary.debtors}</div>
      <div class="label">Debtors</div>
    </div>
  </div>

  <div class="money-grid">
    <div class="money-card">
      <div class="value" style="color:#16a34a">MWK ${report.summary.totalCollected.toLocaleString()}</div>
      <div class="label">Total Collected</div>
    </div>
    <div class="money-card">
      <div class="value" style="color:#dc2626">MWK ${report.summary.totalOutstanding.toLocaleString()}</div>
      <div class="label">Total Outstanding</div>
    </div>
    <div class="money-card">
      <div class="value" style="color:#1e3a5f">MWK ${report.summary.totalRequired.toLocaleString()}</div>
      <div class="label">Total Required</div>
    </div>
  </div>

  <div class="section-title">Summary by Class</div>
  <table>
    <thead>
      <tr>
        <th>Class</th>
        <th>Students</th>
        <th>Paid Full</th>
        <th>Partial</th>
        <th>No Payment</th>
        <th>Debtors</th>
        <th>Collected</th>
        <th>Outstanding</th>
      </tr>
    </thead>
    <tbody>
      ${report.classSummary
        .map(
          (c: any) => `
        <tr>
          <td><strong>${c.className}</strong></td>
          <td>${c.totalStudents}</td>
          <td style="color:#16a34a"><strong>${c.paidFull}</strong></td>
          <td style="color:#ca8a04">${c.partial}</td>
          <td style="color:#6b7280">${c.noPayment}</td>
          <td style="color:#dc2626">${c.debtors}</td>
          <td>MWK ${c.totalCollected.toLocaleString()}</td>
          <td style="color:#dc2626">MWK ${c.totalOutstanding.toLocaleString()}</td>
        </tr>
      `,
        )
        .join("")}
    </tbody>
  </table>

  <div class="section-title">Detailed Student List</div>
  <table>
    <thead>
      <tr>
        <th>ID</th>
        <th>Student Name</th>
        <th>Class</th>
        <th>Parent</th>
        <th>Phone</th>
        <th>Required</th>
        <th>Paid</th>
        <th>Balance</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      ${report.rows
        .map(
          (r: any) => `
        <tr>
          <td style="font-family:monospace">${r.studentCode}</td>
          <td><strong>${r.fullName}</strong></td>
          <td>${r.className}</td>
          <td>${r.parentName}</td>
          <td>${r.parentPhone}</td>
          <td>MWK ${(r.requiredAmount || 0).toLocaleString()}</td>
          <td style="color:#16a34a">MWK ${r.totalPaid.toLocaleString()}</td>
          <td style="color:${r.balance > 0 ? "#dc2626" : "#16a34a"}">
            ${r.balance > 0 ? "MWK " + r.balance.toLocaleString() : "✓ Clear"}
          </td>
          <td>
            <span class="badge ${
              r.paymentStatus === "PAID_FULL"
                ? "badge-green"
                : r.paymentStatus === "PARTIAL"
                  ? "badge-yellow"
                  : r.paymentStatus === "PAID_WITH_CREDIT"
                    ? "badge-purple"
                    : "badge-gray"
            }">
              ${statusLabels[r.paymentStatus] || r.paymentStatus}
            </span>
          </td>
        </tr>
      `,
        )
        .join("")}
    </tbody>
  </table>

  <div class="footer">
    SchoolPay Malawi &nbsp;|&nbsp; Confidential &nbsp;|&nbsp; ${new Date().toLocaleDateString("en-GB")}
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
    }, 500);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">Fee Reports</h2>
          <p className="text-sm text-gray-500">
            Generate and export fee collection reports
          </p>
        </div>
        {generated && (
          <div className="flex items-center gap-2">
            <button
              onClick={exportToExcel}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
            >
              <FileSpreadsheet size={16} />
              Export Excel
            </button>
            <button
              onClick={exportToPDF}
              className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
            >
              <FileText size={16} />
              Export PDF
            </button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
        <p className="text-sm font-medium text-gray-700 mb-4 flex items-center gap-2">
          <Filter size={16} className="text-gray-400" />
          Report Filters
        </p>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              Academic Year
            </label>
            <input
              value={filters.academicYear}
              onChange={(e) =>
                setFilters({ ...filters, academicYear: e.target.value })
              }
              placeholder="eg. 2025"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              Term
            </label>
            <select
              value={filters.term}
              onChange={(e) => setFilters({ ...filters, term: e.target.value })}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {termOptions.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              Class
            </label>
            <select
              value={filters.classId}
              onChange={(e) =>
                setFilters({ ...filters, classId: e.target.value })
              }
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Classes</option>
              {classes.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={generateReport}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-blue-900 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-800 disabled:opacity-40 transition-colors"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Generating...
                </>
              ) : (
                <>
                  <BarChart2 size={16} /> Generate Report
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Report Content */}
      {generated && report && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-gray-500">Total Students</p>
                <Users size={16} className="text-blue-900" />
              </div>
              <p className="text-2xl font-bold text-gray-800">
                {report.summary.totalStudents}
              </p>
            </div>
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-gray-500">Paid in Full</p>
                <CheckCircle size={16} className="text-green-600" />
              </div>
              <p className="text-2xl font-bold text-green-600">
                {report.summary.paidFull}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {report.summary.totalStudents > 0
                  ? Math.round(
                      (report.summary.paidFull / report.summary.totalStudents) *
                        100,
                    )
                  : 0}
                % of students
              </p>
            </div>
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-gray-500">Debtors</p>
                <AlertCircle size={16} className="text-red-600" />
              </div>
              <p className="text-2xl font-bold text-red-600">
                {report.summary.debtors}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {report.summary.partial} partial payments
              </p>
            </div>
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-gray-500">No Payment</p>
                <Clock size={16} className="text-gray-400" />
              </div>
              <p className="text-2xl font-bold text-gray-500">
                {report.summary.noPayment}
              </p>
            </div>
          </div>

          {/* Financial Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-green-50 border border-green-100 rounded-xl p-5">
              <p className="text-xs text-gray-500 mb-1">Total Collected</p>
              <p className="text-xl font-bold text-green-600">
                {formatMWK(report.summary.totalCollected)}
              </p>
            </div>
            <div className="bg-red-50 border border-red-100 rounded-xl p-5">
              <p className="text-xs text-gray-500 mb-1">Total Outstanding</p>
              <p className="text-xl font-bold text-red-600">
                {formatMWK(report.summary.totalOutstanding)}
              </p>
            </div>
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-5">
              <p className="text-xs text-gray-500 mb-1">Total Required</p>
              <p className="text-xl font-bold text-blue-900">
                {formatMWK(report.summary.totalRequired)}
              </p>
              <div className="mt-2 bg-gray-200 rounded-full h-1.5">
                <div
                  className="bg-green-500 h-1.5 rounded-full"
                  style={{
                    width: `${
                      report.summary.totalRequired > 0
                        ? Math.min(
                            100,
                            (report.summary.totalCollected /
                              report.summary.totalRequired) *
                              100,
                          )
                        : 0
                    }%`,
                  }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">
                {report.summary.totalRequired > 0
                  ? Math.round(
                      (report.summary.totalCollected /
                        report.summary.totalRequired) *
                        100,
                    )
                  : 0}
                % collected
              </p>
            </div>
          </div>

          {/* Class Summary Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="font-medium text-gray-800">Summary by Class</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                      Class
                    </th>
                    <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                      Students
                    </th>
                    <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                      Paid Full
                    </th>
                    <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                      Partial
                    </th>
                    <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                      No Payment
                    </th>
                    <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                      Debtors
                    </th>
                    <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                      Collected
                    </th>
                    <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                      Outstanding
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {report.classSummary.map((cls: any) => (
                    <tr key={cls.className} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-800">
                        {cls.className}
                      </td>
                      <td className="px-4 py-4 text-center text-gray-600">
                        {cls.totalStudents}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className="text-green-600 font-medium">
                          {cls.paidFull}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className="text-yellow-600 font-medium">
                          {cls.partial}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className="text-gray-400">{cls.noPayment}</span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className="text-red-600 font-medium">
                          {cls.debtors}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-green-600 font-medium">
                        {formatMWK(cls.totalCollected)}
                      </td>
                      <td className="px-6 py-4 text-right text-red-600 font-medium">
                        {formatMWK(cls.totalOutstanding)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Detailed Student Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-medium text-gray-800">
                Student Details
                <span className="ml-2 text-xs text-gray-400 font-normal">
                  {report.rows.length} students
                </span>
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={exportToExcel}
                  className="flex items-center gap-1.5 text-xs text-green-600 font-medium hover:text-green-700"
                >
                  <Download size={13} />
                  Excel
                </button>
                <span className="text-gray-300">|</span>
                <button
                  onClick={exportToPDF}
                  className="flex items-center gap-1.5 text-xs text-red-600 font-medium hover:text-red-700"
                >
                  <Download size={13} />
                  PDF
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                      Student
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                      ID
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                      Class
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                      Parent
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                      Required
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                      Paid
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                      Balance
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {report.rows.map((row: any) => (
                    <tr key={row.studentId} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-gray-800">
                          {row.fullName}
                        </p>
                        <p className="text-xs text-gray-400">{row.gender}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded">
                          {row.studentCode}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {row.className}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-gray-600">
                          {row.parentName}
                        </p>
                        <p className="text-xs text-gray-400">
                          {row.parentPhone}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-gray-600">
                        {row.requiredAmount
                          ? formatMWK(row.requiredAmount)
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-medium text-green-600">
                        {formatMWK(row.totalPaid)}
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-medium">
                        {row.balance !== null ? (
                          row.balance === 0 ? (
                            <span className="text-green-600">✓ Clear</span>
                          ) : (
                            <span className="text-red-600">
                              {formatMWK(row.balance)}
                            </span>
                          )
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs px-2 py-1 rounded-full font-medium ${statusColors[row.paymentStatus] || "bg-gray-100 text-gray-500"}`}
                        >
                          {statusLabels[row.paymentStatus] || row.paymentStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Report footer */}
          <div className="text-center text-xs text-gray-400 py-2">
            Report generated on {new Date().toLocaleString("en-GB")} • SchoolPay
            Malawi
          </div>
        </>
      )}

      {/* Empty state */}
      {!generated && !loading && (
        <div className="bg-white rounded-xl p-16 text-center shadow-sm border border-gray-100">
          <BarChart2 size={48} className="mx-auto mb-4 text-gray-200" />
          <p className="text-gray-400 font-medium">No report generated yet</p>
          <p className="text-gray-300 text-sm mt-1">
            Select filters above and click Generate Report
          </p>
        </div>
      )}
    </div>
  );
}
