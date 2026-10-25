import { useState } from "react";
import {
  Plus,
  Trash2,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Star,
} from "lucide-react";
import platformApi from "../../lib/platformApi";

export interface Tier {
  id: string;
  name: string;
  price: number;
  maxStudents: number;
  description: string;
  features: string[];
  popular?: boolean;
}

interface TierManagerCardProps {
  tiers: Tier[];
  onChange: (tiers: Tier[]) => void;
  onSaved?: () => void;
}

const DEFAULT_NEW_TIER: Tier = {
  id: "",
  name: "",
  price: 0,
  maxStudents: 100,
  description: "",
  features: [],
  popular: false,
};

const slugifyId = (name: string): string =>
  name
    .toUpperCase()
    .trim()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
export default function TierManagerCard({
  tiers,
  onChange,
  onSaved,
}: TierManagerCardProps) {
  const [localTiers, setLocalTiers] = useState<Tier[]>(tiers);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const updateTier = (index: number, field: keyof Tier, value: any) => {
    const next = [...localTiers];
    next[index] = { ...next[index], [field]: value };
    if (field === "name" && !next[index].id) {
      next[index].id = slugifyId(value);
    }
    setLocalTiers(next);
  };

  const updateFeature = (
    tierIndex: number,
    featureIndex: number,
    value: string,
  ) => {
    const next = [...localTiers];
    const features = [...next[tierIndex].features];
    features[featureIndex] = value;
    next[tierIndex] = { ...next[tierIndex], features };
    setLocalTiers(next);
  };

  const addFeature = (tierIndex: number) => {
    const next = [...localTiers];
    next[tierIndex] = {
      ...next[tierIndex],
      features: [...next[tierIndex].features, ""],
    };
    setLocalTiers(next);
  };

  const removeFeature = (tierIndex: number, featureIndex: number) => {
    const next = [...localTiers];
    const features = next[tierIndex].features.filter(
      (_, i) => i !== featureIndex,
    );
    next[tierIndex] = { ...next[tierIndex], features };
    setLocalTiers(next);
  };

  const addTier = () => {
    setLocalTiers([...localTiers, { ...DEFAULT_NEW_TIER }]);
  };

  const removeTier = (index: number) => {
    if (
      !confirm(
        "Remove this tier? Schools on this plan will keep their existing limits.",
      )
    ) {
      return;
    }
    setLocalTiers(localTiers.filter((_, i) => i !== index));
  };

  const setPopular = (index: number) => {
    if (localTiers[index].popular) return; // Already popular
    const next = localTiers.map((t, i) => ({ ...t, popular: i === index }));
    setLocalTiers(next);
    setMessage({
      type: "success",
      text: `"${localTiers[index].name}" is now the popular tier. Scroll down and click Save Tiers to apply.`,
    });
    setTimeout(() => setMessage(null), 5000);
  };

  const validate = (): string | null => {
    if (localTiers.length === 0) return "You must have at least one tier.";
    const ids = new Set<string>();
    for (const t of localTiers) {
      if (!t.id) return "Every tier needs an ID.";
      if (ids.has(t.id)) return `Duplicate tier ID: ${t.id}`;
      ids.add(t.id);
      if (!t.name) return "Every tier needs a name.";
      if (t.price <= 0) return `Tier "${t.name}" must have a price > 0.`;
      if (t.maxStudents <= 0)
        return `Tier "${t.name}" must have maxStudents > 0.`;
    }
    return null;
  };

  const save = async () => {
    setMessage(null);
    const err = validate();
    if (err) {
      setMessage({ type: "error", text: err });
      return;
    }

    setSaving(true);
    try {
      const cleanedTiers = localTiers.map((t) => ({
        ...t,
        features: t.features.filter((f) => f.trim()),
      }));
      await platformApi.put("/platform/settings", { tiers: cleanedTiers });
      onChange(cleanedTiers);
      setMessage({
        type: "success",
        text: "Tiers saved. Marketing site will update within 1 minute.",
      });
      setTimeout(() => setMessage(null), 5000);
      onSaved?.();
    } catch (err: any) {
      setMessage({
        type: "error",
        text: err.response?.data?.message || "Failed to save tiers",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div>
          <h3 className="font-semibold text-slate-900">Subscription Tiers</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure pricing shown on the marketing site. Changes take effect
            immediately.
          </p>
        </div>
        <button
          type="button"
          onClick={addTier}
          className="flex items-center gap-1.5 text-xs font-semibold bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-2 rounded-lg transition-colors"
        >
          <Plus size={14} /> Add Tier
        </button>
      </div>

      {message && (
        <div
          className={`mx-5 mt-4 p-3 rounded-lg flex items-start gap-2 text-sm ${
            message.type === "success"
              ? "bg-green-50 border border-green-200 text-green-800"
              : "bg-red-50 border border-red-200 text-red-800"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
          ) : (
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
          )}
          {message.text}
        </div>
      )}

      <div className="p-5 space-y-4">
        {localTiers.length === 0 ? (
          <div className="text-center py-8 text-sm text-slate-500 border-2 border-dashed border-slate-200 rounded-lg">
            No tiers yet. Click "Add Tier" to create one.
          </div>
        ) : (
          localTiers.map((tier, i) => (
            <div
              key={i}
              className={`border rounded-xl p-4 space-y-3 ${
                tier.popular
                  ? "border-blue-400 bg-blue-50/30"
                  : "border-slate-200"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-600">
                    {tier.id || "NO_ID"}
                  </span>
                  {tier.popular && (
                    <span className="text-[10px] font-bold bg-blue-600 text-white px-2 py-0.5 rounded-full">
                      MOST POPULAR
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setPopular(i)}
                    disabled={tier.popular}
                    title={
                      tier.popular
                        ? "This is the popular tier"
                        : "Set as the most popular tier"
                    }
                    className={`p-1.5 rounded transition-colors ${
                      tier.popular
                        ? "bg-blue-100 text-blue-600 cursor-not-allowed"
                        : "text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                    }`}
                  >
                    <Star
                      size={14}
                      fill={tier.popular ? "currentColor" : "none"}
                    />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeTier(i)}
                    className="p-1.5 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    title="Remove tier"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    Name
                  </label>
                  <input
                    value={tier.name}
                    onChange={(e) => updateTier(i, "name", e.target.value)}
                    placeholder="e.g. Small School"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    Price (MWK / term)
                  </label>
                  <input
                    type="number"
                    value={tier.price}
                    onChange={(e) =>
                      updateTier(i, "price", Number(e.target.value))
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    Max Students
                  </label>
                  <input
                    type="number"
                    value={tier.maxStudents}
                    onChange={(e) =>
                      updateTier(i, "maxStudents", Number(e.target.value))
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Description (shown under the tier name)
                </label>
                <input
                  value={tier.description}
                  onChange={(e) => updateTier(i, "description", e.target.value)}
                  placeholder="e.g. Up to 150 students"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-medium text-slate-600">
                    Features (checkmarks on the pricing card)
                  </label>
                  <button
                    type="button"
                    onClick={() => addFeature(i)}
                    className="text-[11px] font-semibold text-blue-600 hover:text-blue-800"
                  >
                    + Add feature
                  </button>
                </div>
                <div className="space-y-1.5">
                  {tier.features.length === 0 && (
                    <p className="text-xs text-slate-400 italic">
                      No features yet
                    </p>
                  )}
                  {tier.features.map((feature, fi) => (
                    <div key={fi} className="flex items-center gap-2">
                      <input
                        value={feature}
                        onChange={(e) => updateFeature(i, fi, e.target.value)}
                        placeholder="e.g. Unlimited staff accounts"
                        className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => removeFeature(i, fi)}
                        className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
        >
          {saving ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Save size={14} />
          )}
          {saving ? "Saving..." : "Save Tiers"}
        </button>
      </div>
    </div>
  );
}
