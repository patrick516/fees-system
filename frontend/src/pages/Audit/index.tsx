import { useEffect, useState } from "react";
import {
  Search,
  Loader2,
  Download,
  RefreshCw,
  Filter,
  ChevronLeft,
  ChevronRight,
  X,
  Shield,
  Eye,
  LogIn,
  LogOut,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  XCircle,
  KeyRound,
  Bell,
  Users,
  FileBarChart,
  List,
  Activity,
} from "lucide-react";
import api from "../../lib/axios";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import type { AuditLog } from "../../types";

// ==================== ACTION MAPPING ====================
type ActionKind =
  | "create"
  | "update"
  | "delete"
  | "login"
  | "logout"
  | "verify"
  | "password"
  | "staff"
  | "notification"
  | "report"
  | "other";

const getActionKind = (action: string): ActionKind => {
  if (action === "LOGIN_FAILED") return "other";
  if (action === "LOGIN_SUCCESS") return "login";
  if (action === "LOGOUT") return "logout";
  if (action.includes("PASSWORD") || action.includes("REFRESH_TOKEN"))
    return "password";
  if (
    action.startsWith("STAFF_") ||
    action.startsWith("ROLE_") ||
    action.startsWith("DEPARTMENT_")
  )
    return "staff";
  if (
    action.includes("NOTIFICATION") ||
    action.includes("SMS") ||
    action.includes("ALERT") ||
    action.includes("REMINDER")
  )
    return "notification";
  if (action.includes("REPORT") || action.includes("EXPORT")) return "report";
  if (
    action.includes("VERIFIED") ||
    action.includes("ACTIVATED") ||
    action.includes("CONFIRMED")
  )
    return "verify";
  if (
    action.includes("ADDED") ||
    action.includes("CREATED") ||
    action.includes("INVITED") ||
    action.includes("IMPORTED")
  )
    return "create";
  if (action.includes("UPDATED") || action.includes("CHANGED")) return "update";
  if (
    action.includes("DELETED") ||
    action.includes("REJECTED") ||
    action.includes("DEACTIVATED") ||
    action.includes("REMOVED")
  )
    return "delete";
  return "other";
};

const ACTION_STYLES: Record<
  ActionKind,
  { label: string; color: string; icon: typeof Plus }
> = {
  create: { label: "Create", color: "bg-green-100 text-green-700", icon: Plus },
  update: { label: "Update", color: "bg-blue-100 text-blue-700", icon: Pencil },
  delete: { label: "Delete", color: "bg-red-100 text-red-700", icon: Trash2 },
  login: {
    label: "Login",
    color: "bg-purple-100 text-purple-700",
    icon: LogIn,
  },
  logout: { label: "Logout", color: "bg-gray-100 text-gray-600", icon: LogOut },
  verify: {
    label: "Verify",
    color: "bg-emerald-100 text-emerald-700",
    icon: CheckCircle2,
  },
  password: {
    label: "Password",
    color: "bg-amber-100 text-amber-700",
    icon: KeyRound,
  },
  staff: {
    label: "Staff",
    color: "bg-indigo-100 text-indigo-700",
    icon: Users,
  },
  notification: {
    label: "Notification",
    color: "bg-cyan-100 text-cyan-700",
    icon: Bell,
  },
  report: {
    label: "Report",
    color: "bg-orange-100 text-orange-700",
    icon: FileBarChart,
  },
  other: { label: "Action", color: "bg-gray-100 text-gray-600", icon: Shield },
};

const ACTION_LABELS: Record<string, string> = {
  STUDENT_ADDED: "Added student",
  STUDENT_UPDATED: "Updated student",
  STUDENT_PROMOTED: "Promoted students",
  STUDENTS_BULK_IMPORTED: "Bulk imported students",
  PAYMENT_RECORDED: "Recorded payment",
  PAYMENT_VERIFIED: "Verified payment",
  PAYMENT_REJECTED: "Rejected payment",
  FEE_STRUCTURE_SET: "Set fee structure",
  TERM_ACTIVATED: "Activated term",
  SCHOOL_SETTINGS_UPDATED: "Updated school settings",
  SCHOOL_LOGO_UPDATED: "Uploaded school logo",
  PAYMENT_DETAILS_UPDATED: "Updated payment details",
  STAFF_INVITED: "Invited staff",
  STAFF_UPDATED: "Updated staff",
  STAFF_DEACTIVATED: "Deactivated staff",
  ROLE_CREATED: "Created role",
  ROLE_UPDATED: "Updated role",
  ROLE_DELETED: "Deleted role",
  LOGIN_SUCCESS: "Logged in",
  LOGIN_FAILED: "Login failed",
  LOGOUT: "Logged out",
  PASSWORD_CHANGED: "Changed password",
};

