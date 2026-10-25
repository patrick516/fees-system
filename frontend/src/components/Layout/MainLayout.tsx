import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import Sidebar from "./Sidebar/index";
import Topbar from "./Topbar/index";
import { useAuthStore } from "../../store/authStore";
import { AlertTriangle, Lock, CalendarDays } from "lucide-react";
import api from "../../lib/axios";

const MainLayout = () => {
  const { staff } = useAuthStore();
  const school = staff?.school as any;

  const location = useLocation();
  const navigate = useNavigate();

  // 🎯 Setup Guard: Ensure a term is active before they can do anything
  const [hasActiveTerm, setHasActiveTerm] = useState<boolean | null>(null);

  useEffect(() => {
    let isMounted = true;
    const checkTerm = async () => {
      try {
        await api.get("/schools/active-term");
        if (isMounted) setHasActiveTerm(true);
      } catch (err: any) {
        if (isMounted) {
          if (err.response?.status === 404) {
            setHasActiveTerm(false);
          } else {
            setHasActiveTerm(true); // Fail-safe: if backend errors, don't lock the user out
          }
        }
      }
    };
    checkTerm();
    return () => {
      isMounted = false;
    };
  }, [location.pathname]); // Re-check on every navigation (cheap API call)

  // Paths they ARE allowed to visit without an active term
  const ALLOWED_WITHOUT_TERM = [
    "/dashboard",
    "/classes",
    "/settings",
    "/support",
  ];
  const isBlocked =
    hasActiveTerm === false &&
    !ALLOWED_WITHOUT_TERM.some((p) => location.pathname.startsWith(p));

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
          {isBlocked ? (
            <div className="flex flex-col items-center justify-center h-full text-center max-w-md mx-auto">
              <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                <CalendarDays
                  className="text-[var(--color-primary)]"
                  size={28}
                />
              </div>
              <h2 className="text-xl font-bold text-gray-800 mb-2">
                Activate a Term First
              </h2>
              <p className="text-gray-500 mb-6 text-sm leading-relaxed">
                You must activate a term before you can access this page. This
                ensures that all fees, payments, and student records are
                properly tracked and no inconsistent data is created.
              </p>
              <button
                onClick={() => navigate("/classes")}
                className="bg-[var(--color-primary)] text-white px-6 py-2.5 rounded-lg font-medium hover:bg-[var(--color-primary-dark)] transition-colors"
              >
                Go to Classes & Terms
              </button>
            </div>
          ) : (
            <Outlet />
          )}
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
