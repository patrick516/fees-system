import { useState, useEffect } from "react";
import {
  Plus,
  Building2,
  Loader2,
  Trash2,
  Edit2,
  X,
  Check,
} from "lucide-react";
import api from "../../lib/axios";
import type { Department } from "../../types";

const DepartmentsCard = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");

  const fetchDepartments = async () => {
    setLoading(true);
    try {
      const res = await api.get("/departments");
      setDepartments(res.data.data || []);
    } catch (err) {
      console.error("Failed to load departments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await api.post("/departments", {
        name: newName.trim(),
        description: newDesc.trim() || undefined,
      });
      setNewName("");
      setNewDesc("");
      setShowAdd(false);
      await fetchDepartments();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to create department");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (id: string) => {
    setError("");
    setSaving(true);
    try {
      await api.put(`/departments/${id}`, {
        name: editName.trim(),
        description: editDesc.trim() || undefined,
      });
      setEditingId(null);
      await fetchDepartments();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to update");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete department "${name}"?`)) return;
    setError("");
    try {
      await api.delete(`/departments/${id}`);
      await fetchDepartments();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to delete");
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Building2 size={16} className="text-gray-400" />
          <div>
            <h3 className="font-medium text-gray-800">Departments</h3>
            <p className="text-xs text-gray-500">
              Group staff into teams like Finance, Bursary, Academics
            </p>
          </div>
        </div>
        {!showAdd && (
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 text-sm text-[var(--color-primary)] font-medium hover:text-[var(--color-primary-dark)]"
          >
            <Plus size={14} />
            Add Department
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 rounded-lg text-sm mb-4">
          {error}
        </div>
      )}

      {/* Add form */}
      {showAdd && (
        <form
          onSubmit={handleAdd}
          className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 space-y-3"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-blue-800">New Department</p>
            <button
              type="button"
              onClick={() => {
                setShowAdd(false);
                setNewName("");
                setNewDesc("");
                setError("");
              }}
              className="text-blue-600 hover:text-blue-800"
            >
              <X size={14} />
            </button>
          </div>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="e.g. Finance"
            required
            className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          />
          <input
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            placeholder="Short description (optional)"
            className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving || !newName.trim()}
              className="flex items-center gap-1.5 bg-[var(--color-primary)] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[var(--color-primary-dark)] disabled:opacity-40"
            >
              {saving && <Loader2 size={12} className="animate-spin" />}
              Create
            </button>
            <button
              type="button"
              onClick={() => {
                setShowAdd(false);
                setNewName("");
                setNewDesc("");
                setError("");
              }}
              className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-white"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center h-20">
          <Loader2 size={18} className="animate-spin text-gray-300" />
        </div>
      ) : departments.length === 0 ? (
        <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center">
          <p className="text-sm text-gray-400">No departments yet</p>
          <p className="text-xs text-gray-300 mt-1">
            Departments help you organize your team
          </p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100 border border-gray-200 rounded-lg overflow-hidden">
          {departments.map((dept) => (
            <div key={dept.id} className="flex items-center gap-3 px-4 py-3">
              {editingId === dept.id ? (
                <>
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    autoFocus
                  />
                  <input
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    placeholder="Description"
                    className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  />
                  <button
                    onClick={() => handleUpdate(dept.id)}
                    disabled={saving || !editName.trim()}
                    className="p-2 text-green-600 hover:bg-green-50 rounded disabled:opacity-40"
                  >
                    <Check size={14} />
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="p-2 text-gray-400 hover:bg-gray-50 rounded"
                  >
                    <X size={14} />
                  </button>
                </>
              ) : (
                <>
                  <div className="w-8 h-8 rounded-lg bg-[var(--color-primary-light)] flex items-center justify-center shrink-0">
                    <Building2
                      size={14}
                      className="text-[var(--color-primary)]"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800">
                      {dept.name}
                    </p>
                    {dept.description && (
                      <p className="text-xs text-gray-400 truncate">
                        {dept.description}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-gray-500 shrink-0">
                    {dept._count?.staff || 0} staff
                  </span>
                  <button
                    onClick={() => {
                      setEditingId(dept.id);
                      setEditName(dept.name);
                      setEditDesc(dept.description || "");
                    }}
                    className="p-1.5 text-gray-400 hover:text-[var(--color-primary)] hover:bg-gray-50 rounded"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(dept.id, dept.name)}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                  >
                    <Trash2 size={14} />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DepartmentsCard;
