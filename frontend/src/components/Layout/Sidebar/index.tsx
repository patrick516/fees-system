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
  Settings,
  FileText,
  X,
  Menu,
  UserCog,
} from "lucide-react";
import { useAuthStore } from "../../../store/authStore";
import type { Resource } from "../../../types";

type NavItem = {
  to: string;
  icon: typeof LayoutDashboard;
  label: string;
  end?: boolean;
  resource: Resource;
};

const navItems: NavItem[] = [
  {
    to: "/dashboard",
    icon: LayoutDashboard,
    label: "Dashboard",
    end: true,
    resource: "dashboard",
  },
  { to: "/students", icon: Users, label: "Students", resource: "students" },
  {
    to: "/payments",
    icon: CreditCard,
    label: "Payments",
    end: true,
    resource: "payments",
  },
  {
    to: "/payments/pending",
    icon: Clock,
    label: "Pending",
    resource: "payments",
  },
  {
    to: "/classes",
    icon: GraduationCap,
    label: "Classes",
    resource: "classes",
  },
  { to: "/reports", icon: BarChart2, label: "Reports", resource: "reports" },
  { to: "/sms", icon: MessageSquare, label: "Send SMS", resource: "sms" },
  {
    to: "/results",
    icon: FileText,
    label: "Exam Results",
    resource: "results",
  },
  { to: "/staff", icon: UserCog, label: "Staff", resource: "staff" },
  { to: "/settings", icon: Settings, label: "Settings", resource: "settings" },
];

const Sidebar = () => {
  const { staff, logout } = useAuthStore();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  // Check if the logged-in user has "read" permission for a resource.
  // School Admin always passes (safety fallback).
  const canRead = (resource: Resource): boolean => {
    if (!staff?.role) return false;
    if (staff.role.name === "School Admin") return true;
    const perms = staff.role.permissions?.[resource];
    return Array.isArray(perms) && perms.includes("read");
  };

  const visibleNavItems = navItems.filter((item) => canRead(item.resource));

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const close = () => setOpen(false);

  const sidebarContent = (
    <div className="w-64 bg-[var(--color-primary)] text-white flex flex-col h-full">
      {/* Logo */}
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center overflow-hidden">
            {staff?.school?.logo ? (
              <img
                src={staff.school.logo}
                alt={staff.school.name}
                className="w-full h-full object-contain"
              />
            ) : (
              <School size={20} />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm">SchoolPay</p>
            <p className="text-white/70 text-xs truncate">
              {staff?.school?.name}
            </p>
          </div>
          <button
            onClick={close}
            className="md:hidden ml-auto text-white/70 hover:text-white"
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {visibleNavItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={close}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-colors ${
                isActive
                  ? "bg-white/15 text-white font-medium"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
              }`
            }
          >
            <item.icon size={18} />
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* User info and logout */}
      <div className="p-4 border-t border-white/10">
        <div className="flex items-center gap-3 mb-3 px-2">
          <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-xs font-bold shrink-0">
            {staff?.fullName?.charAt(0) || "?"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{staff?.fullName}</p>
            <p className="text-white/70 text-xs truncate">
              {staff?.role?.name || "—"}
            </p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-4 py-2 text-white/70 hover:bg-white/10 hover:text-white rounded-lg text-sm transition-colors"
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
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center h-14 px-4 bg-[var(--color-primary)] border-b border-white/10 text-white">
        <button
          onClick={() => setOpen(true)}
          className="p-1 rounded-md text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Open menu"
        >
          <Menu size={22} />
        </button>
        <div className="flex items-center gap-2 ml-3">
          <div className="w-7 h-7 bg-white/20 rounded-md flex items-center justify-center overflow-hidden">
            {staff?.school?.logo ? (
              <img
                src={staff.school.logo}
                alt={staff.school.name}
                className="w-full h-full object-contain"
              />
            ) : (
              <School size={14} />
            )}
          </div>
          <span className="font-semibold text-sm">SchoolPay</span>
        </div>
      </div>

      {/* ── Desktop sidebar ── */}
      <aside className="hidden md:flex md:flex-col md:w-64 md:shrink-0 h-screen sticky top-0">
        {sidebarContent}
      </aside>

      {/* ── Mobile drawer ── */}
      <div
        onClick={close}
        className={`md:hidden fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 ${
          open
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
        aria-hidden="true"
      />
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
