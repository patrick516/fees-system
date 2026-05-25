import { useEffect, useState } from "react";
import { Plus, GraduationCap, Loader2 } from "lucide-react";
import api from "../../lib/axios";
import type { Class } from "../../types";

const ClassesPage = () => {
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", level: "" });
  const [error, setError] = useState("");

  const fetchClasses = async () => {
    try {
      const res = await api.get("/schools/classes");
      setClasses(res.data.data);
    } catch {
      console.error("Failed to load classes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setAdding(true);
    try {
      await api.post("/schools/classes", {
        name: form.name,
        level: parseInt(form.level),
      });
      setForm({ name: "", level: "" });
      fetchClasses();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to add class");
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-800">Classes</h2>
        <p className="text-sm text-gray-500">
          Manage school classes and grade levels
        </p>
      </div>

      {/* Add Class Form */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h3 className="font-medium text-gray-800 mb-4">Add New Class</h3>
        <form onSubmit={handleAdd} className="flex gap-3">
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Class name (eg. Form 1, Standard 3)"
            required
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="number"
            value={form.level}
            onChange={(e) => setForm({ ...form, level: e.target.value })}
            placeholder="Level (eg. 1)"
            required
            className="w-24 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={adding}
            className="flex items-center gap-2 bg-blue-900 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-800 disabled:opacity-40"
          >
            {adding ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Plus size={14} />
            )}
            Add
          </button>
        </form>
        {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
      </div>

      {/* Classes List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-900" />
          </div>
        ) : classes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-gray-400">
            <GraduationCap size={32} className="mb-2 opacity-30" />
            <p className="text-sm">No classes added yet</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {classes
              .sort((a: any, b: any) => (a.level || 0) - (b.level || 0))
              .map((cls: any) => (
                <div
                  key={cls.id}
                  className="flex items-center justify-between px-6 py-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                      <GraduationCap size={16} className="text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">
                        {cls.name}
                      </p>
                      <p className="text-xs text-gray-400">Level {cls.level}</p>
                    </div>
                  </div>
                  <span className="text-xs text-gray-400">
                    {cls._count?.students || 0} students
                  </span>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ClassesPage;
