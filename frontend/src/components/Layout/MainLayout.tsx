// frontend/src/components/Layout/MainLayout.tsx
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar/index";
import Topbar from "./Topbar/index";
import { useAuthStore } from "../../store/authStore";
import { AlertTriangle, Lock } from "lucide-react";

const MainLayout = () => {
  const { staff } = useAuthStore();
  const school = staff?.school as any;

  let banner = null;
  if (school) {
    const now = new Date();
    const trial = school.trialEndsAt ? new Date(school.trialEndsAt) : null;
    const sub = school.subscriptionEndsAt
      ? new Date(school.subscriptionEndsAt)
      : null;
    const end = sub && sub > now ? sub : trial;
    const daysLeft = end
      ? Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    if (
      school.subscriptionStatus === "GRACE" ||
      (school.subscriptionStatus === "TRIAL" && daysLeft <= 7)
    ) {
      banner = (
        <div className="bg-orange-50 border-b border-orange-200 px-6 py-2 flex items-center justify-center gap-2 text-sm text-orange-800 font-medium">
          <AlertTriangle size={16} /> Your subscription expires in {daysLeft}{" "}
          days. Please pay to avoid interruption.
        </div>
      );
    } else if (
      school.subscriptionStatus === "READONLY" ||
      school.subscriptionStatus === "LOCKED"
    ) {
      banner = (
        <div className="bg-red-50 border-b border-red-200 px-6 py-2 flex items-center justify-center gap-2 text-sm text-red-800 font-bold">
          <Lock size={16} /> Your account is restricted. Please pay your
          subscription to restore full access.
        </div>
      );
    }
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Topbar />
        {banner}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