const friendlyAction = (action: string) =>
  ACTION_LABELS[action] || action.replace(/_/g, " ").toLowerCase();

const relativeTime = (date: Date) => {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return date.toLocaleDateString("en-GB");
};

const dateFmt = (iso: string) => {
  const d = new Date(iso);
  return {
    rel: relativeTime(d),
    full: d.toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }),
  };
};

const INITIALS = (name?: string | null) => {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.[0] || "?") + (parts[1]?.[0] || "");
};

// ==================== PAGE ====================
const AuditPage = () => {
  const [view, setView] = useState<"timeline" | "grouped">("grouped");

  // Timeline state
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [pagination, setPagination] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  // Grouped state
  const [groups, setGroups] = useState<any[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(false);

  // Filters
  const [dateRange, setDateRange] = useState("7");
  const [staffId, setStaffId] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");

  // Meta
  const [actions, setActions] = useState<{ action: string; count: number }[]>(
    [],
  );
  const [staffList, setStaffList] = useState<any[]>([]);

  // Modals
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [exporting, setExporting] = useState(false);

  const PER_PAGE = 25;

  const dateRangeToBounds = (range: string) => {
    const to = new Date();
    to.setHours(23, 59, 59, 999);
    const from = new Date();
    if (range === "1") from.setDate(from.getDate() - 1);
    else if (range === "7") from.setDate(from.getDate() - 7);
    else if (range === "30") from.setDate(from.getDate() - 30);
    else if (range === "90") from.setDate(from.getDate() - 90);
    from.setHours(0, 0, 0, 0);
    return {
      from: from.toISOString().slice(0, 10),
      to: to.toISOString().slice(0, 10),
    };
  };

  const fetchMeta = async () => {
    try {
      const res = await api.get("/audit/meta");
      setActions(res.data.data.actions || []);
      setStaffList(res.data.data.staff || []);
    } catch {
      /* silent */
    }
  };

  const fetchTimeline = async (targetPage = page) => {
    setLoading(true);
    try {
      const { from, to } = dateRangeToBounds(dateRange);
      const params = new URLSearchParams({
        page: String(targetPage),
        limit: String(PER_PAGE),
        from,
        to,
      });
      if (staffId) params.set("staffId", staffId);
      if (actionFilter) params.set("action", actionFilter);
      if (statusFilter) params.set("status", statusFilter);
      if (search) params.set("search", search);

      const res = await api.get(`/audit?${params}`);
      setLogs(res.data.data || []);
      setPagination(res.data.pagination);
    } catch {
      console.error("Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  };

  const fetchGrouped = async () => {
    setGroupsLoading(true);
    try {
      const { from, to } = dateRangeToBounds(dateRange);
      const params = new URLSearchParams({ from, to });
      if (search) params.set("search", search);

      const res = await api.get(`/audit/grouped?${params}`);
      setGroups(res.data.data || []);
    } catch {
      setGroups([]);
    } finally {
      setGroupsLoading(false);
    }
  };

  useEffect(() => {
    fetchMeta();
  }, []);

  useEffect(() => {
    setPage(1);
    if (view === "timeline") fetchTimeline(1);
    else fetchGrouped();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange, staffId, actionFilter, statusFilter, view]);

  const handleApply = () => {
    setPage(1);
    if (view === "timeline") fetchTimeline(1);
    else fetchGrouped();
  };

  const handleReset = () => {
    setDateRange("7");
    setStaffId("");
    setActionFilter("");
    setStatusFilter("");
    setSearch("");
    setPage(1);
    setTimeout(() => {
      if (view === "timeline") fetchTimeline(1);
      else fetchGrouped();
    }, 0);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const { from, to } = dateRangeToBounds(dateRange);
      const params = new URLSearchParams({ from, to });
      if (staffId) params.set("staffId", staffId);
      if (actionFilter) params.set("action", actionFilter);
      if (statusFilter) params.set("status", statusFilter);

      const res = await api.get(`/audit/export?${params}`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `audit-trail-${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      alert("Failed to export");
    } finally {
      setExporting(false);
    }
  };

  const goToPage = (p: number) => {
    if (p < 1 || (pagination && p > pagination.totalPages)) return;
    setPage(p);
    fetchTimeline(p);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[var(--color-primary)] rounded-xl flex items-center justify-center">
            <Shield size={20} className="text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Audit Trail</h2>
            <p className="text-sm text-gray-500">
              Every action taken in your school
            </p>
          </div>
        </div>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="flex items-center gap-2 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50"
        >
          {exporting ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Download size={14} />
          )}
          Export CSV
        </button>
      </div>

      {/* View toggle */}
      <div className="flex items-center gap-2">
        <div className="flex bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setView("grouped")}
            className={`flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
              view === "grouped"
                ? "bg-white shadow-sm text-[var(--color-primary)]"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Users size={14} />
            By User
          </button>
          <button
            onClick={() => setView("timeline")}
            className={`flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
              view === "timeline"
                ? "bg-white shadow-sm text-[var(--color-primary)]"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <List size={14} />
            Timeline
          </button>
        </div>
        <p className="text-xs text-gray-500">
          {view === "grouped"
            ? "One row per user — click View to see their full history"
            : "Chronological list of every action"}
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3">
        <div className="flex items-center gap-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
          <Filter size={12} /> Filters
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Date Range
            </label>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-full bg-white border-gray-200 rounded-lg text-sm h-[38px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="1">Today</SelectItem>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {view === "timeline" && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                User
              </label>
              <Select
                value={staffId || "all"}
                onValueChange={(v) => setStaffId(v === "all" ? "" : v)}
              >
                <SelectTrigger className="w-full bg-white border-gray-200 rounded-lg text-sm h-[38px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="all">All users</SelectItem>
                  {staffList.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {view === "timeline" && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Action Type
              </label>
              <Select
                value={actionFilter || "all"}
                onValueChange={(v) => setActionFilter(v === "all" ? "" : v)}
              >
                <SelectTrigger className="w-full bg-white border-gray-200 rounded-lg text-sm h-[38px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white max-h-[300px]">
                  <SelectItem value="all">All actions</SelectItem>
                  {actions.map((a) => (
                    <SelectItem key={a.action} value={a.action}>
                      {friendlyAction(a.action)} ({a.count})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {view === "timeline" && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Status
              </label>
              <Select
                value={statusFilter || "all"}
                onValueChange={(v) => setStatusFilter(v === "all" ? "" : v)}
              >
                <SelectTrigger className="w-full bg-white border-gray-200 rounded-lg text-sm h-[38px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="SUCCESS">Success</SelectItem>
                  <SelectItem value="FAILED">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className={view === "grouped" ? "lg:col-span-4" : ""}>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Search
            </label>
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleApply()}
                placeholder={
                  view === "grouped"
                    ? "Search by name, role, or email..."
                    : "Actor, target, IP..."
                }
                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm h-[38px] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 justify-end pt-1">
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            <RefreshCw size={12} /> Reset
          </button>
          <button
            onClick={handleApply}
            className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium text-white bg-[var(--color-primary)] rounded-lg hover:bg-[var(--color-primary-dark)]"
          >
            <Filter size={12} /> Apply
          </button>
        </div>
      </div>

      {/* ==================== GROUPED VIEW ==================== */}
      {view === "grouped" && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {groupsLoading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 size={24} className="animate-spin text-gray-300" />
            </div>
          ) : groups.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <Users size={40} className="mx-auto mb-3 text-gray-200" />
              <p className="text-sm text-gray-400 font-medium">
                No activity found
              </p>
              <p className="text-xs text-gray-300 mt-1">
                Try a wider date range
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">
                      User
                    </th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">
                      Role
                    </th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">
                      Total Actions
                    </th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">
                      Breakdown
                    </th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">
                      Last Active
                    </th>
                    <th className="text-right px-5 py-3 text-xs font-medium text-gray-500 uppercase">
                      View
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {groups.map((g) => {
                    const { rel, full } = dateFmt(g.lastActionAt);
                    return (
                      <tr key={g.key} className="hover:bg-gray-50">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-[var(--color-primary-light)] text-[var(--color-primary)] flex items-center justify-center text-xs font-bold shrink-0">
                              {INITIALS(g.actorName)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-800 truncate">
                                {g.actorName}
                              </p>
                              {g.actorEmail && (
                                <p className="text-[11px] text-gray-400 truncate">
                                  {g.actorEmail}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded-md">
                            {g.actorRole}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <p className="text-lg font-bold text-gray-800">
                            {g.totalActions}
                          </p>
                          {g.failedActions > 0 && (
                            <p className="text-[11px] text-red-500">
                              {g.failedActions} failed
                            </p>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex flex-wrap gap-1">
                            {g.topActions.map((a: any) => {
                              const kind = getActionKind(a.action);
                              const style = ACTION_STYLES[kind];
                              const Icon = style.icon;
                              return (
                                <span
                                  key={a.action}
                                  className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium ${style.color}`}
                                  title={friendlyAction(a.action)}
                                >
                                  <Icon size={9} />
                                  {style.label}
                                  <span className="opacity-70">{a.count}</span>
                                </span>
                              );
                            })}
                            {g.actionCount > 4 && (
                              <span className="text-[10px] text-gray-400 self-center">
                                +{g.actionCount - 4} more
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <p className="text-xs font-medium text-gray-700">
                            {rel}
                          </p>
                          <p className="text-[11px] text-gray-400 mt-0.5">
                            {full}
                          </p>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <button
                            onClick={() => setSelectedUser(g)}
                            className="inline-flex items-center gap-1 text-xs font-medium text-[var(--color-primary)] hover:text-[var(--color-primary-dark)] border border-gray-200 rounded-lg px-2.5 py-1 hover:bg-gray-50"
                          >
                            <Activity size={12} /> View Activity
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ==================== TIMELINE VIEW ==================== */}
      {view === "timeline" && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 size={24} className="animate-spin text-gray-300" />
            </div>
          ) : logs.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <Shield size={40} className="mx-auto mb-3 text-gray-200" />
              <p className="text-sm text-gray-400 font-medium">
                No audit entries found
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">
                      Timestamp
                    </th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">
                      Actor
                    </th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">
                      Action
                    </th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">
                      Resource / Target
                    </th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">
                      IP Address
                    </th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">
                      Result
                    </th>
                    <th className="text-right px-5 py-3 text-xs font-medium text-gray-500 uppercase">
                      View
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {logs.map((log) => {
                    const kind = getActionKind(log.action);
                    const style = ACTION_STYLES[kind];
                    const ActionIcon = style.icon;
                    const { rel, full } = dateFmt(log.createdAt);
                    return (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="px-5 py-4 whitespace-nowrap">
                          <p className="text-xs font-medium text-gray-700">
                            {rel}
                          </p>
                          <p className="text-[11px] text-gray-400 mt-0.5">
                            {full}
                          </p>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-[var(--color-primary-light)] text-[var(--color-primary)] flex items-center justify-center text-[11px] font-bold shrink-0">
                              {INITIALS(log.actorName)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-800 truncate">
                                {log.actorName || "System"}
                              </p>
                              <p className="text-[11px] text-gray-400 truncate">
                                {log.actorRole || "—"}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium ${style.color}`}
                          >
                            <ActionIcon size={10} />
                            {style.label}
                          </span>
                          <p className="text-[11px] text-gray-500 mt-1">
                            {friendlyAction(log.action)}
                          </p>
                        </td>
                        <td className="px-5 py-4">
                          <p className="text-xs font-medium text-gray-700">
                            {log.entity}
                            {log.targetName ? `: ${log.targetName}` : ""}
                          </p>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <p className="text-xs font-mono text-gray-600">
                            {log.ipAddress || "—"}
                          </p>
                        </td>
                        <td className="px-5 py-4">
                          {log.status === "SUCCESS" ? (
                            <span className="inline-flex items-center gap-1 text-xs text-green-700 font-medium">
                              <CheckCircle2 size={12} /> Success
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs text-red-700 font-medium">
                              <XCircle size={12} /> Failed
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <button
                            onClick={() => setSelectedLog(log)}
                            className="inline-flex items-center gap-1 text-xs font-medium text-[var(--color-primary)] hover:text-[var(--color-primary-dark)] border border-gray-200 rounded-lg px-2.5 py-1 hover:bg-gray-50"
                          >
                            <Eye size={12} /> View
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
              <p className="text-xs text-gray-500">
                Page {page} of {pagination.totalPages} • {pagination.total}{" "}
                entries
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => goToPage(page - 1)}
                  disabled={page === 1 || loading}
                  className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 disabled:opacity-40"
                >
                  <ChevronLeft size={14} />
                </button>
                <span className="px-3 text-xs font-medium text-gray-700">
                  {page} / {pagination.totalPages}
                </span>
                <button
                  onClick={() => goToPage(page + 1)}
                  disabled={page === pagination.totalPages || loading}
                  className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 disabled:opacity-40"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Detail modals */}
      {selectedLog && (
        <AuditDetailModal
          log={selectedLog}
          onClose={() => setSelectedLog(null)}
        />
      )}
      {selectedUser && (
        <UserTimelineDrawer
          user={selectedUser}
          dateRange={dateRange}
          onClose={() => setSelectedUser(null)}
        />
      )}
    </div>
  );
};

// ==================== AUDIT DETAIL MODAL ====================
const AuditDetailModal = ({
  log,
  onClose,
}: {
  log: AuditLog;
  onClose: () => void;
}) => {
  const kind = getActionKind(log.action);
  const style = ACTION_STYLES[kind];
  const { full } = dateFmt(log.createdAt);

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${style.color}`}
            >
              <style.icon size={18} />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-800">
                {friendlyAction(log.action)}
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">{full}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Actor
            </p>
            <div className="bg-gray-50 rounded-xl p-3 space-y-1">
              <p className="text-sm font-medium text-gray-800">
                {log.actorName || "System"}
              </p>
              <p className="text-xs text-gray-500">
                {log.actorRole || "—"} {log.actorEmail && `• ${log.actorEmail}`}
              </p>
            </div>
          </div>

          <div>
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Resource
            </p>
            <div className="bg-gray-50 rounded-xl p-3 space-y-1">
              <p className="text-sm text-gray-800">
                <span className="font-medium">{log.entity}</span>
                {log.targetName && (
                  <span className="text-gray-600"> — {log.targetName}</span>
                )}
              </p>
              {log.entityId && (
                <p className="text-[11px] font-mono text-gray-400">
                  {log.entityId}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                IP Address
              </p>
              <p className="text-xs font-mono text-gray-700 bg-gray-50 rounded-lg px-3 py-2">
                {log.ipAddress || "—"}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Status
              </p>
              <p
                className={`text-xs font-medium rounded-lg px-3 py-2 ${
                  log.status === "SUCCESS"
                    ? "bg-green-50 text-green-700"
                    : "bg-red-50 text-red-700"
                }`}
              >
                {log.status}
              </p>
            </div>
          </div>

          {log.changes && Object.keys(log.changes).length > 0 && (
            <div>
              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Details
              </p>
              <pre className="bg-gray-50 rounded-xl p-3 text-[11px] text-gray-700 overflow-x-auto whitespace-pre-wrap break-words">
                {JSON.stringify(log.changes, null, 2)}
              </pre>
            </div>
          )}

          {log.userAgent && (
            <div>
              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                User Agent
              </p>
              <p className="text-[11px] text-gray-500 bg-gray-50 rounded-lg px-3 py-2 break-words">
                {log.userAgent}
              </p>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="w-full py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// ==================== USER TIMELINE DRAWER ====================
const UserTimelineDrawer = ({
  user,
  dateRange,
  onClose,
}: {
  user: any;
  dateRange: string;
  onClose: () => void;
}) => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const to = new Date();
      to.setHours(23, 59, 59, 999);
      const from = new Date();
      if (dateRange === "1") from.setDate(from.getDate() - 1);
      else if (dateRange === "7") from.setDate(from.getDate() - 7);
      else if (dateRange === "30") from.setDate(from.getDate() - 30);
      else if (dateRange === "90") from.setDate(from.getDate() - 90);
      from.setHours(0, 0, 0, 0);

      const params = new URLSearchParams({
        from: from.toISOString().slice(0, 10),
        to: to.toISOString().slice(0, 10),
        limit: "100",
      });

      const res = await api.get(`/audit/user/${user.key}?${params}`);
      setLogs(res.data.data || []);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.key]);

  const filtered = filter
    ? logs.filter((l) => getActionKind(l.action) === filter)
    : logs;

  const counts = logs.reduce(
    (acc, log) => {
      const kind = getActionKind(log.action);
      acc[kind] = (acc[kind] || 0) + 1;
      return acc;
    },
    {} as Record<ActionKind, number>,
  );

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex justify-end"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-2xl h-full overflow-y-auto shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 p-5 z-10">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-[var(--color-primary-light)] text-[var(--color-primary)] flex items-center justify-center text-base font-bold shrink-0">
                {INITIALS(user.actorName)}
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-800">
                  {user.actorName}
                </h3>
                <p className="text-xs text-gray-500">
                  {user.actorRole}
                  {user.actorEmail && ` • ${user.actorEmail}`}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-gray-600 rounded"
            >
              <X size={18} />
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-gray-50 rounded-lg p-2.5 text-center">
              <p className="text-lg font-bold text-gray-800">
                {user.totalActions}
              </p>
              <p className="text-[10px] text-gray-500 uppercase">Total</p>
            </div>
            <div className="bg-red-50 rounded-lg p-2.5 text-center">
              <p className="text-lg font-bold text-red-600">
                {user.failedActions}
              </p>
              <p className="text-[10px] text-red-500 uppercase">Failed</p>
            </div>
            <div className="bg-blue-50 rounded-lg p-2.5 text-center">
              <p className="text-lg font-bold text-[var(--color-primary)]">
                {Object.keys(user.actions || {}).length}
              </p>
              <p className="text-[10px] text-[var(--color-primary-dark)] uppercase">
                Types
              </p>
            </div>
          </div>

          {/* Category filter chips */}
          <div className="flex flex-wrap gap-1.5 mt-3">
            <button
              onClick={() => setFilter("")}
              className={`text-[11px] px-2.5 py-1 rounded-full font-medium transition-colors ${
                filter === ""
                  ? "bg-[var(--color-primary)] text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              All ({logs.length})
            </button>
            {(Object.keys(counts) as ActionKind[]).map((kind) => {
              const style = ACTION_STYLES[kind];
              return (
                <button
                  key={kind}
                  onClick={() => setFilter(kind)}
                  className={`text-[11px] px-2.5 py-1 rounded-full font-medium transition-colors ${
                    filter === kind
                      ? "bg-[var(--color-primary)] text-white"
                      : `${style.color} hover:opacity-80`
                  }`}
                >
                  {style.label} ({counts[kind]})
                </button>
              );
            })}
          </div>
        </div>

        {/* Timeline */}
        <div className="p-5">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 size={20} className="animate-spin text-gray-300" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <Activity size={32} className="mx-auto mb-2 text-gray-200" />
              <p className="text-sm text-gray-400">No activity in this range</p>
            </div>
          ) : (
            <div className="space-y-1">
              {filtered.map((log, idx) => {
                const kind = getActionKind(log.action);
                const style = ACTION_STYLES[kind];
                const Icon = style.icon;
                const { rel, full } = dateFmt(log.createdAt);
                const isLast = idx === filtered.length - 1;

                return (
                  <div key={log.id} className="flex gap-3 relative">
                    {/* Timeline line + dot */}
                    <div className="flex flex-col items-center shrink-0">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center ${style.color} shrink-0`}
                      >
                        <Icon size={13} />
                      </div>
                      {!isLast && (
                        <div className="w-px flex-1 bg-gray-100 my-1" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 pb-4 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-800">
                            {friendlyAction(log.action)}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {log.entity}
                            {log.targetName ? ` — ${log.targetName}` : ""}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-[11px] text-gray-500">{rel}</p>
                          <p className="text-[10px] text-gray-400">{full}</p>
                        </div>
                      </div>

                      {/* Meta row */}
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        {log.status === "FAILED" && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-red-600 font-medium">
                            <XCircle size={9} /> Failed
                          </span>
                        )}
                        {log.ipAddress && (
                          <span className="text-[10px] font-mono text-gray-400">
                            {log.ipAddress}
                          </span>
                        )}
                      </div>

                      {/* Changes preview */}
                      {log.changes &&
                        Object.keys(log.changes).length > 0 &&
                        Object.keys(log.changes).length <= 3 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {Object.entries(log.changes)
                              .slice(0, 3)
                              .map(([k, v]) => (
                                <span
                                  key={k}
                                  className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded"
                                >
                                  {k}: {String(v).slice(0, 30)}
                                </span>
                              ))}
                          </div>
                        )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuditPage;
