import { useState, useEffect, useRef } from "react";
import { X, Loader2, Save, AlertCircle } from "lucide-react";
import api from "../../lib/axios";
import { toast } from "../../lib/toast";

interface Props {
  open: boolean;
  examPeriod: {
    id: string;
    name: string;
    term: string;
    academicYear: string;
  } | null;
  cls: { id: string; name: string; gradingSystem: string } | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function GradeEntryModal({
  open,
  examPeriod,
  cls,
  onClose,
  onSaved,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [students, setStudents] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [marks, setMarks] = useState<Record<string, string>>({});

  // 🎯 Refs for keyboard navigation
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    if (open && examPeriod && cls) {
      loadGrid();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, examPeriod?.id, cls?.id]);

  const loadGrid = async () => {
    if (!examPeriod || !cls) return;
    setLoading(true);
    try {
      const res = await api.get(
        `/schools/exams/grid?examPeriodId=${examPeriod.id}&classId=${cls.id}`,
      );
      const data = res.data.data;

      setStudents(data.students);
      setSubjects(data.subjects);
      setMarks(data.marksMap || {});
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to load grid");
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleMarkChange = (
    studentId: string,
    subjectId: string,
    value: string,
  ) => {
    const clean = value.replace(/[^0-9.]/g, "");
    if (Number(clean) > 100) return;

    setMarks((prev) => ({
      ...prev,
      [`${studentId}|${subjectId}`]: clean,
    }));
  };

  // 🎯 Move focus to a specific cell
  const moveFocus = (studentIdx: number, subjectIdx: number) => {
    const key = `${students[studentIdx]?.id}|${subjects[subjectIdx]?.id}`;
    const input = inputRefs.current[key];
    if (input) {
      input.focus();
      input.select();
    }
  };

  // 🎯 Smart keyboard navigation
  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    studentIndex: number,
    subjectIndex: number,
  ) => {
    const isShift = e.shiftKey;

    const goRight = () => {
      e.preventDefault();
      let nextSubject = subjectIndex + 1;
      let nextStudent = studentIndex;
      if (nextSubject >= subjects.length) {
        nextSubject = 0;
        nextStudent = studentIndex + 1;
      }
      if (nextStudent >= students.length) {
        nextStudent = 0;
        nextSubject = 0;
      }
      moveFocus(nextStudent, nextSubject);
    };

    const goLeft = () => {
      e.preventDefault();
      let prevSubject = subjectIndex - 1;
      let prevStudent = studentIndex;
      if (prevSubject < 0) {
        prevSubject = subjects.length - 1;
        prevStudent = studentIndex - 1;
      }
      if (prevStudent < 0) {
        prevStudent = students.length - 1;
        prevSubject = subjects.length - 1;
      }
      moveFocus(prevStudent, prevSubject);
    };

    const goDown = () => {
      e.preventDefault();
      let nextStudent = studentIndex + 1;
      if (nextStudent >= students.length) {
        nextStudent = 0;
      }
      moveFocus(nextStudent, subjectIndex);
    };

    const goUp = () => {
      e.preventDefault();
      let prevStudent = studentIndex - 1;
      if (prevStudent < 0) {
        prevStudent = students.length - 1;
      }
      moveFocus(prevStudent, subjectIndex);
    };

    if (e.key === "Enter") {
      if (isShift) goLeft();
      else goRight();
      return;
    }

    if (e.key === "ArrowRight") {
      goRight();
      return;
    }

    if (e.key === "ArrowLeft") {
      goLeft();
      return;
    }

    if (e.key === "ArrowDown") {
      goDown();
      return;
    }

    if (e.key === "ArrowUp") {
      goUp();
      return;
    }
  };

  const handleSave = async () => {
    if (!examPeriod || !cls) return;
    setSaving(true);

    try {
      const payload: any[] = [];
      for (const student of students) {
        for (const subject of subjects) {
          const key = `${student.id}|${subject.id}`;
          const markVal = marks[key];
          if (markVal !== undefined && markVal !== "") {
            payload.push({
              studentId: student.id,
              subjectId: subject.id,
              mark: parseFloat(markVal),
            });
          }
        }
      }

      if (payload.length === 0) {
        toast.info("No marks entered to save");
        setSaving(false);
        return;
      }

      await api.post(`/schools/exams/${examPeriod.id}/classes/${cls.id}/grid`, {
        marks: payload,
      });

      toast.success(`${payload.length} marks saved successfully`);
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to save marks");
    } finally {
      setSaving(false);
    }
  };

  if (!open || !examPeriod || !cls) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-2 md:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-7xl h-[95vh] flex flex-col shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50">
          <div>
            <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
              Grade Entry
              <span className="text-xs font-normal px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                {examPeriod.name}
              </span>
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              {cls.name} · {students.length} Students · {subjects.length}{" "}
              Subjects
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={saving || loading}
              className="flex items-center gap-2 bg-[var(--color-primary)] text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-[var(--color-primary-dark)] disabled:opacity-50"
            >
              {saving ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Save size={16} />
              )}
              {saving ? "Saving..." : "Save Grades"}
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-200"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto bg-gray-50 p-4">
          {loading ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 size={32} className="animate-spin text-gray-300" />
            </div>
          ) : subjects.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <AlertCircle size={40} className="text-yellow-500 mb-3" />
              <h4 className="text-lg font-bold text-gray-700">
                No subjects found
              </h4>
              <p className="text-sm text-gray-500 mt-1 max-w-md">
                You need to add subjects to {cls.name} first before you can
                enter grades. Go to Classes → Manage Subjects.
              </p>
            </div>
          ) : students.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <AlertCircle size={40} className="text-yellow-500 mb-3" />
              <h4 className="text-lg font-bold text-gray-700">
                No students found
              </h4>
              <p className="text-sm text-gray-500 mt-1">
                There are no active students in {cls.name}.
              </p>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden inline-block min-w-full shadow-sm">
              <table className="w-full text-sm text-left border-collapse">
                <thead className="bg-gray-100 border-b border-gray-200 sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-gray-700 w-12 text-center border-r border-gray-200">
                      #
                    </th>
                    <th className="px-4 py-3 font-semibold text-gray-700 min-w-[200px] border-r border-gray-200 sticky left-0 bg-gray-100 z-20">
                      Student Name
                    </th>
                    {subjects.map((sub) => (
                      <th
                        key={sub.id}
                        className="px-2 py-3 font-semibold text-gray-600 text-center border-r border-gray-200 min-w-[100px]"
                      >
                        {sub.name}
                        {sub.code && (
                          <span className="block text-[10px] text-gray-400 font-normal">
                            {sub.code}
                          </span>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {students.map((student, studentIdx) => {
                    const droppedIds = student.studentSubjects.map(
                      (s: any) => s.subjectId,
                    );

                    return (
                      <tr
                        key={student.id}
                        className="hover:bg-blue-50/30 transition-colors"
                      >
                        <td className="px-4 py-2 text-center text-gray-400 text-xs border-r border-gray-100">
                          {studentIdx + 1}
                        </td>
                        <td className="px-4 py-2 border-r border-gray-100 sticky left-0 bg-white group-hover:bg-blue-50/30">
                          <p className="font-medium text-gray-800">
                            {student.fullName}
                          </p>
                          <p className="text-[11px] text-gray-400 font-mono">
                            {student.studentCode}
                          </p>
                        </td>
                        {subjects.map((sub, subjectIdx) => {
                          const isDropped = droppedIds.includes(sub.id);
                          const key = `${student.id}|${sub.id}`;

                          return (
                            <td
                              key={sub.id}
                              className="p-1 border-r border-gray-100"
                            >
                              <input
                                ref={(el) => {
                                  inputRefs.current[key] = el;
                                }}
                                type="text"
                                inputMode="decimal"
                                disabled={isDropped}
                                value={marks[key] || ""}
                                onChange={(e) =>
                                  handleMarkChange(
                                    student.id,
                                    sub.id,
                                    e.target.value,
                                  )
                                }
                                onKeyDown={(e) =>
                                  handleKeyDown(e, studentIdx, subjectIdx)
                                }
                                placeholder={isDropped ? "Dropped" : "-"}
                                className={`w-full h-9 text-center rounded border transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] ${
                                  isDropped
                                    ? "bg-gray-100 border-transparent text-gray-400 cursor-not-allowed placeholder-red-300"
                                    : marks[key]
                                      ? "bg-white border-gray-300 font-bold text-gray-800"
                                      : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
                                }`}
                              />
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-100 bg-gray-50 text-xs text-gray-500 flex flex-wrap items-center gap-x-4 gap-y-1">
          <span>
            💡 <strong>Tip:</strong>
          </span>
          <span>
            <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded text-[10px]">
              Enter
            </kbd>{" "}
            or{" "}
            <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded text-[10px]">
              →
            </kbd>{" "}
            next mark
          </span>
          <span>
            <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded text-[10px]">
              ←
            </kbd>{" "}
            previous mark
          </span>
          <span>
            <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded text-[10px]">
              ↑
            </kbd>{" "}
            <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded text-[10px]">
              ↓
            </kbd>{" "}
            change student
          </span>
        </div>
      </div>
    </div>
  );
}
