// frontend/src/components/Platform/NotificationBell.tsx
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Bell, Check, X, Loader2 } from "lucide-react";
import platformApi from "../../lib/platformApi";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  payload: any;
  status: "UNREAD" | "READ" | "RESOLVED";
  createdAt: string;
  school: { id: string; name: string } | null;
  actorName: string | null;
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [list, setList] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [acting, setActing] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const fetchUnread = async () => {
    try {
      const res = await platformApi.get("/platform/notifications/unread-count");
      setUnread(res.data.data.count || 0);
    } catch {
      /* ignore */
    }
  };

  const fetchList = async () => {
    setLoading(true);
    try {
      const res = await platformApi.get(
        "/platform/notifications?status=UNREAD,READ",
      );
      setList(res.data.data || []);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUnread();
    const t = setInterval(fetchUnread, 60_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (open) fetchList();
  }, [open]);

  // close on outside click
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const resolve = async (id: string, action: "approve" | "reject") => {
    setActing(id);
    try {
      await platformApi.post(`/platform/notifications/${id}/resolve`, {
        action,
      });
      await Promise.all([fetchList(), fetchUnread()]);
    } catch (err: any) {
      alert(err?.response?.data?.message || "Failed");
    } finally {
      setActing(null);
    }
  };

  return (
    <div className="relative" ref={wrapRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-lg hover:bg-slate-100 transition"
      >
        <Bell size={18} className="text-slate-600" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center px-1">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-96 max-h-[70vh] overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg z-50">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-900">
              Notifications
            </p>
            <button
              onClick={() => setOpen(false)}
              className="text-slate-400 hover:text-slate-700"
            >
              <X size={16} />
            </button>
          </div>

          {loading && (
            <div className="p-6 flex items-center justify-center text-sm text-slate-500">
              <Loader2 size={16} className="animate-spin mr-2" /> Loading...
            </div>
          )}

          {!loading && list.length === 0 && (
            <div className="p-6 text-center text-sm text-slate-500">
              No notifications
            </div>
          )}

          {!loading &&
            list.map((n) => (
              <div
                key={n.id}
                className={`p-4 border-b border-slate-100 last:border-0 ${
                  n.status === "UNREAD" ? "bg-blue-50/40" : ""
                }`}
              >
                <div className="flex items-start gap-2">
                  <div
                    className={`mt-1 w-2 h-2 rounded-full shrink-0 ${
                      n.status === "UNREAD" ? "bg-blue-600" : "bg-slate-300"
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900">
                      {n.title}
                    </p>
                    <p className="text-xs text-slate-600 mt-0.5">{n.message}</p>
                    {n.actorName && (
                      <p className="text-[11px] text-slate-400 mt-1">
                        From {n.actorName}
                      </p>
                    )}

                    {n.type === "SETTLEMENT_CHANGE_REQUEST" && n.payload && (
                      <div className="mt-2 text-[11px] bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono text-slate-700 leading-relaxed">
                        <div>Bank: {n.payload.bankName}</div>
                        <div>Name: {n.payload.accountName}</div>
                        <div>Acct: {n.payload.accountNumber}</div>
                        {n.payload.branch && (
                          <div>Branch: {n.payload.branch}</div>
                        )}
                        {n.payload.reason && (
                          <div className="mt-1 not-italic font-sans text-slate-500">
                            Reason: {n.payload.reason}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex items-center gap-2 mt-3">
                      {n.type === "SETTLEMENT_CHANGE_REQUEST" && (
                        <>
                          <button
                            disabled={acting === n.id}
                            onClick={() => resolve(n.id, "approve")}
                            className="flex items-center gap-1 text-xs font-semibold text-white bg-green-600 hover:bg-green-700 disabled:opacity-60 rounded px-2 py-1"
                          >
                            <Check size={12} /> Approve
                          </button>
                          <button
                            disabled={acting === n.id}
                            onClick={() => resolve(n.id, "reject")}
                            className="flex items-center gap-1 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded px-2 py-1"
                          >
                            <X size={12} /> Reject
                          </button>
                        </>
                      )}
                      {n.school && (
                        <Link
                          to={`/platform/schools/${n.school.id}`}
                          className="text-[11px] text-blue-700 hover:underline ml-auto"
                        >
                          View school →
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
