import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Download,
  FileSpreadsheet,
  FileText,
  Filter,
  Users,
  CheckCircle,
  AlertCircle,
  Clock,
  Loader2,
  BarChart2,
  History,
} from "lucide-react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import api from "../../lib/axios";
import { useSchoolSettings } from "../../hooks/useSchoolSettings";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { getCurrentAcademicYear } from "../../lib/utils";
import { useActiveTerm } from "../../hooks/useActiveTerm";

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

const termLabel = (t?: string | null) =>
  t ? t.replace("_", " ").replace("TERM", "Term") : "";

const ITEM_CLASS =
  "cursor-pointer mx-1 my-0.5 rounded-md pl-3 pr-7 focus:bg-gray-100 focus:text-gray-900 data-[highlighted]:bg-gray-100 data-[highlighted]:text-gray-900";

export default function ReportsPage() {
  const { settings } = useSchoolSettings();
  const [searchParams, setSearchParams] = useSearchParams();
  const [classes, setClasses] = useState<any[]>([]);
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [generatedFromHistory, setGeneratedFromHistory] = useState(false);

  const { academicYear: activeYear } = useActiveTerm();

  const [filters, setFilters] = useState({
    term: "",
    classId: "",
    academicYear: getCurrentAcademicYear(),
  });

  useEffect(() => {
    if (activeYear) {
      setFilters((prev) => ({ ...prev, academicYear: activeYear }));
    }
  }, [activeYear]);

  useEffect(() => {
    api
      .get("/schools/classes")
      .then((res) => setClasses(res.data.data))
      .catch(() => {});
  }, []);

  const runReport = async (f: typeof filters) => {
    setLoading(true);
    setGenerated(false);
    try {
      const params = new URLSearchParams({ academicYear: f.academicYear });
      if (f.term) params.set("term", f.term);
      if (f.classId) params.set("classId", f.classId);
      const res = await api.get(`/reports/fees?${params}`);
      setReport(res.data.data);
      setGenerated(true);
    } catch (err) {
      console.error("Failed to generate report");
    } finally {
      setLoading(false);
    }
  };

  const generateReport = () => runReport(filters);

  useEffect(() => {
    const urlTerm = searchParams.get("term");
    const urlYear = searchParams.get("academicYear");

    if (!urlTerm && !urlYear) return;

    const newFilters = {
      term: urlTerm || "",
      classId: "",
      academicYear: urlYear || getCurrentAcademicYear(),
    };
    setFilters(newFilters);
    setGeneratedFromHistory(true);
    runReport(newFilters);
    setSearchParams({}, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const exportToExcel = () => {
    if (!report) return;

    const wb = XLSX.utils.book_new();

    const summaryData = [
      [settings?.name || "SCHOOL FEES REPORT"],
      ...(settings?.motto ? [[settings.motto]] : []),
      [`Generated: ${new Date().toLocaleDateString("en-GB")}`],
      [`Academic Year: ${filters.academicYear}`],
      [`Term: ${filters.term ? termLabel(filters.term) : "All Terms"}`],
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

    const fileName = `SchoolPay_Report_${filters.academicYear}_${filters.term || "AllTerms"}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    saveAs(blob, fileName);
  };

  const exportToPDF = () => {
    if (!report) return;

    const termText = filters.term ? termLabel(filters.term) : "All Terms";
    const classLabel = filters.classId
      ? classes.find((c) => c.id === filters.classId)?.name || "All Classes"
      : "All Classes";

    const collectionPct =
      report.summary.totalRequired > 0
        ? Math.round(
            (report.summary.totalCollected / report.summary.totalRequired) *
              100,
          )
        : 0;

    // Resolve logo URL to absolute
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

    const badgeFor = (status: string) => {
      const map: Record<string, { bg: string; fg: string; label: string }> = {
        PAID_FULL: { bg: "#dcfce7", fg: "#15803d", label: "✓ Paid in Full" },
        PAID_WITH_CREDIT: {
          bg: "#f3e8ff",
          fg: "#7e22ce",
          label: "★ Paid + Credit",
        },
        PARTIAL: { bg: "#fef3c7", fg: "#a16207", label: "⚠ Partial" },
        NO_PAYMENT: { bg: "#f1f5f9", fg: "#64748b", label: "○ No Payment" },
      };
      const s = map[status] || map.NO_PAYMENT;
      return `<span style="display:inline-block;padding:3px 9px;border-radius:999px;background:${s.bg};color:${s.fg};font-size:9px;font-weight:600;letter-spacing:0.2px;white-space:nowrap;">${s.label}</span>`;
    };

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${settings?.name || "School"} — Fees Report</title>
  <style>
    @page { size: A4; margin: 14mm 12mm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      font-size: 10.5px;
      color: #1e293b;
      line-height: 1.45;
      background: white;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    /* HEADER */
    .header {
      display: flex;
      align-items: center;
      gap: 16px;
      padding-bottom: 14px;
      border-bottom: 3px solid #1e3a5f;
      margin-bottom: 18px;
    }
    .header-logo {
      width: 68px;
      height: 68px;
      object-fit: contain;
      flex-shrink: 0;
    }
    .header-logo-placeholder {
      width: 68px;
      height: 68px;
      background: #f1f5f9;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #94a3b8;
      font-size: 9px;
      font-weight: 600;
      flex-shrink: 0;
    }
    .header-content { flex: 1; min-width: 0; }
    .school-name {
      font-size: 19px;
      font-weight: 800;
      color: #1e3a5f;
      letter-spacing: -0.3px;
      line-height: 1.15;
    }
    .school-motto {
      font-size: 10.5px;
      color: #64748b;
      font-style: italic;
      margin-top: 2px;
    }
    .report-title {
      font-size: 12px;
      font-weight: 600;
      color: #334155;
      margin-top: 6px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .header-meta {
      text-align: right;
      font-size: 9.5px;
      color: #64748b;
      line-height: 1.6;
      white-space: nowrap;
    }
    .header-meta strong { color: #1e3a5f; font-weight: 700; }

    /* FILTER CHIPS */
    .filter-row {
      display: flex;
      gap: 8px;
      margin-bottom: 18px;
      flex-wrap: wrap;
    }
    .chip {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      background: #eff6ff;
      color: #1e40af;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 9.5px;
      font-weight: 600;
      border: 1px solid #dbeafe;
    }
    .chip-label { color: #64748b; font-weight: 500; }

    /* SECTION */
    .section { margin-bottom: 22px; page-break-inside: avoid; }
    .section-title {
      font-size: 12px;
      font-weight: 700;
      color: #1e3a5f;
      padding-left: 10px;
      border-left: 4px solid #1e3a5f;
      margin-bottom: 12px;
      letter-spacing: 0.3px;
    }

    /* STAT CARDS */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      margin-bottom: 14px;
    }
    .stat-card {
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 12px 14px;
      background: #ffffff;
    }
    .stat-label {
      font-size: 9px;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 5px;
    }
    .stat-value {
      font-size: 22px;
      font-weight: 800;
      line-height: 1;
      letter-spacing: -0.5px;
    }
    .stat-value.green { color: #16a34a; }
    .stat-value.red { color: #dc2626; }
    .stat-value.blue { color: #1e3a5f; }
    .stat-value.amber { color: #ca8a04; }
    .stat-value.slate { color: #475569; }
    .stat-sub {
      font-size: 9px;
      color: #94a3b8;
      margin-top: 4px;
    }

    /* MONEY CARDS */
    .money-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
      margin-bottom: 14px;
    }
    .money-card {
      border-radius: 10px;
      padding: 12px 14px;
      border: 1px solid;
    }
    .money-card.collected { background: #f0fdf4; border-color: #bbf7d0; }
    .money-card.outstanding { background: #fef2f2; border-color: #fecaca; }
    .money-card.required { background: #eff6ff; border-color: #bfdbfe; }
    .money-label {
      font-size: 9px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }
    .money-card.collected .money-label { color: #15803d; }
    .money-card.outstanding .money-label { color: #b91c1c; }
    .money-card.required .money-label { color: #1e40af; }
    .money-value {
      font-size: 17px;
      font-weight: 800;
      letter-spacing: -0.3px;
    }
    .money-card.collected .money-value { color: #15803d; }
    .money-card.outstanding .money-value { color: #b91c1c; }
    .money-card.required .money-value { color: #1e3a5f; }

    /* PROGRESS */
    .progress-wrap { margin-top: 8px; }
    .progress-track {
      height: 6px;
      background: #e2e8f0;
      border-radius: 999px;
      overflow: hidden;
      margin-top: 4px;
    }
    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #22c55e 0%, #16a34a 100%);
      border-radius: 999px;
    }
    .progress-text {
      display: flex;
      justify-content: space-between;
      font-size: 9px;
      color: #64748b;
      margin-top: 4px;
    }
    .progress-text strong { color: #1e3a5f; }

    /* TABLES */
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 9.5px;
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid #e2e8f0;
    }
    thead th {
      background: #1e3a5f;
      color: #ffffff;
      font-size: 8.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 9px 8px;
      text-align: left;
      white-space: nowrap;
    }
    thead th.right { text-align: right; }
    thead th.center { text-align: center; }
    tbody td {
      padding: 8px;
      border-top: 1px solid #f1f5f9;
      vertical-align: middle;
    }
    tbody tr:nth-child(even) td { background: #f8fafc; }
    tbody td.right { text-align: right; }
    tbody td.center { text-align: center; }
    tbody td.mono {
      font-family: 'Courier New', monospace;
      font-size: 9px;
      color: #475569;
    }
    tbody td.bold { font-weight: 700; color: #1e293b; }
    tbody td.green { color: #16a34a; font-weight: 600; }
    tbody td.red { color: #dc2626; font-weight: 600; }
    tbody td.slate { color: #64748b; }
    tbody td.muted { color: #94a3b8; }

    /* FOOTER */
    .footer {
      margin-top: 24px;
      padding-top: 12px;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      font-size: 8.5px;
      color: #94a3b8;
    }
    .footer strong { color: #1e3a5f; font-weight: 700; }

    .empty-state {
      padding: 24px;
      text-align: center;
      color: #94a3b8;
      font-size: 10px;
      border: 1px dashed #e2e8f0;
      border-radius: 8px;
    }

    @media print {
      body { padding: 0; }
      .section { page-break-inside: avoid; }
      table { page-break-inside: auto; }
      tr { page-break-inside: avoid; page-break-after: auto; }
    }
  </style>
</head>
<body>

  <!-- HEADER -->
  <div class="header">
    ${
      logoUrl
        ? `<img src="${logoUrl}" alt="Logo" class="header-logo" />`
        : `<div class="header-logo-placeholder">LOGO</div>`
    }
    <div class="header-content">
      <div class="school-name">${settings?.name || "School Fees Report"}</div>
      ${settings?.motto ? `<div class="school-motto">"${settings.motto}"</div>` : ""}
      <div class="report-title">School Fees Collection Report</div>
    </div>
    <div class="header-meta">
      <div>Generated on</div>
      <div><strong>${today}</strong></div>
      <div style="margin-top:6px;">Academic Year</div>
      <div><strong>${filters.academicYear}</strong></div>
    </div>
  </div>

  <!-- FILTER CHIPS -->
  <div class="filter-row">
    <div class="chip"><span class="chip-label">Term:</span> ${termText}</div>
    <div class="chip"><span class="chip-label">Class:</span> ${classLabel}</div>
    <div class="chip"><span class="chip-label">Students:</span> ${report.summary.totalStudents}</div>
  </div>

  <!-- SECTION 1 -->
  <div class="section">
    <div class="section-title">1. Overview</div>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-label">Total Students</div>
        <div class="stat-value blue">${report.summary.totalStudents}</div>
        <div class="stat-sub">Enrolled this term</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Paid in Full</div>
        <div class="stat-value green">${report.summary.paidFull}</div>
        <div class="stat-sub">${report.summary.totalStudents > 0 ? Math.round((report.summary.paidFull / report.summary.totalStudents) * 100) : 0}% of students</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Partial Payment</div>
        <div class="stat-value amber">${report.summary.partial}</div>
        <div class="stat-sub">Paying but not cleared</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Debtors</div>
        <div class="stat-value red">${report.summary.debtors}</div>
        <div class="stat-sub">With balance owing</div>
      </div>
    </div>

    <div class="money-grid">
      <div class="money-card collected">
        <div class="money-label">Total Collected</div>
        <div class="money-value">MWK ${report.summary.totalCollected.toLocaleString()}</div>
      </div>
      <div class="money-card outstanding">
        <div class="money-label">Total Outstanding</div>
        <div class="money-value">MWK ${report.summary.totalOutstanding.toLocaleString()}</div>
      </div>
      <div class="money-card required">
        <div class="money-label">Total Required</div>
        <div class="money-value">MWK ${report.summary.totalRequired.toLocaleString()}</div>
      </div>
    </div>

    <div class="progress-wrap">
      <div class="progress-track">
        <div class="progress-fill" style="width:${collectionPct}%"></div>
      </div>
      <div class="progress-text">
        <span><strong>${collectionPct}%</strong> collected</span>
        <span>Target: <strong>MWK ${report.summary.totalRequired.toLocaleString()}</strong></span>
      </div>
    </div>
  </div>

  <!-- SECTION 2 -->
  <div class="section">
    <div class="section-title">2. Summary by Class</div>
    ${
      report.classSummary.length === 0
        ? `<div class="empty-state">No classes to report.</div>`
        : `<table>
            <thead>
              <tr>
                <th>Class</th>
                <th class="center">Students</th>
                <th class="center">Paid Full</th>
                <th class="center">Partial</th>
                <th class="center">Debtors</th>
                <th class="right">Collected</th>
                <th class="right">Outstanding</th>
              </tr>
            </thead>
            <tbody>
              ${report.classSummary
                .map(
                  (c: any) => `
                <tr>
                  <td class="bold">${c.className}</td>
                  <td class="center">${c.totalStudents}</td>
                  <td class="center green">${c.paidFull}</td>
                  <td class="center" style="color:#ca8a04;font-weight:600;">${c.partial}</td>
                  <td class="center ${c.debtors > 0 ? "red" : "muted"}">${c.debtors}</td>
                  <td class="right green">MWK ${c.totalCollected.toLocaleString()}</td>
                  <td class="right ${c.totalOutstanding > 0 ? "red" : "green"}">
                    ${c.totalOutstanding > 0 ? `MWK ${c.totalOutstanding.toLocaleString()}` : "✓ Clear"}
                  </td>
                </tr>
              `,
                )
                .join("")}
            </tbody>
          </table>`
    }
  </div>

  <!-- SECTION 3 -->
  <div class="section">
    <div class="section-title">3. Detailed Student List</div>
    ${
      report.rows.length === 0
        ? `<div class="empty-state">No student records found for the selected filters.</div>`
        : `<table>
            <thead>
              <tr>
                <th>Student</th>
                <th>Student ID</th>
                <th>Class</th>
                <th>Parent / Guardian</th>
                <th class="right">Required</th>
                <th class="right">Paid</th>
                <th class="right">Balance</th>
                <th class="center">Status</th>
              </tr>
            </thead>
            <tbody>
              ${report.rows
                .map(
                  (r: any) => `
                <tr>
                  <td class="bold">${r.fullName}</td>
                  <td class="mono">${r.studentCode}</td>
                  <td class="slate">${r.className}</td>
                  <td>
                    <div style="font-weight:600;color:#334155;">${r.parentName}</div>
                    <div style="font-size:8.5px;color:#94a3b8;">${r.parentPhone}</div>
                  </td>
                  <td class="right slate">
                    ${r.requiredAmount ? `MWK ${r.requiredAmount.toLocaleString()}` : "—"}
                  </td>
                  <td class="right green">MWK ${r.totalPaid.toLocaleString()}</td>
                  <td class="right ${r.balance > 0 ? "red" : "green"}">
                    ${
                      r.balance === null
                        ? "—"
                        : r.balance > 0
                          ? `MWK ${r.balance.toLocaleString()}`
                          : "✓ Clear"
                    }
                  </td>
                  <td class="center">${badgeFor(r.paymentStatus)}</td>
                </tr>
              `,
                )
                .join("")}
            </tbody>
          </table>`
    }
  </div>

  <!-- FOOTER -->
  <div class="footer">
    <div>
      <strong>${settings?.name || "SchoolPay Malawi"}</strong> &nbsp;·&nbsp; Confidential Report &nbsp;·&nbsp; Generated by SchoolPay
    </div>
    <div>
      ${today} &nbsp;·&nbsp; ${termText} &nbsp;·&nbsp; ${filters.academicYear}
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

      {/* History banner */}
      {generatedFromHistory && (
        <div className="flex items-center gap-2.5 bg-blue-50 border border-blue-200 rounded-xl p-3">
          <History size={15} className="text-blue-700 shrink-0" />
          <p className="text-xs text-blue-800">
            Viewing historical report for{" "}
            <span className="font-semibold">
              {termLabel(filters.term)} • {filters.academicYear}
            </span>
            . Change the filters below to view a different term.
          </p>
          <button
            onClick={() => setGeneratedFromHistory(false)}
            className="ml-auto text-xs text-blue-700 font-medium hover:text-blue-900"
          >
            Dismiss
          </button>
        </div>
      )}

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
              placeholder="eg. 2025-2026"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              Term
            </label>
            <Select
              value={filters.term || "ALL"}
              onValueChange={(v) =>
                setFilters({ ...filters, term: v === "ALL" ? "" : v })
              }
            >
              <SelectTrigger className="w-full bg-transparent border-gray-200 rounded-lg text-sm h-[42px]">
                <SelectValue placeholder="All Terms" />
              </SelectTrigger>
              <SelectContent className="bg-white w-auto min-w-[140px]">
                {termOptions.map((t) => (
                  <SelectItem
                    key={t.value || "ALL"}
                    value={t.value || "ALL"}
                    className={ITEM_CLASS}
                  >
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              Class
            </label>
            <Select
              value={filters.classId || "ALL"}
              onValueChange={(v) =>
                setFilters({ ...filters, classId: v === "ALL" ? "" : v })
              }
            >
              <SelectTrigger className="w-full bg-transparent border-gray-200 rounded-lg text-sm h-[42px]">
                <SelectValue placeholder="All Classes" />
              </SelectTrigger>
              <SelectContent className="bg-white w-auto min-w-[140px]">
                <SelectItem value="ALL" className={ITEM_CLASS}>
                  All Classes
                </SelectItem>
                {classes.map((c: any) => (
                  <SelectItem key={c.id} value={c.id} className={ITEM_CLASS}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <button
              onClick={generateReport}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-[var(--color-primary)] text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-[var(--color-primary-dark)] disabled:opacity-40 transition-colors"
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
                <Users size={16} className="text-[var(--color-primary)]" />
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
            Report generated on {new Date().toLocaleString("en-GB")} •{" "}
            {settings?.name || "SchoolPay Malawi"}
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
