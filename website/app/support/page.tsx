"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  MessageSquare,
  Plus,
  X,
  Send,
  Loader2,
  ArrowLeft,
  ChevronRight,
  Lock,
  AlertCircle,
  Inbox,
  HelpCircle,
} from "lucide-react";
import api from "../../lib/axios";
import { useAuthStore } from "../../store/authStore";

interface SupportMessage {
  id: string;
  senderType: "CREATOR" | "RESPONDER";
  senderName: string;
  message: string;
  createdAt: string;
}

interface SupportTicket {
  id: string;
  subject: string;
  status: "OPEN" | "RESOLVED" | "CLOSED";
  lastReplyAt?: string | null;
  lastReplyBy?: "CREATOR" | "RESPONDER" | null;
  createdAt: string;
  messages?: SupportMessage[];
  _count?: { messages: number };
}

export default function ParentSupportPage() {
  const router = useRouter();
  const { isAuthenticated, _hasHydrated } = useAuthStore();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [openTicket, setOpenTicket] = useState<SupportTicket | null>(null);
  const [filter, setFilter] = useState<"ALL" | "OPEN" | "CLOSED">("ALL");

  const loadTickets = async () => {
    try {
      const res = await api.get("/parent/support");
      setTickets(res.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!_hasHydrated) return;
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    loadTickets();
  }, [_hasHydrated, isAuthenticated, router]);

  const filtered = tickets.filter((t) => {
    if (filter === "ALL") return true;
    if (filter === "OPEN") return t.status === "OPEN";
    return t.status !== "OPEN";
  });

  return (
    <div className="min-h-screen bg-white pb-28">
      {/* Header — white, centered title, back arrow left */}
      <header className="sticky top-0 z-20 bg-white border-b border-gray-100">
        <div className="max-w-lg mx-auto px-4 py-3 relative">
          <button
            onClick={() => router.push("/dashboard")}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-2 -ml-2 hover:bg-gray-100 rounded-xl transition"
            aria-label="Back"
          >
            <ArrowLeft size={20} className="text-gray-700" />
          </button>
          <div className="text-center">
            <h1 className="text-lg font-bold text-gray-900">Help & Support</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Ask the school anything
            </p>
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
        {/* Segmented filter control */}
        <div className="bg-gray-100 rounded-2xl p-1 grid grid-cols-3 gap-1">
          {(["ALL", "OPEN", "CLOSED"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`py-2 rounded-xl text-sm font-semibold transition-all ${
                filter === f
                  ? "bg-[var(--color-primary)] text-white shadow-sm"
                  : "text-gray-600 hover:text-gray-800"
              }`}
            >
              {f === "ALL" ? "All" : f === "OPEN" ? "Open" : "Closed"}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="text-center py-12">
            <Loader2 size={24} className="animate-spin text-gray-300 mx-auto" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState filter={filter} onCreate={() => setShowNewTicket(true)} />
        ) : (
          <div className="space-y-2">
            {filtered.map((t) => {
              const needsReply =
                t.status === "OPEN" && t.lastReplyBy === "RESPONDER";
              const isClosed = t.status !== "OPEN";
              return (
                <button
                  key={t.id}
                  onClick={() => setOpenTicket(t)}
                  className="w-full bg-white rounded-2xl p-4 text-left border border-gray-100 hover:border-[var(--color-primary)]/30 hover:shadow-sm transition-all flex items-start gap-3"
                >
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                      isClosed
                        ? "bg-gray-100 text-gray-500"
                        : "bg-blue-50 text-[var(--color-primary)]"
                    }`}
                  >
                    {isClosed ? (
                      <Lock size={18} />
                    ) : (
                      <MessageSquare size={18} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-gray-900 truncate flex-1">
                        {t.subject}
                      </p>
                      {needsReply && (
                        <span className="text-[9px] font-bold text-white bg-green-500 px-1.5 py-0.5 rounded-full shrink-0">
                          NEW
                        </span>
                      )}
                      {isClosed && (
                        <span className="text-[9px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full shrink-0 tracking-wide">
                          CLOSED
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      {t._count?.messages || 0} message
                      {(t._count?.messages || 0) !== 1 ? "s" : ""}
                      {" · "}
                      {formatWhen(t.lastReplyAt || t.createdAt)}
                    </p>
                  </div>
                  <ChevronRight
                    size={18}
                    className="text-gray-300 shrink-0 mt-2"
                  />
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Fixed bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-20 bg-white border-t border-gray-100 p-4">
        <div className="max-w-lg mx-auto">
          <button
            onClick={() => setShowNewTicket(true)}
            className="w-full flex items-center justify-center gap-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white py-3.5 rounded-2xl font-semibold text-sm transition-colors shadow-sm"
          >
            <Plus size={16} />
            New Ticket
          </button>
        </div>
      </div>

      {/* Modals */}
      {showNewTicket && (
        <NewTicketModal
          onClose={() => setShowNewTicket(false)}
          onCreated={() => {
            setShowNewTicket(false);
            loadTickets();
          }}
        />
      )}

      {openTicket && (
        <TicketDetailModal
          ticketId={openTicket.id}
          onClose={() => {
            setOpenTicket(null);
            loadTickets();
          }}
        />
      )}
    </div>
  );
}

// ==================== EMPTY STATE ====================

function EmptyState({
  filter,
  onCreate,
}: {
  filter: "ALL" | "OPEN" | "CLOSED";
  onCreate: () => void;
}) {
  const message =
    filter === "ALL"
      ? "No tickets here"
      : filter === "OPEN"
        ? "No open tickets"
        : "No closed tickets";

  const subtitle =
    filter === "ALL"
      ? "Create a new ticket or check back later."
      : filter === "OPEN"
        ? "You have no open conversations with the school."
        : "No conversations have been closed yet.";

  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      {/* Illustration: soft circle + inbox icon */}
      <div className="relative mb-6">
        <div className="w-32 h-32 rounded-full bg-gradient-to-b from-blue-50 to-slate-50 flex items-center justify-center">
          <Inbox size={56} className="text-[var(--color-primary)]/40" />
        </div>
      </div>

      <h3 className="text-base font-bold text-gray-900 mb-1">{message}</h3>
      <p className="text-xs text-gray-500 mb-6 max-w-xs leading-relaxed">
        {subtitle}
      </p>

      {filter === "ALL" && (
        <div className="flex flex-col items-center gap-3">
          <button
            onClick={onCreate}
            className="inline-flex items-center gap-1.5 bg-[var(--color-primary)] text-white px-5 py-2.5 rounded-2xl text-sm font-semibold hover:bg-[var(--color-primary-dark)] transition"
          >
            <Plus size={14} /> New Ticket
          </button>
          <div className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-gray-400 mt-2">
            <HelpCircle size={18} />
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== HELPERS ====================

function formatWhen(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ==================== NEW TICKET MODAL ====================

function NewTicketModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await api.post("/parent/support", { subject, message });
      onCreated();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to send");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100">
          <div>
            <h3 className="text-base font-bold text-gray-900">
              Send a Message
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              The school will reply by SMS
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={submit} className="p-5 space-y-3">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Subject
            </label>
            <input
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Question about Term 1 balance"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Message
            </label>
            <textarea
              required
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Explain your question in detail..."
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] resize-none"
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-50 disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !subject.trim() || !message.trim()}
              className="flex-1 flex items-center justify-center gap-2 bg-[var(--color-primary)] text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-[var(--color-primary-dark)] disabled:opacity-40"
            >
              {saving ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Send size={14} />
              )}
              {saving ? "Sending..." : "Send"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ==================== TICKET DETAIL MODAL ====================

function TicketDetailModal({
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
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/parent/support/${ticketId}`);
      setTicket(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId]);

  const sendReply = async () => {
    if (!reply.trim()) return;
    setSending(true);
    setError("");
    try {
      await api.post(`/parent/support/${ticketId}/reply`, {
        message: reply.trim(),
      });
      setReply("");
      await load();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to send reply");
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-gray-100">
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-bold text-gray-900 truncate">
              {ticket?.subject || "Loading..."}
            </h3>
            {ticket && (
              <p className="text-xs text-gray-500 mt-0.5">
                {ticket.status === "OPEN" ? "Open" : "Closed"}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 size={20} className="animate-spin text-gray-300" />
            </div>
          ) : (
            ticket?.messages?.map((m) => {
              const isMine = m.senderType === "CREATOR";
              return (
                <div
                  key={m.id}
                  className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                      isMine
                        ? "bg-[var(--color-primary)] text-white"
                        : "bg-white text-gray-800 border border-gray-200"
                    }`}
                  >
                    <p
                      className={`text-[10px] font-medium mb-0.5 ${
                        isMine ? "text-white/80" : "text-gray-500"
                      }`}
                    >
                      {m.senderName}
                    </p>
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">
                      {m.message}
                    </p>
                    <p
                      className={`text-[10px] mt-1 ${
                        isMine ? "text-white/60" : "text-gray-400"
                      }`}
                    >
                      {formatTime(m.createdAt)}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Reply box */}
        {ticket?.status === "OPEN" ? (
          <div className="border-t border-gray-100 p-4 space-y-2">
            {error && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-xs">
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
            <textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              rows={3}
              placeholder="Type your reply..."
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] resize-none"
            />
            <button
              onClick={sendReply}
              disabled={sending || !reply.trim()}
              className="w-full flex items-center justify-center gap-2 bg-[var(--color-primary)] text-white py-3 rounded-xl text-sm font-semibold hover:bg-[var(--color-primary-dark)] disabled:opacity-40 transition"
            >
              {sending ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Send size={14} />
              )}
              {sending ? "Sending..." : "Send Reply"}
            </button>
          </div>
        ) : (
          <div className="border-t border-gray-100 p-4 text-center">
            <p className="text-xs text-gray-500 flex items-center justify-center gap-1.5">
              <Lock size={12} /> This conversation is closed
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
