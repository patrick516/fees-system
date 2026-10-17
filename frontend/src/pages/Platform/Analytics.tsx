import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Loader2,
  TrendingUp,
  AlertTriangle,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";
import platformApi from "../../lib/platformApi";

export default function PlatformAnalytics() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await platformApi.get("/platform/subscriptions/analytics");
        setData(res.data.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="animate-spin text-slate-400" size={32} />
      </div>
    );
  }

  if (!data)
    return <div className="p-8 text-slate-500">Failed to load analytics.</div>;

  const { stats, atRiskSchools, loyalPayers, recentTransactions, currency } =
    data;

  const formatMoney = (amt: number) =>
    `${currency} ${Number(amt).toLocaleString()}`;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="mb-2">
        <h1 className="text-2xl font-semibold text-slate-900">
          Revenue & Analytics
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Track payments, promotions, and at-risk schools.
        </p>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
            Total Revenue
          </p>
          <p className="text-3xl font-bold text-slate-900">
            {formatMoney(stats.totalRevenue)}
          </p>
          <div className="flex items-center gap-4 mt-4 text-sm text-slate-600">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>{" "}
              OneKhusa: {formatMoney(stats.onekhusaRevenue)}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-slate-400"></span>{" "}
              Manual: {formatMoney(stats.manualRevenue)}
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
            Total Transactions
          </p>
          <p className="text-3xl font-bold text-slate-900">
            {stats.totalPayments}
          </p>
          <p className="text-sm text-slate-500 mt-4">
            Successfully verified payments.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
            At-Risk Schools
          </p>
          <p className="text-3xl font-bold text-red-600">
            {atRiskSchools.length}
          </p>
          <p className="text-sm text-slate-500 mt-4">
            Currently in Grace, Readonly, or Locked.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Loyal Payers (Promotions) */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2 bg-green-50/50">
            <TrendingUp size={18} className="text-green-600" />
            <h2 className="text-sm font-semibold text-green-900">
              Loyal Payers (Promotion Candidates)
            </h2>
          </div>
          <div className="divide-y divide-slate-100">
            {loyalPayers.length === 0 ? (
              <p className="p-5 text-sm text-slate-500">
                No active paid schools yet.
              </p>
            ) : (
              loyalPayers.map((s: any) => (
                <div
                  key={s.id}
                  className="px-5 py-3 flex items-center justify-between"
                >
                  <div>
                    <p className="font-medium text-slate-900">{s.name}</p>
                    <p className="text-xs text-slate-500">
                      {s._count.subscriptionPayments} successful terms
                    </p>
                  </div>
                  <Link
                    to={`/platform/schools/${s.id}`}
                    className="text-xs font-semibold text-blue-700 hover:underline"
                  >
                    View
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>

        {/* At-Risk Schools */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2 bg-red-50/50">
            <AlertTriangle size={18} className="text-red-600" />
            <h2 className="text-sm font-semibold text-red-900">
              At-Risk Schools (Follow Up)
            </h2>
          </div>
          <div className="divide-y divide-slate-100 max-h-[300px] overflow-y-auto">
            {atRiskSchools.length === 0 ? (
              <p className="p-5 text-sm text-slate-500">
                All schools are in good standing!
              </p>
            ) : (
              atRiskSchools.map((s: any) => (
                <div
                  key={s.id}
                  className="px-5 py-3 flex items-center justify-between"
                >
                  <div>
                    <p className="font-medium text-slate-900">{s.name}</p>
                    <p className="text-xs text-slate-500">
                      Status:{" "}
                      <span className="font-semibold text-red-600">
                        {s.subscriptionStatus}
                      </span>
                    </p>
                  </div>
                  <Link
                    to={`/platform/schools/${s.id}`}
                    className="text-xs font-semibold text-blue-700 hover:underline"
                  >
                    Manage
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2 bg-slate-50">
          <ShieldCheck size={18} className="text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-800">
            Recent Transactions
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase text-left">
              <tr>
                <th className="px-5 py-3 font-medium">Date</th>
                <th className="px-5 py-3 font-medium">School</th>
                <th className="px-5 py-3 font-medium">Term</th>
                <th className="px-5 py-3 font-medium">Method</th>
                <th className="px-5 py-3 font-medium text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentTransactions.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-6 text-center text-slate-500"
                  >
                    No transactions yet.
                  </td>
                </tr>
              ) : (
                recentTransactions.map((tx: any) => (
                  <tr key={tx.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 text-slate-600">
                      {new Date(tx.paidAt).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3 font-medium text-slate-900">
                      {tx.school.name}
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {tx.term.replace("_", " ")} {tx.academicYear}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${tx.method === "ONEKHUSA" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-700"}`}
                      >
                        {tx.method}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right font-mono font-medium text-slate-900">
                      {formatMoney(tx.amount)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
