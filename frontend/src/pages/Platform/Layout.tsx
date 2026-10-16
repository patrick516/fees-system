import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { usePlatformAuthStore } from "../../store/platformAuthStore";
import platformApi from "../../lib/platformApi";
import NotificationBell from "../../components/Platform/NotificationBell";

const NAV = [
  { to: "/platform/dashboard", label: "Dashboard" },
  { to: "/platform/subscriptions", label: "Subscriptions" },
  { to: "/platform/settings", label: "Settings" },
];

export default function PlatformLayout() {
  const { admin, logout } = usePlatformAuthStore();
  const location = useLocation();
  const navigate = useNavigate();

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
    <div className="min-h-screen flex bg-slate-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col">
        <div className="px-5 py-5 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <img
              src="/images/SchoolPayLogo.jpg"
              alt="SchoolPay"
              className="h-9 w-auto max-w-[80px] object-contain rounded-lg"
            />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900 truncate">
                SchoolPay
              </p>
              <p className="text-[11px] text-slate-500">Platform Owner</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map((item) => {
            const active = location.pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`block px-3 py-2 rounded-lg text-sm transition ${
                  active
                    ? "bg-blue-50 text-blue-800 font-semibold"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200">
          <p className="text-xs text-slate-500 truncate">{admin?.email}</p>
          <button
            onClick={handleLogout}
            className="mt-2 text-xs text-red-600 hover:underline"
          >
            Sign out
          </button>
        </div>
      </aside>
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-14 border-b border-slate-200 bg-white flex items-center justify-end px-6 shrink-0">
          <NotificationBell />
        </header>
        <main className="flex-1 min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
