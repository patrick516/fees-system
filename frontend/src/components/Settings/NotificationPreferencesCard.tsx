import { useState, useEffect } from "react";
import {
  Bell,
  MessageSquare,
  Mail,
  Loader2,
  Check,
  Layers,
} from "lucide-react";
import api from "../../lib/axios";
import type { NotificationChannel } from "../../types";

const CHANNELS: {
  value: NotificationChannel;
  label: string;
  description: string;
  icon: typeof MessageSquare;
}[] = [
  {
    value: "SMS",
    label: "SMS Only",
    description: "Send alerts to parent phones via TumaSend",
    icon: MessageSquare,
  },
  {
    value: "EMAIL",
    label: "Email Only",
    description: "Send alerts to parent emails via Brevo (free)",
    icon: Mail,
  },
  {
    value: "BOTH",
    label: "SMS + Email",
    description: "Send on both channels for maximum reach",
    icon: Layers,
  },
];

const NotificationPreferencesCard = () => {
  const [channel, setChannel] = useState<NotificationChannel>("BOTH");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  // Load current preference
  useEffect(() => {
    api
      .get("/schools/me")
      .then((res) => {
        const defaults = res.data.data?.notificationDefaults;
        if (defaults?.defaultChannel) {
          setChannel(defaults.defaultChannel);
        }
      })
      .catch(() => setChannel("BOTH"))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (newChannel: NotificationChannel) => {
    setChannel(newChannel);
    setError("");
    setSaving(true);

    try {
      await api.put("/schools/notification-defaults", {
        defaultChannel: newChannel,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to save preference");
      // Revert? We don't know the old value now, so just re-fetch
      api
        .get("/schools/me")
        .then((res) => {
          const defaults = res.data.data?.notificationDefaults;
          if (defaults?.defaultChannel) setChannel(defaults.defaultChannel);
        })
        .catch(() => {});
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Bell size={16} className="text-gray-400" />
        <div className="flex-1">
          <h3 className="font-medium text-gray-800">
            Notification Preferences
          </h3>
          <p className="text-xs text-gray-500">
            Default channel used for automated alerts (payment confirmations,
            fee reminders)
          </p>
        </div>
        {saving && <Loader2 size={14} className="animate-spin text-gray-400" />}
        {saved && !saving && (
          <span className="inline-flex items-center gap-1 text-xs text-green-600 font-medium">
            <Check size={12} strokeWidth={3} /> Saved
          </span>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2.5 rounded-lg text-xs mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-20">
          <Loader2 size={18} className="animate-spin text-gray-300" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {CHANNELS.map((c) => {
            const isActive = channel === c.value;
            const Icon = c.icon;
            return (
              <button
                key={c.value}
                onClick={() => handleSave(c.value)}
                disabled={saving}
                className={`flex items-start gap-3 p-3.5 rounded-xl text-left transition-all border-2 ${
                  isActive
                    ? "border-[var(--color-primary)] bg-[var(--color-primary-light)]"
                    : "border-gray-200 bg-white hover:border-gray-300"
                } disabled:opacity-60`}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    isActive
                      ? "bg-white text-[var(--color-primary)]"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  <Icon size={15} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800 leading-tight">
                    {c.label}
                  </p>
                  <p className="text-[11px] text-gray-500 mt-1 leading-snug">
                    {c.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Note about override */}
      <div className="mt-4 bg-blue-50 border border-blue-100 rounded-lg p-3 flex items-start gap-2">
        <Bell
          size={12}
          className="text-[var(--color-primary)] shrink-0 mt-0.5"
        />
        <p className="text-[11px] text-blue-800 leading-relaxed">
          This is the <strong>default</strong>. You can still pick a different
          channel each time you send a bulk alert from the Send SMS page.
        </p>
      </div>
    </div>
  );
};

export default NotificationPreferencesCard;
