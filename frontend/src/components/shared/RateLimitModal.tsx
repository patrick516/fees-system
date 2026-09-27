import { useEffect, useState } from "react";
import { AlertTriangle, Clock } from "lucide-react";

interface RateLimitDetail {
  retryAfterSec: number;
  message: string;
}

const formatRemaining = (ms: number) => {
  if (ms <= 0) return "0s";
  const totalSec = Math.ceil(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;

  // Show "Xh Ym" if over an hour, else "Xm Ys" if over a minute, else "Xs"
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
};

export default function RateLimitModal() {
  const [open, setOpen] = useState(false);
  const [until, setUntil] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [message, setMessage] = useState("");
  const [remaining, setRemaining] = useState(0);

  // Listen for the global event dispatched by axios on 429
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<RateLimitDetail>).detail;
      if (!detail) return;

      const now = Date.now();
      const nextUntil = now + detail.retryAfterSec * 1000;
      const totalMs = detail.retryAfterSec * 1000;

      // If we're already open, extend the deadline AND the duration so
      // the progress bar stays accurate
      setUntil((prev) => Math.max(prev, nextUntil));
      setDuration((prev) => Math.max(prev, totalMs));
      setMessage(detail.message);
      setRemaining(nextUntil - now);
      setOpen(true);
    };

    window.addEventListener("api:rate-limited", handler);
    return () => window.removeEventListener("api:rate-limited", handler);
  }, []);

  // Live countdown
  useEffect(() => {
    if (!open) return;
    const tick = () => {
      const left = until - Date.now();
      if (left <= 0) {
        setOpen(false);
        setRemaining(0);
        return;
      }
      setRemaining(left);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [open, until]);

  if (!open) return null;

  // Progress bar: fraction of the original window remaining
  // Progress bar: fraction of the original window remaining
  const progressPct = duration
    ? Math.min(100, Math.max(0, (remaining / duration) * 100))
    : 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="rate-limit-title"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 max-w-md w-full p-6 animate-fade-in-up">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center shrink-0">
            <AlertTriangle size={22} className="text-amber-700" />
          </div>

          <div className="flex-1 min-w-0">
            <h2
              id="rate-limit-title"
              className="text-base font-semibold text-gray-900"
            >
              Please slow down
            </h2>
            <p className="text-sm text-gray-600 mt-1 leading-relaxed">
              {message}
            </p>
          </div>
        </div>

        {/* Countdown card */}
        <div className="mt-5 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock size={14} className="text-amber-700" />
            <p className="text-[11px] font-semibold text-amber-700 uppercase tracking-wide">
              Retry available in
            </p>
          </div>
          <p className="text-2xl font-bold text-amber-900 tabular-nums leading-none">
            {formatRemaining(remaining)}
          </p>

          {/* Visual progress bar */}
          <div className="mt-3 h-1.5 bg-amber-200/60 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-500 transition-all duration-1000 ease-linear"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* Action row — disabled until countdown finishes */}
        <div className="mt-5 flex items-center justify-between gap-3">
          <p className="text-[11px] text-gray-400 leading-snug">
            You can keep the page open. The banner will close on its own.
          </p>
          <button
            onClick={() => window.location.reload()}
            disabled={remaining > 0}
            className="shrink-0 px-4 py-2 rounded-lg text-sm font-medium bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-dark)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Refresh now
          </button>
        </div>
      </div>
    </div>
  );
}
