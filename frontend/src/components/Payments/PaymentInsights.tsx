import { useEffect, useState } from "react";
import {
  Zap,
  Smartphone,
  Building2,
  Banknote,
  TrendingUp,
  Clock,
  AlertCircle,
  Loader2,
} from "lucide-react";
import api from "../../lib/axios";

interface Channel {
  key: string;
  count: number;
  amount: number;
  label: string;
  description: string;
  color: string;
  percent: number;
}

const ICONS: Record<string, typeof Zap> = {
  malipo_online: Zap,
  mobile_manual: Smartphone,
  bank_manual: Building2,
  cash: Banknote,
};

const COLOR_MAP: Record<
  string,
  { bg: string; text: string; bar: string; icon: string }
> = {
  emerald: {
    bg: "bg-emerald-50 border-emerald-100",
    text: "text-emerald-700",
    bar: "bg-emerald-500",
    icon: "text-emerald-600",
  },
  amber: {
    bg: "bg-amber-50 border-amber-100",
    text: "text-amber-700",
    bar: "bg-amber-500",
    icon: "text-amber-600",
  },
  blue: {
    bg: "bg-blue-50 border-blue-100",
    text: "text-blue-700",
    bar: "bg-blue-500",
    icon: "text-blue-600",
  },
  slate: {
    bg: "bg-slate-50 border-slate-100",
    text: "text-slate-700",
    bar: "bg-slate-500",
    icon: "text-slate-600",
  },
};

const PaymentInsights = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/payments/insights")
      .then((res) => setData(res.data.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 flex items-center justify-center h-32">
        <Loader2 size={20} className="animate-spin text-gray-300" />
      </div>
    );
  }

  if (!data || data.totalCount === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 text-center">
        <TrendingUp size={28} className="mx-auto mb-2 text-gray-200" />
        <p className="text-sm text-gray-400 font-medium">
          No payments recorded for this term yet
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <TrendingUp size={16} className="text-[var(--color-primary)]" />
          <div>
            <h3 className="font-medium text-gray-800 text-sm">
              Payment Insights
            </h3>
            <p className="text-[11px] text-gray-500">
              {data.term ? data.term.replace("_", " ") : "All terms"} •{" "}
              {data.academicYear} • {data.totalCount} verified payments
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[11px] text-gray-400 uppercase tracking-wide">
            Total collected
          </p>
          <p className="text-sm font-bold text-gray-800">
            MWK {data.totalAmount.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Channel cards */}
      <div className="p-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
        {data.channels.map((c: Channel) => {
          const Icon = ICONS[c.key] || Banknote;
          const colors = COLOR_MAP[c.color] || COLOR_MAP.slate;
          return (
            <div key={c.key} className={`rounded-xl border p-3 ${colors.bg}`}>
              <div className="flex items-center justify-between mb-2">
                <div
                  className={`w-7 h-7 rounded-lg bg-white flex items-center justify-center`}
                >
                  <Icon size={14} className={colors.icon} />
                </div>
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${colors.text} bg-white`}
                >
                  {c.percent}%
                </span>
              </div>
              <p className="text-[10px] text-gray-500 uppercase tracking-wide font-medium">
                {c.label}
              </p>
              <p className={`text-base font-bold ${colors.text}`}>
                MWK {c.amount.toLocaleString()}
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5">
                {c.count} payment{c.count !== 1 ? "s" : ""}
              </p>
              <div className="mt-2 h-1 rounded-full bg-white/60 overflow-hidden">
                <div
                  className={`h-full ${colors.bar} rounded-full`}
                  style={{ width: `${c.percent}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom row — extra info */}
      <div className="border-t border-gray-100 px-5 py-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
            <Zap size={14} className="text-emerald-600" />
          </div>
          <div>
            <p className="text-[10px] text-gray-400 uppercase tracking-wide">
              Today (online)
            </p>
            <p className="text-xs font-semibold text-gray-800">
              MWK {data.todayOnline.amount.toLocaleString()}{" "}
              <span className="text-[10px] text-gray-400 font-normal">
                ({data.todayOnline.count})
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
            <Clock size={14} className="text-amber-600" />
          </div>
          <div>
            <p className="text-[10px] text-gray-400 uppercase tracking-wide">
              Online pending
            </p>
            <p className="text-xs font-semibold text-gray-800">
              {data.malipoPending} awaiting confirmation
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
            <AlertCircle size={14} className="text-red-600" />
          </div>
          <div>
            <p className="text-[10px] text-gray-400 uppercase tracking-wide">
              Online failed
            </p>
            <p className="text-xs font-semibold text-gray-800">
              {data.malipoFailed} this term
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentInsights;
