import { useState, useEffect } from "react";
import {
  Upload,
  Plus,
  Loader2,
  Save,
  Pencil,
  X,
  Trophy,
  AlertTriangle,
  Check,
  Eye,
  FileSpreadsheet,
  Star,
  RefreshCw,
} from "lucide-react";
import { useExamResults } from "../../hooks/useExamResults";
import { useClasses } from "../../hooks/useStudents";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getCurrentAcademicYear } from "../../lib/utils";
import { useActiveTerm } from "../../hooks/useActiveTerm";
import AnalyticsTab from "./AnalyticsTab";

const defaultPointsBoundaries = [
  { minPercent: 80, maxPercent: 100, gradePoint: 1, gradeLabel: "" },
  { minPercent: 70, maxPercent: 79, gradePoint: 2, gradeLabel: "" },
  { minPercent: 60, maxPercent: 69, gradePoint: 3, gradeLabel: "" },
  { minPercent: 50, maxPercent: 59, gradePoint: 4, gradeLabel: "" },
  { minPercent: 40, maxPercent: 49, gradePoint: 5, gradeLabel: "" },
  { minPercent: 30, maxPercent: 39, gradePoint: 6, gradeLabel: "" },
  { minPercent: 20, maxPercent: 29, gradePoint: 7, gradeLabel: "" },
  { minPercent: 10, maxPercent: 19, gradePoint: 8, gradeLabel: "" },
  { minPercent: 0, maxPercent: 9, gradePoint: 9, gradeLabel: "" },
];

const defaultLetterBoundaries = [
  { minPercent: 80, maxPercent: 100, gradeLabel: "A" },
  { minPercent: 70, maxPercent: 79, gradeLabel: "B" },
  { minPercent: 60, maxPercent: 69, gradeLabel: "C" },
  { minPercent: 50, maxPercent: 59, gradeLabel: "D" },
  { minPercent: 0, maxPercent: 49, gradeLabel: "F" },
];

