import { useEffect, useState, useMemo } from "react";
import {
  Users,
  CheckCircle,
  XCircle,
  TrendingUp,
  Trophy,
  Loader2,
  FileSpreadsheet,
  FileText,
  BarChart3,
  AlertCircle,
} from "lucide-react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { useExamResults } from "../../hooks/useExamResults";
import { useClasses } from "../../hooks/useStudents";
import { useSchoolSettings } from "../../hooks/useSchoolSettings";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";

// ============ PASSING THRESHOLDS ============
const LETTER_PASS_MIN = 50; // Average mark >= 50% passes
const POINTS_PASS_MAX = 30; // Total points (best 6) <= 30 passes
const SUBJECT_PASS_MIN = 50; // Single subject pass mark

const ITEM_CLASS =
  "cursor-pointer mx-1 my-0.5 rounded-md pl-3 pr-7 focus:bg-gray-100 focus:text-gray-900 data-[highlighted]:bg-gray-100 data-[highlighted]:text-gray-900";

const termLabel = (t?: string | null) =>
  t ? t.replace("_", " ").replace("TERM", "Term") : "";

const AnalyticsTab = () => {
  const { getPeriods, getClassResults } = useExamResults();
  const { classes } = useClasses();
  const { settings } = useSchoolSettings();

  const [periods, setPeriods] = useState<any[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [gradingSystem, setGradingSystem] = useState<"POINTS" | "LETTER">(
    "POINTS",
  );
  const [loading, setLoading] = useState(false);
  const [loadingPeriods, setLoadingPeriods] = useState(true);

  // Load periods on mount
  useEffect(() => {
    (async () => {
      const p = await getPeriods();
      if (p.success && p.data.length > 0) {
        setPeriods(p.data);
        setSelectedPeriod(p.data[0].id);
      }
      setLoadingPeriods(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load class results when either selection changes
  useEffect(() => {
    if (!selectedClass || !selectedPeriod) {
      setResults([]);
      return;
    }
    setLoading(true);
    getClassResults(selectedClass, selectedPeriod)
      .then((res) => {
        if (res.success) {
          setResults(res.data || []);
          setGradingSystem(res.gradingSystem || "POINTS");
        } else {
          setResults([]);
        }
      })
      .catch(() => setResults([]))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClass, selectedPeriod]);

  const selectedClassObj = classes.find((c: any) => c.id === selectedClass);
  const selectedPeriodObj = periods.find((p) => p.id === selectedPeriod);

  // ============ COMPUTE ANALYTICS ============
  const analytics = useMemo(() => {
    if (results.length === 0) {
      return {
        total: 0,
        passed: 0,
        failed: 0,
        passRate: 0,
        top: [],
        subjectStats: [],
        classAverage: 0,
      };
    }

    // Which students passed
    const passedStudents = results.filter((r) => {
      if (gradingSystem === "LETTER") {
        return (r.averageMark || 0) >= LETTER_PASS_MIN;
      }
      return (r.totalPoints || 999) <= POINTS_PASS_MAX;
    });

    // Subject aggregation
    const subjectMap = new Map<
      string,
      { marks: number[]; passCount: number }
    >();
    for (const row of results) {
      for (const s of row.subjects || []) {
        if (!subjectMap.has(s.subject)) {
          subjectMap.set(s.subject, { marks: [], passCount: 0 });
        }
        const entry = subjectMap.get(s.subject)!;
        entry.marks.push(s.mark);
        if (s.mark >= SUBJECT_PASS_MIN) entry.passCount++;
      }
    }

    const subjectStats = Array.from(subjectMap.entries()).map(
      ([subject, { marks, passCount }]) => {
        const total = marks.reduce((a, b) => a + b, 0);
        return {
          subject,
          avg: marks.length ? Math.round((total / marks.length) * 10) / 10 : 0,
          high: marks.length ? Math.max(...marks) : 0,
          low: marks.length ? Math.min(...marks) : 0,
          passRate: marks.length
            ? Math.round((passCount / marks.length) * 100)
            : 0,
          sat: marks.length,
        };
      },
    );

    // Sort subject stats alphabetically
    subjectStats.sort((a, b) => a.subject.localeCompare(b.subject));

    // Class average
    let classAverage = 0;
    if (gradingSystem === "LETTER") {
      const total = results.reduce((s, r) => s + (r.averageMark || 0), 0);
      classAverage = Math.round((total / results.length) * 10) / 10;
    } else {
      const total = results.reduce((s, r) => s + (r.totalPoints || 0), 0);
      classAverage = Math.round((total / results.length) * 10) / 10;
    }

    return {
      total: results.length,
      passed: passedStudents.length,
      failed: results.length - passedStudents.length,
      passRate: Math.round((passedStudents.length / results.length) * 100),
      top: results.slice(0, 5), // already sorted by backend
      subjectStats,
      classAverage,
    };
  }, [results, gradingSystem]);

  // ============ EXPORTS ============
  const exportToExcel = () => {
    if (results.length === 0) return;

    const wb = XLSX.utils.book_new();

    // Sheet 1 — Summary
    const summaryData = [
      [settings?.name || "School"],
      ["EXAM RESULTS ANALYTICS"],
      [],
      ["Exam Period", selectedPeriodObj?.name || ""],
      ["Term", termLabel(selectedPeriodObj?.term)],
      ["Academic Year", selectedPeriodObj?.academicYear || ""],
      ["Class", selectedClassObj?.name || ""],
      ["Grading System", gradingSystem],
      [],
      ["SUMMARY"],
      ["Total Students", analytics.total],
      ["Passed", analytics.passed],
      ["Failed", analytics.failed],
      ["Pass Rate", `${analytics.passRate}%`],
      [
        gradingSystem === "LETTER"
          ? "Class Average (%)"
          : "Class Average (Points)",
        analytics.classAverage,
      ],
      [],
      [
        "Pass Threshold",
        gradingSystem === "LETTER"
          ? `Average ≥ ${LETTER_PASS_MIN}%`
          : `Total Points ≤ ${POINTS_PASS_MAX}`,
      ],
    ];
    const ws1 = XLSX.utils.aoa_to_sheet(summaryData);
    ws1["!cols"] = [{ wch: 22 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(wb, ws1, "Summary");

    // Sheet 2 — Rankings
    const headers =
      gradingSystem === "LETTER"
        ? [
            "Position",
            "Student ID",
            "Full Name",
            "Average %",
            "Grade",
            "Pass/Fail",
          ]
        : ["Position", "Student ID", "Full Name", "Total Points", "Pass/Fail"];
    const rows = results.map((r) => {
      const passed =
        gradingSystem === "LETTER"
          ? (r.averageMark || 0) >= LETTER_PASS_MIN
          : (r.totalPoints || 999) <= POINTS_PASS_MAX;
      if (gradingSystem === "LETTER") {
        return [
          r.position,
          r.studentCode,
          r.fullName,
          r.averageMark,
          r.overallGrade,
          passed ? "Pass" : "Fail",
        ];
      }
      return [
        r.position,
        r.studentCode,
        r.fullName,
        r.totalPoints,
        passed ? "Pass" : "Fail",
      ];
    });
    const ws2 = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    ws2["!cols"] = headers.map(() => ({ wch: 18 }));
    XLSX.utils.book_append_sheet(wb, ws2, "Rankings");

    // Sheet 3 — Subject Performance
    const subHeaders = [
      "Subject",
      "Students",
      "Average %",
      "Pass Rate %",
      "Highest",
      "Lowest",
    ];
    const subRows = analytics.subjectStats.map((s) => [
      s.subject,
      s.sat,
      s.avg,
      s.passRate,
      s.high,
      s.low,
    ]);
    const ws3 = XLSX.utils.aoa_to_sheet([subHeaders, ...subRows]);
    ws3["!cols"] = subHeaders.map(() => ({ wch: 16 }));
    XLSX.utils.book_append_sheet(wb, ws3, "Subject Performance");

    const fileName = `Analytics_${selectedClassObj?.name || "Class"}_${selectedPeriodObj?.name || "Period"}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    saveAs(blob, fileName);
  };

  const exportToPDF = () => {
    if (results.length === 0) return;

    // School's brand color — CSS vars don't work in a separate window,
    // so we inject the real hex into the PDF CSS.
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

    const isPoints = gradingSystem === "POINTS";

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Exam Analytics — ${selectedClassObj?.name || ""}</title>
  <style>
    @page { size: A4; margin: 14mm 12mm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 10.5px; color: #1e293b; line-height: 1.45; -webkit-print-color-adjust: exact; print-color-adjust: exact; }

    .header { display: flex; align-items: center; gap: 16px; padding-bottom: 14px; border-bottom: 3px solid ${brand}; margin-bottom: 18px; }
    .header-logo { width: 68px; height: 68px; object-fit: contain; flex-shrink: 0; }
    .header-logo-placeholder { width: 68px; height: 68px; background: #f1f5f9; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: #94a3b8; font-size: 9px; font-weight: 600; }
    .school-name { font-size: 19px; font-weight: 800; color: ${brand}; letter-spacing: -0.3px; }
    .report-title { font-size: 12px; font-weight: 600; color: #334155; margin-top: 6px; text-transform: uppercase; letter-spacing: 1px; }
    .header-meta { text-align: right; font-size: 9.5px; color: #64748b; line-height: 1.6; white-space: nowrap; }
    .header-meta strong { color: ${brand}; }

    .chips { display: flex; gap: 8px; margin-bottom: 18px; flex-wrap: wrap; }
    .chip { background: #eff6ff; color: ${brand}; padding: 4px 10px; border-radius: 6px; font-size: 9.5px; font-weight: 600; border: 1px solid #dbeafe; }
    .chip-label { color: #64748b; font-weight: 500; }

    .section-title { font-size: 12px; font-weight: 700; color: ${brand}; padding-left: 10px; border-left: 4px solid ${brand}; margin-bottom: 12px; }

    .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px; }
    .stat-card { border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px 14px; background: #fff; }
    .stat-label { font-size: 9px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 5px; }
    .stat-value { font-size: 22px; font-weight: 800; line-height: 1; }
    .stat-value.blue { color: ${brand}; }
    .stat-value.green { color: #16a34a; }
    .stat-value.red { color: #dc2626; }
    .stat-value.amber { color: #ca8a04; }

    .top-list { margin-bottom: 20px; }
    .top-row { display: flex; align-items: center; gap: 10px; padding: 8px 12px; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 6px; }
    .top-row.first { background: #fefce8; border-color: #fde68a; }
    .medal { font-size: 16px; }
    .top-name { flex: 1; font-weight: 600; color: #1e293b; }
    .top-value { font-weight: 700; color: #16a34a; }

    table { width: 100%; border-collapse: collapse; font-size: 9.5px; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0; margin-bottom: 16px; }
    thead th { background: ${brand}; color: #fff; font-size: 8.5px; font-weight: 700; text-transform: uppercase; padding: 9px 8px; text-align: left; }
    thead th.right { text-align: right; }
    thead th.center { text-align: center; }
    tbody td { padding: 8px; border-top: 1px solid #f1f5f9; }
    tbody tr:nth-child(even) td { background: #f8fafc; }
    tbody td.right { text-align: right; }
    tbody td.center { text-align: center; }
    tbody td.bold { font-weight: 700; }
    tbody td.green { color: #16a34a; font-weight: 600; }
    tbody td.red { color: #dc2626; font-weight: 600; }
    tbody td.mono { font-family: 'Courier New', monospace; font-size: 9px; }

    .footer { margin-top: 24px; padding-top: 12px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; font-size: 8.5px; color: #94a3b8; }
    .footer strong { color: ${brand}; }
  </style>
</head>
<body>

  <div class="header">
    ${logoUrl ? `<img src="${logoUrl}" class="header-logo" />` : `<div class="header-logo-placeholder">LOGO</div>`}
    <div style="flex:1;">
      <div class="school-name">${settings?.name || "School"}</div>
      <div class="report-title">Exam Results Analytics</div>
    </div>
    <div class="header-meta">
      <div>Generated on</div>
      <div><strong>${today}</strong></div>
    </div>
  </div>

  <div class="chips">
    <div class="chip"><span class="chip-label">Exam:</span> ${selectedPeriodObj?.name || ""}</div>
    <div class="chip"><span class="chip-label">Term:</span> ${termLabel(selectedPeriodObj?.term)} ${selectedPeriodObj?.academicYear || ""}</div>
    <div class="chip"><span class="chip-label">Class:</span> ${selectedClassObj?.name || ""}</div>
    <div class="chip"><span class="chip-label">Grading:</span> ${gradingSystem}</div>
  </div>

  <div class="section-title">1. Summary</div>
  <div class="stats-grid">
    <div class="stat-card">
      <div class="stat-label">Students</div>
      <div class="stat-value blue">${analytics.total}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Passed</div>
      <div class="stat-value green">${analytics.passed}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Failed</div>
      <div class="stat-value red">${analytics.failed}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Pass Rate</div>
      <div class="stat-value amber">${analytics.passRate}%</div>
    </div>
  </div>

  <div class="section-title">2. Top 5 Performers</div>
  <div class="top-list">
    ${analytics.top
      .map((s: any, i: number) => {
        const medal =
          i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`;
        const value = isPoints ? `${s.totalPoints} pts` : `${s.averageMark}%`;
        return `<div class="top-row ${i === 0 ? "first" : ""}"><span class="medal">${medal}</span><span class="top-name">${s.fullName}</span><span class="top-value">${value}</span></div>`;
      })
      .join("")}
  </div>

  <div class="section-title">3. Subject Performance</div>
  <table>
    <thead>
      <tr>
        <th>Subject</th>
        <th class="center">Students</th>
        <th class="right">Average %</th>
        <th class="right">Pass Rate</th>
        <th class="right">Highest</th>
        <th class="right">Lowest</th>
      </tr>
    </thead>
    <tbody>
      ${analytics.subjectStats
        .map(
          (s: any) => `
        <tr>
          <td class="bold">${s.subject}</td>
          <td class="center">${s.sat}</td>
          <td class="right">${s.avg}%</td>
          <td class="right ${s.passRate >= 50 ? "green" : "red"}">${s.passRate}%</td>
          <td class="right">${s.high}%</td>
          <td class="right">${s.low}%</td>
        </tr>
      `,
        )
        .join("")}
    </tbody>
  </table>

  <div class="section-title">4. Full Class Rankings</div>
  <table>
    <thead>
      <tr>
        <th class="center">Pos</th>
        <th>Student ID</th>
        <th>Student Name</th>
        ${
          isPoints
            ? `<th class="right">Total Points</th><th class="center">Result</th>`
            : `<th class="right">Average</th><th class="center">Grade</th><th class="center">Result</th>`
        }
      </tr>
    </thead>
    <tbody>
      ${results
        .map((r: any) => {
          const passed = isPoints
            ? (r.totalPoints || 999) <= POINTS_PASS_MAX
            : (r.averageMark || 0) >= LETTER_PASS_MIN;
          const badgeClass = passed ? "green" : "red";
          const badgeLabel = passed ? "Pass" : "Fail";
          return `
        <tr>
          <td class="center bold">${r.position}</td>
          <td class="mono">${r.studentCode}</td>
          <td class="bold">${r.fullName}</td>
          ${
            isPoints
              ? `<td class="right">${r.totalPoints}</td><td class="center ${badgeClass}">${badgeLabel}</td>`
              : `<td class="right">${r.averageMark}%</td><td class="center">${r.overallGrade}</td><td class="center ${badgeClass}">${badgeLabel}</td>`
          }
        </tr>
      `;
        })
        .join("")}
    </tbody>
  </table>

  <div class="footer">
    <div><strong>${settings?.name || "SchoolPay"}</strong> · Confidential Report · Generated by SchoolPay</div>
    <div>${today} · ${selectedClassObj?.name || ""}</div>
  </div>

</body>
</html>`;

    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 600);
  };

  // ============ RENDER ============
  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-xl">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              Exam Period
            </label>
            {loadingPeriods ? (
              <div className="h-[40px] bg-gray-50 rounded-lg animate-pulse" />
            ) : periods.length === 0 ? (
              <p className="text-xs text-gray-400 py-2">No exam periods yet</p>
            ) : (
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="w-full bg-transparent border-gray-300 rounded-lg text-sm h-[40px]">
                  <SelectValue placeholder="Select exam period" />
                </SelectTrigger>
                <SelectContent className="bg-white w-auto min-w-[200px]">
                  {periods.map((p) => (
                    <SelectItem key={p.id} value={p.id} className={ITEM_CLASS}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              Class
            </label>
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger className="w-full bg-transparent border-gray-300 rounded-lg text-sm h-[40px]">
                <SelectValue placeholder="Select class" />
              </SelectTrigger>
              <SelectContent className="bg-white w-auto min-w-[160px]">
                {classes.map((c: any) => (
                  <SelectItem key={c.id} value={c.id} className={ITEM_CLASS}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Empty states */}
      {!selectedClass || !selectedPeriod ? (
        <div className="bg-white rounded-xl p-12 text-center shadow-sm border border-gray-100">
          <BarChart3 size={40} className="mx-auto mb-2 text-gray-200" />
          <p className="text-sm text-gray-500 font-medium">
            Choose an exam period and class to see analytics
          </p>
        </div>
      ) : loading ? (
        <div className="bg-white rounded-xl p-12 text-center shadow-sm border border-gray-100">
          <Loader2
            size={24}
            className="mx-auto animate-spin text-[var(--color-primary)]"
          />
          <p className="text-xs text-gray-400 mt-2">Loading analytics…</p>
        </div>
      ) : results.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center shadow-sm border border-gray-100">
          <AlertCircle size={32} className="mx-auto mb-2 text-gray-300" />
          <p className="text-sm text-gray-500 font-medium">
            No results uploaded for this class yet
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Upload the exam sheet in the Upload & Manage tab first
          </p>
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] text-gray-500 font-medium uppercase tracking-wide">
                  Students
                </p>
                <Users size={14} className="text-gray-400" />
              </div>
              <p className="text-2xl font-bold text-gray-800">
                {analytics.total}
              </p>
              <p className="text-[11px] text-gray-400 mt-1">
                Sat {selectedPeriodObj?.name}
              </p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-green-100">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] text-green-700 font-medium uppercase tracking-wide">
                  Passed
                </p>
                <CheckCircle size={14} className="text-green-500" />
              </div>
              <p className="text-2xl font-bold text-green-600">
                {analytics.passed}
              </p>
              <p className="text-[11px] text-gray-400 mt-1">
                {gradingSystem === "LETTER"
                  ? `Avg ≥ ${LETTER_PASS_MIN}%`
                  : `Points ≤ ${POINTS_PASS_MAX}`}
              </p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-red-100">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] text-red-700 font-medium uppercase tracking-wide">
                  Failed
                </p>
                <XCircle size={14} className="text-red-500" />
              </div>
              <p className="text-2xl font-bold text-red-600">
                {analytics.failed}
              </p>
              <p className="text-[11px] text-gray-400 mt-1">Below threshold</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-amber-100">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] text-amber-700 font-medium uppercase tracking-wide">
                  Pass Rate
                </p>
                <TrendingUp size={14} className="text-amber-500" />
              </div>
              <p className="text-2xl font-bold text-amber-600">
                {analytics.passRate}%
              </p>
              <p className="text-[11px] text-gray-400 mt-1">
                Class avg {analytics.classAverage}
                {gradingSystem === "LETTER" ? "%" : " pts"}
              </p>
            </div>
          </div>

          {/* Top Performers */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
              <Trophy size={15} className="text-yellow-500" />
              <h3 className="text-sm font-semibold text-gray-800">
                Top 5 Performers
              </h3>
            </div>
            <div className="divide-y divide-gray-50">
              {analytics.top.map((s: any, i: number) => {
                const medal =
                  i === 0
                    ? "🥇"
                    : i === 1
                      ? "🥈"
                      : i === 2
                        ? "🥉"
                        : `${i + 1}.`;
                const value =
                  gradingSystem === "LETTER"
                    ? `${s.averageMark}%`
                    : `${s.totalPoints} pts`;
                const grade = s.overallGrade;
                return (
                  <div
                    key={s.studentId}
                    className={`px-5 py-3 flex items-center gap-3 ${
                      i === 0 ? "bg-yellow-50/50" : ""
                    }`}
                  >
                    <span className="text-lg w-8 text-center shrink-0">
                      {medal}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">
                        {s.fullName}
                      </p>
                      <p className="text-[11px] text-gray-400 font-mono">
                        {s.studentCode}
                      </p>
                    </div>
                    {gradingSystem === "LETTER" && grade && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-semibold shrink-0">
                        {grade}
                      </span>
                    )}
                    <span className="text-sm font-bold text-green-600 shrink-0 ml-2">
                      {value}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Subject Performance */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
              <BarChart3 size={15} className="text-[var(--color-primary)]" />
              <h3 className="text-sm font-semibold text-gray-800">
                Subject Performance
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr className="text-left text-gray-500">
                    <th className="px-5 py-2.5 text-[11px] font-medium uppercase">
                      Subject
                    </th>
                    <th className="px-4 py-2.5 text-[11px] font-medium uppercase text-center">
                      Sat
                    </th>
                    <th className="px-4 py-2.5 text-[11px] font-medium uppercase text-right">
                      Avg
                    </th>
                    <th className="px-4 py-2.5 text-[11px] font-medium uppercase text-right">
                      Pass Rate
                    </th>
                    <th className="px-4 py-2.5 text-[11px] font-medium uppercase text-right">
                      High
                    </th>
                    <th className="px-4 py-2.5 text-[11px] font-medium uppercase text-right">
                      Low
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {analytics.subjectStats.map((s) => (
                    <tr key={s.subject} className="hover:bg-gray-50">
                      <td className="px-5 py-3 font-medium text-gray-800">
                        {s.subject}
                      </td>
                      <td className="px-4 py-3 text-center text-gray-600">
                        {s.sat}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-700">
                        {s.avg}%
                      </td>
                      <td
                        className={`px-4 py-3 text-right font-medium ${
                          s.passRate >= 50 ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {s.passRate}%
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600">
                        {s.high}%
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600">
                        {s.low}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Export */}
          <div className="flex gap-2 justify-end">
            <button
              onClick={exportToExcel}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
            >
              <FileSpreadsheet size={15} />
              Export Excel
            </button>
            <button
              onClick={exportToPDF}
              className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
            >
              <FileText size={15} />
              Export PDF
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default AnalyticsTab;
