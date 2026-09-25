"use client";
import { useEffect, useState } from "react";
import { BookOpen } from "lucide-react";
import api from "../../lib/axios";

export default function ResultsView({ studentId }: { studentId: string }) {
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const res = await api.get(`/exams/student-results/${studentId}`);
        setResults(res.data.data);
      } catch (err: any) {
        setError(err.response?.data?.message || "Results not available yet");
      } finally {
        setLoading(false);
      }
    };
    fetchResults();
  }, [studentId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-900" />
      </div>
    );
  }

  if (error || !results) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center text-gray-400">
        <BookOpen size={32} className="mx-auto mb-2 opacity-50" />
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-800">
          {results.examPeriod.name}
        </h2>
        <p className="text-xs text-gray-500">
          {results.examPeriod.term.replace("_", " ")}{" "}
          {results.examPeriod.academicYear}
        </p>
      </div>
      <div className="divide-y divide-gray-100">
        {results.results.map((r: any, i: number) => (
          <div
            key={i}
            className={`px-4 py-3 flex items-center justify-between ${
              r.countedInTotal ? "bg-green-50/50" : ""
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-700">{r.subject}</span>
              {r.countedInTotal && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-100 text-green-700 font-medium">
                  Counted
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-800">
                {r.mark}%
              </span>
              {results.gradingSystem === "LETTER" ? (
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                  {r.gradeLabel}
                </span>
              ) : (
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    r.countedInTotal
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  Point {r.gradePoint}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
        <div className="flex justify-between mb-1">
          <span className="text-sm font-semibold text-gray-700">
            Total Marks (all subjects): {results.totalMarks}
          </span>
        </div>
        <div className="flex justify-between">
          {results.gradingSystem === "LETTER" ? (
            <span className="text-sm font-bold text-blue-900">
              Average: {results.averageMark}% — Overall Grade:{" "}
              {results.overallGrade}
            </span>
          ) : (
            <span className="text-sm font-bold text-blue-900">
              Best {results.subjectsCounted} Points Total: {results.totalPoints}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
