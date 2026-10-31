interface Props {
  examName: string;
  term: string;
  academicYear: string;
  results: any[];
  isLetter: boolean;
  totalMarks: number;
  totalPoints: number;
  subjectsCounted: number;
  averageMark: number;
  overallGrade: string;
}

export default function MarksTable({
  examName,
  term,
  academicYear,
  results,
  isLetter,
  totalMarks,
  totalPoints,
  subjectsCounted,
  averageMark,
  overallGrade,
}: Props) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-800">{examName}</h2>
        <p className="text-xs text-gray-500">
          {term.replace("_", " ")} {academicYear}
        </p>
      </div>
      <div className="divide-y divide-gray-100">
        {results.map((r: any, i: number) => (
          <div
            key={i}
            className={`px-4 py-3 flex items-center justify-between ${r.countedInTotal ? "bg-green-50/50" : ""}`}
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
              {isLetter ? (
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                  {r.gradeLabel}
                </span>
              ) : (
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${r.countedInTotal ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}
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
            Total Marks (all subjects): {totalMarks}
          </span>
        </div>
        <div className="flex justify-between">
          {isLetter ? (
            <span className="text-sm font-bold text-blue-900">
              Average: {averageMark}% — Overall Grade: {overallGrade}
            </span>
          ) : (
            <span className="text-sm font-bold text-blue-900">
              Best {subjectsCounted} Points Total: {totalPoints}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
