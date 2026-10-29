import { useEffect, useState } from "react";
import {
  MessageSquare,
  Loader2,
  Send,
  X,
  Lock,
  Building2,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import platformApi from "../../lib/platformApi";

interface SupportTicket {
  id: string;
  schoolId: string;
  school?: { id: string; name: string };
  creatorName: string;
  creatorEmail?: string | null;
  subject: string;
  status: "OPEN" | "RESOLVED" | "CLOSED";
  lastReplyAt?: string | null;
  lastReplyBy?: "CREATOR" | "RESPONDER" | null;
  messages?: SupportMessage[];
  _count?: { messages: number };
  createdAt: string;
  updatedAt: string;
}

interface SupportMessage {
  id: string;
  senderType: "CREATOR" | "RESPONDER";
  senderName: string;
  message: string;
  createdAt: string;
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

export default function PlatformSupportPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"OPEN" | "CLOSED" | "">("");
  const [openTicket, setOpenTicket] = useState<SupportTicket | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const params = filter ? `?status=${filter}` : "";
      const res = await platformApi.get(`/platform/support${params}`);
      setTickets(res.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 flex items-center gap-2">
          <MessageSquare size={20} className="text-blue-700" />
          Support Tickets
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Questions raised by school admins. Replies are sent by email.
        </p>
      </div>

      <div className="flex items-center gap-2">
        {(["OPEN", "CLOSED", ""] as const).map((f) => (
          <button
            key={f || "all"}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              filter === f
                ? "bg-blue-700 text-white"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            {f === "" ? "All" : f === "OPEN" ? "Open" : "Closed"}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 size={24} className="animate-spin text-slate-300" />
          </div>
        ) : tickets.length === 0 ? (
          <div className="p-12 text-center">
            <MessageSquare size={40} className="mx-auto mb-3 text-slate-300" />
            <p className="text-sm font-medium text-slate-500">No tickets</p>
            <p className="text-xs text-slate-400 mt-1">
              Nothing waiting for you right now
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {tickets.map((t) => {
              const needsReply =
                t.status === "OPEN" && t.lastReplyBy === "CREATOR";
              return (
                <button
                  key={t.id}
                  onClick={() => setOpenTicket(t)}
                  className="w-full text-left px-5 py-4 hover:bg-slate-50 transition-colors flex items-start gap-4"
                >
                  <div
                    className={`w-2 h-2 rounded-full mt-2 shrink-0 ${
                      needsReply ? "bg-blue-600" : "bg-slate-300"
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-slate-900 truncate">
                        {t.subject}
                      </p>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                          t.status === "OPEN"
                            ? "bg-green-100 text-green-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {t.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5 flex items-center gap-1.5">
                      <Building2 size={11} />
                      {t.school?.name || "—"} · {t.creatorName}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {t._count &&
                        `${t._count.messages} message${t._count.messages !== 1 ? "s" : ""} · `}
                      {t.lastReplyAt
                        ? formatDate(t.lastReplyAt)
                        : formatDate(t.createdAt)}
                    </p>
                  </div>
                  {needsReply && (
                    <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full shrink-0">
                      NEW
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {openTicket && (
        <PlatformTicketModal
          ticketId={openTicket.id}
          onClose={() => {
            setOpenTicket(null);
            load();
          }}
        />
      )}
    </div>
  );
}

// ==================== TICKET MODAL ====================

function PlatformTicketModal({
  ticketId,
  onClose,
}: {
  ticketId: string;
  onClose: () => void;
}) {
  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [closing, setClosing] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await platformApi.get(`/platform/support/${ticketId}`);
      setTicket(res.data.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId]);

  // Auto-dismiss success/error after 4s
  useEffect(() => {
    if (error || success) {
      const t = setTimeout(() => {
        setError(null);
        setSuccess(null);
      }, 4000);
      return () => clearTimeout(t);
    }
  }, [error, success]);

  const sendReply = async () => {
    if (!reply.trim()) return;
    setSending(true);
    setError(null);
    try {
      await platformApi.post(`/platform/support/${ticketId}/reply`, {
        message: reply.trim(),
      });
      setReply("");
      setSuccess("Reply sent successfully. School admin notified by email.");
      await load();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to send reply");
    } finally {
      setSending(false);
    }
  };

  const closeTicket = async () => {
    setClosing(true);
    setError(null);
    try {
      await platformApi.post(`/platform/support/${ticketId}/close`);
      setShowCloseConfirm(false);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to close ticket");
      setClosing(false);
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
        onClick={onClose}
      >
        <div
          className="bg-white w-full max-w-2xl rounded-t-2xl sm:rounded-2xl shadow-xl flex flex-col max-h-[90vh] sm:max-h-[85vh]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between px-5 py-4 border-b border-slate-100">
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-slate-900 truncate">
                {ticket?.subject || "Loading..."}
              </h3>
              {ticket && (
                <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                  <Building2 size={11} /> {ticket.school?.name} ·{" "}
                  {ticket.creatorName}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-slate-600 shrink-0"
            >
              <X size={18} />
            </button>
          </div>

          {/* 🎯 Toast-like feedback banners */}
          {error && (
            <div className="mx-5 mt-3 flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700">
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              <span className="flex-1">{error}</span>
              <button
                onClick={() => setError(null)}
                className="text-red-500 hover:text-red-700"
              >
                <X size={12} />
              </button>
            </div>
          )}
          {success && (
            <div className="mx-5 mt-3 flex items-start gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-xs text-green-700">
              <CheckCircle2 size={14} className="shrink-0 mt-0.5" />
              <span className="flex-1">{success}</span>
              <button
                onClick={() => setSuccess(null)}
                className="text-green-500 hover:text-green-700"
              >
                <X size={12} />
              </button>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 size={20} className="animate-spin text-slate-300" />
              </div>
            ) : (
              ticket?.messages?.map((m) => {
                const isMine = m.senderType === "RESPONDER";
                return (
                  <div
                    key={m.id}
                    className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                        isMine
                          ? "bg-blue-700 text-white"
                          : "bg-white text-slate-800 border border-slate-200"
                      }`}
                    >
                      <p
                        className={`text-[10px] font-medium mb-0.5 ${isMine ? "text-white/80" : "text-slate-500"}`}
                      >
                        {m.senderName}
                      </p>
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">
                        {m.message}
                      </p>
                      <p
                        className={`text-[10px] mt-1 ${isMine ? "text-white/60" : "text-slate-400"}`}
                      >
                        {formatDate(m.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          {ticket?.status === "OPEN" ? (
            <div className="border-t border-slate-100 p-4 space-y-2">
              <textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                rows={3}
                placeholder="Reply to the school admin... (they'll get an email)"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none"
              />
              <div className="flex items-center justify-between gap-2">
                <button
                  onClick={() => setShowCloseConfirm(true)}
                  disabled={closing}
                  className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-red-600 disabled:opacity-50"
                >
                  <Lock size={12} /> {closing ? "Closing..." : "Close Ticket"}
                </button>
                <div className="flex-1" />
                <button
                  onClick={sendReply}
                  disabled={sending || !reply.trim()}
                  className="flex items-center gap-2 bg-blue-700 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-800 disabled:opacity-50"
                >
                  {sending ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Send size={14} />
                  )}
                  {sending ? "Sending..." : "Send Reply"}
                </button>
              </div>
            </div>
          ) : (
            <div className="border-t border-slate-100 p-4 text-center">
              <p className="text-xs text-slate-500 flex items-center justify-center gap-1.5">
                <Lock size={12} /> This ticket is closed
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 🎯 Beautiful Close Confirmation Modal */}
      {showCloseConfirm && (
        <div
          className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4"
          onClick={() => !closing && setShowCloseConfirm(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center">
              <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lock size={24} className="text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-1">
                Close this ticket?
              </h3>
              <p className="text-sm text-slate-500 mb-4">
                The school admin won't be able to reply after closing. You can
                re-open it later if needed.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCloseConfirm(false)}
                  disabled={closing}
                  className="flex-1 border border-slate-300 text-slate-700 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={closeTicket}
                  disabled={closing}
                  className="flex-1 bg-red-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {closing && <Loader2 size={14} className="animate-spin" />}
                  {closing ? "Closing..." : "Yes, Close"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
