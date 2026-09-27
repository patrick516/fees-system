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
  RefreshCw,
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

  const downloadTemplate = () => {
    const headers = [
      "First Name",
      "Middle Name",
      "Last Name",
      "Date of Birth",
      "Gender",
      "Class",
      "Parent Name",
      "Parent Phone",
      "Parent Phone 2",
      "Parent Email",
      "Academic Year",
    ];
    const sample = [
      "John",
      "",
      "Banda",
      "2010-03-15",
      "MALE",
      "Form 1",
      "Mary Banda",
      "995049331",
      "",
      "parent@email.com",
      academicYear || "2026-2027",
    ];
    const notes = [
      "Instructions:",
      "1. Fill one row per student. Do not change the header row.",
      "2. Date of Birth must be YYYY-MM-DD (e.g. 2010-03-15).",
      "3. Gender must be MALE or FEMALE.",
      "4. Class must exactly match a class in your system (e.g. Form 1, Form 4).",
      "5. Parent Phone: type the 9-digit number (e.g. 995049331). +265 is added automatically.",
      "6. Middle Name, Parent Phone 2, Parent Email are optional.",
      "7. Academic Year is optional — defaults to the school's active year.",
      "8. Delete this notes column and the sample row before uploading.",
    ];

    const ws = XLSX.utils.aoa_to_sheet([
      headers,
      sample,
      [],
      notes.map((n) => [n]),
    ]);
    ws["!cols"] = headers.map(() => ({ wch: 18 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Students");
    XLSX.writeFile(wb, "student-import-template.xlsx");
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setError("");
    setPreview(null);
    setResult(null);

    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", f);
      const res = await api.post("/students/bulk/preview", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setPreview(res.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to read file");
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!file) return;
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

      {/* Step 1 — Template */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
            <span className="text-sm font-bold text-blue-700">1</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800">
              Download the template
            </p>
            <p className="text-xs text-gray-500">
              Fill it in, then come back and upload it
            </p>
          </div>
        </div>
        <button
          onClick={downloadTemplate}
          className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50"
        >
          <Download size={15} />
          Download Template
        </button>
      </div>

      {/* Step 2 — Upload */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
            <span className="text-sm font-bold text-blue-700">2</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800">
              Upload the filled file
            </p>
            <p className="text-xs text-gray-500">
              We'll check every row before saving anything
            </p>
          </div>
        </div>

        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-light)] transition-all">
          {loading ? (
            <>
              <Loader2
                size={24}
                className="animate-spin text-[var(--color-primary)] mb-2"
              />
              <p className="text-sm text-gray-500">Reading file…</p>
            </>
          ) : (
            <>
              <Upload size={24} className="text-gray-400 mb-2" />
              <p className="text-sm font-medium text-gray-600">
                {file ? file.name : "Click to choose an .xlsx file"}
              </p>
              <p className="text-xs text-gray-400 mt-1">Excel files only</p>
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
      </div>

      {/* Top-level error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-start gap-2">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>{error}</span>
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
                  return (
                    <tr
                      key={r.rowNumber}
                      className={r.valid ? "" : "bg-red-50/40"}
                    >
                      <td className="px-4 py-2 text-xs font-mono text-gray-400">
                        {r.rowNumber}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-800">
                        {fullName || (
                          <span className="text-gray-300 italic">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-xs text-gray-600">
                        {r.data.className || "—"}
                      </td>
                      <td className="px-4 py-2 text-xs font-mono text-gray-600">
                        {r.data.parentPhone || "—"}
                      </td>
                      <td className="px-4 py-2">
                        {r.valid ? (
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
              {preview.errorCount > 0
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
                disabled={importing || preview.errorCount > 0}
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

      {/* Empty tips */}
      {!preview && !loading && !file && (
        <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 flex items-start gap-3">
          <RefreshCw size={15} className="text-gray-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-gray-700 mb-1">
              Before you upload
            </p>
            <ul className="text-xs text-gray-500 space-y-0.5 list-disc list-inside">
              <li>Use the template we provide — don't build your own</li>
              <li>Class names must match exactly (Form 1, Form 4, etc.)</li>
              <li>Dates in YYYY-MM-DD format (2010-03-15)</li>
              <li>
                Phone numbers can be 995049331 or +265995049331 — either works
              </li>
              <li>Delete the sample row and instructions before uploading</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default BulkImport;
