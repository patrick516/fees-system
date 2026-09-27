"use client";
import { useEffect, useState } from "react";
import { BookOpen, Trophy, Medal } from "lucide-react";
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

  const isLetter = results.gradingSystem === "LETTER";

  // Progress bar fill — position 1 = 100%, bottom = ~5%
  const barWidth =
    results.position && results.classSize
      ? Math.max(
          5,
          Math.round((1 - (results.position - 1) / results.classSize) * 100),
        )
      : 100;

  // Colour the badge based on how well the student did
  const rankTone =
    results.percentile == null
      ? "gray"
      : results.percentile <= 10
        ? "gold"
        : results.percentile <= 33
          ? "silver"
          : results.percentile <= 66
            ? "bronze"
            : "gray";

  const toneClasses: Record<string, string> = {
    gold: "bg-yellow-50 border-yellow-200",
    silver: "bg-slate-50 border-slate-200",
    bronze: "bg-amber-50 border-amber-200",
    gray: "bg-gray-50 border-gray-200",
  };

  const toneIconColors: Record<string, string> = {
    gold: "text-yellow-600",
    silver: "text-slate-500",
    bronze: "text-amber-700",
    gray: "text-gray-400",
  };

  return (
    <div className="space-y-3">
      {/* ============ RANK CARD ============ */}
      {results.position && results.classSize > 0 && (
        <div
          className={`rounded-xl shadow-sm border p-4 ${toneClasses[rankTone]}`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-xl bg-white flex items-center justify-center shrink-0 ${toneIconColors[rankTone]}`}
            >
              <Trophy size={22} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                Class Position
              </p>
              <p className="text-2xl font-bold text-gray-800 leading-tight">
                {results.position}
                <span className="text-sm font-medium text-gray-500 ml-1">
                  of {results.classSize}
                </span>
              </p>
            </div>
            {results.percentile != null && results.percentile <= 10 && (
              <span className="text-[10px] px-2 py-1 rounded-full bg-yellow-500 text-white font-bold shrink-0">
                TOP {results.percentile}%
              </span>
            )}
          </div>

          {/* Progress bar */}
          <div className="mt-3">
            <div className="w-full bg-white/70 rounded-full h-2 overflow-hidden">
              <div
                className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-blue-700 transition-all"
                style={{ width: `${barWidth}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-gray-500 mt-1.5">
              <span>
                {isLetter ? (
                  <>
                    Average:{" "}
                    <span className="font-semibold text-gray-700">
                      {results.averageMark}%
                    </span>{" "}
                    • Grade:{" "}
                    <span className="font-semibold text-gray-700">
                      {results.overallGrade}
                    </span>
                  </>
                ) : (
                  <>
                    Total Points:{" "}
                    <span className="font-semibold text-gray-700">
                      {results.totalPoints}
                    </span>{" "}
                    <span className="text-gray-400">
                      (best {results.subjectsCounted})
                    </span>
                  </>
                )}
              </span>
              {results.percentile != null && (
                <span>
                  Top{" "}
                  <span className="font-semibold text-gray-700">
                    {results.percentile}%
                  </span>
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============ CLASS TOP 3 ============ */}
      {results.topThree && results.topThree.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
            <Medal size={14} className="text-yellow-500" />
            <h3 className="text-xs font-semibold text-gray-700">
              Class Top 3 — {results.examPeriod.name}
            </h3>
          </div>
          <div className="divide-y divide-gray-50">
            {results.topThree.map((t: any) => {
              const medal =
                t.position === 1 ? "🥇" : t.position === 2 ? "🥈" : "🥉";
              return (
                <div
                  key={t.position}
                  className={`px-4 py-2.5 flex items-center justify-between ${
                    t.isCurrentStudent ? "bg-blue-50/60" : ""
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-base shrink-0">{medal}</span>
                    <span
                      className={`text-sm truncate ${
                        t.isCurrentStudent
                          ? "font-semibold text-blue-900"
                          : "text-gray-700"
                      }`}
                    >
                      {t.fullName}
                    </span>
                    {t.isCurrentStudent && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 font-semibold shrink-0">
                        You
                      </span>
                    )}
                  </div>
                  <span
                    className={`text-sm font-semibold shrink-0 ml-2 ${
                      t.isCurrentStudent ? "text-blue-900" : "text-gray-700"
                    }`}
                  >
                    {isLetter ? `${t.value}%` : `${t.value} pts`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ============ MARKS TABLE ============ */}
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
            {isLetter ? (
              <span className="text-sm font-bold text-blue-900">
                Average: {results.averageMark}% — Overall Grade:{" "}
                {results.overallGrade}
              </span>
            ) : (
              <span className="text-sm font-bold text-blue-900">
                Best {results.subjectsCounted} Points Total:{" "}
                {results.totalPoints}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
