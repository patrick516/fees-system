// frontend/src/components/shared/PasswordStrengthMeter.tsx
import { Check, X } from "lucide-react";
import { validatePassword, getRequirements } from "../../lib/passwordPolicy";

interface Props {
  password: string;
  /** Show the checklist of requirements below the bar */
  showChecklist?: boolean;
  /** Compact mode: inline chips instead of a vertical list (for tight layouts) */
  compact?: boolean;
}

const SCORE_COLORS = [
  "bg-gray-200",
  "bg-red-500",
  "bg-orange-500",
  "bg-yellow-500",
  "bg-green-500",
];

const TEXT_COLORS = [
  "text-gray-400",
  "text-red-600",
  "text-orange-600",
  "text-yellow-600",
  "text-green-600",
];

const PasswordStrengthMeter = ({
  password,
  showChecklist = true,
  compact = false,
}: Props) => {
  const { score, label, valid } = validatePassword(password);
  const requirements = getRequirements(password);

  if (!password) return null;

  return (
    <div className={compact ? "mt-1.5 space-y-1.5" : "mt-2 space-y-2"}>
      {/* Strength bar */}
      <div className="flex items-center gap-2">
        <div className="flex-1 flex gap-1">
          {[1, 2, 3, 4].map((segment) => (
            <div
              key={segment}
              className={`h-1.5 flex-1 rounded-full transition-colors duration-200 ${
                segment <= score ? SCORE_COLORS[score] : "bg-gray-200"
              }`}
            />
          ))}
        </div>
        <span
          className={`text-xs font-medium ${TEXT_COLORS[score]} ${
            compact ? "min-w-[70px]" : "min-w-[80px]"
          } text-right`}
        >
          {label}
        </span>
      </div>

      {/* COMPACT: inline chips */}
      {compact && showChecklist && (
        <div className="flex flex-wrap gap-1">
          {requirements.map((req) => (
            <span
              key={req.label}
              className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium transition-colors ${
                req.met
                  ? "bg-green-100 text-green-700"
                  : "bg-gray-100 text-gray-400"
              }`}
            >
              {req.met ? "✓ " : ""}
              {req.short}
            </span>
          ))}
        </div>
      )}

      {/* FULL: vertical checklist */}
      {!compact && showChecklist && (
        <ul className="space-y-1 pt-1">
          {requirements.map((req) => (
            <li
              key={req.label}
              className={`flex items-center gap-1.5 text-xs transition-colors ${
                req.met ? "text-green-600" : "text-gray-400"
              }`}
            >
              {req.met ? (
                <Check size={12} strokeWidth={3} />
              ) : (
                <X size={12} strokeWidth={3} />
              )}
              <span>{req.label}</span>
            </li>
          ))}
        </ul>
      )}

      {valid && !compact && (
        <p className="text-xs text-green-600 font-medium flex items-center gap-1">
          <Check size={12} strokeWidth={3} /> Password meets all requirements
        </p>
      )}
    </div>
  );
};

export default PasswordStrengthMeter;
