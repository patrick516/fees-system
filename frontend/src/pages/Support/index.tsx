import { useEffect, useState } from "react";
import {
  MessageSquare,
  Loader2,
  Plus,
  X,
  Send,
  Lock,
  AlertCircle,
  Building2,
} from "lucide-react";
import api from "../../lib/axios";
import type { SupportTicket, SupportMessage } from "../../types";

type Tab = "parent" | "platform";

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

export default function SupportPage() {
  const [activeTab, setActiveTab] = useState<Tab>("parent");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <MessageSquare size={18} className="text-[var(--color-primary)]" />
          Support Inbox
        </h2>
        <p className="text-sm text-gray-500">
          Answer questions from parents or contact SchoolPay support
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab("parent")}
          className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "parent"
              ? "border-[var(--color-primary)] text-[var(--color-primary)]"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          <span className="flex items-center gap-2">
            <Building2 size={14} />
            Parent Tickets
          </span>
        </button>
        <button
          onClick={() => setActiveTab("platform")}
          className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "platform"
              ? "border-[var(--color-primary)] text-[var(--color-primary)]"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          <span className="flex items-center gap-2">
            <MessageSquare size={14} />
            My Requests to SchoolPay
          </span>
        </button>
      </div>

      {activeTab === "parent" ? <ParentInbox /> : <MyPlatformTickets />}
    </div>
  );
}

// ==================== TAB 1: PARENT TICKETS ====================

