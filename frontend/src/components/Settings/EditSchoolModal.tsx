import { useState, useEffect } from "react";
import {
  X,
  Loader2,
  Upload,
  Building2,
  Image as ImageIcon,
  Check,
} from "lucide-react";
import { useSchoolSettings } from "../../hooks/useSchoolSettings";
import { useAuthStore } from "../../store/authStore";
import { applyTheme } from "../../lib/theme";

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

const EditSchoolModal = ({ open, onClose, onSaved }: Props) => {
  const { settings, saving, uploadingLogo, updateSettings, uploadLogo } =
    useSchoolSettings();
  const { staff, setStaff } = useAuthStore();

  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    city: "",
    motto: "",
    primaryColor: "#1e3a8a",
  });
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Load current values whenever the modal opens
  useEffect(() => {
    if (open && settings) {
      setForm({
        name: settings.name || "",
        phone: settings.phone || "",
        email: settings.email || "",
        address: settings.address || "",
        city: settings.city || "",
        motto: settings.motto || "",
        primaryColor: settings.primaryColor || "#1e3a8a",
      });
      setLogoPreview(settings.logo || null);
      setError("");
      setSavedSuccess(false);
    }
  }, [open, settings]);

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLogoPreview(URL.createObjectURL(file));
    const result: any = await uploadLogo(file);

    if (!result.success) {
      setError(result.message || "Failed to upload logo");
      setLogoPreview(settings?.logo || null);
      return;
    }

    // Use the fresh URL that came back from the API — not the stale
    // `settings` state (which hasn't re-rendered yet).
    if (staff && result.logo) {
      setStaff({
        ...staff,
        school: { ...staff.school, logo: result.logo },
      });
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSavedSuccess(false);

    const result = await updateSettings(form);
    if (!result.success) {
      setError(result.message || "Failed to save settings");
      return;
    }

    if (staff) {
      setStaff({
        ...staff,
        school: {
          ...staff.school,
          name: form.name,
          primaryColor: form.primaryColor,
        },
      });
    }

    applyTheme(form.primaryColor);
    setSavedSuccess(true);

    // Auto-close after 1.2s
    setTimeout(() => {
      onSaved();
      onClose();
    }, 1200);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-gray-100">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--color-primary-light)] flex items-center justify-center shrink-0">
              <Building2 size={20} className="text-[var(--color-primary)]" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-800">
                Edit School Information
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Used on reports, receipts, and the parent portal
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-5 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2.5 rounded-lg text-xs">
              {error}
            </div>
          )}

          {/* Logo */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">
              School Logo
            </label>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden bg-gray-50 shrink-0">
                {logoPreview ? (
                  <img
                    src={logoPreview}
                    alt="Logo"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <ImageIcon size={24} className="text-gray-300" />
                )}
              </div>
              <div className="flex-1">
                <label className="inline-flex items-center gap-2 border border-gray-300 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 cursor-pointer">
                  {uploadingLogo ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Upload size={14} />
                  )}
                  {uploadingLogo ? "Uploading..." : "Change Logo"}
                  <input
                    type="file"
                    accept="image/png,image/jpeg"
                    onChange={handleLogoChange}
                    disabled={uploadingLogo}
                    className="hidden"
                  />
                </label>
                <p className="text-[11px] text-gray-400 mt-1.5">
                  PNG or JPG, up to 2MB
                </p>
              </div>
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              School Name
            </label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            />
          </div>

          {/* Phone + Email */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Phone
              </label>
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                required
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              />
            </div>
          </div>

          {/* Address + City */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Address
              </label>
              <input
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                required
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                City
              </label>
              <input
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                required
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              />
            </div>
          </div>

          {/* Motto */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              Motto
            </label>
            <input
              value={form.motto}
              onChange={(e) => setForm({ ...form, motto: e.target.value })}
              placeholder="eg. Excellence through Knowledge"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            />
          </div>

          {/* Brand color */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              Brand Color
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={form.primaryColor}
                onChange={(e) =>
                  setForm({ ...form, primaryColor: e.target.value })
                }
                className="w-12 h-10 rounded-lg border border-gray-200 cursor-pointer shrink-0"
              />
              <input
                value={form.primaryColor}
                onChange={(e) =>
                  setForm({ ...form, primaryColor: e.target.value })
                }
                placeholder="#1e3a8a"
                className="flex-1 px-3 py-2.5 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              />
            </div>
          </div>

          {/* Footer buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || savedSuccess}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                savedSuccess
                  ? "bg-green-600 text-white"
                  : "bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-dark)] disabled:opacity-40"
              }`}
            >
              {saving ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> Saving...
                </>
              ) : savedSuccess ? (
                <>
                  <Check size={14} strokeWidth={3} /> Saved
                </>
              ) : (
                "Save Changes"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditSchoolModal;
