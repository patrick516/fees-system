import { useState, useEffect } from "react";
import {
  Upload,
  Building2,
  Loader2,
  Save,
  Image as ImageIcon,
} from "lucide-react";
import { useSchoolSettings } from "../../hooks/useSchoolSettings";
import { useAuthStore } from "../../store/authStore";

const SettingsPage = () => {
  const {
    settings,
    loading,
    saving,
    uploadingLogo,
    updateSettings,
    uploadLogo,
  } = useSchoolSettings();
  const { staff, setStaff } = useAuthStore();

  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    city: "",
    motto: "",
  });
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  useEffect(() => {
    if (settings) {
      setForm({
        name: settings.name || "",
        phone: settings.phone || "",
        email: settings.email || "",
        address: settings.address || "",
        city: settings.city || "",
        motto: settings.motto || "",
      });
      setLogoPreview(settings.logo || null);
    }
  }, [settings]);

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Local preview immediately
    setLogoPreview(URL.createObjectURL(file));

    const result = await uploadLogo(file);
    if (!result.success) {
      setError(result.message || "Failed to upload logo");
      setLogoPreview(settings?.logo || null);
      return;
    }

    // Keep sidebar/session in sync with new logo
    if (staff) {
      setStaff({
        ...staff,
        school: {
          ...staff.school,
          logo: result.success ? logoPreview : staff.school.logo,
        },
      });
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaved(false);

    const result = await updateSettings(form);
    if (!result.success) {
      setError(result.message || "Failed to save settings");
      return;
    }

    // Keep sidebar/session in sync with new name/motto
    if (staff) {
      setStaff({
        ...staff,
        school: { ...staff.school, name: form.name },
      });
    }

    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={24} className="animate-spin text-blue-900" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-800">School Settings</h2>
        <p className="text-sm text-gray-500">
          Configure school identity — used on reports and receipts
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Logo Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-medium text-gray-800 mb-4 flex items-center gap-2">
            <ImageIcon size={16} className="text-gray-400" />
            School Logo
          </h3>

          <div className="flex flex-col items-center">
            <div className="w-32 h-32 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden mb-4 bg-gray-50">
              {logoPreview ? (
                <img
                  src={logoPreview}
                  alt="School logo"
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="text-center text-gray-300">
                  <Building2 size={32} className="mx-auto mb-1" />
                  <p className="text-xs">No logo</p>
                </div>
              )}
            </div>

            <label className="flex items-center gap-2 bg-blue-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-800 cursor-pointer disabled:opacity-40">
              {uploadingLogo ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Upload size={14} />
              )}
              {uploadingLogo ? "Uploading..." : "Upload Logo"}
              <input
                type="file"
                accept="image/png,image/jpeg"
                onChange={handleLogoChange}
                disabled={uploadingLogo}
                className="hidden"
              />
            </label>
            <p className="text-xs text-gray-400 mt-2">
              PNG, JPG up to 2MB. Will appear on reports and receipts.
            </p>
          </div>
        </div>

        {/* School Info Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-medium text-gray-800 mb-4 flex items-center gap-2">
            <Building2 size={16} className="text-gray-400" />
            School Information
          </h3>

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                School Name
              </label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  Phone Number
                </label>
                <input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  required
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  School Email
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  Address
                </label>
                <input
                  value={form.address}
                  onChange={(e) =>
                    setForm({ ...form, address: e.target.value })
                  }
                  required
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                School Motto
              </label>
              <input
                value={form.motto}
                onChange={(e) => setForm({ ...form, motto: e.target.value })}
                placeholder="eg. Excellence through Knowledge"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {error && <p className="text-red-600 text-sm">{error}</p>}
            {saved && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
                ✅ Settings saved successfully
              </div>
            )}

            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 bg-blue-900 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-800 disabled:opacity-40"
            >
              {saving ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Save size={14} />
              )}
              {saving ? "Saving..." : "Save Settings"}
            </button>
          </form>
        </div>
      </div>

      {/* Report Header Preview */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <p className="text-sm font-medium text-gray-500 mb-4">
          Report Header Preview
        </p>
        <div className="border border-gray-200 rounded-lg p-6 flex flex-col items-center text-center">
          {logoPreview && (
            <img
              src={logoPreview}
              alt="Logo"
              className="w-14 h-14 object-contain mb-2"
            />
          )}
          <p className="font-bold text-gray-800">
            {form.name || "School Name"}
          </p>
          <p className="text-xs text-gray-500">
            {form.address}
            {form.city ? `, ${form.city}` : ""}
          </p>
          {form.motto && (
            <p className="text-xs italic text-blue-700 mt-1">"{form.motto}"</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
