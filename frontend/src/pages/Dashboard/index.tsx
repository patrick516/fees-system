import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  CreditCard,
  Clock,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  XCircle,
  ArrowRight,
  BadgeAlert,
  Target,
  Star,
} from "lucide-react";
import api from "../../lib/axios";
import type { PaymentSummary } from "../../types";
import { useActiveTerm } from "../../hooks/useActiveTerm";

const StatCard = ({
  title,
  value,
  icon: Icon,
  color,
  subtitle,
}: {
  title: string;
  value: string | number;
  icon: any;
  color: string;
  subtitle?: string;
}) => (
  <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
    <div className="flex items-center justify-between mb-4">
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <div
        className={`w-10 h-10 ${color} rounded-lg flex items-center justify-center`}
      >
        <Icon size={20} className="text-white" />
      </div>
    </div>
    <p className="text-2xl font-bold text-gray-900">{value}</p>
    {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
  </div>
);

const formatMWK = (amount: number) => {
  return `MWK ${amount.toLocaleString()}`;
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { academicYear: activeYear, activeTerm: currentTerm } = useActiveTerm();
  const [summary, setSummary] = useState<PaymentSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeYear) return; // wait until the hook resolves
    const fetchSummary = async () => {
      try {
        const params = new URLSearchParams();
        params.set("academicYear", activeYear);
        if (currentTerm) params.set("term", currentTerm);

        const res = await api.get(`/payments/summary?${params}`);
        setSummary(res.data.data);
      } catch (err) {
        console.error("Failed to load summary");
      } finally {
        setLoading(false);
      }
    };
    fetchSummary();
  }, [activeYear, currentTerm]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-900" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      {/* Stats Grid — 6 tiles matching the accounting model */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard
          title="Total Required"
          value={formatMWK(summary?.totalRequired || 0)}
          icon={Target}
          color="bg-blue-700"
          subtitle="Fees expected this term"
        />
        <StatCard
          title="Total Collected"
          value={formatMWK(summary?.totalCollected || 0)}
          icon={TrendingUp}
          color="bg-[var(--color-primary)]"
          subtitle={
            activeYear
              ? `${currentTerm?.replace("_", " ") || "Term"} • ${activeYear}`
              : "This term"
          }
        />
        <StatCard
          title="Outstanding Balance"
          value={formatMWK(summary?.outstandingBalance || 0)}
          icon={AlertCircle}
          color="bg-orange-500"
          subtitle="Fees still owed by parents"
        />
        <StatCard
          title="Credit Held"
          value={formatMWK(summary?.totalCredit || 0)}
          icon={Star}
          color="bg-purple-600"
          subtitle="Overpayments for next term"
        />
        <StatCard
          title="Debtors"
          value={summary?.debtorCount || 0}
          icon={BadgeAlert}
          color="bg-red-600"
          subtitle="Students with balance owing"
        />
        <StatCard
          title="Paid in Full"
          value={summary?.paidStudents || 0}
          icon={CheckCircle}
          color="bg-green-600"
          subtitle={`of ${summary?.totalStudents || 0} students`}
        />
      </div>

      {/* Two columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Status Breakdown */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800 mb-6">
            Payment Status
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
              <div className="flex items-center gap-3">
                <CheckCircle size={20} className="text-green-600" />
                <span className="text-sm font-medium text-gray-700">
                  Verified Payments
                </span>
              </div>
              <span className="text-lg font-bold text-green-600">
                {summary?.verifiedCount || 0}
              </span>
            </div>
            <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Clock size={20} className="text-yellow-600" />
                <span className="text-sm font-medium text-gray-700">
                  Pending Review
                </span>
              </div>
              <span className="text-lg font-bold text-yellow-600">
                {summary?.pendingCount || 0}
              </span>
            </div>
            <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
              <div className="flex items-center gap-3">
                <XCircle size={20} className="text-red-600" />
                <span className="text-sm font-medium text-gray-700">
                  Rejected
                </span>
              </div>
              <span className="text-lg font-bold text-red-600">
                {summary?.rejectedCount || 0}
              </span>
            </div>
          </div>
        </div>

        {/* Student Fee Status */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800 mb-6">
            Student Fee Status
          </h2>

          {/* Progress bar */}
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-500">Payment Progress</span>
              <span className="font-medium">
                {summary?.totalStudents
                  ? Math.round(
                      (summary.paidStudents / summary.totalStudents) * 100,
                    )
                  : 0}
                %
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-[var(--color-primary)] h-3 rounded-full transition-all"
                style={{
                  width: `${
                    summary?.totalStudents
                      ? (summary.paidStudents / summary.totalStudents) * 100
                      : 0
                  }%`,
                }}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-600">
                {summary?.paidStudents || 0}
              </p>
              <p className="text-xs text-gray-500 mt-1">Paid in Full</p>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <p className="text-2xl font-bold text-red-600">
                {summary?.debtorCount || 0}
              </p>
              <p className="text-xs text-gray-500 mt-1">Debtors</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-gray-500">
                {summary?.noFeeCount || 0}
              </p>
              <p className="text-xs text-gray-500 mt-1">No Fee Set</p>
            </div>
          </div>
          {/* Pending alert */}
          {(summary?.pendingCount || 0) > 0 && (
            <button
              onClick={() => navigate("/payments/pending")}
              className="mt-4 w-full flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800 hover:bg-yellow-100 transition-colors"
            >
              <div className="flex items-center gap-2">
                <AlertCircle size={16} />
                <span>
                  {summary?.pendingCount} payment(s) waiting for your approval
                </span>
              </div>
              <ArrowRight size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            {
              label: "Record Cash Payment",
              path: "/payments/record",
              color: "bg-[var(--color-primary)]",
              icon: CreditCard,
            },
            {
              label: "Add New Student",
              path: "/students/add",
              color: "bg-green-600",
              icon: Users,
            },
            {
              label: "View Pending",
              path: "/payments/pending",
              color: "bg-yellow-500",
              icon: Clock,
            },
            {
              label: "All Students",
              path: "/students",
              color: "bg-purple-600",
              icon: Users,
            },
          ].map((action) => (
            <button
              key={action.path}
              onClick={() => navigate(action.path)}
              className={`${action.color} text-white p-4 rounded-xl flex flex-col items-center gap-2 hover:opacity-90 transition-opacity`}
            >
              <action.icon size={24} />
              <span className="text-xs font-medium text-center">
                {action.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