function ParentInbox() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"OPEN" | "CLOSED" | "">("");
  const [openTicket, setOpenTicket] = useState<SupportTicket | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const params = filter ? `?status=${filter}` : "";
      const res = await api.get(`/support${params}`);
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
    <>
      <div className="flex items-center gap-2">
        {(["OPEN", "CLOSED", ""] as const).map((f) => (
          <button
            key={f || "all"}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              filter === f
                ? "bg-[var(--color-primary)] text-white"
                : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            {f === "" ? "All" : f === "OPEN" ? "Open" : "Closed"}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 size={24} className="animate-spin text-gray-300" />
          </div>
        ) : tickets.length === 0 ? (
          <div className="p-12 text-center">
            <MessageSquare size={40} className="mx-auto mb-3 text-gray-300" />
            <p className="text-sm font-medium text-gray-500">
              No parent tickets
            </p>
            <p className="text-xs text-gray-400 mt-1">
              When parents ask questions, they&apos;ll appear here
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {tickets.map((t) => {
              const needsReply =
                t.status === "OPEN" && t.lastReplyBy === "CREATOR";
              return (
                <button
                  key={t.id}
                  onClick={() => setOpenTicket(t)}
                  className="w-full text-left px-5 py-4 hover:bg-gray-50 transition-colors flex items-start gap-4"
                >
                  <div
                    className={`w-2 h-2 rounded-full mt-2 shrink-0 ${
                      needsReply ? "bg-blue-500" : "bg-gray-300"
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-gray-800 truncate">
                        {t.subject}
                      </p>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                          t.status === "OPEN"
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {t.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      From: {t.creatorName}
                      {t._count &&
                        ` · ${t._count.messages} message${t._count.messages !== 1 ? "s" : ""}`}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {t.lastReplyAt
                        ? formatDate(t.lastReplyAt)
                        : formatDate(t.createdAt)}
                    </p>
                  </div>
                  {needsReply && (
                    <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full shrink-0">
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
        <TicketModal
          ticketId={openTicket.id}
          endpoint={`/support/${openTicket.id}`}
          replyEndpoint={`/support/${openTicket.id}/reply`}
          closeEndpoint={`/support/${openTicket.id}/close`}
          onClose={() => {
            setOpenTicket(null);
            load();
          }}
        />
      )}
    </>
  );
}

// ==================== TAB 2: MY REQUESTS TO SCHOOLPAY ====================

function MyPlatformTickets() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [openTicket, setOpenTicket] = useState<SupportTicket | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get("/support/platform");
      setTickets(res.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <>
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {tickets.length} ticket{tickets.length !== 1 ? "s" : ""}
        </p>
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-2 bg-[var(--color-primary)] text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-[var(--color-primary-dark)]"
        >
          <Plus size={16} /> Contact SchoolPay Support
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 size={24} className="animate-spin text-gray-300" />
          </div>
        ) : tickets.length === 0 ? (
          <div className="p-12 text-center">
            <MessageSquare size={40} className="mx-auto mb-3 text-gray-300" />
            <p className="text-sm font-medium text-gray-500">No requests yet</p>
            <p className="text-xs text-gray-400 mt-1">
              Click &quot;Contact SchoolPay Support&quot; to reach the platform
              team
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {tickets.map((t) => {
              const needsReply =
                t.status === "OPEN" && t.lastReplyBy === "RESPONDER";
              return (
                <button
                  key={t.id}
                  onClick={() => setOpenTicket(t)}
                  className="w-full text-left px-5 py-4 hover:bg-gray-50 transition-colors flex items-start gap-4"
                >
                  <div
                    className={`w-2 h-2 rounded-full mt-2 shrink-0 ${
                      needsReply ? "bg-green-500" : "bg-gray-300"
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-gray-800 truncate">
                        {t.subject}
                      </p>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                          t.status === "OPEN"
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {t.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {t._count &&
                        `${t._count.messages} message${t._count.messages !== 1 ? "s" : ""}`}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {t.lastReplyAt
                        ? formatDate(t.lastReplyAt)
                        : formatDate(t.createdAt)}
                    </p>
                  </div>
                  {needsReply && (
                    <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full shrink-0">
                      REPLY
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {showNew && (
        <NewPlatformTicketModal
          onClose={() => setShowNew(false)}
          onCreated={() => {
            setShowNew(false);
            load();
          }}
        />
      )}

      {openTicket && (
        <TicketModal
          ticketId={openTicket.id}
          endpoint={`/support/platform/${openTicket.id}`}
          replyEndpoint={`/support/platform/${openTicket.id}/reply`}
          isPlatform={true}
          onClose={() => {
            setOpenTicket(null);
            load();
          }}
        />
      )}
    </>
  );
}

// ==================== TICKET DETAIL MODAL ====================

function TicketModal({
  ticketId,
  endpoint,
  replyEndpoint,
  closeEndpoint,
  isPlatform,
  onClose,
}: {
  ticketId: string;
  endpoint: string;
  replyEndpoint: string;
  closeEndpoint?: string;
  isPlatform?: boolean;
  onClose: () => void;
}) {
  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [closing, setClosing] = useState(false);
  const [error, setError] = useState("");
  const [confirmClose, setConfirmClose] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get(endpoint);
      setTicket(res.data.data);
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
      await api.post(replyEndpoint, { message: reply.trim() });
      setReply("");
      await load();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to send reply");
    } finally {
      setSending(false);
    }
  };

  const doClose = async () => {
    if (!closeEndpoint) return;
    setClosing(true);
    setError("");
    try {
      await api.post(closeEndpoint);
      setConfirmClose(false);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to close");
      setConfirmClose(false);
    } finally {
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
          <div className="flex items-start justify-between px-5 py-4 border-b border-gray-100">
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-gray-800 truncate">
                {ticket?.subject || "Loading..."}
              </h3>
              {ticket && (
                <p className="text-xs text-gray-500 mt-0.5">
                  {ticket.creatorName}
                  {ticket.school && ` · ${ticket.school.name}`}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-gray-600 shrink-0"
            >
              <X size={18} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 size={20} className="animate-spin text-gray-300" />
              </div>
            ) : (
              ticket?.messages?.map((m: SupportMessage) => {
                const isMine = m.senderType === "RESPONDER";
                return (
                  <div
                    key={m.id}
                    className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                        isMine
                          ? "bg-[var(--color-primary)] text-white"
                          : "bg-white text-gray-800 border border-gray-200"
                      }`}
                    >
                      <p
                        className={`text-[10px] font-medium mb-0.5 ${isMine ? "text-white/80" : "text-gray-500"}`}
                      >
                        {m.senderName}
                      </p>
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">
                        {m.message}
                      </p>
                      <p
                        className={`text-[10px] mt-1 ${isMine ? "text-white/60" : "text-gray-400"}`}
                      >
                        {formatDate(m.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Reply + actions */}
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
                placeholder={
                  isPlatform
                    ? "Reply to SchoolPay Support..."
                    : "Reply to this parent... (they'll get an SMS)"
                }
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] resize-none"
              />
              <div className="flex items-center justify-between gap-2">
                {closeEndpoint && (
                  <button
                    onClick={() => setConfirmClose(true)}
                    disabled={closing}
                    className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-red-600 disabled:opacity-50"
                  >
                    <Lock size={12} /> Close Ticket
                  </button>
                )}
                <div className="flex-1" />
                <button
                  onClick={sendReply}
                  disabled={sending || !reply.trim()}
                  className="flex items-center gap-2 bg-[var(--color-primary)] text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-[var(--color-primary-dark)] disabled:opacity-50"
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
            <div className="border-t border-gray-100 p-4 text-center">
              <p className="text-xs text-gray-500 flex items-center justify-center gap-1.5">
                <Lock size={12} /> This ticket is closed
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 🎯 Custom Close Confirmation Modal */}
      {confirmClose && (
        <div
          className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4"
          onClick={() => !closing && setConfirmClose(false)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
              <Lock size={22} className="text-red-600" />
            </div>
            <h3 className="text-base font-bold text-gray-900 text-center mb-2">
              Close this ticket?
            </h3>
            <p className="text-sm text-gray-500 text-center mb-5 leading-relaxed">
              The other party won&apos;t be able to reply after you close it.
              They&apos;ll still see the full conversation.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmClose(false)}
                disabled={closing}
                className="flex-1 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                onClick={doClose}
                disabled={closing}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 disabled:opacity-50"
              >
                {closing ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Lock size={14} />
                )}
                {closing ? "Closing..." : "Yes, Close"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ==================== NEW PLATFORM TICKET MODAL ====================

function NewPlatformTicketModal({
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
      await api.post("/support/platform", { subject, message });
      onCreated();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to create ticket");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gray-800">
            Contact SchoolPay Support
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={18} />
          </button>
        </div>
        <p className="text-xs text-gray-500 mb-4">
          Our team usually replies within 24 hours. You&apos;ll receive an email
          notification when there&apos;s a new reply.
        </p>

        {error && (
          <div className="mb-3 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
            {error}
          </div>
        )}

        <form onSubmit={submit} className="space-y-3">
          <input
            required
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject (e.g. Can't add a new class)"
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          />
          <textarea
            required
            rows={5}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Describe your issue in detail..."
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] resize-none"
          />
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !subject.trim() || !message.trim()}
              className="flex-1 flex items-center justify-center gap-2 bg-[var(--color-primary)] text-white py-2.5 rounded-lg text-sm font-medium hover:bg-[var(--color-primary-dark)] disabled:opacity-40"
            >
              {saving ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Send size={14} />
              )}
              {saving ? "Sending..." : "Send Ticket"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
