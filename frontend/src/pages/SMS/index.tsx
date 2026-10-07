import { useState, useEffect } from "react";
import {
  MessageSquare,
  Send,
  Loader2,
  Users,
  Clock,
  XCircle,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Mail,
  Layers,
  Bell,
} from "lucide-react";
import api from "../../lib/axios";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
} from "../../components/ui/pagination";
import { useActiveTerm } from "../../hooks/useActiveTerm";
import type { NotificationChannel } from "../../types";

const smsTypes = [
  {
    id: "reminder",
    label: "Fee Reminder",
    icon: Clock,
    description: "Send reminder to all parents with outstanding balance",
    color: "border-yellow-200 bg-yellow-50",
    iconColor: "text-yellow-600",
  },
  {
    id: "announcement",
    label: "General Announcement",
    icon: MessageSquare,
    description: "Send a custom message to all parents",
    color: "border-blue-200 bg-blue-50",
    iconColor: "text-blue-600",
  },
  {
    id: "unpaid",
    label: "Unpaid Students Alert",
    icon: XCircle,
    description: "Notify parents of students with zero payment",
    color: "border-red-200 bg-red-50",
    iconColor: "text-red-600",
  },
];

const CHANNEL_OPTIONS: {
  value: NotificationChannel;
  label: string;
  description: string;
  icon: typeof MessageSquare;
}[] = [
  {
    value: "SMS",
    label: "SMS",
    description: "Send to parent phones",
    icon: MessageSquare,
  },
  {
    value: "EMAIL",
    label: "Email",
    description: "Send to parent emails",
    icon: Mail,
  },
  {
    value: "BOTH",
    label: "Both",
    description: "SMS + Email",
    icon: Layers,
  },
];

const termOptions = [
  { value: "TERM_1", label: "Term 1" },
  { value: "TERM_2", label: "Term 2" },
  { value: "TERM_3", label: "Term 3" },
];

const ITEM_CLASS =
  "cursor-pointer mx-1 my-0.5 rounded-md pl-3 pr-7 focus:bg-gray-100 focus:text-gray-900 data-[highlighted]:bg-gray-100 data-[highlighted]:text-gray-900";

const typeLabel: Record<string, string> = {
  reminder: "Fee Reminder",
  announcement: "Announcement",
  unpaid: "Unpaid Alert",
  payment_received: "Payment Received",
  payment_verified: "Payment Confirmed",
  payment_rejected: "Payment Rejected",
};

const typeColor: Record<string, string> = {
  reminder: "bg-yellow-100 text-yellow-700",
  announcement:
    "bg-[var(--color-primary-light)] text-[var(--color-primary-dark)]",
  unpaid: "bg-red-100 text-red-700",
  payment_received: "bg-emerald-100 text-emerald-700",
  payment_verified: "bg-emerald-100 text-emerald-700",
  payment_rejected: "bg-red-100 text-red-700",
};

const PER_PAGE = 10;

