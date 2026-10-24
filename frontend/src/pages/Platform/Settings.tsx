import { useEffect, useState } from "react";
import { Eye, EyeOff, CheckCircle2, Pencil, Layers } from "lucide-react";
import platformApi from "../../lib/platformApi";
import TierManagerCard from "../../components/Platform/TierManagerCard";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";

interface Tier {
  id: string;
  name: string;
  price: number;
  maxStudents: number;
  description: string;
  features: string[];
  popular?: boolean;
}

interface PlatformSettings {
  id: string;
  name: string;
  email: string;
  phone: string;
  currency: string;
  defaultTermPrice: number;
  defaultTrialDays: number;
  subscriptionMerchantAccount: string | null;
  subscriptionWebhookSecretSuccess: string;
  subscriptionWebhookSecretReversed: string;
  hasSubscriptionSecretSuccess: boolean;
  hasSubscriptionSecretReversed: boolean;
  tiers: Tier[];
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

  // 🎯 Tier state (managed locally until "Save Tiers" in TierManagerCard is clicked)
  const [tiers, setTiers] = useState<Tier[]>([]);

  // Eye toggles for secret inputs
  const [showSecretSuccess, setShowSecretSuccess] = useState(false);
  const [showSecretReversed, setShowSecretReversed] = useState(false);

  // Default to "view" — table shows first, Edit reveals the form
  const [mode, setMode] = useState<"edit" | "view">("view");

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
      setSecretSuccess(s.subscriptionWebhookSecretSuccess || "");
      setSecretReversed(s.subscriptionWebhookSecretReversed || "");
      setTiers(s.tiers || []);
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
        tiers, // 🎯 Send the current tiers array along with everything else
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
    <div className={`p-8 ${mode === "view" ? "w-full" : "max-w-4xl"}`}>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">
          Platform Settings
        </h1>
        <p className="text-sm text-slate-500">
          Defaults applied to new schools, subscription tiers, and your own
          subscription revenue account
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
              Fallback values for schools that haven't been assigned a specific
              tier yet.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Fallback Price per Term
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
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger className="w-full rounded-lg border border-slate-300 px-3 py-2 h-[38px] text-sm focus:ring-2 focus:ring-blue-600 text-slate-900 bg-white">
                    <SelectValue placeholder="Select a currency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MWK">MWK — Malawian Kwacha</SelectItem>
                    <SelectItem value="USD">USD — US Dollar</SelectItem>
                    <SelectItem value="ZAR">
                      ZAR — South African Rand
                    </SelectItem>
                  </SelectContent>
                </Select>
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

          {/* 🎯 Subscription Tiers (Dynamic) */}
          <TierManagerCard tiers={tiers} onChange={setTiers} />

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
            <button
              type="button"
              onClick={() => setMode("view")}
              disabled={saving}
              className="text-sm text-slate-600 hover:text-slate-900 px-3 py-2.5 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* ============ VIEW MODE ============ */}
      {mode === "view" && settings && (
        <div className="space-y-6">
          {/* Saved summary row */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
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

            <div className="overflow-x-auto">
              <div className="flex divide-x divide-slate-100 min-w-max w-full">
                <div className="px-5 py-4">
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">
                    Platform
                  </p>
                  <p className="text-sm font-medium text-slate-900 whitespace-nowrap">
                    {settings.name || "—"}
                  </p>
                </div>
                <div className="px-5 py-4">
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">
                    Email
                  </p>
                  <p className="text-sm text-slate-900 whitespace-nowrap">
                    {settings.email || "—"}
                  </p>
                </div>
                <div className="px-5 py-4">
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">
                    Phone
                  </p>
                  <p className="text-sm text-slate-900 whitespace-nowrap">
                    {settings.phone || "—"}
                  </p>
                </div>
                <div className="px-5 py-4">
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">
                    Fallback Price
                  </p>
                  <p className="text-sm text-slate-900 font-mono whitespace-nowrap">
                    {settings.currency || "MWK"}{" "}
                    {Number(settings.defaultTermPrice || 0).toLocaleString()}
                  </p>
                </div>
                <div className="px-5 py-4">
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">
                    Trial
                  </p>
                  <p className="text-sm text-slate-900 whitespace-nowrap">
                    {settings.defaultTrialDays ?? 30}{" "}
                    <span className="text-slate-400 text-xs">days</span>
                  </p>
                </div>
                <div className="px-5 py-4">
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">
                    Merchant Acct
                  </p>
                  {settings.subscriptionMerchantAccount ? (
                    <p className="text-sm font-mono text-slate-900 whitespace-nowrap">
                      {settings.subscriptionMerchantAccount}
                    </p>
                  ) : (
                    <p className="text-sm text-slate-400">Not set</p>
                  )}
                </div>
                <div className="px-5 py-4">
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">
                    Secret · Success
                  </p>
                  {settings.hasSubscriptionSecretSuccess ? (
                    <span className="inline-flex items-center gap-1 text-sm text-green-700 font-medium whitespace-nowrap">
                      <CheckCircle2 size={14} /> Configured
                    </span>
                  ) : (
                    <p className="text-sm text-slate-400">Not set</p>
                  )}
                </div>
                <div className="px-5 py-4">
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">
                    Secret · Reversed
                  </p>
                  {settings.hasSubscriptionSecretReversed ? (
                    <span className="inline-flex items-center gap-1 text-sm text-green-700 font-medium whitespace-nowrap">
                      <CheckCircle2 size={14} /> Configured
                    </span>
                  ) : (
                    <p className="text-sm text-slate-400">Not set</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 🎯 Subscription Tiers summary (read-only preview) */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Layers size={16} className="text-slate-400" />
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">
                    Subscription Tiers
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {tiers.length} {tiers.length === 1 ? "plan" : "plans"}{" "}
                    configured · shown on the marketing site
                  </p>
                </div>
              </div>
              <button
                onClick={() => setMode("edit")}
                className="text-xs font-semibold text-blue-700 hover:text-blue-900"
              >
                Manage →
              </button>
            </div>

            {tiers.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-sm text-slate-500">
                  No tiers configured yet. Click "Edit" to add one.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {tiers.map((tier) => (
                  <div
                    key={tier.id}
                    className="px-5 py-4 flex items-center justify-between gap-4 flex-wrap"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          tier.popular ? "bg-blue-600" : "bg-slate-300"
                        }`}
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-slate-900">
                            {tier.name}
                          </p>
                          {tier.popular && (
                            <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                              POPULAR
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {tier.description}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6 text-sm shrink-0">
                      <div className="text-right">
                        <p className="text-[10px] text-slate-500 uppercase tracking-wide">
                          Price
                        </p>
                        <p className="font-mono font-semibold text-slate-900">
                          MWK {Number(tier.price).toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-slate-500 uppercase tracking-wide">
                          Max Students
                        </p>
                        <p className="font-semibold text-slate-900">
                          {tier.maxStudents >= 99999
                            ? "Unlimited"
                            : Number(tier.maxStudents).toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-slate-500 uppercase tracking-wide">
                          Features
                        </p>
                        <p className="font-semibold text-slate-900">
                          {tier.features?.length || 0}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
