import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Download,
  Upload,
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileSpreadsheet,
  Users,
  AlertTriangle,
} from "lucide-react";
import * as XLSX from "xlsx";
import api from "../../lib/axios";
import { useActiveTerm } from "../../hooks/useActiveTerm";

const BulkImport = () => {
  const navigate = useNavigate();
  const { academicYear } = useActiveTerm();

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [, setShowTemplateHint] = useState(false);

  const downloadTemplate = () => {
    const headers = [
      "First Name",
      "Middle Name",
      "Last Name",
      "Date of Birth",
      "Gender",
      "Class",
      "Student Type",
      "Parent Name",
      "Parent Phone",
      "Parent Phone 2",
      "Parent Email",
      "Academic Year",
    ];

    const sample = [
      "John",
      "Peter",
      "Phiri",
      "2010-05-15",
      "MALE",
      "Form 1",
      "DAY",
      "Mr. Peter Phiri",
      "0995049331",
      "0882781932",
      "parent@example.com",
      academicYear || "2026-2027",
    ];

    const wsData = XLSX.utils.aoa_to_sheet([headers, sample]);
    wsData["!cols"] = [
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 14 },
      { wch: 10 },
      { wch: 10 },
      { wch: 14 },
      { wch: 20 },
      { wch: 15 },
      { wch: 15 },
      { wch: 25 },
      { wch: 14 },
    ];

    const instructions = [
      ["BULK STUDENT IMPORT INSTRUCTIONS"],
      [""],
      [" IMPORTANT:"],
      ["Delete the sample row (John Peter Phiri) BEFORE adding your own data."],
      ["Do NOT keep the sample row in the file — the system will reject it."],
      [""],
      [
        "1. Do not change or delete the column headers in the 'Students' sheet.",
      ],
      [
        "2. Do NOT create an ID column. Student IDs are generated automatically.",
      ],
      ["3. Date of Birth must be YYYY-MM-DD format (e.g., 2010-05-15)."],
      ["4. Gender must be exactly 'MALE' or 'FEMALE'."],
      [
        "5. Class must match the exact class name in the system (e.g., 'Form 1').",
      ],
      ["6. Student Type must be 'DAY' or 'BOARDING'."],
      [
        "7. Parent Phone should be a valid Malawi number (e.g., 0995049331 or +265995049331).",
      ],
      ["8. Middle Name, Parent Phone 2, and Parent Email are optional."],
      ["9. Academic Year is optional — defaults to school's active year."],
    ];
    const wsInstructions = XLSX.utils.aoa_to_sheet(instructions);
    wsInstructions["!cols"] = [{ wch: 95 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsData, "Students");
    XLSX.utils.book_append_sheet(wb, wsInstructions, "Instructions");

    XLSX.writeFile(wb, "Student_Import_Template.xlsx");
  };

  //  Detect if the user forgot to delete the sample row
  const containsSampleRow = (rows: any[]) => {
    return rows.some((r: any) => {
      const fn = String(r.data?.firstName || "")
        .trim()
        .toLowerCase();
      const ln = String(r.data?.lastName || "")
        .trim()
        .toLowerCase();
      const mn = String(r.data?.middleName || "")
        .trim()
        .toLowerCase();
      return fn === "john" && ln === "phiri" && (mn === "peter" || mn === "");
    });
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setError("");
    setPreview(null);
    setResult(null);
    setShowTemplateHint(false);

    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", f);
      const res = await api.post("/students/bulk/preview", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const data = res.data.data;
      setPreview(data);

      //  Enforce: reject if sample row is present
      if (containsSampleRow(data.rows || [])) {
        setError(
          " The sample row 'John Peter Phiri' is still in your file. " +
            "Please delete it, save the file, and re-upload. " +
            "The system will not import the sample row.",
        );
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to read file");
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!file) return;
    if (containsSampleRow(preview?.rows || [])) {
      setError("Delete the sample row before importing.");
      return;
    }
    setImporting(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await api.post("/students/bulk/import", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setResult(res.data.data);
      setPreview(null);
    } catch (err: any) {
      setError(err.response?.data?.message || "Import failed");
      if (err.response?.data?.data?.rows) {
        setPreview(err.response.data.data);
      }
    } finally {
      setImporting(false);
    }
  };

  const resetAll = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setError("");
    setShowTemplateHint(false);
  };

  // ============ SUCCESS SCREEN ============
  if (result) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100 text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={32} className="text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-1">
            Import Complete
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            {result.created.length} student
            {result.created.length !== 1 ? "s" : ""} added successfully
            {result.failed?.length ? `, ${result.failed.length} failed` : ""}
          </p>

          <div className="text-left bg-gray-50 rounded-xl p-4 max-h-64 overflow-y-auto mb-6">
            {result.created.map((c: any) => (
              <div
                key={c.row}
                className="flex items-center justify-between py-1.5 text-sm border-b border-gray-100 last:border-0"
              >
                <span className="text-gray-700">{c.fullName}</span>
                <span className="font-mono text-xs text-gray-500">
                  {c.studentCode}
                </span>
              </div>
            ))}
          </div>

          {result.failed?.length > 0 && (
            <div className="text-left bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
              <p className="text-xs font-semibold text-red-700 uppercase mb-2">
                Failed rows
              </p>
              {result.failed.map((f: any) => (
                <p key={f.row} className="text-xs text-red-600">
                  Row {f.row}: {f.error}
                </p>
              ))}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={resetAll}
              className="flex-1 border border-gray-300 text-gray-700 py-3 rounded-lg text-sm hover:bg-gray-50"
            >
              Import Another File
            </button>
            <button
              onClick={() => navigate("/students")}
              className="flex-1 bg-[var(--color-primary)] text-white py-3 rounded-lg text-sm font-medium hover:bg-[var(--color-primary-dark)]"
            >
              View All Students
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ============ MAIN SCREEN ============
  const sampleRowDetected = containsSampleRow(preview?.rows || []);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate("/students")}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft size={20} className="text-gray-600" />
        </button>
        <div>
          <h2 className="text-lg font-semibold text-gray-800">
            Bulk Import Students
          </h2>
          <p className="text-sm text-gray-500">
            Upload an Excel file to add many students at once
          </p>
        </div>
      </div>

      {/* 🎯 Template hint banner */}
      {!file && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
          <FileSpreadsheet
            size={18}
            className="text-blue-600 shrink-0 mt-0.5"
          />
          <div className="flex-1">
            <p className="text-sm font-semibold text-blue-900">
              Don&apos;t have a file yet?
            </p>
            <p className="text-xs text-blue-700 mt-0.5">
              Download the template below, fill it with your students, then
              upload it here.
            </p>
            <button
              onClick={downloadTemplate}
              className="mt-2 inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition"
            >
              <Download size={13} />
              Download Template
            </button>
          </div>
        </div>
      )}

      {/* Upload */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <label className="flex flex-col items-center justify-center w-full h-44 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-light)] transition-all">
          {loading ? (
            <>
              <Loader2
                size={28}
                className="animate-spin text-[var(--color-primary)] mb-2"
              />
              <p className="text-sm text-gray-500">Reading file…</p>
            </>
          ) : (
            <>
              <Upload size={28} className="text-gray-400 mb-2" />
              <p className="text-sm font-medium text-gray-700">
                {file ? file.name : "Click to upload your Excel file"}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {file
                  ? "Click to choose a different file"
                  : "Accepted format: .xlsx or .xls"}
              </p>
            </>
          )}
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFile}
            className="hidden"
            disabled={loading}
          />
        </label>

        {file && !loading && (
          <div className="mt-3 flex items-center justify-between">
            <p className="text-xs text-gray-500">
              📄 {file.name} ({(file.size / 1024).toFixed(1)} KB)
            </p>
            <button
              onClick={downloadTemplate}
              className="text-xs text-[var(--color-primary)] hover:underline flex items-center gap-1"
            >
              <Download size={11} /> Download template again
            </button>
          </div>
        )}
      </div>

      {/* Top-level error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-start gap-2">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Sample row warning (extra visual emphasis) */}
      {sampleRowDetected && preview && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle size={20} className="text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-900">
              Sample row detected
            </p>
            <p className="text-xs text-amber-800 mt-1">
              Your file still contains <strong>John Peter Phiri</strong> — this
              is just a sample from the template. Open the file, delete that
              row, save it, and re-upload.
            </p>
          </div>
        </div>
      )}

      {/* Preview */}
      {preview && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <FileSpreadsheet
                size={16}
                className="text-[var(--color-primary)]"
              />
              <h3 className="text-sm font-semibold text-gray-800">
                Preview — {preview.totalRows} rows
              </h3>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1 text-green-700">
                <CheckCircle size={12} /> {preview.validCount} valid
              </span>
              {preview.errorCount > 0 && (
                <span className="flex items-center gap-1 text-red-700">
                  <XCircle size={12} /> {preview.errorCount} with errors
                </span>
              )}
            </div>
          </div>

          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100 sticky top-0">
                <tr className="text-left text-gray-500">
                  <th className="px-4 py-2 text-[11px] font-medium uppercase w-16">
                    Row
                  </th>
                  <th className="px-4 py-2 text-[11px] font-medium uppercase">
                    Student
                  </th>
                  <th className="px-4 py-2 text-[11px] font-medium uppercase">
                    Class
                  </th>
                  <th className="px-4 py-2 text-[11px] font-medium uppercase">
                    Parent Phone
                  </th>
                  <th className="px-4 py-2 text-[11px] font-medium uppercase">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {preview.rows.map((r: any) => {
                  const fullName = [
                    r.data.firstName,
                    r.data.middleName,
                    r.data.lastName,
                  ]
                    .filter(Boolean)
                    .join(" ");
                  const isSample =
                    String(r.data?.firstName || "").toLowerCase() === "john" &&
                    String(r.data?.lastName || "").toLowerCase() === "phiri";
                  return (
                    <tr
                      key={r.rowNumber}
                      className={!r.valid || isSample ? "bg-red-50/40" : ""}
                    >
                      <td className="px-4 py-2 text-xs font-mono text-gray-400">
                        {r.rowNumber}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-800">
                        {fullName || (
                          <span className="text-gray-300 italic">—</span>
                        )}
                        {isSample && (
                          <span className="ml-2 text-[10px] font-semibold uppercase text-red-600 bg-red-100 px-1.5 py-0.5 rounded">
                            Sample
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-xs text-gray-600">
                        {r.data.className || "—"}
                      </td>
                      <td className="px-4 py-2 text-xs font-mono text-gray-600">
                        {r.data.parentPhone || "—"}
                      </td>
                      <td className="px-4 py-2">
                        {isSample ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 font-medium">
                            <AlertTriangle size={12} /> Delete this row
                          </span>
                        ) : r.valid ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-green-700 font-medium">
                            <CheckCircle size={12} /> Ready
                          </span>
                        ) : (
                          <div>
                            <span className="inline-flex items-center gap-1 text-[11px] text-red-700 font-medium">
                              <XCircle size={12} /> Error
                            </span>
                            <ul className="text-[10px] text-red-600 mt-0.5 space-y-0.5">
                              {r.errors.map((e: string, i: number) => (
                                <li key={i}>• {e}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Action bar */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between flex-wrap gap-3">
            <p className="text-xs text-gray-500">
              {sampleRowDetected
                ? "Delete the sample row and re-upload."
                : preview.errorCount > 0
                  ? "Fix the errors in the sheet, then re-upload."
                  : "Everything looks good. Ready to import."}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={resetAll}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-white"
              >
                Choose Another File
              </button>
              <button
                onClick={handleImport}
                disabled={
                  importing || preview.errorCount > 0 || sampleRowDetected
                }
                className="flex items-center gap-2 bg-[var(--color-primary)] text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-[var(--color-primary-dark)] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {importing ? (
                  <>
                    <Loader2 size={14} className="animate-spin" /> Importing…
                  </>
                ) : (
                  <>
                    <Users size={14} /> Import {preview.validCount} Students
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BulkImport;
