import { useEffect, useState } from "react";
import {
  Users,
  ArrowUpCircle,
  AlertTriangle,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import api from "../../lib/axios";
import SubscriptionPaymentModal from "../Subscription/SubscriptionPaymentModal";

type TierKey = "SMALL" | "MEDIUM" | "LARGE";

const TIER_NAMES: Record<TierKey, string> = {
  SMALL: "Small School",
  MEDIUM: "Medium School",
  LARGE: "Large School",
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

export default function TierStatusCard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showPayModal, setShowPayModal] = useState(false);

  const fetchTierStatus = () => {
    api
      .get("/schools/tier-status")
      .then((res) => setData(res.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTierStatus();
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center justify-center h-24">
        <Loader2 size={20} className="animate-spin text-gray-300" />
      </div>
    );
  }

  if (!data) return null;

  const currentTier = (data.tier as TierKey) || "SMALL";
  const isNearLimit = data.percentUsed >= 90 && data.percentUsed < 100;
  const isAtLimit = data.percentUsed >= 100;

  // 🎯 Allow upgrade if there are higher tiers available
  const hasUpgradeOption =
    TIER_ORDER.SMALL < TIER_ORDER.LARGE &&
    TIER_ORDER[currentTier] < TIER_ORDER.LARGE;

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
                {currentTier === "LARGE"
                  ? "You are on the highest plan available."
                  : "Upgrade to unlock more students."}
              </p>
            </div>
            <button
              onClick={() => setShowPayModal(true)}
              disabled={!hasUpgradeOption}
              className="flex items-center gap-1.5 bg-white border border-gray-200 text-gray-700 hover:bg-gray-100 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ArrowUpCircle size={14} /> Upgrade
            </button>
          </div>
        </div>
      </div>

      {/* 🎯 Real OneKhusa payment modal */}
      <SubscriptionPaymentModal
        isOpen={showPayModal}
        onClose={() => {
          setShowPayModal(false);
          // Refresh in case webhook already fired
          fetchTierStatus();
        }}
      />
    </>
  );
}
