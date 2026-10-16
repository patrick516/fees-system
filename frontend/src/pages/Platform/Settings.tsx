// frontend/src/pages/Platform/Settings.tsx
import { useEffect, useState } from "react";
import { Eye, EyeOff, CheckCircle2, Pencil } from "lucide-react";
import platformApi from "../../lib/platformApi";

interface PlatformSettings {
  id: string;
  name: string;
  email: string;
  phone: string;
  currency: string;
  defaultTermPrice: number;
  defaultTrialDays: number;
  subscriptionMerchantAccount: string | null;
  hasSubscriptionSecretSuccess: boolean;
  hasSubscriptionSecretReversed: boolean;
}

export default function PlatformSettingsPage() {
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  // Form fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [currency, setCurrency] = useState("MWK");
  const [defaultTermPrice, setDefaultTermPrice] = useState(0);
  const [defaultTrialDays, setDefaultTrialDays] = useState(30);
  const [merchantAccount, setMerchantAccount] = useState("");
  const [secretSuccess, setSecretSuccess] = useState("");
  const [secretReversed, setSecretReversed] = useState("");

  // Eye toggles for secret inputs
  const [showSecretSuccess, setShowSecretSuccess] = useState(false);
  const [showSecretReversed, setShowSecretReversed] = useState(false);

  // "edit" shows the form; "view" shows the saved summary
  const [mode, setMode] = useState<"edit" | "view">("edit");

  const load = async () => {
    setLoading(true);
    try {
      const res = await platformApi.get("/platform/settings");
      const s: PlatformSettings = res.data.data;
      setSettings(s);
      setName(s.name || "");
      setEmail(s.email || "");
      setPhone(s.phone || "");
      setCurrency(s.currency || "MWK");
      setDefaultTermPrice(s.defaultTermPrice || 0);
      setDefaultTrialDays(s.defaultTrialDays ?? 30);
      setMerchantAccount(s.subscriptionMerchantAccount || "");
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const body: any = {
        name,
        email,
        phone,
        currency,
        defaultTermPrice,
        defaultTrialDays,
        subscriptionMerchantAccount: merchantAccount || null,
      };
      if (secretSuccess.trim())
        body.subscriptionWebhookSecretSuccess = secretSuccess;
      if (secretReversed.trim())
        body.subscriptionWebhookSecretReversed = secretReversed;

      const res = await platformApi.put("/platform/settings", body);
      setSettings(res.data.data);
      setSecretSuccess("");
      setSecretReversed("");
      setSaved(true);
      setMode("view");
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <p className="text-sm text-slate-500">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">
          Platform Settings
        </h1>
        <p className="text-sm text-slate-500">
          Defaults applied to new schools + your own subscription revenue
          account
        </p>
      </div>

      {error && (
        <div className="mb-4 text-sm rounded-lg bg-red-50 border border-red-200 text-red-700 px-3 py-2">
          {error}
        </div>
      )}

      {/* ============ EDIT MODE ============ */}
      {mode === "edit" && (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Platform Info */}
          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <h2 className="text-sm font-semibold text-slate-900 mb-4">
              Platform Information
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Platform Name
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Contact Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Contact Phone
                </label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>
          </div>

          {/* Subscription Defaults */}
          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <h2 className="text-sm font-semibold text-slate-900 mb-1">
              Subscription Defaults
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Applied to new schools unless overridden at invite time.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Price per Term
                </label>
                <input
                  type="number"
                  min={0}
                  value={defaultTermPrice}
                  onChange={(e) => setDefaultTermPrice(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Currency
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="MWK">MWK — Malawian Kwacha</option>
                  <option value="USD">USD — US Dollar</option>
                  <option value="ZAR">ZAR — South African Rand</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Default Trial Days
                </label>
                <input
                  type="number"
                  min={0}
                  value={defaultTrialDays}
                  onChange={(e) => setDefaultTrialDays(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  e.g. 30 for a month, 90 for a whole term
                </p>
              </div>
            </div>
          </div>

          {/* Subscription Revenue Account */}
          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <h2 className="text-sm font-semibold text-slate-900 mb-1">
              Subscription Revenue Account (OneKhusa)
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Your OWN merchant account where schools&apos; subscription
              payments land — separate from each school&apos;s parent-payment
              merchant.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Merchant Account Number
                </label>
                <input
                  value={merchantAccount}
                  onChange={(e) => setMerchantAccount(e.target.value)}
                  placeholder="e.g. 75480500"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Webhook Secret — Success
                </label>
                <div className="relative">
                  <input
                    type={showSecretSuccess ? "text" : "password"}
                    value={secretSuccess}
                    onChange={(e) => setSecretSuccess(e.target.value)}
                    placeholder={
                      settings?.hasSubscriptionSecretSuccess
                        ? "•••••••• (leave blank to keep)"
                        : "Paste secret from OneKhusa"
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 pr-10 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecretSuccess((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                    title={showSecretSuccess ? "Hide" : "Show"}
                  >
                    {showSecretSuccess ? (
                      <EyeOff size={16} />
                    ) : (
                      <Eye size={16} />
                    )}
                  </button>
                </div>
                {settings?.hasSubscriptionSecretSuccess && (
                  <p className="text-[11px] text-green-700 mt-1">
                    ✓ A secret is currently stored
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Webhook Secret — Reversed
                </label>
                <div className="relative">
                  <input
                    type={showSecretReversed ? "text" : "password"}
                    value={secretReversed}
                    onChange={(e) => setSecretReversed(e.target.value)}
                    placeholder={
                      settings?.hasSubscriptionSecretReversed
                        ? "•••••••• (leave blank to keep)"
                        : "Paste secret from OneKhusa"
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 pr-10 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecretReversed((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                    title={showSecretReversed ? "Hide" : "Show"}
                  >
                    {showSecretReversed ? (
                      <EyeOff size={16} />
                    ) : (
                      <Eye size={16} />
                    )}
                  </button>
                </div>
                {settings?.hasSubscriptionSecretReversed && (
                  <p className="text-[11px] text-green-700 mt-1">
                    ✓ A secret is currently stored
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              disabled={saving}
              className="rounded-lg bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white text-sm font-semibold px-5 py-2.5"
            >
              {saving ? "Saving..." : "Save Settings"}
            </button>
            {saved && <span className="text-sm text-green-700">✓ Saved</span>}
          </div>
        </form>
      )}

      {/* ============ VIEW MODE — saved summary as table ============ */}
      {mode === "view" && settings && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-green-50/60">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-green-700" />
              <p className="text-sm font-semibold text-green-800">
                Settings saved
              </p>
            </div>
            <button
              onClick={() => setMode("edit")}
              className="flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:text-blue-900 bg-white border border-blue-200 hover:bg-blue-50 rounded-lg px-3 py-1.5 transition"
              title="Edit settings"
            >
              <Pencil size={12} /> Edit
            </button>
          </div>

          {/* Table */}
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-1/2">
                  Setting
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-1/2">
                  Value
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr className="hover:bg-slate-50 transition">
                <td className="px-5 py-3 text-slate-600">Platform Name</td>
                <td className="px-5 py-3 text-slate-900 font-medium">
                  {settings.name || "—"}
                </td>
              </tr>
              <tr className="hover:bg-slate-50 transition">
                <td className="px-5 py-3 text-slate-600">Contact Email</td>
                <td className="px-5 py-3 text-slate-900">
                  {settings.email || "—"}
                </td>
              </tr>
              <tr className="hover:bg-slate-50 transition">
                <td className="px-5 py-3 text-slate-600">Contact Phone</td>
                <td className="px-5 py-3 text-slate-900">
                  {settings.phone || "—"}
                </td>
              </tr>
              <tr className="hover:bg-slate-50 transition">
                <td className="px-5 py-3 text-slate-600">Currency</td>
                <td className="px-5 py-3 text-slate-900">
                  {settings.currency || "MWK"}
                </td>
              </tr>
              <tr className="hover:bg-slate-50 transition">
                <td className="px-5 py-3 text-slate-600">Price per Term</td>
                <td className="px-5 py-3 text-slate-900">
                  <span className="font-mono">
                    {settings.currency || "MWK"}{" "}
                    {Number(settings.defaultTermPrice || 0).toLocaleString()}
                  </span>
                </td>
              </tr>
              <tr className="hover:bg-slate-50 transition">
                <td className="px-5 py-3 text-slate-600">Default Trial Days</td>
                <td className="px-5 py-3 text-slate-900">
                  {settings.defaultTrialDays ?? 30}{" "}
                  <span className="text-slate-400 text-xs">days</span>
                </td>
              </tr>
              <tr className="hover:bg-slate-50 transition">
                <td className="px-5 py-3 text-slate-600">Merchant Account</td>
                <td className="px-5 py-3">
                  {settings.subscriptionMerchantAccount ? (
                    <span className="font-mono text-slate-900">
                      {settings.subscriptionMerchantAccount}
                    </span>
                  ) : (
                    <span className="text-slate-400">Not set</span>
                  )}
                </td>
              </tr>
              <tr className="hover:bg-slate-50 transition">
                <td className="px-5 py-3 text-slate-600">
                  Webhook Secret — Success
                </td>
                <td className="px-5 py-3">
                  {settings.hasSubscriptionSecretSuccess ? (
                    <span className="inline-flex items-center gap-1 text-green-700 font-medium">
                      <CheckCircle2 size={14} /> Configured
                    </span>
                  ) : (
                    <span className="text-slate-400">Not set</span>
                  )}
                </td>
              </tr>
              <tr className="hover:bg-slate-50 transition">
                <td className="px-5 py-3 text-slate-600">
                  Webhook Secret — Reversed
                </td>
                <td className="px-5 py-3">
                  {settings.hasSubscriptionSecretReversed ? (
                    <span className="inline-flex items-center gap-1 text-green-700 font-medium">
                      <CheckCircle2 size={14} /> Configured
                    </span>
                  ) : (
                    <span className="text-slate-400">Not set</span>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
