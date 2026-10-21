import { useState } from "react";
import { CreditCard, CheckCircle2 } from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import SubscriptionPaymentModal from "../Subscription/SubscriptionPaymentModal";

export default function SubscriptionCard() {
  const [showPayModal, setShowPayModal] = useState(false);
  const { staff } = useAuthStore();
  const school = staff?.school as any;

  if (!school) return null;

  const now = new Date();
  const trial = school.trialEndsAt ? new Date(school.trialEndsAt) : null;
  const sub = school.subscriptionEndsAt
    ? new Date(school.subscriptionEndsAt)
    : null;

  const end = sub && sub > now ? sub : trial;
  const daysLeft = end
    ? Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  // 🎯 The logic you requested: Only show the button if they are near expiration
  // or already in Grace/ReadOnly/Locked status.
  const showPayButton =
    daysLeft <= 7 ||
    school.subscriptionStatus === "GRACE" ||
    school.subscriptionStatus === "READONLY" ||
    school.subscriptionStatus === "LOCKED";

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <CreditCard size={16} className="text-gray-400" />
          <h3 className="font-medium text-gray-800">Subscription</h3>
        </div>
        <span
          className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
            school.subscriptionStatus === "ACTIVE"
              ? "bg-green-100 text-green-700"
              : school.subscriptionStatus === "TRIAL"
                ? "bg-blue-100 text-blue-700"
                : "bg-red-100 text-red-700"
          }`}
        >
          {school.subscriptionStatus}
        </span>
      </div>

      <div className="p-5 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-900">
            {school.subscriptionStatus === "TRIAL"
              ? "Free Trial"
              : "Term Subscription"}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {end && daysLeft > 0
              ? `Expires on ${end.toLocaleDateString()} (${daysLeft} days left)`
              : "Expired"}
          </p>
        </div>

        {/* 🎯 CONDITIONAL RENDERING HERE */}
        {showPayButton ? (
          <button
            onClick={() => setShowPayModal(true)}
            className="rounded-lg bg-[var(--color-primary)] hover:opacity-90 text-white text-sm font-semibold px-4 py-2 transition-opacity"
          >
            Pay Now
          </button>
        ) : (
          <div className="flex items-center gap-1.5 text-sm font-medium text-green-600 bg-green-50 px-3 py-1.5 rounded-lg border border-green-100">
            <CheckCircle2 size={16} />
            Active
          </div>
        )}
      </div>

      <SubscriptionPaymentModal
        isOpen={showPayModal}
        onClose={() => setShowPayModal(false)}
      />
    </div>
  );
}
