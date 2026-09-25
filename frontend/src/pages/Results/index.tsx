import { useState, useEffect } from "react";
import {
  Upload,
  Plus,
  Loader2,
  CheckCircle2,
  Save,
  Pencil,
  X,
  Trophy,
  AlertTriangle,
  Check,
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
  const {
    getPeriods,
    createPeriod,
    togglePeriodActive,
    getGradeBoundaries,
    setGradeBoundaries,
    uploadResults,
    uploading,
    getClassResults,
    updateClassGradingSystem,
    getPendingRows,
    resolvePendingRow,
    discardPendingRow,
  } = useExamResults();
  const { classes, refetch: refetchClasses } = useClasses();

  const [classResults, setClassResults] = useState<any[]>([]);
  const [resultsGradingSystem, setResultsGradingSystem] = useState<
    "POINTS" | "LETTER"
  >("POINTS");
  const [loadingResults, setLoadingResults] = useState(false);
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);

  const [periods, setPeriods] = useState<any[]>([]);
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
  const [selectedPeriod, setSelectedPeriod] = useState(
    () => localStorage.getItem("results_selectedPeriod") || "",
  );
  const [selectedClass, setSelectedClass] = useState(
    () => localStorage.getItem("results_selectedClass") || "",
  );
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [savingBoundaries, setSavingBoundaries] = useState(false);
  const [savingGradingSystem, setSavingGradingSystem] = useState(false);
  const [pendingRows, setPendingRows] = useState<any[]>([]);
  const [resolvingRowId, setResolvingRowId] = useState<string | null>(null);

  const boundaries =
    boundarySystem === "POINTS" ? pointsBoundaries : letterBoundaries;
  const setBoundaries =
    boundarySystem === "POINTS" ? setPointsBoundaries : setLetterBoundaries;

  const selectedClassObj = classes.find((c: any) => c.id === selectedClass);

  // Active term — single source of truth for academic year
  const { academicYear: activeYear, activeTerm: currentTerm } = useActiveTerm();

  const [newPeriod, setNewPeriod] = useState({
    name: "",
    term: "TERM_1",
    academicYear: getCurrentAcademicYear(),
    examType: "END_TERM",
  });

  // Sync the exam period form with the activated values as they load
  useEffect(() => {
    if (activeYear) {
      setNewPeriod((prev) => ({ ...prev, academicYear: activeYear }));
    }
    if (currentTerm) {
      setNewPeriod((prev) => ({ ...prev, term: currentTerm }));
    }
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

      const savedPeriod = localStorage.getItem("results_selectedPeriod");
      const savedClass = localStorage.getItem("results_selectedClass");
      if (savedPeriod && savedClass) {
        setLoadingResults(true);
        const r = await getClassResults(savedClass, savedPeriod);
        if (r.success) {
          setClassResults(r.data);
          setResultsGradingSystem(r.gradingSystem || "POINTS");
        }
        setLoadingResults(false);

        const p = await getPendingRows(savedClass, savedPeriod);
        if (p.success) setPendingRows(p.data);
      }
    })();
  }, []);

  useEffect(() => {
    if (selectedPeriod) {
      localStorage.setItem("results_selectedPeriod", selectedPeriod);
    }
  }, [selectedPeriod]);

  useEffect(() => {
    if (selectedClass) {
      localStorage.setItem("results_selectedClass", selectedClass);
    }
    // Bug fix: clear stale rankings when the filter changes so old data
    // doesn't linger on screen looking like nothing happened
    setClassResults([]);
  }, [selectedClass]);

  useEffect(() => {
    setClassResults([]);
  }, [selectedPeriod]);

  const handleBoundaryChange = (
    index: number,
    field: "minPercent" | "maxPercent" | "gradePoint" | "gradeLabel",
    value: string,
  ) => {
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

  const handleGradingSystemChange = async (system: "POINTS" | "LETTER") => {
    if (!selectedClass) return;
    setSavingGradingSystem(true);
    const res = await updateClassGradingSystem(selectedClass, system);
    if (res.success) {
      await refetchClasses();
      setMessage(
        `${selectedClassObj?.name || "Class"} now uses ${
          system === "LETTER" ? "letter grades" : "points"
        }`,
      );
    }
    setSavingGradingSystem(false);
  };

  const handleUpload = async () => {
    if (!file || !selectedClass || !selectedPeriod) {
      setMessage("Select a class, exam period, and file first");
      return;
    }
    const res = await uploadResults(file, selectedClass, selectedPeriod);
    setMessage(res.message || (res.success ? "Uploaded" : "Upload failed"));
    if (res.success) {
      handleViewResults();
      loadPendingRows();
    }
  };

  const loadPendingRows = async () => {
    if (!selectedClass || !selectedPeriod) return;
    const res = await getPendingRows(selectedClass, selectedPeriod);
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
      handleViewResults();
    } else {
      setMessage(res.message || "Failed to resolve");
    }
    setResolvingRowId(null);
  };

  const handleDiscardPendingRow = async (pendingRowId: string) => {
    const res = await discardPendingRow(pendingRowId);
    if (res.success) {
      setPendingRows(pendingRows.filter((r) => r.id !== pendingRowId));
    }
  };

  const handleViewResults = async () => {
    if (!selectedClass || !selectedPeriod) {
      setMessage("Select a class and exam period to view rankings");
      return;
    }
    setLoadingResults(true);
    const res = await getClassResults(selectedClass, selectedPeriod);
    if (res.success) {
      setClassResults(res.data);
      setResultsGradingSystem(res.gradingSystem || "POINTS");
    }
    setLoadingResults(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-800">Exam Results</h2>
        <p className="text-sm text-gray-500">
          Create exam periods, set grade boundaries, upload marks per class, and
          control when parents see results
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
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  boundarySystem === "POINTS"
                    ? "bg-white shadow-sm text-blue-900"
                    : "text-gray-500"
                }`}
              >
                Points (1–9)
              </button>
              <button
                onClick={() => {
                  setBoundarySystem("LETTER");
                  setEditingBoundaries(false);
                }}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  boundarySystem === "LETTER"
                    ? "bg-white shadow-sm text-blue-900"
                    : "text-gray-500"
                }`}
              >
                Letter (A–F)
              </button>
            </div>
          </div>
          {!editingBoundaries && (
            <button
              onClick={() => setEditingBoundaries(true)}
              className="flex items-center gap-1.5 text-sm font-medium text-blue-900 hover:text-blue-700 transition-colors"
            >
              <Pencil size={14} /> Edit
            </button>
          )}
        </div>

        <p className="text-xs text-gray-400 mb-4">
          {boundarySystem === "POINTS"
            ? "Used for Form 3 & 4 — best 6 subjects summed, lower total wins."
            : "Used for Form 1 & 2 — average mark maps to a letter grade."}
        </p>

        {editingBoundaries ? (
          <>
            <div className="space-y-2">
              {boundaries.map((b, i) => (
                <div
                  key={i}
                  className={`grid gap-2 items-center ${
                    boundarySystem === "POINTS" ? "grid-cols-4" : "grid-cols-3"
                  }`}
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
                  className="text-xs text-blue-700 font-medium mt-1"
                >
                  + Add grade row
                </button>
              )}
            </div>
            <div className="mt-4 flex gap-2">
              <button
                onClick={handleSaveBoundaries}
                disabled={savingBoundaries}
                className="flex items-center gap-2 bg-blue-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-800 disabled:opacity-40"
              >
                {savingBoundaries ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Save size={14} />
                )}
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
                    <td className="px-4 py-2 text-gray-600">{b.minPercent}%</td>
                    <td className="px-4 py-2 text-gray-600">{b.maxPercent}%</td>
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
          className="flex items-center gap-2 bg-blue-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-800"
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
                        className={`text-xs px-3 py-1 rounded-full font-medium ${
                          p.isActive
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-500"
                        }`}
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

      {/* Upload */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="font-medium text-gray-800 mb-4">Upload Class Results</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-full bg-transparent border-gray-200 rounded-lg text-sm h-auto py-2">
              <SelectValue placeholder="Select exam period" />
            </SelectTrigger>
            <SelectContent className="bg-white">
              {periods.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedClass} onValueChange={setSelectedClass}>
            <SelectTrigger className="w-full bg-transparent border-gray-200 rounded-lg text-sm h-auto py-2">
              <SelectValue placeholder="Select class" />
            </SelectTrigger>
            <SelectContent className="bg-white">
              {classes.map((c: any) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="text-sm"
          />
        </div>

        {selectedClassObj && (
          <div className="flex items-center gap-3 mb-4 p-3 bg-gray-50 rounded-lg">
            <span className="text-xs text-gray-500">
              {selectedClassObj.name} grades using:
            </span>
            <div className="flex bg-white border border-gray-200 rounded-lg p-0.5">
              <button
                onClick={() => handleGradingSystemChange("POINTS")}
                disabled={savingGradingSystem}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  selectedClassObj.gradingSystem === "POINTS"
                    ? "bg-blue-900 text-white"
                    : "text-gray-500"
                }`}
              >
                Points
              </button>
              <button
                onClick={() => handleGradingSystemChange("LETTER")}
                disabled={savingGradingSystem}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  selectedClassObj.gradingSystem === "LETTER"
                    ? "bg-blue-900 text-white"
                    : "text-gray-500"
                }`}
              >
                Letter Grades
              </button>
            </div>
          </div>
        )}

        <button
          onClick={handleUpload}
          disabled={uploading}
          className="flex items-center gap-2 bg-blue-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-800 disabled:opacity-40"
        >
          {uploading ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Upload size={14} />
          )}
          {uploading ? "Uploading..." : "Upload Sheet"}
        </button>
        {message && (
          <p className="text-sm mt-3 flex items-center gap-2 text-gray-600">
            <CheckCircle2 size={14} /> {message}
          </p>
        )}
        <button
          onClick={handleViewResults}
          disabled={loadingResults}
          className="mt-3 flex items-center gap-2 text-sm text-blue-900 font-medium hover:text-blue-700 transition-colors"
        >
          {loadingResults ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Trophy size={14} />
          )}
          View Class Rankings
        </button>
      </div>

      {/* Pending Name Matches */}
      {pendingRows.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-amber-200 p-6">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={16} className="text-amber-600" />
            <h3 className="font-medium text-gray-800">
              Pending Matches ({pendingRows.length})
            </h3>
          </div>
          <p className="text-xs text-gray-500 mb-4">
            These names matched more than one student in this class. Pick the
            correct student for each, or discard the row.
          </p>
          <div className="space-y-3">
            {pendingRows.map((row) => (
              <div
                key={row.id}
                className="border border-amber-100 bg-amber-50 rounded-lg p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium text-gray-800 text-sm">
                    "{row.rawName}"
                  </p>
                  <button
                    onClick={() => handleDiscardPendingRow(row.id)}
                    className="text-xs text-gray-400 hover:text-red-600"
                  >
                    Discard
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 mb-3">
                  {row.marks.map((m: any, i: number) => (
                    <span
                      key={i}
                      className="text-xs bg-white border border-gray-200 rounded px-2 py-0.5 text-gray-600"
                    >
                      {m.subject}: {m.mark}%
                    </span>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  {row.candidates.map((c: any) => (
                    <button
                      key={c.id}
                      onClick={() => handleResolvePendingRow(row.id, c.id)}
                      disabled={resolvingRowId === row.id}
                      className="flex items-center gap-1.5 text-xs bg-white border border-gray-200 rounded-lg px-3 py-1.5 hover:border-blue-400 hover:bg-blue-50 disabled:opacity-40"
                    >
                      {resolvingRowId === row.id ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <Check size={12} className="text-green-600" />
                      )}
                      {c.fullName}{" "}
                      <span className="text-gray-400 font-mono">
                        ({c.studentCode})
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Class Rankings */}
      {classResults.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 overflow-x-auto">
          <h3 className="font-medium text-gray-800 mb-4">
            Class Rankings — Best to Worst
          </h3>
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
                          <td className="px-4 py-2 font-semibold text-blue-900">
                            {row.overallGrade}
                            <span className="ml-2 text-xs text-gray-400">
                              {expandedStudent === row.studentId ? "▲" : "▼"}
                            </span>
                          </td>
                        </>
                      ) : (
                        <td className="px-4 py-2 font-semibold text-blue-900">
                          {row.totalPoints}
                          <span className="ml-2 text-xs text-gray-400">
                            {expandedStudent === row.studentId ? "▲" : "▼"}
                          </span>
                        </td>
                      )}
                    </tr>
                    {expandedStudent === row.studentId && (
                      <tr className="bg-gray-50">
                        <td
                          colSpan={resultsGradingSystem === "LETTER" ? 7 : 6}
                          className="px-4 py-3"
                        >
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            {row.subjects.map((s: any, i: number) => (
                              <div
                                key={i}
                                className="flex items-center justify-between bg-white border border-gray-100 rounded-lg px-3 py-2 text-xs"
                              >
                                <span className="text-gray-600">
                                  {s.subject}
                                </span>
                                <span className="font-medium text-gray-800">
                                  {s.mark}%{" "}
                                  <span className="text-gray-400">
                                    {resultsGradingSystem === "LETTER"
                                      ? `(${s.gradeLabel})`
                                      : `(Pt ${s.gradePoint})`}
                                  </span>
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
  );
};

export default ResultsPage;
