// frontend/src/components/shared/PasswordStrengthMeter.tsx
import { Check, X } from "lucide-react";
import { validatePassword, getRequirements } from "../../lib/passwordPolicy";

interface Props {
  password: string;
  /** Optional: show the checklist of requirements below the bar */
  showChecklist?: boolean;
}

const SCORE_COLORS = [
  "bg-gray-200", // 0 - empty
  "bg-red-500", // 1 - very weak
  "bg-orange-500", // 2 - weak
  "bg-yellow-500", // 3 - fair
  "bg-green-500", // 4 - strong
];

const TEXT_COLORS = [
  "text-gray-400",
  "text-red-600",
  "text-orange-600",
  "text-yellow-600",
  "text-green-600",
];

const PasswordStrengthMeter = ({ password, showChecklist = true }: Props) => {
  const { score, label, valid } = validatePassword(password);
  const requirements = getRequirements(password);

  // Nothing to show if the field is empty
  if (!password) return null;

  return (
    <div className="mt-2 space-y-2">
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
          className={`text-xs font-medium ${TEXT_COLORS[score]} min-w-[80px] text-right`}
        >
          {label}
        </span>
      </div>

      {/* Requirements checklist */}
      {showChecklist && (
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

      {/* "All requirements met" nudge */}
      {valid && (
        <p className="text-xs text-green-600 font-medium flex items-center gap-1">
          <Check size={12} strokeWidth={3} /> Password meets all requirements
        </p>
      )}
    </div>
  );
};

export default PasswordStrengthMeter;
