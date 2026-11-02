import { useEffect, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../../store/authStore";
import {
  Bell,
  CreditCard,
  LogOut,
  User,
  ChevronDown,
  Settings,
} from "lucide-react";
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
  const { staff, logout } = useAuthStore();
  const [pendingCount, setPendingCount] = useState(0);
  const [showPayModal, setShowPayModal] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  const title = pageTitles[location.pathname] || "SchoolPay";

  // 🎯 Close profile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        profileRef.current &&
        !profileRef.current.contains(event.target as Node)
      ) {
        setShowProfileMenu(false);
      }
    };
    if (showProfileMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showProfileMenu]);

  // Subscription trial days
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
      statusLabel = `Trial • ${daysLeft} days left`;
      badgeColor =
        daysLeft <= 7
          ? "bg-orange-100 text-orange-700"
          : "bg-blue-100 text-blue-700";
    } else if (school.subscriptionStatus === "ACTIVE") {
      statusLabel = `Paid • ${daysLeft} days left`;
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

  const handleLogout = () => {
    localStorage.removeItem("activeSchoolId");
    localStorage.removeItem("isViewingAsGroupAdmin");
    logout();
    navigate("/login");
  };

  const isGroupAdmin = staff?.isGroupAdmin || false;

  return (
    <>
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-800">{title}</h1>

        <div className="flex items-center gap-3">
          {/* Subscription Badge & Button */}
          {school && (
            <div className="flex items-center gap-2 border-r border-gray-200 pr-3">
              <span
                className={`text-xs font-semibold px-3 py-1 rounded-full ${badgeColor}`}
              >
                {statusLabel}
              </span>
              {showPayButton && (
                <button
                  onClick={() => setShowPayModal(true)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 px-3 py-1.5 rounded-lg transition"
                >
                  <CreditCard size={14} /> Pay
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

          {/* 🎯 Profile Dropdown */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-2 pl-2 pr-3 py-1.5 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <div className="w-8 h-8 bg-[var(--color-primary)] rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0">
                {staff?.fullName?.charAt(0)?.toUpperCase() || "?"}
              </div>
              <div className="hidden md:block text-left min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate max-w-[150px]">
                  {staff?.fullName || "User"}
                </p>
                <p className="text-[10px] text-gray-500 truncate max-w-[150px]">
                  {isGroupAdmin ? "Group Director" : staff?.role?.name || "—"}
                </p>
              </div>
              <ChevronDown
                size={14}
                className={`text-gray-400 transition-transform ${
                  showProfileMenu ? "rotate-180" : ""
                }`}
              />
            </button>

            {showProfileMenu && (
              <div className="absolute top-full right-0 mt-2 w-56 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden z-50">
                {/* User info */}
                <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                  <p className="text-sm font-semibold text-gray-800 truncate">
                    {staff?.fullName || "User"}
                  </p>
                  <p className="text-xs text-gray-500 truncate mt-0.5">
                    {staff?.email || "—"}
                  </p>
                  <span className="inline-block mt-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--color-primary-light)] text-[var(--color-primary-dark)]">
                    {isGroupAdmin ? "Group Director" : staff?.role?.name || "—"}
                  </span>
                </div>

                {/* Menu items */}
                <div className="py-1">
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      navigate("/settings");
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Settings size={16} className="text-gray-400" />
                    Settings
                  </button>
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      // Future: go to profile page
                    }}
                    disabled
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-400 cursor-not-allowed"
                  >
                    <User size={16} className="text-gray-300" />
                    Profile (soon)
                  </button>
                </div>

                {/* Logout */}
                <div className="border-t border-gray-100 py-1">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors font-medium"
                  >
                    <LogOut size={16} />
                    Logout
                  </button>
                </div>
              </div>
            )}
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
