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
  // ---- Auth events ----
  if (action === "LOGIN_FAILED") return "other";
  if (action === "LOGIN_SUCCESS") return "login";
  if (action === "LOGOUT") return "logout";
  if (
    action === "PASSWORD_CHANGED" ||
    action === "REFRESH_TOKEN_REVOKED" ||
    action.includes("PASSWORD")
  )
    return "password";

  // ---- Staff management ----
  if (
    action.startsWith("STAFF_") ||
    action.startsWith("ROLE_") ||
    action.startsWith("DEPARTMENT_")
  )
    return "staff";

  // ---- Notifications / SMS / Email ----
  if (
    action.includes("NOTIFICATION") ||
    action.includes("SMS") ||
    action.includes("ALERT") ||
    action.includes("BULK_SENT") ||
    action.includes("REMINDER")
  )
    return "notification";

  // ---- Reports ----
  if (action.includes("REPORT") || action.includes("EXPORT")) return "report";

  // ---- Verification / Activation ----
  if (
    action.includes("VERIFIED") ||
    action.includes("ACTIVATED") ||
    action.includes("CONFIRMED")
  )
    return "verify";

  // ---- Create ----
  if (
    action.includes("ADDED") ||
    action.includes("CREATED") ||
    action.includes("INVITED") ||
    action.includes("IMPORTED")
  )
    return "create";

  // ---- Update ----
  if (action.includes("UPDATED") || action.includes("CHANGED")) return "update";

  // ---- Delete ----
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
  create: {
    label: "Create",
    color: "bg-green-100 text-green-700",
    icon: Plus,
  },
  update: {
    label: "Update",
    color: "bg-blue-100 text-blue-700",
    icon: Pencil,
  },
  delete: {
    label: "Delete",
    color: "bg-red-100 text-red-700",
    icon: Trash2,
  },
  login: {
    label: "Login",
    color: "bg-purple-100 text-purple-700",
    icon: LogIn,
  },
  logout: {
    label: "Logout",
    color: "bg-gray-100 text-gray-600",
    icon: LogOut,
  },
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
  other: {
    label: "Action",
    color: "bg-gray-100 text-gray-600",
    icon: Shield,
  },
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
  REFRESH_TOKEN_REVOKED: "Session revoked",
};

const friendlyAction = (action: string) =>
  ACTION_LABELS[action] || action.replace(/_/g, " ").toLowerCase();

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

const INITIALS = (name?: string | null) => {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.[0] || "?") + (parts[1]?.[0] || "");
};

// ==================== PAGE ====================
const AuditPage = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [pagination, setPagination] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

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

  // Detail modal
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
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

  const fetchLogs = async (targetPage = page) => {
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
    } catch (err) {
      console.error("Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMeta();
  }, []);

  useEffect(() => {
    setPage(1);
    fetchLogs(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange, staffId, actionFilter, statusFilter]);

  const handleApply = () => {
    setPage(1);
    fetchLogs(1);
  };

  const handleReset = () => {
    setDateRange("7");
    setStaffId("");
    setActionFilter("");
    setStatusFilter("");
    setSearch("");
    setPage(1);
    setTimeout(() => fetchLogs(1), 0);
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
    fetchLogs(p);
  };

  // Compute quick counts by category from the current page of logs
  const counts = logs.reduce(
    (acc, log) => {
      const kind = getActionKind(log.action);
      acc[kind] = (acc[kind] || 0) + 1;
      return acc;
    },
    {} as Record<ActionKind, number>,
  );

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
        <div className="flex items-center gap-2">
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
      </div>

      {/* Category chips — quick counts on this page */}
      {logs.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {(
            [
              "login",
              "logout",
              "password",
              "create",
              "update",
              "delete",
              "verify",
              "staff",
              "notification",
              "report",
            ] as ActionKind[]
          ).map((kind) => {
            if (!counts[kind]) return null;
            const style = ACTION_STYLES[kind];
            const Icon = style.icon;
            return (
              <span
                key={kind}
                className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${style.color}`}
              >
                <Icon size={11} />
                {style.label}
                <span className="bg-white/60 rounded-full px-1.5 text-[10px]">
                  {counts[kind]}
                </span>
              </span>
            );
          })}
        </div>
      )}

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

          <div>
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
                placeholder="Actor, target, IP..."
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

      {/* Table */}
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
            <p className="text-xs text-gray-300 mt-1">
              Try adjusting the filters above
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

        {/* Pagination */}
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

      {/* Detail modal */}
      {selectedLog && (
        <AuditDetailModal
          log={selectedLog}
          onClose={() => setSelectedLog(null)}
        />
      )}
    </div>
  );
};

// ==================== DETAIL MODAL ====================
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
        {/* Header */}
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

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Actor */}
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

          {/* Target */}
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

          {/* Request metadata */}
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

          {/* Changes */}
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

          {/* User agent */}
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

        {/* Footer */}
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

export default AuditPage;
