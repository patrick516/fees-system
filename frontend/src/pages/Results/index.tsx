import { useState, useEffect } from "react";
import { Upload, Plus, Loader2, CheckCircle2, Save } from "lucide-react";
import { useExamResults } from "../../hooks/useExamResults";
import { useClasses } from "../../hooks/useStudents";

const ResultsPage = () => {
  const {
    getPeriods,
    createPeriod,
    togglePeriodActive,
    getGradeBoundaries,
    setGradeBoundaries,
    uploadResults,
    uploading,
  } = useExamResults();
  const { classes } = useClasses();

  const [periods, setPeriods] = useState<any[]>([]);
  const [boundaries, setBoundaries] = useState<any[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [savingBoundaries, setSavingBoundaries] = useState(false);

  const [newPeriod, setNewPeriod] = useState({
    name: "",
    term: "TERM_1",
    academicYear: "2026",
    examType: "END_TERM",
  });

  useEffect(() => {
    (async () => {
      const p = await getPeriods();
      if (p.success) setPeriods(p.data);
      const b = await getGradeBoundaries();
      if (b.success && b.data.length > 0) {
        setBoundaries(b.data);
      } else {
        // Sensible default 1-9 point scale, editable before saving
        setBoundaries([
          { minPercent: 80, maxPercent: 100, gradePoint: 1, gradeLabel: "" },
          { minPercent: 70, maxPercent: 79, gradePoint: 2, gradeLabel: "" },
          { minPercent: 60, maxPercent: 69, gradePoint: 3, gradeLabel: "" },
          { minPercent: 50, maxPercent: 59, gradePoint: 4, gradeLabel: "" },
          { minPercent: 40, maxPercent: 49, gradePoint: 5, gradeLabel: "" },
          { minPercent: 30, maxPercent: 39, gradePoint: 6, gradeLabel: "" },
          { minPercent: 20, maxPercent: 29, gradePoint: 7, gradeLabel: "" },
          { minPercent: 10, maxPercent: 19, gradePoint: 8, gradeLabel: "" },
          { minPercent: 0, maxPercent: 9, gradePoint: 9, gradeLabel: "" },
        ]);
      }
    })();
  }, []);

  const handleBoundaryChange = (
    index: number,
    field: "minPercent" | "maxPercent" | "gradeLabel",
    value: string,
  ) => {
    const updated = [...boundaries];
    updated[index] = { ...updated[index], [field]: value };
    setBoundaries(updated);
  };

  const handleSaveBoundaries = async () => {
    setSavingBoundaries(true);
    const res = await setGradeBoundaries(boundaries);
    setMessage(res.success ? "Grade boundaries saved" : res.message);
    setSavingBoundaries(false);
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
        <h3 className="font-medium text-gray-800 mb-4">
          Grade Boundaries (1 = best, 9 = fail)
        </h3>
        <div className="space-y-2">
          {boundaries.map((b, i) => (
            <div key={i} className="grid grid-cols-4 gap-2 items-center">
              <span className="text-sm font-medium text-gray-600">
                Point {b.gradePoint}
              </span>
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
              <input
                value={b.gradeLabel || ""}
                onChange={(e) =>
                  handleBoundaryChange(i, "gradeLabel", e.target.value)
                }
                placeholder="Label (optional)"
                className="px-2 py-1.5 border border-gray-200 rounded-lg text-sm"
              />
            </div>
          ))}
        </div>
        <button
          onClick={handleSaveBoundaries}
          disabled={savingBoundaries}
          className="mt-4 flex items-center gap-2 bg-blue-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-800 disabled:opacity-40"
        >
          {savingBoundaries ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Save size={14} />
          )}
          Save Grade Boundaries
        </button>
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
          <select
            value={newPeriod.term}
            onChange={(e) =>
              setNewPeriod({ ...newPeriod, term: e.target.value })
            }
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
          >
            <option value="TERM_1">Term 1</option>
            <option value="TERM_2">Term 2</option>
            <option value="TERM_3">Term 3</option>
          </select>
          <input
            placeholder="Academic Year"
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

        <div className="mt-4 space-y-2">
          {periods.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between p-3 border border-gray-100 rounded-lg"
            >
              <span className="text-sm">
                {p.name} — {p.term.replace("_", " ")} {p.academicYear}
              </span>
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
            </div>
          ))}
        </div>
      </div>

      {/* Upload */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="font-medium text-gray-800 mb-4">Upload Class Results</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
          >
            <option value="">Select exam period</option>
            {periods.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
          >
            <option value="">Select class</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="text-sm"
          />
        </div>
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
      </div>
    </div>
  );
};

export default ResultsPage;
