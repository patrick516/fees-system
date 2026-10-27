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
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-[var(--color-primary)] text-white sticky top-0 z-20 shadow-md">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => router.push("/dashboard")}
            className="p-2 -ml-2 hover:bg-white/10 rounded-xl transition"
            aria-label="Back"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold">Help & Support</h1>
            <p className="text-[11px] text-white/70">Ask the school anything</p>
          </div>
          <button
            onClick={() => setShowNewTicket(true)}
            className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 px-3 py-2 rounded-xl text-sm font-semibold transition"
          >
            <Plus size={14} /> New
          </button>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
        {/* Filter chips */}
        <div className="flex gap-2">
          {(["ALL", "OPEN", "CLOSED"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                filter === f
                  ? "bg-[var(--color-primary)] text-white"
                  : "bg-white text-gray-600 border border-gray-200 hover:border-gray-300"
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
          <div className="bg-white rounded-2xl p-8 text-center border border-gray-100">
            <div className="w-14 h-14 rounded-full bg-[var(--color-primary-light)] flex items-center justify-center mx-auto mb-4">
              <MessageSquare
                size={24}
                className="text-[var(--color-primary)]"
              />
            </div>
            <p className="text-sm font-semibold text-gray-800 mb-1">
              {filter === "ALL" ? "No messages yet" : "Nothing here"}
            </p>
            <p className="text-xs text-gray-500 mb-4 leading-relaxed">
              Have a question about fees or your child&apos;s account? Send the
              school a message.
            </p>
            <button
              onClick={() => setShowNewTicket(true)}
              className="inline-flex items-center gap-1.5 bg-[var(--color-primary)] text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-[var(--color-primary-dark)] transition"
            >
              <Plus size={14} /> Send a Message
            </button>
          </div>
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
                  className="w-full bg-white rounded-2xl p-4 text-left border border-gray-100 hover:border-[var(--color-primary)]/30 transition-colors flex items-start gap-3"
                >
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      isClosed
                        ? "bg-gray-100 text-gray-500"
                        : "bg-blue-100 text-blue-600"
                    }`}
                  >
                    {isClosed ? (
                      <Lock size={16} />
                    ) : (
                      <MessageSquare size={16} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-gray-800 truncate flex-1">
                        {t.subject}
                      </p>
                      {needsReply && (
                        <span className="text-[9px] font-bold text-white bg-green-500 px-1.5 py-0.5 rounded-full shrink-0">
                          NEW
                        </span>
                      )}
                      {isClosed && (
                        <span className="text-[9px] font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-full shrink-0">
                          CLOSED
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {t._count?.messages || 0} message
                      {(t._count?.messages || 0) !== 1 ? "s" : ""}
                      {" · "}
                      {formatWhen(t.lastReplyAt || t.createdAt)}
                    </p>
                  </div>
                  <ChevronRight
                    size={16}
                    className="text-gray-300 shrink-0 mt-1"
                  />
                </button>
              );
            })}
          </div>
        )}
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
