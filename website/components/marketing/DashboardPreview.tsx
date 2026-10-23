import { ArrowUpRight, TrendingUp, Users, Wallet } from "lucide-react";

export default function DashboardPreview() {
  return (
    <div className="relative mx-auto max-w-5xl mt-16 rounded-2xl border border-gray-200 bg-white shadow-2xl overflow-hidden ring-1 ring-gray-900/5">
      {/* Fake Browser Header */}
      <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-200">
        <div className="w-3 h-3 rounded-full bg-red-400" />
        <div className="w-3 h-3 rounded-full bg-amber-400" />
        <div className="w-3 h-3 rounded-full bg-green-400" />
        <div className="ml-4 flex-1 flex justify-center">
          <div className="px-4 py-1 rounded-md bg-white border border-gray-200 text-xs text-gray-400 w-64 text-center">
            app.schoolpay.mw/dashboard
          </div>
        </div>
      </div>

      <div className="flex h-[500px] bg-gray-50/50">
        {/* Fake Sidebar */}
        <div className="w-48 bg-white border-r border-gray-200 p-4 hidden md:block">
          <div className="space-y-4 mt-4">
            <div className="h-8 bg-[var(--color-primary-light)] rounded-lg w-full" />
            <div className="h-8 bg-gray-100 rounded-lg w-5/6" />
            <div className="h-8 bg-gray-100 rounded-lg w-4/6" />
            <div className="h-8 bg-gray-100 rounded-lg w-5/6" />
          </div>
        </div>

        {/* Fake Dashboard Content */}
        <div className="flex-1 p-6 md:p-8 overflow-hidden">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-lg font-bold text-gray-800">Overview</h3>
              <p className="text-xs text-gray-500">Term 1, 2026-2027</p>
            </div>
            <div className="h-8 w-24 bg-[var(--color-primary)] rounded-lg shadow-sm" />
          </div>

          {/* Top Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
              <div className="flex justify-between items-center mb-2">
                <p className="text-xs font-medium text-gray-500">
                  Total Collected
                </p>
                <Wallet size={14} className="text-green-500" />
              </div>
              <p className="text-xl font-bold text-gray-800">MWK 12,450,000</p>
              <p className="text-[10px] text-green-600 flex items-center gap-1 mt-1">
                <ArrowUpRight size={10} /> +15% from last term
              </p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
              <div className="flex justify-between items-center mb-2">
                <p className="text-xs font-medium text-gray-500">Outstanding</p>
                <TrendingUp size={14} className="text-orange-500" />
              </div>
              <p className="text-xl font-bold text-gray-800">MWK 3,200,000</p>
              <p className="text-[10px] text-gray-400 mt-1">24 debtors</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
              <div className="flex justify-between items-center mb-2">
                <p className="text-xs font-medium text-gray-500">
                  Paid in Full
                </p>
                <Users size={14} className="text-blue-500" />
              </div>
              <p className="text-xl font-bold text-gray-800">342 Students</p>
              <p className="text-[10px] text-gray-400 mt-1">Out of 400</p>
            </div>
          </div>

          {/* Charts Area */}
          <div className="grid grid-cols-2 gap-4">
            {/* Bar Chart (Term Collections) */}
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
              <p className="text-xs font-semibold text-gray-700 mb-4">
                Collections by Term
              </p>
              <div className="flex items-end gap-4 h-32 pt-4">
                {[40, 70, 90].map((height, i) => (
                  <div
                    key={i}
                    className="flex-1 flex flex-col items-center gap-2"
                  >
                    <div
                      className="w-full bg-[var(--color-primary)] rounded-t-md opacity-80 hover:opacity-100 transition-all"
                      style={{ height: `${height}%` }}
                    />
                    <span className="text-[10px] text-gray-400">
                      Term {i + 1}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Donut Chart (Payment Methods) */}
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-700 mb-2">
                  Channels
                </p>
                <div className="space-y-2 text-[10px]">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[var(--color-primary)]" />{" "}
                    OneKhusa
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-400" /> Bank
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-400" /> Cash
                  </div>
                </div>
              </div>
              <div className="relative w-24 h-24 rounded-full border-[12px] border-gray-100 flex items-center justify-center">
                <div
                  className="absolute inset-0 rounded-full border-[12px] border-[var(--color-primary)]"
                  style={{
                    clipPath:
                      "polygon(50% 50%, 100% 0, 100% 100%, 0 100%, 0 50%)",
                  }}
                />
                <span className="text-xs font-bold text-gray-800 z-10">
                  65%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
