import { useEffect, useState } from "react";
import {
  Users,
  ArrowUpCircle,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  X,
} from "lucide-react";
import api from "../../lib/axios";
type TierKey = "SMALL" | "MEDIUM" | "LARGE";

const TIER_NAMES: Record<TierKey, string> = {
  SMALL: "Small School",
  MEDIUM: "Medium School",
  LARGE: "Large School",
};

const TIER_PRICES: Record<TierKey, number> = {
  SMALL: 150000,
  MEDIUM: 250000,
  LARGE: 400000,
};

const TIER_STUDENT_LIMITS: Record<TierKey, string> = {
  SMALL: "150",
  MEDIUM: "400",
  LARGE: "Unlimited",
};

const TIER_ORDER: Record<TierKey, number> = {
  SMALL: 1,
  MEDIUM: 2,
  LARGE: 3,
};

const TIER_KEYS: TierKey[] = ["SMALL", "MEDIUM", "LARGE"];

export default function TierStatusCard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgrading, setUpgrading] = useState(false);

  useEffect(() => {
    api
      .get("/schools/tier-status")
      .then((res) => setData(res.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleUpgrade = async () => {
    setUpgrading(true);
    try {
      //  In a full implementation, this triggers a new OneKhusa payment for the difference
      // or sends a request to the platform owner.
      await new Promise((r) => setTimeout(r, 1200)); // Mock API call
      setShowUpgradeModal(false);
      // Refresh local state (mock upgrade to LARGE for demonstration)
      setData({ ...data, tier: "LARGE", maxStudents: 99999, percentUsed: 0 });
    } catch {
      // handle error
    } finally {
      setUpgrading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center justify-center h-24">
        <Loader2 size={20} className="animate-spin text-gray-300" />
      </div>
    );
  }

  if (!data) return null;

  //  Safely cast the tier from the API to our union type
  const currentTier = (data.tier as TierKey) || "SMALL";
  const isNearLimit = data.percentUsed >= 90 && data.percentUsed < 100;
  const isAtLimit = data.percentUsed >= 100;

  //  Filter available upgrade options
  const upgradeOptions = TIER_KEYS.filter(
    (key) => TIER_ORDER[key] > TIER_ORDER[currentTier],
  );

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-gray-400" />
            <h3 className="font-medium text-gray-800">Plan & Student Limits</h3>
          </div>
          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
            {TIER_NAMES[currentTier] || currentTier}
          </span>
        </div>

        <div className="p-5">
          <div className="flex items-end justify-between mb-2">
            <div>
              <p className="text-sm font-medium text-gray-900">
                {data.activeStudents}{" "}
                <span className="text-gray-400">
                  / {data.maxStudents} students
                </span>
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Active students enrolled
              </p>
            </div>
            {isAtLimit ? (
              <span className="flex items-center gap-1 text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded-md">
                <AlertTriangle size={12} /> Limit Reached
              </span>
            ) : isNearLimit ? (
              <span className="flex items-center gap-1 text-xs font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded-md">
                <AlertTriangle size={12} /> Almost Full
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-md">
                <CheckCircle2 size={12} /> Healthy
              </span>
            )}
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-100 rounded-full h-2.5 mb-5 overflow-hidden">
            <div
              className={`h-2.5 rounded-full transition-all ${
                isAtLimit
                  ? "bg-red-500"
                  : isNearLimit
                    ? "bg-orange-500"
                    : "bg-[var(--color-primary)]"
              }`}
              style={{ width: `${Math.max(2, data.percentUsed)}%` }}
            />
          </div>

          <div className="flex items-center justify-between bg-slate-50 rounded-lg p-3">
            <div>
              <p className="text-xs font-semibold text-gray-700">
                Need more space?
              </p>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Upgrade to unlock more students.
              </p>
            </div>
            <button
              onClick={() => setShowUpgradeModal(true)}
              disabled={upgradeOptions.length === 0}
              className="flex items-center gap-1.5 bg-white border border-gray-200 text-gray-700 hover:bg-gray-100 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ArrowUpCircle size={14} /> Upgrade
            </button>
          </div>
        </div>
      </div>

      {/*  UPGRADE MODAL */}
      {showUpgradeModal && (
        <div
          className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm"
          onClick={() => !upgrading && setShowUpgradeModal(false)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">
                Upgrade Your Plan
              </h3>
              <button
                onClick={() => !upgrading && setShowUpgradeModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>

            <div className="px-6 py-5">
              <p className="text-sm text-slate-600 mb-4">
                You are currently on the{" "}
                <strong>{TIER_NAMES[currentTier]}</strong> plan. Choose a new
                plan to increase your student limit.
              </p>

              <div className="space-y-3">
                {upgradeOptions.length === 0 ? (
                  <div className="text-center py-6 text-sm text-slate-500">
                    You are already on the highest plan available.
                  </div>
                ) : (
                  upgradeOptions.map((key) => (
                    <div
                      key={key}
                      className="flex items-center justify-between p-4 border border-slate-200 rounded-xl hover:border-[var(--color-primary)]/50 transition-colors cursor-pointer"
                      onClick={handleUpgrade}
                    >
                      <div>
                        <p className="text-sm font-bold text-slate-900">
                          {TIER_NAMES[key]}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Up to {TIER_STUDENT_LIMITS[key]} students
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-[var(--color-primary)]">
                          MWK {TIER_PRICES[key].toLocaleString()}
                        </p>
                        <p className="text-[10px] text-slate-400">per term</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                onClick={() => setShowUpgradeModal(false)}
                disabled={upgrading}
                className="px-5 py-2.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-200/50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              {upgradeOptions.length > 0 && (
                <button
                  onClick={handleUpgrade}
                  disabled={upgrading}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] transition-colors disabled:opacity-50"
                >
                  {upgrading ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <ArrowUpCircle size={14} />
                  )}
                  {upgrading ? "Processing..." : "Confirm Upgrade"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
