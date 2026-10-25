import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  CreditCard,
  Clock,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  CheckCircle2,
  Circle,
  XCircle,
  ArrowRight,
  BadgeAlert,
  Target,
  Star,
  Loader2,
  RefreshCw,
  BookOpen,
  CalendarDays,
  PartyPopper,
  Building2,
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
  const [onboarding, setOnboarding] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchSummary = useCallback(async () => {
    if (!activeYear) return;
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      params.set("academicYear", activeYear);
      if (currentTerm) params.set("term", currentTerm);

      const res = await api.get(`/payments/summary?${params}`);
      setSummary(res.data.data);
    } catch (err: any) {
      const status = err.response?.status;
      const msg = err.response?.data?.message;

      if (status === 429) {
        setError("Too many requests — please wait a moment before refreshing.");
      } else if (status === 401) {
        setError("Your session expired. Redirecting to login…");
      } else {
        setError(msg || "Couldn't load dashboard data. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }, [activeYear, currentTerm]);

  const fetchOnboarding = async () => {
    try {
      const res = await api.get("/schools/onboarding-status");
      setOnboarding(res.data.data);
    } catch (err) {
      console.error("Failed to load onboarding status");
    }
  };

  useEffect(() => {
    fetchSummary();
    fetchOnboarding();
  }, [fetchSummary]);

  if (loading && !summary) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-primary)]" />
      </div>
    );
  }

  if (error && !summary) {
    return (
      <div className="max-w-md mx-auto mt-12 bg-white rounded-xl shadow-sm border border-red-100 p-8 text-center">
        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
          <AlertCircle size={22} className="text-red-600" />
        </div>
        <h2 className="text-base font-semibold text-gray-800 mb-1">
          Couldn't load dashboard
        </h2>
        <p className="text-sm text-gray-500 mb-5">{error}</p>
        <button
          onClick={fetchSummary}
          disabled={loading}
          className="inline-flex items-center gap-2 bg-[var(--color-primary)] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[var(--color-primary-dark)] disabled:opacity-40"
        >
          {loading ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <RefreshCw size={14} />
          )}
          {loading ? "Retrying…" : "Retry"}
        </button>
      </div>
    );
  }

  //  Onboarding Checklist Component
  const renderOnboarding = () => {
    if (!onboarding || onboarding.isComplete) return null;

    const steps = [
      {
        title: "Complete School Profile",
        desc: "Set your school's name so we can generate the correct Student IDs.",
        done: onboarding.hasSchoolDetails, // This comes from the backend
        path: "/settings",
        icon: Building2,
      },
      {
        title: "Create Classes",
        desc: "Add the classes or forms in your school (e.g. Form 1, Grade 5).",
        done: onboarding.hasClasses,
        path: "/classes",
        icon: BookOpen,
      },
      {
        title: "Set Fee Structures",
        desc: "Define how much each class pays per term.",
        done: onboarding.hasFeeStructures,
        path: "/classes", // Adjust if you have a dedicated fee page
        icon: CreditCard,
      },
      {
        title: "Activate a Term",
        desc: "Set the current term and academic year to start collecting fees.",
        done: onboarding.hasActiveTerm,
        path: "/classes",
        icon: CalendarDays,
      },
      {
        title: "Add Students",
        desc: "Add students manually or import them via Excel.",
        done: onboarding.hasStudents,
        path: "/students/add",
        icon: Users,
      },
    ];

    const completedCount = steps.filter((s) => s.done).length;
    const progress = Math.round((completedCount / steps.length) * 100);

    return (
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-6 mb-8 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900">
              Welcome to SchoolPay!
              <PartyPopper size={20} className="text-[var(--color-primary)]" />
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Complete these steps to finish setting up your school.
            </p>
          </div>
          <div className="text-right">
            <span className="text-2xl font-bold text-[var(--color-primary)]">
              {progress}%
            </span>
            <p className="text-xs text-gray-500 font-medium">Completed</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-blue-200/50 rounded-full h-2 mb-6">
          <div
            className="bg-[var(--color-primary)] h-2 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Checklist */}
        <div className="space-y-3">
          {steps.map((step, i) => (
            <div
              key={i}
              className={`flex items-center gap-4 p-3 rounded-lg border ${
                step.done
                  ? "bg-white/60 border-green-200"
                  : "bg-white border-blue-100 shadow-sm"
              }`}
            >
              <div className="shrink-0">
                {step.done ? (
                  <CheckCircle2 size={24} className="text-green-500" />
                ) : (
                  <Circle size={24} className="text-gray-300" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm font-semibold ${
                    step.done ? "text-gray-500 line-through" : "text-gray-900"
                  }`}
                >
                  {step.title}
                </p>
                {!step.done && (
                  <p className="text-xs text-gray-500 mt-0.5">{step.desc}</p>
                )}
              </div>
              {!step.done && (
                <button
                  onClick={() => navigate(step.path)}
                  className="shrink-0 flex items-center gap-1 bg-[var(--color-primary)] text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-[var(--color-primary-dark)] transition-colors"
                >
                  Start <ArrowRight size={12} />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/*  Onboarding Wizard */}
      {renderOnboarding()}

      {/* Non-blocking error banner — data is showing but stale */}
      {error && summary && (
        <div className="flex items-center gap-2.5 bg-amber-50 border border-amber-200 rounded-xl p-3">
          <AlertCircle size={15} className="text-amber-600 shrink-0" />
          <p className="text-xs text-amber-800 flex-1">
            {error} Numbers below may be out of date.
          </p>
          <button
            onClick={fetchSummary}
            disabled={loading}
            className="text-xs text-amber-700 font-semibold hover:text-amber-900 disabled:opacity-40 inline-flex items-center gap-1"
          >
            {loading ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <RefreshCw size={12} />
            )}
            Refresh
          </button>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard
          title="Total Required"
          value={formatMWK(summary?.totalRequired || 0)}
          icon={Target}
          color="bg-[var(--color-primary)]"
          subtitle="Fees expected this term"
        />
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-gray-500">Total Collected</p>
            <div className="w-10 h-10 bg-[var(--color-primary)] rounded-lg flex items-center justify-center">
              <TrendingUp size={20} className="text-white" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {formatMWK(summary?.totalCollected || 0)}
          </p>

          <div className="mt-3 pt-3 border-t border-gray-100 space-y-1">
            <div className="flex justify-between text-xs text-gray-500">
              <span>Processing Fees (OneKhusa):</span>
              <span className="text-red-500 font-medium">
                - {formatMWK(summary?.totalFees || 0)}
              </span>
            </div>
            <div className="flex justify-between text-sm font-semibold text-green-700">
              <span>Net to School:</span>
              <span>{formatMWK(summary?.totalNetCollected || 0)}</span>
            </div>
          </div>
        </div>
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

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800 mb-6">
            Student Fee Status
          </h2>

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
              label: "Record Payment",
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
