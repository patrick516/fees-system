import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../../store/authStore";
import { Bell } from "lucide-react";
import api from "../../../lib/axios";

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

  const title = pageTitles[location.pathname] || "SchoolPay";
  const greeting = new Date().getHours() < 12 ? "morning" : "afternoon";

  const fetchPendingCount = async () => {
    try {
      const res = await api.get("/payments/pending");
      setPendingCount(res.data.data?.length || 0);
    } catch {
      /* silent — bell just stays at its last value */
    }
  };

  // Fetch on mount + poll every 30s to pick up new parent submissions
  useEffect(() => {
    fetchPendingCount();
    const interval = setInterval(fetchPendingCount, 30_000);
    return () => clearInterval(interval);
  }, []);

  // Refetch whenever the route changes — so verifying a payment on
  // /payments/pending reduces the badge when the admin navigates away
  useEffect(() => {
    fetchPendingCount();
  }, [location.pathname]);

  const handleBellClick = () => {
    navigate("/payments/pending");
  };

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
      <h1 className="text-xl font-semibold text-gray-800">{title}</h1>
      <div className="flex items-center gap-4">
        <button
          onClick={handleBellClick}
          className="relative p-2 text-gray-500 hover:text-gray-700 transition-colors"
          aria-label={
            pendingCount > 0
              ? `${pendingCount} pending payments`
              : "Notifications"
          }
        >
          <Bell size={20} />
          {pendingCount > 0 && (
            <span
              className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center leading-none"
              aria-hidden
            >
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
  );
};

export default Topbar;
