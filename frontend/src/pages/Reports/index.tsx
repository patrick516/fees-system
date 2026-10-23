import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
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
  Calendar,
  TrendingUp,
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
  const { academicYear: activeYear } = useActiveTerm();

  // Tab State
  const [activeTab, setActiveTab] = useState<
    "fees" | "ageing" | "daily" | "financial"
  >("fees");

  // Shared Filters
  const [filters, setFilters] = useState({
    term: "",
    classId: "",
    academicYear: getCurrentAcademicYear(),
  });

  // Daily Report Dates
  const [dailyDates, setDailyDates] = useState({
    from: new Date().toISOString().split("T")[0],
    to: new Date().toISOString().split("T")[0],
  });

  // Report States
  const [report, setReport] = useState<any>(null);
  const [dailyReport, setDailyReport] = useState<any>(null);

  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [generatedFromHistory, setGeneratedFromHistory] = useState(false);

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

  // Reset when changing tabs
  useEffect(() => {
    setGenerated(false);
    setReport(null);
    setDailyReport(null);
  }, [activeTab]);

  const generateReport = async () => {
    setLoading(true);
    setGenerated(false);
    try {
      let endpoint = "/reports/fees";
      let params = new URLSearchParams({ academicYear: filters.academicYear });

      if (activeTab === "fees") {
        if (filters.term) params.set("term", filters.term);
        if (filters.classId) params.set("classId", filters.classId);
      } else if (activeTab === "ageing") {
        endpoint = "/reports/ageing";
      } else if (activeTab === "daily") {
        endpoint = "/reports/daily";
        params = new URLSearchParams({
          from: dailyDates.from,
          to: dailyDates.to,
        });
      } else if (activeTab === "financial") {
        endpoint = "/reports/financial";
      }

      const res = await api.get(`${endpoint}?${params}`);

      if (activeTab === "daily") {
        setDailyReport(res.data.data);
      } else {
        setReport(res.data.data);
      }
      setGenerated(true);
    } catch (err) {
      console.error("Failed to generate report");
    } finally {
      setLoading(false);
    }
  };

  // Handle URL params for History
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
    setActiveTab("fees");

    // We need a small delay to let the state update before generating
    setTimeout(() => generateReport(), 100);
    setSearchParams({}, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ==================== EXPORT TO EXCEL ====================
  const exportToExcel = () => {
    if (!report) return;
    const wb = XLSX.utils.book_new();

    // SHEET 1: SUMMARY
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
      ["FINANCIAL SUMMARY"],
      ["Total Required", report.summary.totalRequired],
      ["Gross Collected (Parents)", report.summary.totalCollected],
      ["Processing Fees (OneKhusa)", report.summary.totalFees || 0],
      [
        "Net Collected (To Bank)",
        report.summary.totalNetCollected || report.summary.totalCollected,
      ],
      ["Total Outstanding", report.summary.totalOutstanding],
    ];
    const ws1 = XLSX.utils.aoa_to_sheet(summaryData);
    ws1["!cols"] = [{ wch: 30 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, ws1, "Summary");

    // SHEET 2: BY CLASS
    const classHeaders = [
      "Class",
      "Students",
      "Paid Full",
      "Partial",
      "No Payment",
      "Debtors",
      "Gross Collected",
      "Fees",
      "Net Collected",
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
      c.totalFees || 0,
      c.totalNetCollected || c.totalCollected,
      c.totalOutstanding,
    ]);
    const ws2 = XLSX.utils.aoa_to_sheet([classHeaders, ...classRows]);
    ws2["!cols"] = classHeaders.map(() => ({ wch: 18 }));
    XLSX.utils.book_append_sheet(wb, ws2, "By Class");

    // SHEET 3: STUDENT DETAILS
    const detailHeaders = [
      "Student ID",
      "Full Name",
      "Class",
      "Parent Name",
      "Parent Phone",
      "Required (MWK)",
      "Gross Paid (MWK)",
      "Fees (MWK)",
      "Net Paid (MWK)",
      "Balance (MWK)",
      "Status",
      "Last Payment Date",
    ];
    const detailRows = report.rows.map((r: any) => [
      r.studentCode,
      r.fullName,
      r.className,
      r.parentName,
      r.parentPhone,
      r.requiredAmount || 0,
      r.totalPaid,
      r.platformFee || 0,
      r.netAmount || r.totalPaid,
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
      { wch: 20 },
      { wch: 16 },
      { wch: 16 },
      { wch: 16 },
      { wch: 12 },
      { wch: 16 },
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

  // ==================== EXPORT TO PDF ====================
  const exportToPDF = () => {
    if (!report) return;

    const brand = settings?.primaryColor || "#1e3a5f";
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
    @page { size: A4 landscape; margin: 12mm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 10px; color: #1e293b; line-height: 1.45; background: white; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .header { display: flex; align-items: center; gap: 16px; padding-bottom: 14px; border-bottom: 3px solid ${brand}; margin-bottom: 18px; }
    .header-logo { width: 68px; height: 68px; object-fit: contain; flex-shrink: 0; }
    .header-logo-placeholder { width: 68px; height: 68px; background: #f1f5f9; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: #94a3b8; font-size: 9px; font-weight: 600; flex-shrink: 0; }
    .header-content { flex: 1; min-width: 0; }
    .school-name { font-size: 19px; font-weight: 800; color: ${brand}; line-height: 1.15; }
    .school-motto { font-size: 10.5px; color: #64748b; font-style: italic; margin-top: 2px; }
    .report-title { font-size: 12px; font-weight: 600; color: #334155; margin-top: 6px; text-transform: uppercase; letter-spacing: 1px; }
    .header-meta { text-align: right; font-size: 9.5px; color: #64748b; line-height: 1.6; white-space: nowrap; }
    .header-meta strong { color: ${brand}; font-weight: 700; }
    .filter-row { display: flex; gap: 8px; margin-bottom: 18px; flex-wrap: wrap; }
    .chip { display: inline-flex; align-items: center; gap: 5px; background: #eff6ff; color: ${brand}; padding: 4px 10px; border-radius: 6px; font-size: 9.5px; font-weight: 600; border: 1px solid #dbeafe; }
    .chip-label { color: #64748b; font-weight: 500; }
    .section { margin-bottom: 22px; page-break-inside: avoid; }
    .section-title { font-size: 12px; font-weight: 700; color: ${brand}; padding-left: 10px; border-left: 4px solid ${brand}; margin-bottom: 12px; letter-spacing: 0.3px; }
    .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 14px; }
    .stat-card { border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px 14px; background: #ffffff; }
    .stat-label { font-size: 9px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 5px; }
    .stat-value { font-size: 22px; font-weight: 800; line-height: 1; letter-spacing: -0.5px; }
    .stat-value.green { color: #16a34a; }
    .stat-value.red { color: #dc2626; }
    .stat-value.blue { color: ${brand}; }
    .stat-value.amber { color: #ca8a04; }
    .stat-sub { font-size: 9px; color: #94a3b8; margin-top: 4px; }
    .money-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 14px; }
    .money-card { border-radius: 10px; padding: 12px 14px; border: 1px solid; }
    .money-card.collected { background: #f0fdf4; border-color: #bbf7d0; }
    .money-card.fees { background: #fef2f2; border-color: #fecaca; }
    .money-card.net { background: #eff6ff; border-color: #bfdbfe; }
    .money-card.outstanding { background: #fff7ed; border-color: #fed7aa; }
    .money-label { font-size: 9px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
    .money-card.collected .money-label { color: #15803d; }
    .money-card.fees .money-label { color: #b91c1c; }
    .money-card.net .money-label { color: ${brand}; }
    .money-card.outstanding .money-label { color: #c2410c; }
    .money-value { font-size: 17px; font-weight: 800; letter-spacing: -0.3px; }
    .money-card.collected .money-value { color: #15803d; }
    .money-card.fees .money-value { color: #b91c1c; }
    .money-card.net .money-value { color: ${brand}; }
    .money-card.outstanding .money-value { color: #c2410c; }
    .progress-wrap { margin-top: 8px; }
    .progress-track { height: 6px; background: #e2e8f0; border-radius: 999px; overflow: hidden; margin-top: 4px; }
    .progress-fill { height: 100%; background: linear-gradient(90deg, #22c55e 0%, #16a34a 100%); border-radius: 999px; }
    .progress-text { display: flex; justify-content: space-between; font-size: 9px; color: #64748b; margin-top: 4px; }
    .progress-text strong { color: ${brand}; }
    table { width: 100%; border-collapse: collapse; font-size: 9px; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0; }
    thead th { background: ${brand}; color: #ffffff; font-size: 8.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; padding: 9px 8px; text-align: left; white-space: nowrap; }
    thead th.right { text-align: right; }
    thead th.center { text-align: center; }
    tbody td { padding: 8px; border-top: 1px solid #f1f5f9; vertical-align: middle; }
    tbody tr:nth-child(even) td { background: #f8fafc; }
    tbody td.right { text-align: right; }
    tbody td.center { text-align: center; }
    tbody td.mono { font-family: 'Courier New', monospace; font-size: 9px; color: #475569; }
    tbody td.bold { font-weight: 700; color: #1e293b; }
    tbody td.green { color: #16a34a; font-weight: 600; }
    tbody td.red { color: #dc2626; font-weight: 600; }
    tbody td.slate { color: #64748b; }
    tbody td.muted { color: #94a3b8; }
    .footer { margin-top: 24px; padding-top: 12px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; font-size: 8.5px; color: #94a3b8; }
    .footer strong { color: ${brand}; font-weight: 700; }
    .empty-state { padding: 24px; text-align: center; color: #94a3b8; font-size: 10px; border: 1px dashed #e2e8f0; border-radius: 8px; }
    @media print { body { padding: 0; } .section { page-break-inside: avoid; } table { page-break-inside: auto; } tr { page-break-inside: avoid; page-break-after: auto; } }
  </style>
</head>
<body>
  <div class="header">
    ${logoUrl ? `<img src="${logoUrl}" alt="Logo" class="header-logo" />` : `<div class="header-logo-placeholder">LOGO</div>`}
    <div class="header-content">
      <div class="school-name">${settings?.name || "School Fees Report"}</div>
      ${settings?.motto ? `<div class="school-motto">"${settings.motto}"</div>` : ""}
      <div class="report-title">School Fees Collection & Transparency Report</div>
    </div>
    <div class="header-meta">
      <div>Generated on</div>
      <div><strong>${today}</strong></div>
      <div style="margin-top:6px;">Academic Year</div>
      <div><strong>${filters.academicYear}</strong></div>
    </div>
  </div>
  <div class="filter-row">
    <div class="chip"><span class="chip-label">Term:</span> ${termText}</div>
    <div class="chip"><span class="chip-label">Class:</span> ${classLabel}</div>
    <div class="chip"><span class="chip-label">Students:</span> ${report.summary.totalStudents}</div>
  </div>
  <div class="section">
    <div class="section-title">1. Overview & Financial Summary</div>
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-label">Total Students</div><div class="stat-value blue">${report.summary.totalStudents}</div><div class="stat-sub">Enrolled this term</div></div>
      <div class="stat-card"><div class="stat-label">Paid in Full</div><div class="stat-value green">${report.summary.paidFull}</div><div class="stat-sub">${report.summary.totalStudents > 0 ? Math.round((report.summary.paidFull / report.summary.totalStudents) * 100) : 0}% of students</div></div>
      <div class="stat-card"><div class="stat-label">Partial Payment</div><div class="stat-value amber">${report.summary.partial}</div><div class="stat-sub">Paying but not cleared</div></div>
      <div class="stat-card"><div class="stat-label">Debtors</div><div class="stat-value red">${report.summary.debtors}</div><div class="stat-sub">With balance owing</div></div>
    </div>
    <div class="money-grid">
      <div class="money-card collected"><div class="money-label">Gross Collected</div><div class="money-value">MWK ${report.summary.totalCollected.toLocaleString()}</div><div style="font-size:8px;color:#64748b;margin-top:4px;">Paid by parents</div></div>
      <div class="money-card fees"><div class="money-label">Processing Fees</div><div class="money-value">- MWK ${(report.summary.totalFees || 0).toLocaleString()}</div><div style="font-size:8px;color:#64748b;margin-top:4px;">OneKhusa deductions</div></div>
      <div class="money-card net"><div class="money-label">Net to Bank</div><div class="money-value">MWK ${(report.summary.totalNetCollected || report.summary.totalCollected).toLocaleString()}</div><div style="font-size:8px;color:#64748b;margin-top:4px;">Actual money received</div></div>
      <div class="money-card outstanding"><div class="money-label">Outstanding</div><div class="money-value">MWK ${report.summary.totalOutstanding.toLocaleString()}</div><div style="font-size:8px;color:#64748b;margin-top:4px;">Fees still owed</div></div>
    </div>
    <div class="progress-wrap">
      <div class="progress-track"><div class="progress-fill" style="width:${collectionPct}%"></div></div>
      <div class="progress-text"><span><strong>${collectionPct}%</strong> of required fees collected</span><span>Target: <strong>MWK ${report.summary.totalRequired.toLocaleString()}</strong></span></div>
    </div>
  </div>
  <div class="section">
    <div class="section-title">2. Summary by Class</div>
    ${
      report.classSummary.length === 0
        ? `<div class="empty-state">No classes to report.</div>`
        : `
      <table><thead><tr><th>Class</th><th class="center">Students</th><th class="center">Paid Full</th><th class="center">Partial</th><th class="center">Debtors</th><th class="right">Gross Collected</th><th class="right">Fees</th><th class="right">Net Collected</th><th class="right">Outstanding</th></tr></thead>
      <tbody>${report.classSummary
        .map(
          (c: any) => `
        <tr>
          <td class="bold">${c.className}</td><td class="center">${c.totalStudents}</td><td class="center green">${c.paidFull}</td><td class="center" style="color:#ca8a04;font-weight:600;">${c.partial}</td><td class="center ${c.debtors > 0 ? "red" : "muted"}">${c.debtors}</td><td class="right green">MWK ${c.totalCollected.toLocaleString()}</td><td class="right red">- MWK ${(c.totalFees || 0).toLocaleString()}</td><td class="right bold">MWK ${(c.totalNetCollected || c.totalCollected).toLocaleString()}</td><td class="right ${c.totalOutstanding > 0 ? "red" : "green"}">${c.totalOutstanding > 0 ? `MWK ${c.totalOutstanding.toLocaleString()}` : "✓ Clear"}</td>
        </tr>`,
        )
        .join("")}
      </tbody></table>`
    }
  </div>
  <div class="section">
    <div class="section-title">3. Detailed Student List</div>
    ${
      report.rows.length === 0
        ? `<div class="empty-state">No student records found for the selected filters.</div>`
        : `
      <table><thead><tr><th>Student</th><th>Class</th><th>Parent / Guardian</th><th class="right">Required</th><th class="right">Gross Paid</th><th class="right">Fees</th><th class="right">Net Paid</th><th class="right">Balance</th><th class="center">Status</th></tr></thead>
      <tbody>${report.rows
        .map(
          (r: any) => `
        <tr>
          <td><div class="bold">${r.fullName}</div><div class="mono" style="font-size:8px;">${r.studentCode}</div></td><td class="slate">${r.className}</td><td><div style="font-weight:600;color:#334155;">${r.parentName}</div><div style="font-size:8.5px;color:#94a3b8;">${r.parentPhone}</div></td><td class="right slate">${r.requiredAmount ? `MWK ${r.requiredAmount.toLocaleString()}` : "—"}</td><td class="right green">MWK ${r.totalPaid.toLocaleString()}</td><td class="right red">${r.platformFee ? `- MWK ${r.platformFee.toLocaleString()}` : "—"}</td><td class="right bold">MWK ${(r.netAmount || r.totalPaid).toLocaleString()}</td><td class="right ${r.balance > 0 ? "red" : "green"}">${r.balance === null ? "—" : r.balance > 0 ? `MWK ${r.balance.toLocaleString()}` : "✓ Clear"}</td>
          <td class="center">${badgeFor(r.paymentStatus)}</td>
        </tr>`,
        )
        .join("")}
      </tbody></table>`
    }
  </div>
  <div class="footer">
    <div><strong>${settings?.name || "SchoolPay Malawi"}</strong> &nbsp;·&nbsp; Confidential Report &nbsp;·&nbsp; Generated by SchoolPay</div>
    <div>${today} &nbsp;·&nbsp; ${termText} &nbsp;·&nbsp; ${filters.academicYear}</div>
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">
            Reports & Analytics
          </h2>
          <p className="text-sm text-gray-500">
            Generate transparent financial reports
          </p>
        </div>
        {generated && activeTab === "fees" && (
          <div className="flex items-center gap-2">
            <button
              onClick={exportToExcel}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
            >
              <FileSpreadsheet size={16} /> Export Excel
            </button>
            <button
              onClick={exportToPDF}
              className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
            >
              <FileText size={16} /> Export PDF
            </button>
          </div>
        )}
      </div>

      {/* TABS */}
      <div className="flex overflow-x-auto border-b border-gray-200">
        {[
          { id: "fees", label: "Fee Collection", icon: BarChart2 },
          { id: "ageing", label: "Debtor Ageing", icon: Clock },
          { id: "daily", label: "Daily Collections", icon: Calendar },
          { id: "financial", label: "Financial Statement", icon: TrendingUp },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? "border-[var(--color-primary)] text-[var(--color-primary)] bg-[var(--color-primary-light)]/20"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            }`}
          >
            <tab.icon size={16} /> {tab.label}
          </button>
        ))}
      </div>

      {/* History banner */}
      {generatedFromHistory && activeTab === "fees" && (
        <div className="flex items-center gap-2.5 bg-blue-50 border border-blue-200 rounded-xl p-3">
          <History
            size={15}
            className="text-[var(--color-primary-dark)] shrink-0"
          />
          <p className="text-xs text-blue-800">
            Viewing historical report for{" "}
            <span className="font-semibold">
              {termLabel(filters.term)} • {filters.academicYear}
            </span>
            . Change the filters below to view a different term.
          </p>
          <button
            onClick={() => setGeneratedFromHistory(false)}
            className="ml-auto text-xs text-[var(--color-primary-dark)] font-medium hover:text-[var(--color-primary)]"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
        <p className="text-sm font-medium text-gray-700 mb-4 flex items-center gap-2">
          <Filter size={16} className="text-gray-400" /> Report Filters
        </p>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {(activeTab === "fees" ||
            activeTab === "ageing" ||
            activeTab === "financial") && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Academic Year
              </label>
              <input
                value={filters.academicYear}
                onChange={(e) =>
                  setFilters({ ...filters, academicYear: e.target.value })
                }
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              />
            </div>
          )}

          {activeTab === "fees" && (
            <>
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
                  <SelectContent className="bg-white">
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
                  <SelectContent className="bg-white">
                    <SelectItem value="ALL" className={ITEM_CLASS}>
                      All Classes
                    </SelectItem>
                    {classes.map((c: any) => (
                      <SelectItem
                        key={c.id}
                        value={c.id}
                        className={ITEM_CLASS}
                      >
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {activeTab === "daily" && (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  From Date
                </label>
                <input
                  type="date"
                  value={dailyDates.from}
                  onChange={(e) =>
                    setDailyDates({ ...dailyDates, from: e.target.value })
                  }
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  To Date
                </label>
                <input
                  type="date"
                  value={dailyDates.to}
                  onChange={(e) =>
                    setDailyDates({ ...dailyDates, to: e.target.value })
                  }
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm"
                />
              </div>
            </>
          )}

          <div className="flex items-end">
            <button
              onClick={generateReport}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-[var(--color-primary)] text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-[var(--color-primary-dark)] disabled:opacity-40 transition-colors"
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <BarChart2 size={16} />
              )}
              {loading ? "Generating..." : "Generate Report"}
            </button>
          </div>
        </div>
      </div>

      {/* ==================== TAB CONTENT ==================== */}
      {generated && (
        <>
          {/* 1. FEE REPORT TAB (Original UI) */}
          {activeTab === "fees" && report && (
            <>
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
                          (report.summary.paidFull /
                            report.summary.totalStudents) *
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

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-green-50 border border-green-100 rounded-xl p-5">
                  <p className="text-xs text-gray-500 mb-1">Gross Collected</p>
                  <p className="text-xl font-bold text-green-600">
                    {formatMWK(report.summary.totalCollected)}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-1">
                    Paid by parents
                  </p>
                </div>
                <div className="bg-red-50 border border-red-100 rounded-xl p-5">
                  <p className="text-xs text-gray-500 mb-1">Processing Fees</p>
                  <p className="text-xl font-bold text-red-600">
                    - {formatMWK(report.summary.totalFees || 0)}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-1">
                    OneKhusa deductions
                  </p>
                </div>
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-5">
                  <p className="text-xs text-gray-500 mb-1">Net to Bank</p>
                  <p className="text-xl font-bold text-[var(--color-primary)]">
                    {formatMWK(
                      report.summary.totalNetCollected ||
                        report.summary.totalCollected,
                    )}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-1">
                    Actual money received
                  </p>
                </div>
                <div className="bg-orange-50 border border-orange-100 rounded-xl p-5">
                  <p className="text-xs text-gray-500 mb-1">Outstanding</p>
                  <p className="text-xl font-bold text-orange-600">
                    {formatMWK(report.summary.totalOutstanding)}
                  </p>
                  <div className="mt-2 bg-gray-200/50 rounded-full h-1.5">
                    <div
                      className="bg-green-500 h-1.5 rounded-full"
                      style={{
                        width: `${report.summary.totalRequired > 0 ? Math.min(100, (report.summary.totalCollected / report.summary.totalRequired) * 100) : 0}%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                  <h3 className="font-medium text-gray-800">
                    Summary by Class
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                          Class
                        </th>
                        <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                          Students
                        </th>
                        <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                          Paid Full
                        </th>
                        <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                          Gross
                        </th>
                        <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                          Fees
                        </th>
                        <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                          Net
                        </th>
                        <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                          Outstanding
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {report.classSummary.map((cls: any) => (
                        <tr key={cls.className} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-800">
                            {cls.className}
                          </td>
                          <td className="px-4 py-3 text-center text-gray-600">
                            {cls.totalStudents}
                          </td>
                          <td className="px-4 py-3 text-center text-green-600 font-medium">
                            {cls.paidFull}
                          </td>
                          <td className="px-4 py-3 text-right text-green-600 font-medium">
                            {formatMWK(cls.totalCollected)}
                          </td>
                          <td className="px-4 py-3 text-right text-red-600 font-medium">
                            - {formatMWK(cls.totalFees || 0)}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-gray-800">
                            {formatMWK(
                              cls.totalNetCollected || cls.totalCollected,
                            )}
                          </td>
                          <td className="px-4 py-3 text-right text-orange-600 font-medium">
                            {formatMWK(cls.totalOutstanding)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="font-medium text-gray-800">
                    Student Details
                    <span className="ml-2 text-xs text-gray-400 font-normal">
                      {report.rows.length} students
                    </span>
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                          Student
                        </th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                          Class
                        </th>
                        <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                          Required
                        </th>
                        <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                          Gross Paid
                        </th>
                        <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                          Fees
                        </th>
                        <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                          Net Paid
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
                            <p className="text-xs font-mono text-gray-400">
                              {row.studentCode}
                            </p>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {row.className}
                          </td>
                          <td className="px-4 py-3 text-right text-sm text-gray-600">
                            {row.requiredAmount
                              ? formatMWK(row.requiredAmount)
                              : "—"}
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-medium text-green-600">
                            {formatMWK(row.totalPaid)}
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-medium text-red-600">
                            {row.platformFee
                              ? `- ${formatMWK(row.platformFee)}`
                              : "—"}
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-bold text-gray-800">
                            {formatMWK(row.netAmount || row.totalPaid)}
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-medium">
                            {row.balance !== null ? (
                              row.balance === 0 ? (
                                <span className="text-green-600">✓ Clear</span>
                              ) : (
                                <span className="text-orange-600">
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
                              {statusLabels[row.paymentStatus] ||
                                row.paymentStatus}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* 2. DEBTOR AGEING TAB */}
          {activeTab === "ageing" && report && (
            <div className="space-y-6">
              <div className="bg-red-50 border border-red-100 rounded-xl p-5 flex items-center justify-between">
                <div>
                  <h3 className="text-red-800 font-bold text-lg">
                    Total Outstanding Debt
                  </h3>
                  <p className="text-red-600 text-sm mt-1">
                    Across {report.summary.totalDebtors} students
                  </p>
                </div>
                <p className="text-3xl font-extrabold text-red-600">
                  {formatMWK(report.summary.totalOwed)}
                </p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                        Student
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                        Parent Contact
                      </th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                        Term 1 Owed
                      </th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                        Term 2 Owed
                      </th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                        Term 3 Owed
                      </th>
                      <th className="text-right px-4 py-3 text-xs font-bold text-red-600 uppercase">
                        Total Owed
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {report.rows.map((r: any) => (
                      <tr key={r.studentId} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-gray-800">
                            {r.fullName}
                          </p>
                          <p className="text-xs text-gray-500">
                            {r.className} • {r.studentCode}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm text-gray-700">
                            {r.parentName}
                          </p>
                          <p className="text-xs text-gray-500">
                            {r.parentPhone}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-gray-600">
                          {r.term1 > 0 ? formatMWK(r.term1) : "—"}
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-gray-600">
                          {r.term2 > 0 ? formatMWK(r.term2) : "—"}
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-gray-600">
                          {r.term3 > 0 ? formatMWK(r.term3) : "—"}
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-bold text-red-600">
                          {formatMWK(r.totalOwed)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 3. DAILY COLLECTIONS TAB */}
          {activeTab === "daily" && dailyReport && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl p-4 border border-gray-100 text-center">
                  <p className="text-xs text-gray-500 uppercase font-semibold">
                    Cash Collected
                  </p>
                  <p className="text-xl font-bold text-gray-800 mt-1">
                    {formatMWK(dailyReport.totals.cash)}
                  </p>
                </div>
                <div className="bg-white rounded-xl p-4 border border-gray-100 text-center">
                  <p className="text-xs text-gray-500 uppercase font-semibold">
                    Mobile Money
                  </p>
                  <p className="text-xl font-bold text-gray-800 mt-1">
                    {formatMWK(dailyReport.totals.mobile)}
                  </p>
                </div>
                <div className="bg-white rounded-xl p-4 border border-gray-100 text-center">
                  <p className="text-xs text-gray-500 uppercase font-semibold">
                    Bank Transfers
                  </p>
                  <p className="text-xl font-bold text-gray-800 mt-1">
                    {formatMWK(dailyReport.totals.bank)}
                  </p>
                </div>
                <div className="bg-green-50 rounded-xl p-4 border border-green-200 text-center">
                  <p className="text-xs text-green-700 uppercase font-semibold">
                    Total Net
                  </p>
                  <p className="text-xl font-bold text-green-700 mt-1">
                    {formatMWK(dailyReport.totals.net)}
                  </p>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                        Date
                      </th>
                      <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                        Txns
                      </th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                        Cash
                      </th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                        Mobile
                      </th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                        Bank
                      </th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                        Gross
                      </th>
                      <th className="text-right px-4 py-3 text-xs font-bold text-green-600 uppercase">
                        Net to Bank
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {dailyReport.rows.map((r: any) => (
                      <tr key={r.date} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-800">
                          {new Date(r.date).toLocaleDateString("en-GB")}
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-gray-600">
                          {r.count}
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-gray-600">
                          {r.cash > 0 ? formatMWK(r.cash) : "—"}
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-gray-600">
                          {r.mobile > 0 ? formatMWK(r.mobile) : "—"}
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-gray-600">
                          {r.bank > 0 ? formatMWK(r.bank) : "—"}
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-medium text-gray-800">
                          {formatMWK(r.total)}
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-bold text-green-600">
                          {formatMWK(r.net)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 4. FINANCIAL STATEMENT TAB */}
          {activeTab === "financial" && report && (
            <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-sm border border-gray-100 p-8">
              <div className="text-center border-b border-gray-200 pb-6 mb-6">
                <h2 className="text-2xl font-bold text-gray-800">
                  {settings?.name || "School"}
                </h2>
                <p className="text-gray-500 font-medium mt-1">
                  Financial Statement (YTD) — {report.academicYear}
                </p>
              </div>
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-[var(--color-primary)] border-b border-gray-100 pb-2 mb-3">
                    1. Revenue & Collections
                  </h3>
                  <div className="flex justify-between py-2 text-sm text-gray-600">
                    <span>Total Expected Fees (Theoretical)</span>
                    <span className="font-medium">
                      {formatMWK(report.statement.totalExpected)}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 text-sm text-gray-600">
                    <span>Total Gross Collected</span>
                    <span className="font-medium text-green-600">
                      {formatMWK(report.statement.grossCollected)}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 text-sm text-gray-600">
                    <span>Less: OneKhusa Processing Fees</span>
                    <span className="font-medium text-red-500">
                      ({formatMWK(report.statement.platformFees)})
                    </span>
                  </div>
                  <div className="flex justify-between py-2 text-base font-bold text-gray-800 bg-gray-50 px-3 rounded-lg mt-2">
                    <span>Net Revenue (To School Bank)</span>
                    <span>{formatMWK(report.statement.netCollected)}</span>
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-orange-500 border-b border-gray-100 pb-2 mb-3">
                    2. Receivables (Outstanding)
                  </h3>
                  <div className="flex justify-between py-2 text-sm text-gray-600">
                    <span>Outstanding Balance from Parents</span>
                    <span className="font-bold text-orange-600">
                      {formatMWK(report.statement.outstanding)}
                    </span>
                  </div>
                  <div className="mt-4">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Collection Rate</span>
                      <span>{report.statement.collectionRate}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-[var(--color-primary)] h-2 rounded-full"
                        style={{ width: `${report.statement.collectionRate}%` }}
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-700 border-b border-gray-100 pb-2 mb-3">
                    3. Collections by Term
                  </h3>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                      <p className="text-xs text-blue-600 font-semibold uppercase">
                        Term 1
                      </p>
                      <p className="text-sm font-bold text-blue-800 mt-1">
                        {formatMWK(report.termBreakdown.TERM_1)}
                      </p>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                      <p className="text-xs text-blue-600 font-semibold uppercase">
                        Term 2
                      </p>
                      <p className="text-sm font-bold text-blue-800 mt-1">
                        {formatMWK(report.termBreakdown.TERM_2)}
                      </p>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                      <p className="text-xs text-blue-600 font-semibold uppercase">
                        Term 3
                      </p>
                      <p className="text-sm font-bold text-blue-800 mt-1">
                        {formatMWK(report.termBreakdown.TERM_3)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-8 text-center text-xs text-gray-400">
                <p>Generated on {new Date().toLocaleString("en-GB")}</p>
              </div>
            </div>
          )}
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
