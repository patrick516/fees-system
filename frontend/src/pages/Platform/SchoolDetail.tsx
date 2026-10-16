// frontend/src/pages/Platform/SchoolDetail.tsx
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import platformApi from "../../lib/platformApi";

interface SchoolDetail {
  id: string;
  name: string;
  slug: string | null;
  email: string | null;
  address: string;
  city: string;
  phone: string;
  isActive: boolean;
  setupCompleted: boolean;
  subscriptionStatus: string;
  trialEndsAt: string | null;
  subscriptionEndsAt: string | null;
  onekhusaMerchantAccount: string | null;
  settlementBankName: string | null;
  settlementAccountName: string | null;
  settlementAccountNumber: string | null;
  settlementBranch: string | null;
  studentCount: number;
  staffCount: number;
  admin: {
    id: string;
    email: string;
    fullName: string;
    phone: string;
    lastLogin: string | null;
    emailVerified: boolean;
  } | null;
}

export default function PlatformSchoolDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [school, setSchool] = useState<SchoolDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // OneKhusa form
  const [merchantAccount, setMerchantAccount] = useState("");
  const [secretSuccess, setSecretSuccess] = useState("");
  const [secretReversed, setSecretReversed] = useState("");
  const [savingKhusa, setSavingKhusa] = useState(false);
  const [khusaSaved, setKhusaSaved] = useState(false);

  // Suspend
  const [togglingStatus, setTogglingStatus] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await platformApi.get(`/platform/schools/${id}`);
      setSchool(res.data.data);
      setMerchantAccount(res.data.data.onekhusaMerchantAccount || "");
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to load school");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const saveOneKhusa = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingKhusa(true);
    setKhusaSaved(false);
    try {
      await platformApi.put(`/platform/schools/${id}/onekhusa`, {
        merchantAccount: merchantAccount || null,
        secretSuccess: secretSuccess || undefined,
        secretReversed: secretReversed || undefined,
      });
      setSecretSuccess("");
      setSecretReversed("");
      setKhusaSaved(true);
      setTimeout(() => setKhusaSaved(false), 3000);
      load();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to save OneKhusa");
    } finally {
      setSavingKhusa(false);
    }
  };

  const toggleStatus = async () => {
    if (!school) return;
    if (!confirm(school.isActive ? "Suspend this school?" : "Activate?"))
      return;
    setTogglingStatus(true);
    try {
      await platformApi.patch(`/platform/schools/${id}/status`, {
        isActive: !school.isActive,
      });
      load();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to update status");
    } finally {
      setTogglingStatus(false);
    }
  };

  if (loading)
    return <div className="p-8 text-sm text-slate-500">Loading...</div>;
  if (error && !school)
    return (
      <div className="p-8">
        <div className="text-sm rounded-lg bg-red-50 border border-red-200 text-red-700 px-3 py-2">
          {error}
        </div>
      </div>
    );
  if (!school) return null;

  return (
    <div className="p-8 max-w-4xl">
      <button
        onClick={() => navigate("/platform/dashboard")}
        className="text-xs text-slate-500 hover:text-slate-700 mb-3"
      >
        ← Back to schools
      </button>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            {school.name}
          </h1>
          <p className="text-sm text-slate-500">
            {school.studentCount} students · {school.staffCount} staff
          </p>
        </div>
        <button
          onClick={toggleStatus}
          disabled={togglingStatus}
          className={`rounded-lg text-sm font-semibold px-4 py-2 ${
            school.isActive
              ? "bg-red-50 text-red-700 hover:bg-red-100 border border-red-200"
              : "bg-green-50 text-green-700 hover:bg-green-100 border border-green-200"
          }`}
        >
          {school.isActive ? "Suspend School" : "Activate School"}
        </button>
      </div>

      {error && (
        <div className="mb-4 text-sm rounded-lg bg-red-50 border border-red-200 text-red-700 px-3 py-2">
          {error}
        </div>
      )}

      {/* Overview */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 mb-6">
        <h2 className="text-sm font-semibold text-slate-900 mb-4">
          School Information
        </h2>
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-xs text-slate-500">Name</dt>
            <dd className="text-slate-900">{school.name}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Status</dt>
            <dd className="text-slate-900">{school.subscriptionStatus}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Admin</dt>
            <dd className="text-slate-900">{school.admin?.email || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Admin Last Login</dt>
            <dd className="text-slate-900">
              {school.admin?.lastLogin
                ? new Date(school.admin.lastLogin).toLocaleString()
                : "Never (invite pending)"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Setup</dt>
            <dd className="text-slate-900">
              {school.setupCompleted ? "Complete" : "Pending"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Trial Ends</dt>
            <dd className="text-slate-900">
              {school.trialEndsAt
                ? new Date(school.trialEndsAt).toLocaleDateString()
                : "—"}
            </dd>
          </div>
        </dl>
      </div>

      {/* Settlement account (read-only — school entered it) */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 mb-6">
        <h2 className="text-sm font-semibold text-slate-900 mb-4">
          Settlement Account (school-provided)
        </h2>
        {school.settlementAccountNumber ? (
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-xs text-slate-500">Bank</dt>
              <dd className="text-slate-900">{school.settlementBankName}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Account Name</dt>
              <dd className="text-slate-900">{school.settlementAccountName}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Account Number</dt>
              <dd className="text-slate-900 font-mono">
                {school.settlementAccountNumber}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Branch</dt>
              <dd className="text-slate-900">
                {school.settlementBranch || "—"}
              </dd>
            </div>
          </dl>
        ) : (
          <p className="text-sm text-slate-500">
            School admin hasn&apos;t added their settlement account yet.
          </p>
        )}
      </div>

      {/* OneKhusa */}
      <form
        onSubmit={saveOneKhusa}
        className="bg-white border border-slate-200 rounded-xl p-6 mb-6"
      >
        <h2 className="text-sm font-semibold text-slate-900 mb-1">
          OneKhusa Integration
        </h2>
        <p className="text-xs text-slate-500 mb-4">
          Merchant account + webhook secrets from app.onekhusa.com. Only you see
          these — schools never do.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Merchant Account Number
            </label>
            <input
              value={merchantAccount}
              onChange={(e) => setMerchantAccount(e.target.value)}
              placeholder="75480583"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Webhook Secret — Success
            </label>
            <input
              type="password"
              value={secretSuccess}
              onChange={(e) => setSecretSuccess(e.target.value)}
              placeholder={
                school.onekhusaMerchantAccount
                  ? "•••••••• (leave blank to keep)"
                  : "Paste secret"
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Webhook Secret — Reversed
            </label>
            <input
              type="password"
              value={secretReversed}
              onChange={(e) => setSecretReversed(e.target.value)}
              placeholder={
                school.onekhusaMerchantAccount
                  ? "•••••••• (leave blank to keep)"
                  : "Paste secret"
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 mt-5">
          <button
            disabled={savingKhusa}
            className="rounded-lg bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white text-sm font-semibold px-4 py-2"
          >
            {savingKhusa ? "Saving..." : "Save OneKhusa"}
          </button>
          {khusaSaved && (
            <span className="text-xs text-green-700">✓ Saved</span>
          )}
        </div>
      </form>
    </div>
  );
}
