import { useLocation } from "react-router-dom";
import { useAuthStore } from "../../../store/authStore";
import { Bell } from "lucide-react";

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
  const { staff } = useAuthStore();
  const title = pageTitles[location.pathname] || "SchoolPay";

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
      <h1 className="text-xl font-semibold text-gray-800">{title}</h1>
      <div className="flex items-center gap-4">
        <button className="relative p-2 text-gray-500 hover:text-gray-700">
          <Bell size={20} />
        </button>
        <div className="text-sm text-gray-600">
          Good {new Date().getHours() < 12 ? "morning" : "afternoon"},{" "}
          <span className="font-medium text-gray-800">
            {staff?.fullName.split(" ")[0]}
          </span>
        </div>
      </div>
    </header>
  );
};

export default Topbar;
