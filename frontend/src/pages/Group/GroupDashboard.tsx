import { useState, useEffect } from "react";
// import { useNavigate } from "react-router-dom";
import {
  Building2,
  Plus,
  Users,
  CreditCard,
  Loader2,
  ChevronRight,
} from "lucide-react";
import api from "../../lib/axios";
import { toast } from "../../lib/toast";

const GroupDashboard = () => {
  const [schools, setSchools] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // Add School Form State
  const [form, setForm] = useState({
    schoolName: "",
    adminFirstName: "",
    adminLastName: "",
    adminEmail: "",
  });
  const [submitting, setSubmitting] = useState(false);

  // Fetch schools in the group
  const fetchSchools = async () => {
    setLoading(true);
    try {
      const res = await api.get("/group/schools");
      setSchools(res.data.data || []);
    } catch (err: any) {
      toast.error("Failed to load group schools");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchools();
  }, []);

  // Handle adding a new school
  const handleAddSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.schoolName || !form.adminEmail) {
      toast.error("School name and admin email are required");
      return;
    }
    if (!form.adminFirstName || !form.adminLastName) {
      toast.error("Admin first name and last name are required");
      return;
    }

    setSubmitting(true);
    try {
      await api.post("/group/schools", form);
      toast.success("School added and admin invited successfully!");
      setShowAddModal(false);
      setForm({
        schoolName: "",
        adminFirstName: "",
        adminLastName: "",
        adminEmail: "",
      });
      fetchSchools();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to add school");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle switching to a specific school
  const handleManageSchool = (schoolId: string) => {
    localStorage.setItem("activeSchoolId", schoolId);
    localStorage.setItem("isViewingAsGroupAdmin", "true");
    window.location.href = "/dashboard";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2
          className="animate-spin text-[var(--color-primary)]"
          size={32}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Building2 className="text-indigo-600" size={24} />
            Group Overview
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage all schools under your group and onboard new ones.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
        >
          <Plus size={16} />
          Add New School
        </button>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-50 rounded-lg flex items-center justify-center">
            <Building2 className="text-indigo-600" size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Total Schools</p>
            <p className="text-2xl font-bold text-gray-900">{schools.length}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
            <Users className="text-blue-600" size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Total Students</p>
            <p className="text-2xl font-bold text-gray-900">
              {schools.reduce((sum, s) => sum + (s._count?.students || 0), 0)}
            </p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 rounded-lg flex items-center justify-center">
            <CreditCard className="text-emerald-600" size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">
              Active Subscriptions
            </p>
            <p className="text-2xl font-bold text-gray-900">
              {schools.filter((s) => s.subscriptionStatus === "ACTIVE").length}
            </p>
          </div>
        </div>
      </div>

      {/* School List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800">Your Schools</h2>
        </div>

        {schools.length === 0 ? (
          <div className="p-12 text-center">
            <Building2 className="mx-auto text-gray-300 mb-3" size={48} />
            <p className="text-gray-500 text-sm">
              No schools in this group yet.
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-4 text-indigo-600 text-sm font-semibold hover:underline"
            >
              Add your first school
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {schools.map((school) => (
              <div
                key={school.id}
                className="p-4 md:px-6 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden shrink-0">
                    {school.logo ? (
                      <img
                        src={school.logo}
                        alt={school.name}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <Building2 className="text-gray-400" size={24} />
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{school.name}</p>
                    <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                      <span className="flex items-center gap-1">
                        <Users size={12} /> {school._count?.students || 0}{" "}
                        Students
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          school.subscriptionStatus === "ACTIVE"
                            ? "bg-emerald-100 text-emerald-700"
                            : school.subscriptionStatus === "LOCKED"
                              ? "bg-red-100 text-red-700"
                              : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {school.subscriptionStatus}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleManageSchool(school.id)}
                  className="flex items-center gap-1 text-sm font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-2 rounded-lg transition-colors"
                >
                  Manage <ChevronRight size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add School Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center px-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              Add New School
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              This will create a new school and invite an admin to manage it.
            </p>

            <form onSubmit={handleAddSchool} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  School Name
                </label>
                <input
                  type="text"
                  required
                  value={form.schoolName}
                  onChange={(e) =>
                    setForm({ ...form, schoolName: e.target.value })
                  }
                  placeholder="e.g., St. Peters Secondary School"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Admin First Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.adminFirstName}
                    onChange={(e) =>
                      setForm({ ...form, adminFirstName: e.target.value })
                    }
                    placeholder="e.g., John"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Admin Last Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.adminLastName}
                    onChange={(e) =>
                      setForm({ ...form, adminLastName: e.target.value })
                    }
                    placeholder="e.g., Doe"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Admin Email
                </label>
                <input
                  type="email"
                  required
                  value={form.adminEmail}
                  onChange={(e) =>
                    setForm({ ...form, adminEmail: e.target.value })
                  }
                  placeholder="admin@school.com"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  disabled={submitting}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  {submitting ? "Adding..." : "Add School"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupDashboard;
