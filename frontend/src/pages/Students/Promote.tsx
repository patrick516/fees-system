import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Loader2,
  CheckCircle,
  GraduationCap,
  AlertCircle,
} from "lucide-react";
import api from "../../lib/axios";

const Promote = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [promotionMap, setPromotionMap] = useState<any[]>([]);
  const [studentsByClass, setStudentsByClass] = useState<any[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  const fetchPreview = async () => {
    setLoading(true);
    try {
      const res = await api.get("/students/promote/preview");
      setPromotionMap(res.data.data.promotionMap);
      setStudentsByClass(res.data.data.studentsByClass);

      // Default: every student checked
      const initial: Record<string, boolean> = {};
      res.data.data.studentsByClass.forEach((group: any) => {
        group.students.forEach((s: any) => {
          initial[s.id] = true;
        });
      });
      setSelected(initial);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPreview();
  }, []);

  const toggleStudent = (id: string) => {
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleClass = (classId: string, value: boolean) => {
    const group = studentsByClass.find((g) => g.class.id === classId);
    if (!group) return;
    setSelected((prev) => {
      const next = { ...prev };
      group.students.forEach((s: any) => {
        next[s.id] = value;
      });
      return next;
    });
  };

  const totalSelected = Object.values(selected).filter(Boolean).length;

  const handleSubmit = async () => {
    setError("");
    setResult(null);
    setSubmitting(true);

    // Build payload
    const promotions: any[] = [];
    const graduations: string[] = [];

    for (const group of studentsByClass) {
      const map = promotionMap.find((m) => m.fromClass.id === group.class.id);
      if (!map) continue;

      for (const student of group.students) {
        if (!selected[student.id]) continue;

        if (map.toClass) {
          promotions.push({
            studentId: student.id,
            toClassId: map.toClass.id,
          });
        } else {
          graduations.push(student.id);
        }
      }
    }

    try {
      const res = await api.post("/students/promote", {
        promotions,
        graduations,
      });
      setResult(res.data.data);
      // Refresh preview (promoted students are now in new classes)
      await fetchPreview();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to promote");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={24} className="animate-spin text-gray-300" />
      </div>
    );
  }

  // Post-submit summary screen
  if (result) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={32} className="text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">
            Promotion Complete
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            {result.promoted.length} student
            {result.promoted.length !== 1 ? "s" : ""} promoted ·{" "}
            {result.graduated.length} graduated
          </p>

          {result.promoted.length > 0 && (
            <div className="text-left bg-gray-50 rounded-xl p-4 mb-4">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">
                Promoted
              </p>
              <ul className="space-y-1.5 text-sm">
                {result.promoted.map((p: any) => (
                  <li key={p.studentId} className="flex justify-between gap-3">
                    <span className="font-medium text-gray-800">
                      {p.fullName}
                    </span>
                    <span className="text-xs text-gray-500 font-mono">
                      {p.oldCode} → {p.newCode}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.graduated.length > 0 && (
            <div className="text-left bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-4">
              <p className="text-xs font-semibold text-yellow-700 uppercase mb-2">
                Graduated (deactivated)
              </p>
              <ul className="space-y-1 text-sm">
                {result.graduated.map((g: any) => (
                  <li key={g.studentId} className="text-gray-800">
                    {g.fullName}
                  </li>
                ))}
              </ul>
              <p className="text-[11px] text-yellow-700 mt-2">
                Graduated students are hidden from active lists but their
                records remain intact. You can re-activate them if they return.
              </p>
            </div>
          )}

          {result.errors.length > 0 && (
            <div className="text-left bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
              <p className="text-xs font-semibold text-red-700 uppercase mb-2">
                Errors ({result.errors.length})
              </p>
              <ul className="space-y-1 text-xs text-red-700">
                {result.errors.map((e: string, i: number) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </div>
          )}

          <button
            onClick={() => setResult(null)}
            className="mt-4 px-6 py-2.5 bg-[var(--color-primary)] text-white rounded-lg text-sm font-medium hover:bg-[var(--color-primary-dark)]"
          >
            Back to Promotion
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
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
            End of Year Promotion
          </h2>
          <p className="text-sm text-gray-500">
            Move students to their next class. Uncheck a student to keep them in
            the same class (repeating).
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Empty state */}
      {studentsByClass.every((g) => g.students.length === 0) && (
        <div className="bg-white rounded-xl p-12 text-center shadow-sm border border-gray-100">
          <GraduationCap size={40} className="mx-auto mb-2 text-gray-300" />
          <p className="text-sm text-gray-400 font-medium">
            No active students to promote
          </p>
        </div>
      )}

      {/* Class sections */}
      {studentsByClass
        .filter((g) => g.students.length > 0)
        .map((group: any) => {
          const map = promotionMap.find(
            (m) => m.fromClass.id === group.class.id,
          );
          const toLabel = map?.toClass
            ? map.toClass.name
            : "Graduate (deactivate)";
          const classIds = group.students.map((s: any) => s.id);
          const allChecked = classIds.every((id: string) => selected[id]);
          const checkedCount = classIds.filter(
            (id: string) => selected[id],
          ).length;

          return (
            <div
              key={group.class.id}
              className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
            >
              {/* Class header */}
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                      map?.toClass
                        ? "bg-blue-100 text-blue-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {map?.toClass ? (
                      <GraduationCap size={16} />
                    ) : (
                      <AlertCircle size={16} />
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800 text-sm">
                      {group.class.name} → {toLabel}
                    </p>
                    <p className="text-xs text-gray-500">
                      {checkedCount} of {group.students.length} selected
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => toggleClass(group.class.id, !allChecked)}
                  className="text-xs font-medium text-blue-700 hover:text-blue-900"
                >
                  {allChecked ? "Unselect all" : "Select all"}
                </button>
              </div>

              {/* Student rows */}
              <div className="divide-y divide-gray-50">
                {group.students.map((student: any) => (
                  <label
                    key={student.id}
                    className="flex items-center gap-3 px-6 py-3 hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={!!selected[student.id]}
                      onChange={() => toggleStudent(student.id)}
                      className="w-4 h-4 rounded border-gray-300 text-blue-900 focus:ring-blue-500"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {student.fullName}
                      </p>
                      <p className="text-xs text-gray-400 font-mono">
                        {student.studentCode}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          );
        })}

      {/* Submit */}
      {studentsByClass.some((g) => g.students.length > 0) && (
        <div className="flex gap-3">
          <button
            onClick={() => navigate("/students")}
            className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || totalSelected === 0}
            className="flex-1 flex items-center justify-center gap-2 bg-[var(--color-primary)] text-white px-6 py-3 rounded-lg text-sm font-medium hover:bg-[var(--color-primary-dark)] disabled:opacity-40 transition-colors"
          >
            {submitting && <Loader2 size={16} className="animate-spin" />}
            {submitting
              ? "Promoting..."
              : `Promote ${totalSelected} Student${totalSelected !== 1 ? "s" : ""}`}
          </button>
        </div>
      )}
    </div>
  );
};

export default Promote;