const ResultsPage = () => {
  const [activeTab, setActiveTab] = useState<"upload" | "analytics">("upload");
  const {
    getPeriods,
    createPeriod,
    togglePeriodActive,
    getGradeBoundaries,
    setGradeBoundaries,
    uploadResults,
    uploading,
    getClassResults,
    getPendingRows,
    resolvePendingRow,
    discardPendingRow,
    getUploadSummary,
  } = useExamResults();
  const { classes } = useClasses();

  const [periods, setPeriods] = useState<any[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState(
    () => localStorage.getItem("results_selectedPeriod") || "",
  );

  const [reuploadMode, setReuploadMode] = useState(false);
  const [showReuploadConfirm, setShowReuploadConfirm] = useState(false);

  // Summary of all classes for selected period
  const [uploadSummary, setUploadSummary] = useState<any[]>([]);
  const [loadingSummary, setLoadingSummary] = useState(false);

  // Selected class to view/upload
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [classResults, setClassResults] = useState<any[]>([]);
  const [resultsGradingSystem, setResultsGradingSystem] = useState<
    "POINTS" | "LETTER"
  >("POINTS");
  const [loadingResults, setLoadingResults] = useState(false);
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);

  const [boundarySystem, setBoundarySystem] = useState<"POINTS" | "LETTER">(
    "POINTS",
  );
  const [pointsBoundaries, setPointsBoundaries] = useState<any[]>(
    defaultPointsBoundaries,
  );
  const [letterBoundaries, setLetterBoundaries] = useState<any[]>(
    defaultLetterBoundaries,
  );
  const [editingBoundaries, setEditingBoundaries] = useState(false);

  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [savingBoundaries, setSavingBoundaries] = useState(false);
  const [pendingRows, setPendingRows] = useState<any[]>([]);
  const [resolvingRowId, setResolvingRowId] = useState<string | null>(null);

  // 🎯 Warn if English was missing from upload
  const [englishMissingWarning, setEnglishMissingWarning] = useState(false);

  const boundaries =
    boundarySystem === "POINTS" ? pointsBoundaries : letterBoundaries;
  const setBoundaries =
    boundarySystem === "POINTS" ? setPointsBoundaries : setLetterBoundaries;

  const selectedClassObj = classes.find((c: any) => c.id === selectedClass);

  const { academicYear: activeYear, activeTerm: currentTerm } = useActiveTerm();

  const [newPeriod, setNewPeriod] = useState({
    name: "",
    term: "TERM_1",
    academicYear: getCurrentAcademicYear(),
    examType: "END_TERM",
  });

  useEffect(() => {
    if (activeYear)
      setNewPeriod((prev) => ({ ...prev, academicYear: activeYear }));
    if (currentTerm) setNewPeriod((prev) => ({ ...prev, term: currentTerm }));
  }, [activeYear, currentTerm]);

  const loadBoundaries = async (system: "POINTS" | "LETTER") => {
    const b = await getGradeBoundaries(system);
    if (b.success && b.data.length > 0) {
      if (system === "POINTS") setPointsBoundaries(b.data);
      else setLetterBoundaries(b.data);
    }
  };

  useEffect(() => {
    (async () => {
      const p = await getPeriods();
      if (p.success) setPeriods(p.data);

      await loadBoundaries("POINTS");
      await loadBoundaries("LETTER");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When period changes, fetch the summary of uploads
  useEffect(() => {
    if (!selectedPeriod) {
      setUploadSummary([]);
      setSelectedClass(null);
      return;
    }
    localStorage.setItem("results_selectedPeriod", selectedPeriod);

    (async () => {
      setLoadingSummary(true);
      const res = await getUploadSummary(selectedPeriod);
      if (res.success) setUploadSummary(res.data || []);
      setLoadingSummary(false);

      // If a class was previously selected, refresh its results
      if (selectedClass) {
        handleViewClass(selectedClass);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPeriod]);

  const handleBoundaryChange = (index: number, field: any, value: string) => {
    const updated = [...boundaries];
    updated[index] = { ...updated[index], [field]: value };
    setBoundaries(updated);
  };

  const handleSaveBoundaries = async () => {
    setSavingBoundaries(true);
    const res = await setGradeBoundaries(boundaries, boundarySystem);
    setMessage(res.success ? "Grade boundaries saved" : res.message);
    setSavingBoundaries(false);
    if (res.success) setEditingBoundaries(false);
  };

  const handleCreatePeriod = async () => {
    const res = await createPeriod(newPeriod);
    if (res.success) {
      setPeriods([res.data, ...periods]);
      setMessage("Exam period created");
    }
  };

  const handleToggleActive = async (id: string, current: boolean) => {
    const res = await togglePeriodActive(id, !current);
    if (res.success) {
      setPeriods(periods.map((p) => (p.id === id ? res.data : p)));
    }
  };

  const handleUpload = async () => {
    if (!file || !selectedClass || !selectedPeriod) {
      setMessage("Select a class, exam period, and file first");
      return;
    }
    const res = await uploadResults(file, selectedClass, selectedPeriod);
    setMessage(res.message || (res.success ? "Uploaded" : "Upload failed"));

    if (res.success) {
      // 🎯 Check if English was missing (backend sends this flag)
      if (res.data?.englishIncluded === false) {
        setEnglishMissingWarning(true);
      } else {
        setEnglishMissingWarning(false);
      }

      setFile(null);
      setReuploadMode(false);
      handleViewClass(selectedClass); // Refresh rankings
      loadPendingRows(selectedClass); // Refresh pending

      // Refresh the summary table
      const sumRes = await getUploadSummary(selectedPeriod);
      if (sumRes.success) setUploadSummary(sumRes.data || []);
    }
  };

  const loadPendingRows = async (classId: string) => {
    if (!classId || !selectedPeriod) return;
    const res = await getPendingRows(classId, selectedPeriod);
    if (res.success) setPendingRows(res.data);
  };

  const handleResolvePendingRow = async (
    pendingRowId: string,
    studentId: string,
  ) => {
    setResolvingRowId(pendingRowId);
    const res = await resolvePendingRow(pendingRowId, studentId);
    if (res.success) {
      setPendingRows(pendingRows.filter((r) => r.id !== pendingRowId));
      handleViewClass(selectedClass!);
    } else {
      setMessage(res.message || "Failed to resolve");
    }
    setResolvingRowId(null);
  };

  const handleDiscardPendingRow = async (pendingRowId: string) => {
    const res = await discardPendingRow(pendingRowId);
    if (res.success)
      setPendingRows(pendingRows.filter((r) => r.id !== pendingRowId));
  };

  const handleViewClass = async (classId: string) => {
    setSelectedClass(classId);
    setReuploadMode(false);
    setEnglishMissingWarning(false);
    setLoadingResults(true);
    setExpandedStudent(null);

    const res = await getClassResults(classId, selectedPeriod);
    if (res.success) {
      setClassResults(res.data);
      setResultsGradingSystem(res.gradingSystem || "POINTS");

      // 🎯 Check if any student has englishIncluded: false
      const anyMissingEnglish = res.data?.some(
        (r: any) => r.englishIncluded === false,
      );
      if (anyMissingEnglish && res.gradingSystem === "POINTS") {
        setEnglishMissingWarning(true);
      }
    }
    setLoadingResults(false);

    loadPendingRows(classId);
  };

  // 🎯 Confirms re-upload after showing beautiful modal
  const confirmReupload = () => {
    setShowReuploadConfirm(false);
    setReuploadMode(true);
  };

  // 🎯 Get current class summary for reupload modal
  const currentSummary = uploadSummary.find((s) => s.classId === selectedClass);

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="flex gap-1 border-b border-gray-200">
        <button
          onClick={() => setActiveTab("upload")}
          className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
            activeTab === "upload"
              ? "border-[var(--color-primary)] text-[var(--color-primary)]"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Upload & Manage
        </button>
        <button
          onClick={() => setActiveTab("analytics")}
          className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
            activeTab === "analytics"
              ? "border-[var(--color-primary)] text-[var(--color-primary)]"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Analytics
        </button>
      </div>

      <div className={activeTab === "analytics" ? "" : "hidden"}>
        <AnalyticsTab />
      </div>

      <div className={activeTab === "upload" ? "space-y-6" : "hidden"}>
        <div>
          <h2 className="text-lg font-semibold text-gray-800">Exam Results</h2>
          <p className="text-sm text-gray-500">
            Create exam periods, set grade boundaries, upload marks per class,
            and control when parents see results
          </p>
        </div>

        {/* Grade Boundaries */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <h3 className="font-medium text-gray-800">Grade Boundaries</h3>
              <div className="flex bg-gray-100 rounded-lg p-0.5">
                <button
                  onClick={() => {
                    setBoundarySystem("POINTS");
                    setEditingBoundaries(false);
                  }}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${boundarySystem === "POINTS" ? "bg-white shadow-sm text-[var(--color-primary)]" : "text-gray-500"}`}
                >
                  Points (1–9)
                </button>
                <button
                  onClick={() => {
                    setBoundarySystem("LETTER");
                    setEditingBoundaries(false);
                  }}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${boundarySystem === "LETTER" ? "bg-white shadow-sm text-[var(--color-primary)]" : "text-gray-500"}`}
                >
                  Letter (A–F)
                </button>
              </div>
            </div>
            {!editingBoundaries && (
              <button
                onClick={() => setEditingBoundaries(true)}
                className="flex items-center gap-1.5 text-sm font-medium text-[var(--color-primary)] hover:text-[var(--color-primary-dark)]"
              >
                <Pencil size={14} /> Edit
              </button>
            )}
          </div>

          <p className="text-xs text-gray-400 mb-4">
            {boundarySystem === "POINTS"
              ? "Used for Form 3 & 4 — best 6 subjects summed, English compulsory, lower total wins."
              : "Used for Form 1 & 2 — average mark maps to a letter grade."}
          </p>

          {editingBoundaries ? (
            <>
              <div className="space-y-2">
                {boundaries.map((b, i) => (
                  <div
                    key={i}
                    className={`grid gap-2 items-center ${boundarySystem === "POINTS" ? "grid-cols-4" : "grid-cols-3"}`}
                  >
                    {boundarySystem === "POINTS" ? (
                      <span className="text-sm font-medium text-gray-600">
                        Point {b.gradePoint}
                      </span>
                    ) : (
                      <input
                        value={b.gradeLabel || ""}
                        onChange={(e) =>
                          handleBoundaryChange(i, "gradeLabel", e.target.value)
                        }
                        placeholder="Grade eg. A"
                        className="px-2 py-1.5 border border-gray-200 rounded-lg text-sm font-medium"
                      />
                    )}
                    <input
                      type="number"
                      value={b.minPercent}
                      onChange={(e) =>
                        handleBoundaryChange(i, "minPercent", e.target.value)
                      }
                      placeholder="Min %"
                      className="px-2 py-1.5 border border-gray-200 rounded-lg text-sm"
                    />
                    <input
                      type="number"
                      value={b.maxPercent}
                      onChange={(e) =>
                        handleBoundaryChange(i, "maxPercent", e.target.value)
                      }
                      placeholder="Max %"
                      className="px-2 py-1.5 border border-gray-200 rounded-lg text-sm"
                    />
                    {boundarySystem === "POINTS" && (
                      <input
                        value={b.gradeLabel || ""}
                        onChange={(e) =>
                          handleBoundaryChange(i, "gradeLabel", e.target.value)
                        }
                        placeholder="Label (optional)"
                        className="px-2 py-1.5 border border-gray-200 rounded-lg text-sm"
                      />
                    )}
                  </div>
                ))}
                {boundarySystem === "LETTER" && (
                  <button
                    onClick={() =>
                      setBoundaries([
                        ...boundaries,
                        { minPercent: 0, maxPercent: 0, gradeLabel: "" },
                      ])
                    }
                    className="text-xs text-[var(--color-primary-dark)] font-medium mt-1"
                  >
                    + Add grade row
                  </button>
                )}
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  onClick={handleSaveBoundaries}
                  disabled={savingBoundaries}
                  className="flex items-center gap-2 bg-[var(--color-primary)] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[var(--color-primary-dark)] disabled:opacity-40"
                >
                  {savingBoundaries ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Save size={14} />
                  )}{" "}
                  Save
                </button>
                <button
                  onClick={() => setEditingBoundaries(false)}
                  className="flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200"
                >
                  <X size={14} /> Cancel
                </button>
              </div>
            </>
          ) : (
            <div className="overflow-hidden rounded-lg border border-gray-100">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr className="text-left text-gray-500">
                    {boundarySystem === "POINTS" && (
                      <th className="px-4 py-2 font-medium">Point</th>
                    )}
                    {boundarySystem === "LETTER" && (
                      <th className="px-4 py-2 font-medium">Grade</th>
                    )}
                    <th className="px-4 py-2 font-medium">Min %</th>
                    <th className="px-4 py-2 font-medium">Max %</th>
                    {boundarySystem === "POINTS" && (
                      <th className="px-4 py-2 font-medium">Label</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {boundaries.map((b, i) => (
                    <tr key={i} className="border-t border-gray-100">
                      {boundarySystem === "POINTS" ? (
                        <td className="px-4 py-2 font-medium text-gray-700">
                          Point {b.gradePoint}
                        </td>
                      ) : (
                        <td className="px-4 py-2 font-medium text-gray-700">
                          {b.gradeLabel}
                        </td>
                      )}
                      <td className="px-4 py-2 text-gray-600">
                        {b.minPercent}%
                      </td>
                      <td className="px-4 py-2 text-gray-600">
                        {b.maxPercent}%
                      </td>
                      {boundarySystem === "POINTS" && (
                        <td className="px-4 py-2 text-gray-500">
                          {b.gradeLabel || "—"}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Exam Periods */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-medium text-gray-800 mb-4">Exam Periods</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <input
              placeholder="Name eg. End of Term 2"
              value={newPeriod.name}
              onChange={(e) =>
                setNewPeriod({ ...newPeriod, name: e.target.value })
              }
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm col-span-2"
            />
            <Select
              value={newPeriod.term}
              onValueChange={(v) => setNewPeriod({ ...newPeriod, term: v })}
            >
              <SelectTrigger className="w-full bg-transparent border-gray-200 rounded-lg text-sm h-auto py-2">
                <SelectValue placeholder="Term" />
              </SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="TERM_1">Term 1</SelectItem>
                <SelectItem value="TERM_2">Term 2</SelectItem>
                <SelectItem value="TERM_3">Term 3</SelectItem>
              </SelectContent>
            </Select>
            <input
              placeholder="eg. 2025-2026"
              value={newPeriod.academicYear}
              onChange={(e) =>
                setNewPeriod({ ...newPeriod, academicYear: e.target.value })
              }
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
            />
          </div>
          <button
            onClick={handleCreatePeriod}
            className="flex items-center gap-2 bg-[var(--color-primary)] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[var(--color-primary-dark)]"
          >
            <Plus size={14} /> Create Exam Period
          </button>

          {periods.length > 0 && (
            <div className="mt-4 overflow-hidden rounded-lg border border-gray-100">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr className="text-left text-gray-500">
                    <th className="px-4 py-2 font-medium">Name</th>
                    <th className="px-4 py-2 font-medium">Term</th>
                    <th className="px-4 py-2 font-medium">Year</th>
                    <th className="px-4 py-2 font-medium text-right">
                      Visibility
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {periods.map((p) => (
                    <tr key={p.id} className="border-t border-gray-100">
                      <td className="px-4 py-2 font-medium text-gray-700">
                        {p.name}
                      </td>
                      <td className="px-4 py-2 text-gray-600">
                        {p.term.replace("_", " ")}
                      </td>
                      <td className="px-4 py-2 text-gray-600">
                        {p.academicYear}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <button
                          onClick={() => handleToggleActive(p.id, p.isActive)}
                          className={`text-xs px-3 py-1 rounded-full font-medium ${p.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}
                        >
                          {p.isActive ? "Visible to parents" : "Hidden"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* English Warning Banner */}
        {englishMissingWarning && resultsGradingSystem === "POINTS" && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle
              className="text-amber-600 shrink-0 mt-0.5"
              size={20}
            />
            <div className="flex-1">
              <p className="font-medium text-amber-900 text-sm">
                ⚠️ English not found in this upload
              </p>
              <p className="text-xs text-amber-700 mt-1">
                English is compulsory for Form 3 & 4 rankings. The Best 6
                calculation has fallen back to pure top-6 (without the English
                requirement). Please re-upload with English marks to ensure
                accurate MSCE-style rankings.
              </p>
            </div>
            <button
              onClick={() => setEnglishMissingWarning(false)}
              className="text-amber-600 hover:text-amber-800"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* MAIN UPLOAD & VIEW SECTION */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-gray-800">
              Class Uploads & Rankings
            </h3>
            <div className="w-64">
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="w-full bg-transparent border-gray-200 rounded-lg text-sm h-auto py-2">
                  <SelectValue placeholder="Select exam period to view classes" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  {periods.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {!selectedPeriod ? (
            <div className="p-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
              <FileSpreadsheet
                className="mx-auto text-gray-300 mb-2"
                size={32}
              />
              <p className="text-sm text-gray-500">
                Select an exam period above to manage class results.
              </p>
            </div>
          ) : loadingSummary ? (
            <div className="flex justify-center p-8">
              <Loader2 className="animate-spin text-gray-400" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column: Class Summary List */}
              <div className="space-y-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Classes for this period
                </p>
                {uploadSummary.filter(
                  (sum) => sum.gradingSystem === boundarySystem,
                ).length === 0 ? (
                  <p className="text-sm text-gray-500">
                    No classes found using the{" "}
                    <strong>
                      {boundarySystem === "POINTS"
                        ? "Points (1-9)"
                        : "Letter (A-F)"}
                    </strong>{" "}
                    grading system for this period.
                  </p>
                ) : (
                  uploadSummary
                    .filter((sum) => sum.gradingSystem === boundarySystem)
                    .map((sum) => (
                      <div
                        key={sum.classId}
                        onClick={() => handleViewClass(sum.classId)}
                        className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedClass === sum.classId
                            ? "border-[var(--color-primary)] bg-[var(--color-primary-light)]"
                            : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-gray-800 text-sm">
                            {sum.className}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {sum.hasResults
                              ? `✅ ${sum.studentsUploaded} students uploaded`
                              : "❌ Not uploaded"}
                          </p>
                          {sum.hasResults && sum.lastUploadedAt && (
                            <p className="text-[10px] text-gray-400 mt-1">
                              📅{" "}
                              {new Date(sum.lastUploadedAt).toLocaleString(
                                "en-GB",
                                {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                },
                              )}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] font-bold px-2 py-1 rounded bg-white border border-gray-200 text-gray-600">
                            {sum.gradingSystem === "LETTER"
                              ? "Letters"
                              : "Points"}
                          </span>
                          <Eye
                            size={16}
                            className={
                              sum.hasResults
                                ? "text-[var(--color-primary)]"
                                : "text-gray-300"
                            }
                          />
                        </div>
                      </div>
                    ))
                )}
              </div>

              {/* Right Column: Upload Form / Details */}
              <div>
                {loadingResults ? (
                  <div className="h-full flex flex-col items-center justify-center p-8 bg-gray-50 border border-gray-200 rounded-xl">
                    <Loader2
                      className="animate-spin text-gray-400 mb-2"
                      size={24}
                    />
                    <p className="text-sm text-gray-500">
                      Loading class results...
                    </p>
                  </div>
                ) : selectedClass ? (
                  <div className="space-y-4">
                    {/* Upload form OR "Already uploaded" card */}
                    {(() => {
                      const alreadyUploaded =
                        currentSummary?.hasResults === true;

                      // Show the "already uploaded" card
                      if (alreadyUploaded && !reuploadMode) {
                        return (
                          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                            <div className="flex items-start gap-3">
                              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
                                <Check className="text-green-600" size={20} />
                              </div>
                              <div className="flex-1">
                                <h4 className="font-medium text-green-900 text-sm">
                                  Results Already Uploaded
                                </h4>
                                <p className="text-xs text-green-700 mt-1">
                                  {currentSummary.studentsUploaded} student
                                  {currentSummary.studentsUploaded === 1
                                    ? ""
                                    : "s"}{" "}
                                  processed for this class.
                                </p>
                                {currentSummary.lastUploadedAt && (
                                  <p className="text-[11px] text-green-600 mt-2">
                                    📅 Last uploaded:{" "}
                                    {new Date(
                                      currentSummary.lastUploadedAt,
                                    ).toLocaleString()}
                                  </p>
                                )}
                                {currentSummary.sourceFileUrl && (
                                  <a
                                    href={currentSummary.sourceFileUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 text-[11px] text-green-700 underline mt-1"
                                  >
                                    📄 View uploaded source file
                                  </a>
                                )}
                              </div>
                            </div>

                            <div className="mt-4 pt-3 border-t border-green-200 flex items-center justify-between">
                              <p className="text-[11px] text-green-700">
                                Re-uploading will overwrite existing results.
                              </p>
                              {/* 🎯 Opens the beautiful confirmation modal */}
                              <button
                                onClick={() => setShowReuploadConfirm(true)}
                                className="text-xs font-semibold text-red-600 hover:text-red-800 px-3 py-1.5 rounded-lg border border-red-200 hover:border-red-300 hover:bg-red-50 transition-colors flex items-center gap-1.5"
                              >
                                <RefreshCw size={12} /> Re-upload (overwrites)
                              </button>
                            </div>
                          </div>
                        );
                      }

                      // Show the upload form
                      return (
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                          {alreadyUploaded && (
                            <div className="flex items-center gap-2 mb-3 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                              <AlertTriangle
                                size={14}
                                className="text-amber-600 shrink-0"
                              />
                              <p className="text-[11px] text-amber-800">
                                ⚠️ Re-upload mode — existing results will be
                                overwritten.
                              </p>
                              <button
                                onClick={() => setReuploadMode(false)}
                                className="ml-auto text-[11px] text-amber-700 hover:text-amber-900 underline"
                              >
                                Cancel
                              </button>
                            </div>
                          )}

                          <h4 className="font-medium text-gray-800 text-sm mb-1">
                            {selectedClassObj?.name} — Upload Results
                          </h4>
                          <p className="text-xs text-gray-500 mb-3">
                            Grading System:{" "}
                            <strong>
                              {selectedClassObj?.gradingSystem === "LETTER"
                                ? "Letter Grades (A-F)"
                                : "Points (1-9)"}
                            </strong>{" "}
                            (Locked)
                          </p>

                          <input
                            type="file"
                            accept=".xlsx,.xls,.csv"
                            onChange={(e) =>
                              setFile(e.target.files?.[0] || null)
                            }
                            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[var(--color-primary-light)] file:text-[var(--color-primary-dark)] hover:file:bg-[var(--color-primary-light)]/80 mb-3"
                          />

                          <button
                            onClick={handleUpload}
                            disabled={uploading || !file}
                            className="flex items-center justify-center gap-2 w-full bg-[var(--color-primary)] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[var(--color-primary-dark)] disabled:opacity-40"
                          >
                            {uploading ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <Upload size={14} />
                            )}
                            {uploading ? "Uploading..." : "Upload Sheet"}
                          </button>
                          {message && (
                            <p className="text-xs text-center mt-2 text-gray-600">
                              {message}
                            </p>
                          )}
                        </div>
                      );
                    })()}

                    {/* Pending Name Matches */}
                    {pendingRows.length > 0 && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertTriangle size={14} className="text-amber-600" />
                          <h4 className="font-medium text-amber-900 text-xs">
                            Pending Matches ({pendingRows.length})
                          </h4>
                        </div>
                        <p className="text-[10px] text-amber-700 mb-3">
                          Multiple students matched these names.
                        </p>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {pendingRows.map((row) => (
                            <div
                              key={row.id}
                              className="bg-white border border-amber-100 rounded p-2"
                            >
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-xs font-semibold">
                                  "{row.rawName}"
                                </span>
                                <button
                                  onClick={() =>
                                    handleDiscardPendingRow(row.id)
                                  }
                                  className="text-[10px] text-gray-400 hover:text-red-600"
                                >
                                  Discard
                                </button>
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {row.candidates.map((c: any) => (
                                  <button
                                    key={c.id}
                                    onClick={() =>
                                      handleResolvePendingRow(row.id, c.id)
                                    }
                                    disabled={!!resolvingRowId}
                                    className="text-[10px] bg-gray-50 border border-gray-200 rounded px-2 py-1 hover:border-[var(--color-primary)] flex items-center gap-1 disabled:opacity-50"
                                  >
                                    {resolvingRowId === row.id ? (
                                      <Loader2
                                        size={10}
                                        className="animate-spin text-gray-400"
                                      />
                                    ) : (
                                      <Check
                                        size={10}
                                        className="text-green-600"
                                      />
                                    )}{" "}
                                    {c.fullName}
                                  </button>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center p-8 bg-gray-50 border border-dashed border-gray-200 rounded-xl">
                    <Trophy className="text-gray-300 mb-2" size={32} />
                    <p className="text-sm text-gray-500 text-center">
                      Select a class from the left to view rankings and upload
                      new sheets.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Class Rankings */}
        {selectedClass && classResults.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 overflow-x-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-gray-800">
                {selectedClassObj?.name} Rankings — Best to Worst
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-gray-400 italic">
                  {resultsGradingSystem === "LETTER"
                    ? "Ties broken by aggregate (lower is better)"
                    : "English ⭐ compulsory in Best 6. Ties = shared rank"}
                </span>
                <span className="text-xs font-medium bg-gray-100 text-gray-600 px-2 py-1 rounded">
                  {resultsGradingSystem === "LETTER"
                    ? "Letter Grades"
                    : "Points"}
                </span>
              </div>
            </div>

            <div className="overflow-hidden rounded-lg border border-gray-100">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr className="text-left text-gray-500">
                    <th className="px-4 py-2 font-medium">Position</th>
                    <th className="px-4 py-2 font-medium">Student</th>
                    <th className="px-4 py-2 font-medium">Student ID</th>
                    <th className="px-4 py-2 font-medium">Subjects Sat</th>
                    <th className="px-4 py-2 font-medium">Total Marks</th>
                    {resultsGradingSystem === "LETTER" ? (
                      <>
                        <th className="px-4 py-2 font-medium">Average %</th>
                        <th className="px-4 py-2 font-medium">Aggregate</th>
                        <th className="px-4 py-2 font-medium">Overall Grade</th>
                      </>
                    ) : (
                      <th className="px-4 py-2 font-medium">
                        Total Points (Best 6)
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {classResults.map((row) => (
                    <>
                      <tr
                        key={row.studentId}
                        onClick={() =>
                          setExpandedStudent(
                            expandedStudent === row.studentId
                              ? null
                              : row.studentId,
                          )
                        }
                        className="border-t border-gray-100 cursor-pointer hover:bg-gray-50"
                      >
                        <td className="px-4 py-2 font-semibold text-gray-700">
                          {row.position}
                        </td>
                        <td className="px-4 py-2 text-gray-700">
                          {row.fullName}
                        </td>
                        <td className="px-4 py-2 text-gray-500 font-mono text-xs">
                          {row.studentCode}
                        </td>
                        <td className="px-4 py-2 text-gray-600">
                          {row.subjectsSat}
                        </td>
                        <td className="px-4 py-2 text-gray-600">
                          {row.totalMarks}
                        </td>
                        {resultsGradingSystem === "LETTER" ? (
                          <>
                            <td className="px-4 py-2 text-gray-600">
                              {row.averageMark}%
                            </td>
                            <td className="px-4 py-2 text-gray-600 font-mono">
                              {row.aggregate ?? "—"}
                            </td>
                            <td className="px-4 py-2 font-semibold text-[var(--color-primary)]">
                              {row.overallGrade}
                              <span className="ml-2 text-xs text-gray-400">
                                {expandedStudent === row.studentId ? "▲" : "▼"}
                              </span>
                            </td>
                          </>
                        ) : (
                          <td className="px-4 py-2 font-semibold text-[var(--color-primary)]">
                            {row.totalPoints}
                            {row.englishIncluded === false && (
                              <span
                                className="ml-1 text-[10px] text-amber-600"
                                title="English was not included (missing from upload)"
                              >
                                ⚠️
                              </span>
                            )}
                            <span className="ml-2 text-xs text-gray-400">
                              {expandedStudent === row.studentId ? "▲" : "▼"}
                            </span>
                          </td>
                        )}
                      </tr>
                      {expandedStudent === row.studentId && (
                        <tr className="bg-gray-50">
                          <td
                            colSpan={resultsGradingSystem === "LETTER" ? 8 : 6}
                            className="px-4 py-3"
                          >
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                              {row.subjects.map((s: any, i: number) => (
                                <div
                                  key={i}
                                  className={`flex items-center justify-between border rounded-lg px-3 py-2 text-xs ${
                                    s.isEnglish
                                      ? "bg-purple-50 border-purple-200"
                                      : s.countedInTotal === false
                                        ? "bg-gray-100 border-gray-200 opacity-60"
                                        : "bg-white border-gray-100"
                                  }`}
                                >
                                  <span
                                    className={`flex items-center gap-1 ${s.isEnglish ? "font-semibold text-purple-800" : "text-gray-600"}`}
                                  >
                                    {s.isEnglish && (
                                      <Star
                                        size={10}
                                        className="text-purple-600 fill-purple-600"
                                      />
                                    )}
                                    {s.subject}
                                  </span>
                                  <span
                                    className={`font-medium ${s.isEnglish ? "text-purple-800" : "text-gray-800"}`}
                                  >
                                    {s.mark}%{" "}
                                    <span className="text-gray-400">
                                      {resultsGradingSystem === "LETTER"
                                        ? `(${s.gradeLabel})`
                                        : `(Pt ${s.gradePoint})`}
                                    </span>
                                    {s.countedInTotal === false && (
                                      <span className="ml-1 text-[9px] text-gray-400">
                                        not counted
                                      </span>
                                    )}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* 🎯 Beautiful Re-upload Confirmation Modal */}
      {showReuploadConfirm && currentSummary && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => setShowReuploadConfirm(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center">
              <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle size={24} className="text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-1">
                Re-upload results for {selectedClassObj?.name}?
              </h3>
              <p className="text-sm text-slate-500 mb-4">
                This will overwrite the existing{" "}
                <strong>{currentSummary.studentsUploaded}</strong> student
                record{currentSummary.studentsUploaded === 1 ? "" : "s"} already
                uploaded for this class.
              </p>
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-800 mb-4 text-left">
                ⚠️ All existing marks for this class will be replaced. This
                cannot be undone.
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowReuploadConfirm(false)}
                  className="flex-1 border border-slate-300 text-slate-700 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmReupload}
                  className="flex-1 bg-red-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-red-700"
                >
                  Yes, Re-upload
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResultsPage;
