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
} from "lucide-react";
import { useAuthStore } from "../../../store/authStore";

const navItems = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/students", icon: Users, label: "Students" },
  { to: "/payments", icon: CreditCard, label: "Payments" },
  { to: "/payments/pending", icon: Clock, label: "Pending", badge: true },
  { to: "/classes", icon: GraduationCap, label: "Classes" },
  { to: "/sms", icon: MessageSquare, label: "Send SMS" },
];

const Sidebar = () => {
  const { staff, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="w-64 bg-blue-900 text-white flex flex-col h-full">
      {/* Logo */}
      <div className="p-6 border-b border-blue-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
            <School size={20} />
          </div>
          <div>
            <p className="font-bold text-sm">SchoolPay</p>
            <p className="text-blue-300 text-xs truncate max-w-[140px]">
              {staff?.school.name}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
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
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-xs font-bold">
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
};

export default Sidebar;
