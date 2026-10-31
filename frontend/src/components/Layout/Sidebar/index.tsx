import { useState, useEffect } from "react";
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
  History,
  Briefcase,
  Wallet,
  LifeBuoy,
  Building2, // 🎯 Added for Group Dashboard
  ChevronDown, // 🎯 Added for School Switcher
} from "lucide-react";
import { useAuthStore } from "../../../store/authStore";
import api from "../../../lib/axios";
import type { Resource } from "../../../types";
import { useActiveTerm } from "../../../hooks/useActiveTerm";

type NavItem = {
  to: string;
  icon: typeof LayoutDashboard;
  label: string;
  end?: boolean;
  resource: Resource;
};

type NavSection = {
  title: string;
  items: NavItem[];
};

// 🎯 Grouped Navigation
const navSections: NavSection[] = [
  {
    title: "Main",
    items: [
      {
        to: "/dashboard",
        icon: LayoutDashboard,
        label: "Dashboard",
        end: true,
        resource: "dashboard",
      },
    ],
  },
  {
    title: "Students & Academics",
    items: [
      { to: "/students", icon: Users, label: "Students", resource: "students" },
      {
        to: "/classes",
        icon: GraduationCap,
        label: "Classes",
        resource: "classes",
      },
      {
        to: "/results",
        icon: FileText,
        label: "Exam Results",
        resource: "results",
      },
    ],
  },
  {
    title: "Fees & Finance",
    items: [
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
        to: "/reports",
        icon: BarChart2,
        label: "Reports",
        resource: "reports",
      },
    ],
  },
  {
    title: "Communication",
    items: [
      { to: "/sms", icon: MessageSquare, label: "Send SMS", resource: "sms" },
      {
        to: "/support",
        icon: LifeBuoy,
        label: "Support",
        resource: "support",
      },
    ],
  },
  {
    title: "Admin",
    items: [
      { to: "/staff", icon: UserCog, label: "Staff", resource: "staff" },
      {
        to: "/employees",
        icon: Briefcase,
        label: "Employees",
        resource: "employees",
      },
      { to: "/payroll", icon: Wallet, label: "Payroll", resource: "payroll" },
      { to: "/audit", icon: History, label: "Audit Trail", resource: "audit" },
      {
        to: "/settings",
        icon: Settings,
        label: "Settings",
        resource: "settings",
      },
    ],
  },
];

