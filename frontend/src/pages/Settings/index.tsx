import { useState } from "react";
import {
  Building2,
  Phone,
  Mail,
  MapPin,
  Quote,
  Palette,
  Loader2,
  Edit2,
  Image as ImageIcon,
} from "lucide-react";
import { useSchoolSettings } from "../../hooks/useSchoolSettings";
import DepartmentsCard from "../../components/Settings/DepartmentsCard";
import RolesCard from "../../components/Settings/RolesCard";
import EditSchoolModal from "../../components/Settings/EditSchoolModal";

const SettingsPage = () => {
  const { settings, loading } = useSchoolSettings();
  const [showEdit, setShowEdit] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2
          size={24}
          className="animate-spin text-[var(--color-primary)]"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800">School Settings</h2>
        <p className="text-sm text-gray-500">
          Configure school identity, departments, and permissions
        </p>
      </div>

      {/* ==================== SCHOOL INFORMATION SUMMARY ==================== */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Building2 size={16} className="text-gray-400" />
            <h3 className="font-medium text-gray-800">School Information</h3>
          </div>
          <button
            onClick={() => setShowEdit(true)}
            className="flex items-center gap-1.5 text-sm text-[var(--color-primary)] font-medium hover:text-[var(--color-primary-dark)]"
          >
            <Edit2 size={14} />
            Edit
          </button>
        </div>

        {/* Summary grid */}
        <div className="p-5">
          <div className="flex items-start gap-5">
            {/* Logo */}
            <div className="w-20 h-20 rounded-xl border border-gray-200 flex items-center justify-center overflow-hidden bg-gray-50 shrink-0">
              {settings?.logo ? (
                <img
                  src={settings.logo}
                  alt={settings.name}
                  className="w-full h-full object-contain"
                />
              ) : (
                <ImageIcon size={28} className="text-gray-300" />
              )}
            </div>

            {/* Info grid */}
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3 min-w-0">
              {/* Name */}
              <div className="sm:col-span-2 lg:col-span-3">
                <p className="text-[11px] text-gray-400 uppercase font-medium tracking-wide">
                  School Name
                </p>
                <p className="text-base font-semibold text-gray-800 mt-0.5 truncate">
                  {settings?.name || "—"}
                </p>
                {settings?.motto && (
                  <p className="text-xs italic text-gray-500 mt-0.5 flex items-center gap-1">
                    <Quote size={10} /> {settings.motto}
                  </p>
                )}
              </div>

              {/* Phone */}
              <div>
                <p className="text-[11px] text-gray-400 uppercase font-medium tracking-wide flex items-center gap-1">
                  <Phone size={10} /> Phone
                </p>
                <p className="text-sm text-gray-700 mt-0.5 truncate">
                  {settings?.phone || "—"}
                </p>
              </div>

              {/* Email */}
              <div>
                <p className="text-[11px] text-gray-400 uppercase font-medium tracking-wide flex items-center gap-1">
                  <Mail size={10} /> Email
                </p>
                <p className="text-sm text-gray-700 mt-0.5 truncate">
                  {settings?.email || "—"}
                </p>
              </div>

              {/* Address */}
              <div>
                <p className="text-[11px] text-gray-400 uppercase font-medium tracking-wide flex items-center gap-1">
                  <MapPin size={10} /> Address
                </p>
                <p className="text-sm text-gray-700 mt-0.5 truncate">
                  {settings?.address || "—"}
                  {settings?.city ? `, ${settings.city}` : ""}
                </p>
              </div>

              {/* Brand color */}
              <div>
                <p className="text-[11px] text-gray-400 uppercase font-medium tracking-wide flex items-center gap-1">
                  <Palette size={10} /> Brand Color
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <div
                    className="w-5 h-5 rounded border border-gray-200"
                    style={{
                      backgroundColor: settings?.primaryColor || "#1e3a8a",
                    }}
                  />
                  <span className="text-sm font-mono text-gray-700">
                    {settings?.primaryColor || "#1e3a8a"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ==================== DEPARTMENTS ==================== */}
      <DepartmentsCard />

      {/* ==================== ROLES & PERMISSIONS ==================== */}
      <RolesCard />

      {/* Edit modal */}
      <EditSchoolModal
        key={refreshKey}
        open={showEdit}
        onClose={() => setShowEdit(false)}
        onSaved={() => setRefreshKey((k) => k + 1)}
      />
    </div>
  );
};

export default SettingsPage;
