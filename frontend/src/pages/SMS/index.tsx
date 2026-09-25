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
} from "lucide-react";
import api from "../../lib/axios";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { useActiveTerm } from "../../hooks/useActiveTerm";

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
};

const typeColor: Record<string, string> = {
  reminder: "bg-yellow-100 text-yellow-700",
  announcement: "bg-blue-100 text-blue-700",
  unpaid: "bg-red-100 text-red-700",
};

const SMSPage = () => {
  const [selectedType, setSelectedType] = useState("");
  const [message, setMessage] = useState("");
  const [term, setTerm] = useState("TERM_1");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  const [logs, setLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [logFilter, setLogFilter] = useState<string>("");

  const { activeTerm: currentTerm } = useActiveTerm();

  // Sync term with the activated term once loaded
  useEffect(() => {
    if (currentTerm) setTerm(currentTerm);
  }, [currentTerm]);

  const fetchLogs = async () => {
    setLogsLoading(true);
    try {
      const params = new URLSearchParams();
      if (logFilter) params.set("type", logFilter);
      params.set("limit", "100");
      const res = await api.get(`/sms/logs?${params}`);
      setLogs(res.data.data || []);
    } catch {
      setLogs([]);
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [logFilter]);

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
      });
      setResult(res.data);
      // Refresh the log table so the new entries appear immediately
      await fetchLogs();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to send SMS");
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

  return (
    <div className="w-full space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-800">Send SMS</h2>
        <p className="text-sm text-gray-500">
          Send bulk SMS notifications to parents
        </p>
      </div>

      {/* ==================== SEND SECTION ==================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        {/* SMS Type Selection */}
        <div className="lg:col-span-2 space-y-3">
          <p className="text-sm font-medium text-gray-700">
            Select message type
          </p>

          {/* Made horizontal and compact */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {smsTypes.map((type) => (
              <button
                key={type.id}
                onClick={() => setSelectedType(type.id)}
                className={`flex items-start gap-3 p-3 border-2 rounded-xl text-left transition-all ${
                  selectedType === type.id
                    ? "border-blue-500 bg-blue-50"
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

          {/* About bulk SMS (compact) */}
          <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
            <div className="flex items-start gap-2.5">
              <Users size={14} className="text-gray-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-medium text-gray-700">
                  About bulk SMS
                </p>
                <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">
                  SMS messages are sent via TumaSend. Each message costs a small
                  amount — check your TumaSend dashboard for current rates.
                  Messages are sent to all matching parents in your school.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Form card */}
        <div className="lg:col-span-1">
          {selectedType ? (
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 space-y-3">
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
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
                    result.data?.sent > 0
                      ? "bg-green-50 border-green-200 text-green-700"
                      : "bg-yellow-50 border-yellow-200 text-yellow-800"
                  }`}
                >
                  <p className="font-medium">
                    {result.data?.sent > 0 ? "✅ " : "⚠️ "}
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
                className="w-full flex items-center justify-center gap-2 bg-blue-900 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-800 disabled:opacity-40"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Sending...
                  </>
                ) : (
                  <>
                    <Send size={16} /> Send SMS Now
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
                Pick a type on the left to configure and send an SMS
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ==================== SMS HISTORY ==================== */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="font-medium text-gray-800 text-sm">SMS History</h3>
            <p className="text-[11px] text-gray-500 mt-0.5">
              A record of every message sent — with date, category, and status
            </p>
          </div>
          <div className="flex items-center gap-2">
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
                  className={`px-3 py-1 text-[11px] font-medium rounded-md transition-colors ${
                    logFilter === f.value
                      ? "bg-white shadow-sm text-blue-900"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <button
              onClick={fetchLogs}
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
            <p className="text-sm text-gray-400 font-medium">No SMS sent yet</p>
            <p className="text-[11px] text-gray-300 mt-1">
              Sent messages will appear here
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
                      <span
                        className={`inline-block text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          typeColor[log.type] || "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {typeLabel[log.type] || log.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[11px] font-mono text-gray-700 whitespace-nowrap">
                      {log.phone}
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
      </div>
    </div>
  );
};

export default SMSPage;
