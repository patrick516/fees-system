import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Clock,
  GraduationCap,
  MessageSquare,
  LogOut,
  School,
  BarChart2,
  X, // ← Add this
  Menu, // ← Add this
} from "lucide-react";
import { useAuthStore } from "../../../store/authStore";

const navItems = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard", end: true },
  { to: "/students", icon: Users, label: "Students" },
  { to: "/payments", icon: CreditCard, label: "Payments" },
  { to: "/payments/pending", icon: Clock, label: "Pending" },
  { to: "/classes", icon: GraduationCap, label: "Classes" },
  { to: "/reports", icon: BarChart2, label: "Reports" },
  { to: "/sms", icon: MessageSquare, label: "Send SMS" },
];

const Sidebar = () => {
  const { staff, logout } = useAuthStore();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const close = () => setOpen(false);

  const sidebarContent = (
    <div className="w-64 bg-blue-900 text-white flex flex-col h-full">
      {/* Logo */}
      <div className="p-6 border-b border-blue-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
            <School size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm">SchoolPay</p>
            <p className="text-blue-300 text-xs truncate">
              {staff?.school.name}
            </p>
          </div>
          {/* Close button — mobile only */}
          <button
            onClick={close}
            className="md:hidden ml-auto text-blue-300 hover:text-white"
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={close}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-colors ${
                isActive
                  ? "bg-blue-700 text-white font-medium"
                  : "text-blue-200 hover:bg-blue-800 hover:text-white"
              }`
            }
          >
            <item.icon size={18} />
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* User info and logout */}
      <div className="p-4 border-t border-blue-800">
        <div className="flex items-center gap-3 mb-3 px-2">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-xs font-bold shrink-0">
            {staff?.fullName.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{staff?.fullName}</p>
            <p className="text-blue-300 text-xs">
              {staff?.role.replace("_", " ")}
            </p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-4 py-2 text-blue-200 hover:bg-blue-800 hover:text-white rounded-lg text-sm transition-colors"
        >
          <LogOut size={16} />
          Logout
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* ── Mobile top bar ── */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center h-14 px-4 bg-blue-900 border-b border-blue-800 text-white">
        <button
          onClick={() => setOpen(true)}
          className="p-1 rounded-md text-blue-200 hover:text-white hover:bg-blue-800 transition-colors"
          aria-label="Open menu"
        >
          <Menu size={22} />
        </button>
        <div className="flex items-center gap-2 ml-3">
          <div className="w-7 h-7 bg-blue-600 rounded-md flex items-center justify-center">
            <School size={14} />
          </div>
          <span className="font-semibold text-sm">SchoolPay</span>
        </div>
      </div>

      {/* ── Desktop sidebar (always visible) ── */}
      <aside className="hidden md:flex md:flex-col md:w-64 md:shrink-0 h-screen sticky top-0">
        {sidebarContent}
      </aside>

      {/* ── Mobile drawer ── */}
      {/* Backdrop */}
      <div
        onClick={close}
        className={`md:hidden fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 ${
          open
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
        aria-hidden="true"
      />
      {/* Drawer panel */}
      <aside
        className={`md:hidden fixed top-0 left-0 z-50 h-full transition-transform duration-300 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {sidebarContent}
      </aside>
    </>
  );
};

export default Sidebar;