const SMSPage = () => {
  const [selectedType, setSelectedType] = useState("");
  const [message, setMessage] = useState("");
  const [term, setTerm] = useState("TERM_1");
  const [channel, setChannel] = useState<NotificationChannel>("BOTH");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  const [logs, setLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [logFilter, setLogFilter] = useState<string>("");
  const [channelFilter, setChannelFilter] = useState<string>("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<any>(null);

  const { activeTerm: currentTerm } = useActiveTerm();

  useEffect(() => {
    if (currentTerm) setTerm(currentTerm);
  }, [currentTerm]);

  // Load school default channel on mount
  useEffect(() => {
    api
      .get("/schools/me")
      .then((res) => {
        const defaults = res.data.data?.notificationDefaults;
        if (defaults?.defaultChannel) setChannel(defaults.defaultChannel);
      })
      .catch(() => {});
  }, []);

  const fetchLogs = async (targetPage = page) => {
    setLogsLoading(true);
    try {
      const params = new URLSearchParams();
      if (logFilter) params.set("type", logFilter);
      if (channelFilter) params.set("channel", channelFilter);
      params.set("page", String(targetPage));
      params.set("limit", String(PER_PAGE));
      const res = await api.get(`/sms/logs?${params}`);
      setLogs(res.data.data || []);
      setPagination(res.data.pagination || null);
    } catch {
      setLogs([]);
      setPagination(null);
    } finally {
      setLogsLoading(false);
    }
  };

  // Refetch when any filter changes — reset to page 1
  useEffect(() => {
    setPage(1);
    fetchLogs(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logFilter, channelFilter]);

  const goToPage = (p: number) => {
    if (p < 1 || (pagination && p > pagination.totalPages)) return;
    setPage(p);
    fetchLogs(p);
  };

  const handleSend = async () => {
    if (!selectedType) return;
    setError("");
    setResult(null);
    setLoading(true);

    try {
      const res = await api.post("/sms/bulk", {
        type: selectedType,
        message: message || undefined,
        term,
        channel,
      });
      setResult(res.data);
      setPage(1);
      await fetchLogs(1);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to send");
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getPageNumbers = (): number[] => {
    if (!pagination) return [];
    const { totalPages } = pagination;
    const current = page;
    const pages: number[] = [];
    const window = 1;

    pages.push(1);
    for (
      let i = Math.max(2, current - window);
      i <= Math.min(totalPages - 1, current + window);
      i++
    ) {
      pages.push(i);
    }
    if (totalPages > 1) pages.push(totalPages);
    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className="w-full space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-800">Send Alerts</h2>
        <p className="text-sm text-gray-500">
          Send SMS, Email, or both to parents in bulk
        </p>
      </div>

      {/* ==================== SEND SECTION ==================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        <div className="lg:col-span-2 space-y-3">
          <p className="text-sm font-medium text-gray-700">
            Select message type
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {smsTypes.map((type) => (
              <button
                key={type.id}
                onClick={() => setSelectedType(type.id)}
                className={`flex items-start gap-3 p-3 border-2 rounded-xl text-left transition-all ${
                  selectedType === type.id
                    ? "border-[var(--color-primary)] bg-[var(--color-primary-light)]"
                    : type.color
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shrink-0">
                  <type.icon size={16} className={type.iconColor} />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800 leading-tight">
                    {type.label}
                  </p>
                  <p className="text-[11px] text-gray-500 mt-0.5 leading-tight">
                    {type.description}
                  </p>
                </div>
              </button>
            ))}
          </div>

          <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
            <div className="flex items-start gap-2.5">
              <Users size={14} className="text-gray-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-medium text-gray-700">
                  About bulk alerts
                </p>
                <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">
                  SMS sends via TumaSend (costs per message). Email sends via
                  Brevo (free). Messages are delivered to every matching parent
                  in your school.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-1">
          {selectedType ? (
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 space-y-3">
              {/* Channel selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
                  <Bell size={13} />
                  Send via
                </label>
                <div className="grid grid-cols-3 gap-1">
                  {CHANNEL_OPTIONS.map((c) => {
                    const Icon = c.icon;
                    const isActive = channel === c.value;
                    return (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => setChannel(c.value)}
                        title={c.description}
                        className={`flex flex-col items-center gap-1 py-2 px-1 rounded-lg text-xs font-medium transition-colors border ${
                          isActive
                            ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)]"
                            : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <Icon size={14} />
                        {c.label}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[10px] text-gray-400 mt-1">
                  {
                    CHANNEL_OPTIONS.find((c) => c.value === channel)
                      ?.description
                  }
                </p>
              </div>

              {/* Term */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Term
                </label>
                <Select value={term} onValueChange={setTerm}>
                  <SelectTrigger className="w-full bg-transparent border-gray-300 rounded-lg text-sm h-[40px]">
                    <SelectValue placeholder="Select term" />
                  </SelectTrigger>
                  <SelectContent className="bg-white w-auto min-w-[140px]">
                    {termOptions.map((t) => (
                      <SelectItem
                        key={t.value}
                        value={t.value}
                        className={ITEM_CLASS}
                      >
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedType === "announcement" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Custom Message *
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Type your message to all parents..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] resize-none"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">
                    {message.length} characters
                  </p>
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-xs">
                  {error}
                </div>
              )}

              {result && (
                <div
                  className={`px-3 py-2 rounded-lg text-xs border ${
                    result.data?.smsSent + result.data?.emailSent > 0
                      ? "bg-green-50 border-green-200 text-green-700"
                      : "bg-yellow-50 border-yellow-200 text-yellow-800"
                  }`}
                >
                  <p className="font-medium">
                    {result.data?.smsSent + result.data?.emailSent > 0
                      ? "✅ "
                      : "⚠️ "}
                    {result.message}
                  </p>
                  {result.data?.errors?.length > 0 && (
                    <ul className="mt-1 text-[11px] space-y-0.5">
                      {result.data.errors.map((e: string, i: number) => (
                        <li key={i}>• {e}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              <button
                onClick={handleSend}
                disabled={
                  loading ||
                  (selectedType === "announcement" && !message.trim())
                }
                className="w-full flex items-center justify-center gap-2 bg-[var(--color-primary)] text-white py-2.5 rounded-lg text-sm font-medium hover:bg-[var(--color-primary-dark)] disabled:opacity-40"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Sending...
                  </>
                ) : (
                  <>
                    <Send size={16} /> Send Now
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-xl p-4 shadow-sm border border-dashed border-gray-200 flex flex-col items-center justify-center text-center min-h-[160px]">
              <MessageSquare size={24} className="text-gray-200 mb-2" />
              <p className="text-xs font-medium text-gray-500">
                No message type selected
              </p>
              <p className="text-[11px] text-gray-400 mt-1">
                Pick a type on the left to configure and send
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ==================== HISTORY ==================== */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="font-medium text-gray-800 text-sm">
              Notification History
            </h3>
            <p className="text-[11px] text-gray-500 mt-0.5">
              {pagination
                ? `Showing ${
                    pagination.total === 0 ? 0 : (page - 1) * PER_PAGE + 1
                  }–${Math.min(page * PER_PAGE, pagination.total)} of ${pagination.total} messages`
                : "A record of every notification sent"}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Type filter */}
            <div className="flex bg-gray-100 rounded-lg p-0.5">
              {[
                { value: "", label: "All" },
                { value: "reminder", label: "Reminders" },
                { value: "announcement", label: "Announcements" },
                { value: "unpaid", label: "Unpaid" },
              ].map((f) => (
                <button
                  key={f.value}
                  onClick={() => setLogFilter(f.value)}
                  className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors ${
                    logFilter === f.value
                      ? "bg-white shadow-sm text-[var(--color-primary)]"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Channel filter */}
            <div className="flex bg-gray-100 rounded-lg p-0.5">
              {[
                { value: "", label: "All" },
                { value: "SMS", label: "SMS" },
                { value: "EMAIL", label: "Email" },
              ].map((f) => (
                <button
                  key={f.value}
                  onClick={() => setChannelFilter(f.value)}
                  className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors ${
                    channelFilter === f.value
                      ? "bg-white shadow-sm text-[var(--color-primary)]"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <button
              onClick={() => fetchLogs(page)}
              disabled={logsLoading}
              className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50 disabled:opacity-40"
              title="Refresh"
            >
              <RefreshCw
                size={14}
                className={logsLoading ? "animate-spin" : ""}
              />
            </button>
          </div>
        </div>

        {logsLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 size={20} className="animate-spin text-gray-300" />
          </div>
        ) : logs.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <MessageSquare size={28} className="mx-auto mb-2 text-gray-200" />
            <p className="text-sm text-gray-400 font-medium">
              No notifications found
            </p>
            <p className="text-[11px] text-gray-300 mt-1">
              {logFilter || channelFilter
                ? "No messages match the selected filters"
                : "Sent messages will appear here"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr className="text-left text-gray-500">
                  <th className="px-4 py-2.5 text-[11px] font-medium uppercase">
                    Date
                  </th>
                  <th className="px-4 py-2.5 text-[11px] font-medium uppercase">
                    Channel
                  </th>
                  <th className="px-4 py-2.5 text-[11px] font-medium uppercase">
                    Category
                  </th>
                  <th className="px-4 py-2.5 text-[11px] font-medium uppercase">
                    Recipient
                  </th>
                  <th className="px-4 py-2.5 text-[11px] font-medium uppercase">
                    Message
                  </th>
                  <th className="px-4 py-2.5 text-[11px] font-medium uppercase text-right">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {logs.map((log: any) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-[11px] text-gray-500 whitespace-nowrap">
                      {formatDateTime(log.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      {log.channel === "SMS" ? (
                        <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium bg-blue-100 text-blue-700">
                          <MessageSquare size={9} /> SMS
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium bg-purple-100 text-purple-700">
                          <Mail size={9} /> Email
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          typeColor[log.type] || "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {typeLabel[log.type] || log.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[11px] font-mono text-gray-700 whitespace-nowrap">
                      {log.phone || log.email || "—"}
                    </td>
                    <td className="px-4 py-3 text-[11px] text-gray-600 max-w-md">
                      <p className="line-clamp-2" title={log.message}>
                        {log.message}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {log.status === "SENT" ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-green-700 font-medium">
                          <CheckCircle size={12} /> Sent
                        </span>
                      ) : log.status === "FAILED" ? (
                        <span
                          className="inline-flex items-center gap-1 text-[11px] text-red-700 font-medium cursor-help"
                          title={log.errorMessage || "Unknown error"}
                        >
                          <AlertTriangle size={12} /> Failed
                        </span>
                      ) : (
                        <span className="text-[11px] text-gray-400">
                          {log.status}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ==================== PAGINATION ==================== */}
        {pagination && pagination.totalPages > 1 && (
          <div className="border-t border-gray-100 px-4 py-3">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
              <p className="text-xs text-gray-500">
                Page {page} of {pagination.totalPages}
              </p>

              <Pagination className="mx-0 w-auto">
                <PaginationContent>
                  <PaginationItem>
                    <button
                      onClick={() => goToPage(page - 1)}
                      disabled={page === 1 || logsLoading}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft size={14} />
                      <span className="hidden sm:inline">Previous</span>
                    </button>
                  </PaginationItem>

                  {pageNumbers.map((p, idx) => {
                    const prev = pageNumbers[idx - 1];
                    const showEllipsis = prev !== undefined && p - prev > 1;
                    return (
                      <span key={p} className="flex items-center">
                        {showEllipsis && (
                          <span className="px-2 text-xs text-gray-400">…</span>
                        )}
                        <PaginationItem>
                          <button
                            onClick={() => goToPage(p)}
                            disabled={logsLoading}
                            className={`min-w-[32px] h-8 px-2 text-xs font-medium rounded-md transition-colors disabled:opacity-40 ${
                              p === page
                                ? "bg-[var(--color-primary)] text-white"
                                : "text-gray-600 hover:bg-gray-100"
                            }`}
                          >
                            {p}
                          </button>
                        </PaginationItem>
                      </span>
                    );
                  })}

                  <PaginationItem>
                    <button
                      onClick={() => goToPage(page + 1)}
                      disabled={page === pagination.totalPages || logsLoading}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <span className="hidden sm:inline">Next</span>
                      <ChevronRight size={14} />
                    </button>
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SMSPage;
