import { Trophy } from "lucide-react";

interface Props {
  position: number;
  classSize: number;
  percentile: number | null;
  isLetter: boolean;
  averageMark: number;
  overallGrade: string;
  totalPoints: number;
  subjectsCounted: number;
}

export default function RankCard({
  position,
  classSize,
  percentile,
  isLetter,
  averageMark,
  overallGrade,
  totalPoints,
  subjectsCounted,
}: Props) {
  const barWidth = Math.max(
    5,
    Math.round((1 - (position - 1) / classSize) * 100),
  );

  const rankTone =
    percentile == null
      ? "gray"
      : percentile <= 10
        ? "gold"
        : percentile <= 33
          ? "silver"
          : percentile <= 66
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
    <div className={`rounded-xl shadow-sm border p-4 ${toneClasses[rankTone]}`}>
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
            {position}{" "}
            <span className="text-sm font-medium text-gray-500 ml-1">
              of {classSize}
            </span>
          </p>
        </div>
        {percentile != null && percentile <= 10 && (
          <span className="text-[10px] px-2 py-1 rounded-full bg-yellow-500 text-white font-bold shrink-0">
            TOP {percentile}%
          </span>
        )}
      </div>

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
                  {averageMark}%
                </span>{" "}
                • Grade:{" "}
                <span className="font-semibold text-gray-700">
                  {overallGrade}
                </span>
              </>
            ) : (
              <>
                Total Points:{" "}
                <span className="font-semibold text-gray-700">
                  {totalPoints}
                </span>{" "}
                <span className="text-gray-400">(best {subjectsCounted})</span>
              </>
            )}
          </span>
          {percentile != null && (
            <span>
              Top{" "}
              <span className="font-semibold text-gray-700">{percentile}%</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