const Sidebar = () => {
  const { staff, logout } = useAuthStore();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [supportUnread, setSupportUnread] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const { academicYear: activeYear, activeTerm: currentTerm } = useActiveTerm();

  // 🎯 Multi-Tenant State
  const [groupSchools, setGroupSchools] = useState<any[]>([]);
  const [activeSchool, setActiveSchool] = useState<any>(null);
  const [showSchoolSwitcher, setShowSchoolSwitcher] = useState(false);

  const isGroupAdmin = staff?.isGroupAdmin || false;

  // 🎯 Fetch group schools if user is a Group Admin
  useEffect(() => {
    if (!isGroupAdmin) {
      // Normal users just see their own school
      setActiveSchool(staff?.school);
      return;
    }

    const loadGroupSchools = async () => {
      try {
        const res = await api.get("/group/schools");
        setGroupSchools(res.data.data);

        // Determine which school is currently active
        const activeId =
          localStorage.getItem("activeSchoolId") || staff?.schoolId;
        const matched = res.data.data.find((s: any) => s.id === activeId);

        if (matched) {
          setActiveSchool(matched);
        } else if (res.data.data.length > 0) {
          // Default to first school if none selected
          setActiveSchool(res.data.data[0]);
          localStorage.setItem("activeSchoolId", res.data.data[0].id);
        }
      } catch (err) {
        console.error("Failed to load group schools");
      }
    };
    loadGroupSchools();
  }, [isGroupAdmin, staff]);

  // 🎯 Handle School Switch
  const handleSwitchSchool = (school: any) => {
    localStorage.setItem("activeSchoolId", school.id);
    setActiveSchool(school);
    setShowSchoolSwitcher(false);
    // Hard reload to flush all contexts (safest for multi-tenant)
    window.location.href = "/dashboard";
  };

  // Check if the logged-in user has "read" permission for a resource.
  // School Admin always passes (safety fallback).
  const canRead = (resource: Resource): boolean => {
    if (!staff?.role) return false;
    if (staff.role.name === "School Admin") return true;
    const perms = staff.role.permissions?.[resource];
    return Array.isArray(perms) && perms.includes("read");
  };

  // 🎯 Poll support unread count every 60s
  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get("/support/unread-count");
        setSupportUnread(res.data.data?.count || 0);
      } catch {
        // ignore
      }
    };
    load();
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, []);

  //  Poll pending payments count every 60s (lightweight endpoint)
  useEffect(() => {
    if (!activeYear) return;

    const load = async () => {
      try {
        const params = new URLSearchParams();
        params.set("academicYear", activeYear);
        if (currentTerm) params.set("term", currentTerm);
        const res = await api.get(`/payments/pending-count?${params}`);
        setPendingCount(res.data.data?.count || 0);
      } catch {
        // Silently ignore — user may lack permissions or no data yet
      }
    };

    load();
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, [activeYear, currentTerm]);

  const handleLogout = () => {
    localStorage.removeItem("activeSchoolId"); // 🎯 Clear active school on logout
    logout();
    navigate("/login");
  };

  const close = () => setOpen(false);

  const sidebarContent = (
    <div className="w-64 bg-slate-900 text-white flex flex-col h-full shadow-xl overflow-hidden">
      {/* Logo */}
      <div className="p-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center overflow-hidden">
            {activeSchool?.logo ? (
              <img
                src={activeSchool.logo}
                alt={activeSchool.name}
                className="w-full h-full object-contain"
              />
            ) : (
              <School size={20} />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm text-white">SchoolPay</p>
            <p className="text-slate-400 text-xs truncate">
              {activeSchool?.name || "Loading..."}
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

        {/* 🎯 School Switcher Dropdown for Group Admins */}
        {isGroupAdmin && groupSchools.length > 0 && (
          <div className="mt-4 relative">
            <button
              onClick={() => setShowSchoolSwitcher(!showSchoolSwitcher)}
              className="w-full flex items-center justify-between bg-slate-800 hover:bg-slate-700 px-3 py-2 rounded-lg text-xs font-medium text-white transition-colors"
            >
              <span className="truncate">
                {activeSchool?.name || "Select School"}
              </span>
              <ChevronDown
                size={14}
                className={`transition-transform ${showSchoolSwitcher ? "rotate-180" : ""}`}
              />
            </button>

            {showSchoolSwitcher && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto">
                {groupSchools.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => handleSwitchSchool(s)}
                    className={`w-full text-left px-3 py-2 text-xs transition-colors hover:bg-slate-700 ${s.id === activeSchool?.id ? "bg-slate-700 text-white font-semibold" : "text-slate-300"}`}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-6 custom-scrollbar">
        {/* 🎯 Group Overview Link (Only for Group Admin) */}
        {isGroupAdmin && (
          <div className="mb-4">
            <NavLink
              to="/group"
              onClick={close}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  isActive
                    ? "bg-indigo-600 text-white font-semibold shadow-sm"
                    : "text-indigo-200 hover:bg-white/10 hover:text-white bg-indigo-900/30"
                }`
              }
            >
              <Building2 size={18} />
              <span className="flex-1 font-bold">Group Overview</span>
            </NavLink>
          </div>
        )}

        {navSections.map((section) => {
          // Filter items based on permissions
          const visibleItems = section.items.filter((item) =>
            canRead(item.resource),
          );

          // If user has no access to any item in this section, hide the section header
          if (visibleItems.length === 0) return null;

          return (
            <div key={section.title}>
              <h3 className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                {section.title}
              </h3>
              <div className="space-y-1">
                {visibleItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    onClick={close}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                        isActive
                          ? "bg-[var(--color-primary)] text-white font-semibold shadow-sm"
                          : "text-slate-200 hover:bg-white/10 hover:text-white"
                      }`
                    }
                  >
                    <item.icon size={18} />
                    <span className="flex-1">{item.label}</span>
                    {item.to === "/payments/pending" && pendingCount > 0 && (
                      <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                        {pendingCount > 99 ? "99+" : pendingCount}
                      </span>
                    )}
                    {item.to === "/support" && supportUnread > 0 && (
                      <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                        {supportUnread > 99 ? "99+" : supportUnread}
                      </span>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          );
        })}
      </nav>

      {/* User info and logout */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/50">
        <div className="flex items-center gap-3 mb-3 px-2">
          <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-xs font-bold shrink-0">
            {staff?.fullName?.charAt(0) || "?"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">
              {staff?.fullName}
            </p>
            <p className="text-slate-400 text-xs truncate">
              {isGroupAdmin ? "Group Director" : staff?.role?.name || "—"}
            </p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-4 py-2 text-slate-300 hover:bg-white/10 hover:text-white rounded-lg text-sm transition-colors"
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
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center h-14 px-4 bg-slate-900 border-b border-slate-800 text-white">
        <button
          onClick={() => setOpen(true)}
          className="p-1 rounded-md text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Open menu"
        >
          <Menu size={22} />
        </button>
        <div className="flex items-center gap-2 ml-3">
          <div className="w-7 h-7 bg-white/20 rounded-md flex items-center justify-center overflow-hidden">
            {activeSchool?.logo ? (
              <img
                src={activeSchool.logo}
                alt={activeSchool.name}
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
