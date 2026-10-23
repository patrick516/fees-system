import { useEffect, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { usePlatformAuthStore } from "../../store/platformAuthStore";
import platformApi from "../../lib/platformApi";
import NotificationBell from "../../components/Platform/NotificationBell";

const NAV = [
  { to: "/platform/dashboard", label: "Dashboard" },
  { to: "/platform/requests", label: "School Requests", showBadge: true },
  { to: "/platform/subscriptions", label: "Subscriptions" },
  { to: "/platform/analytics", label: "Revenue & Analytics" },
  { to: "/platform/onekhusa", label: "OneKhusa Merchants" },
  { to: "/platform/settings", label: "Settings" },
];

export default function PlatformLayout() {
  const { admin, logout } = usePlatformAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [pendingRequests, setPendingRequests] = useState(0);

  const fetchPending = async () => {
    try {
      const res = await platformApi.get(
        "/platform/schools/requests/pending-count",
      );
      setPendingRequests(res.data.data?.count || 0);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchPending();
    const t = setInterval(fetchPending, 30_000);
    return () => clearInterval(t);
  }, []);

  const handleLogout = async () => {
    try {
      await platformApi.post("/platform/auth/logout");
    } catch {
      // ignore
    }
    logout();
    navigate("/platform/login", { replace: true });
  };

  return (
    <div className="h-screen flex bg-slate-50 overflow-hidden">
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col h-full shrink-0">
        <div className="px-5 py-6 border-b border-slate-200 flex flex-col items-center justify-center text-center">
          <img
            src="/images/SchoolPayLogo.jpg"
            alt="SchoolPay"
            className="h-12 w-auto max-w-[100px] object-contain rounded-xl mb-3"
          />
          <div>
            <p className="text-sm font-semibold text-slate-900">SchoolPay</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Platform Owner</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV.map((item) => {
            const active = location.pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm transition ${
                  active
                    ? "bg-blue-50 text-blue-800 font-semibold"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <span>{item.label}</span>
                {item.showBadge && pendingRequests > 0 && (
                  <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                    {pendingRequests > 99 ? "99+" : pendingRequests}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200">
          <p className="text-xs text-slate-500 truncate" title={admin?.email}>
            {admin?.email}
          </p>
          <button
            onClick={handleLogout}
            className="mt-2 text-xs text-red-600 hover:underline"
          >
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col h-full overflow-hidden">
        <header className="h-14 border-b border-slate-200 bg-white flex items-center justify-end px-6 shrink-0">
          <NotificationBell />
        </header>
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
