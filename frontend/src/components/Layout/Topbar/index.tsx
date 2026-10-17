import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../../store/authStore";
import { Bell, CreditCard } from "lucide-react";
import api from "../../../lib/axios";
import SubscriptionPaymentModal from "../../Subscription/SubscriptionPaymentModal";

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/students": "Students",
  "/students/add": "Add Student",
  "/payments": "Payments",
  "/payments/record": "Record Payment",
  "/payments/pending": "Pending Payments",
  "/classes": "Classes & Fee Structures",
  "/reports": "Reports",
  "/sms": "Send SMS",
};

const Topbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { staff } = useAuthStore();
  const [pendingCount, setPendingCount] = useState(0);
  const [showPayModal, setShowPayModal] = useState(false);

  const title = pageTitles[location.pathname] || "SchoolPay";
  const greeting = new Date().getHours() < 12 ? "morning" : "afternoon";

  // ==================== CALCULATE TRIAL DAYS ====================
  const school = staff?.school as any;
  let daysLeft = 0;
  let statusLabel = "";
  let badgeColor = "bg-gray-100 text-gray-600";

  if (school) {
    const now = new Date();
    const trial = school.trialEndsAt ? new Date(school.trialEndsAt) : null;
    const sub = school.subscriptionEndsAt
      ? new Date(school.subscriptionEndsAt)
      : null;

    const end = sub && sub > now ? sub : trial;

    if (end) {
      daysLeft = Math.ceil(
        (end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );
    }

    if (school.subscriptionStatus === "TRIAL") {
      statusLabel = `${daysLeft} days left`;
      badgeColor =
        daysLeft <= 7
          ? "bg-orange-100 text-orange-700"
          : "bg-blue-100 text-blue-700";
    } else if (school.subscriptionStatus === "ACTIVE") {
      statusLabel = `Active: ${daysLeft} days left`;
      badgeColor = "bg-green-100 text-green-700";
    } else if (school.subscriptionStatus === "GRACE") {
      statusLabel = `Grace Period`;
      badgeColor = "bg-yellow-100 text-yellow-800";
    } else if (
      school.subscriptionStatus === "READONLY" ||
      school.subscriptionStatus === "LOCKED"
    ) {
      statusLabel = `Expired`;
      badgeColor = "bg-red-100 text-red-700";
    }
  }

  // 🎯 Milestone Logic
  // Show badge if it's a new trial (>= 28 days), halfway (15 days), or warning (<= 7 days)
  const showBadge =
    school &&
    (school.subscriptionStatus === "TRIAL" ||
      school.subscriptionStatus === "ACTIVE") &&
    (daysLeft <= 7 || daysLeft === 15 || daysLeft >= 28);

  // Show pay button if 5 days left, or already in grace/locked
  const showPayButton =
    school &&
    (daysLeft <= 5 ||
      school.subscriptionStatus === "GRACE" ||
      school.subscriptionStatus === "READONLY" ||
      school.subscriptionStatus === "LOCKED");

  const fetchPendingCount = async () => {
    try {
      const res = await api.get("/payments/pending");
      setPendingCount(res.data.data?.length || 0);
    } catch {}
  };

  useEffect(() => {
    fetchPendingCount();
    const interval = setInterval(fetchPendingCount, 30_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchPendingCount();
  }, [location.pathname]);

  return (
    <>
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-800">{title}</h1>

        <div className="flex items-center gap-4">
          {/* Subscription Badge & Button */}
          {school && (showBadge || showPayButton) && (
            <div className="flex items-center gap-3 mr-2 border-r border-gray-200 pr-4">
              {showBadge && (
                <span
                  className={`text-xs font-semibold px-3 py-1 rounded-full ${badgeColor}`}
                >
                  {statusLabel}
                </span>
              )}
              {showPayButton && (
                <button
                  onClick={() => setShowPayModal(true)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 px-3 py-1.5 rounded-lg transition"
                >
                  <CreditCard size={14} /> Pay Subscription
                </button>
              )}
            </div>
          )}

          {/* Bell */}
          <button
            onClick={() => navigate("/payments/pending")}
            className="relative p-2 text-gray-500 hover:text-gray-700 transition-colors"
          >
            <Bell size={20} />
            {pendingCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center leading-none">
                {pendingCount > 99 ? "99+" : pendingCount}
              </span>
            )}
          </button>

          <div className="text-sm text-gray-600">
            Good {greeting},{" "}
            <span className="font-medium text-gray-800">
              {staff?.fullName || "there"}
            </span>
          </div>
        </div>
      </header>

      <SubscriptionPaymentModal
        isOpen={showPayModal}
        onClose={() => setShowPayModal(false)}
      />
    </>
  );
};

export default Topbar;
