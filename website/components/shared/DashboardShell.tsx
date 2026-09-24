// "use client";
// import { useState } from "react";
// import {
//   School,
//   LogOut,
//   Home,
//   History,
//   Banknote,
//   Star,
//   Menu,
//   X,
//   Bell,
// } from "lucide-react";

// interface NavItem {
//   key: string;
//   label: string;
//   icon: any;
// }

// interface DashboardShellProps {
//   student: any;
//   activeTab: string;
//   setActiveTab: (tab: any) => void;
//   resultsAvailable: boolean;
//   onLogout: () => void;
//   children: React.ReactNode;
// }

// export default function DashboardShell({
//   student,
//   activeTab,
//   setActiveTab,
//   resultsAvailable,
//   onLogout,
//   children,
// }: DashboardShellProps) {
//   const [mobileOpen, setMobileOpen] = useState(false);

//   const navItems: NavItem[] = [
//     { key: "overview", label: "Dashboard", icon: Home },
//     { key: "payments", label: "Payment History", icon: History },
//     { key: "info", label: "Payment Info", icon: Banknote },
//     ...(resultsAvailable
//       ? [{ key: "results", label: "Results", icon: Star }]
//       : []),
//   ];

//   const handleNavClick = (key: string) => {
//     setActiveTab(key);
//     setMobileOpen(false);
//   };

//   const NavLink = ({ item }: { item: NavItem }) => (
//     <button
//       onClick={() => handleNavClick(item.key)}
//       className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
//         activeTab === item.key
//           ? "bg-blue-50 text-blue-900"
//           : "text-gray-600 hover:bg-gray-50"
//       }`}
//     >
//       <item.icon size={16} />
//       {item.label}
//     </button>
//   );

//   return (
//     <div className="min-h-screen bg-gray-50">
//       {/* Top bar */}
//       <header className="sticky top-0 z-30 bg-gradient-to-r from-blue-900 to-blue-700 text-white">
//         <div className="flex items-center justify-between px-4 py-3 lg:px-6">
//           <div className="flex items-center gap-3 min-w-0">
//             <button
//               onClick={() => setMobileOpen(true)}
//               className="lg:hidden p-1.5 -ml-1.5 rounded-lg hover:bg-white/10 shrink-0"
//               aria-label="Open menu"
//             >
//               <Menu size={20} />
//             </button>
//             <div className="w-8 h-8 bg-white bg-opacity-20 rounded-lg flex items-center justify-center overflow-hidden shrink-0">
//               {student?.school?.logo ? (
//                 <img
//                   src={student.school.logo}
//                   alt={student.school.name}
//                   className="w-full h-full object-contain"
//                 />
//               ) : (
//                 <School size={16} />
//               )}
//             </div>
//             <div className="min-w-0">
//               <p className="text-xs text-blue-200 leading-tight">SchoolPay</p>
//               <p className="text-sm font-medium truncate leading-tight">
//                 {student?.school?.name}
//               </p>
//             </div>
//           </div>

//           <div className="flex items-center gap-3 shrink-0">
//             <button
//               className="p-1.5 rounded-lg hover:bg-white/10 hidden sm:inline-flex"
//               aria-label="Notifications"
//             >
//               <Bell size={18} className="text-blue-200" />
//             </button>
//             <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-blue-800">
//               <div className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center text-sm font-bold">
//                 {student?.fullName?.charAt(0)}
//               </div>
//               <span className="text-sm font-medium truncate max-w-[120px]">
//                 {student?.fullName}
//               </span>
//             </div>
//             <button
//               onClick={onLogout}
//               className="flex items-center gap-1.5 text-blue-200 hover:text-white text-sm transition-colors"
//             >
//               <LogOut size={14} />
//               <span className="hidden sm:inline text-xs">Logout</span>
//             </button>
//           </div>
//         </div>
//       </header>

//       {/* Mobile drawer */}
//       {mobileOpen && (
//         <div className="fixed inset-0 z-40 lg:hidden">
//           <div
//             className="absolute inset-0 bg-black/40"
//             onClick={() => setMobileOpen(false)}
//           />
//           <div className="absolute left-0 top-0 h-full w-64 bg-white shadow-xl flex flex-col animate-fade-in-up">
//             <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
//               <span className="text-sm font-semibold text-gray-800">Menu</span>
//               <button
//                 onClick={() => setMobileOpen(false)}
//                 className="p-1 rounded-lg hover:bg-gray-100"
//               >
//                 <X size={18} />
//               </button>
//             </div>
//             <div className="px-4 py-3 border-b border-gray-100">
//               <p className="text-sm font-semibold text-gray-800">
//                 {student?.fullName}
//               </p>
//               <p className="text-xs text-gray-500">
//                 {student?.class} • {student?.academicYear}
//               </p>
//             </div>
//             <nav className="flex-1 px-2 py-3 space-y-1">
//               {navItems.map((item) => (
//                 <NavLink key={item.key} item={item} />
//               ))}
//             </nav>
//           </div>
//         </div>
//       )}

//       {/* Body: desktop sidebar + main content */}
//       <div className="lg:flex">
//         <aside className="hidden lg:flex lg:flex-col lg:w-60 lg:shrink-0 lg:sticky lg:top-[65px] lg:h-[calc(100vh-65px)] bg-white border-r border-gray-100">
//           <div className="px-4 py-4 border-b border-gray-100">
//             <p className="text-sm font-semibold text-gray-800 truncate">
//               {student?.fullName}
//             </p>
//             <p className="text-xs text-gray-500">
//               {student?.class} • {student?.academicYear}
//             </p>
//             <p className="text-[10px] text-gray-400 font-mono mt-0.5">
//               {student?.studentCode}
//             </p>
//           </div>
//           <nav className="flex-1 px-3 py-4 space-y-1">
//             {navItems.map((item) => (
//               <NavLink key={item.key} item={item} />
//             ))}
//           </nav>
//         </aside>

//         <main className="flex-1 min-w-0">{children}</main>
//       </div>
//     </div>
//   );
// }
