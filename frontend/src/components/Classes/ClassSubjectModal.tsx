import { useState, useEffect } from "react";
import { X, Plus, Trash2, Loader2, BookOpen } from "lucide-react";
import api from "../../lib/axios";
import { toast } from "../../lib/toast";

interface Props {
  open: boolean;
  cls: { id: string; name: string } | null;
  onClose: () => void;
}

export default function ClassSubjectModal({ open, cls, onClose }: Props) {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [code, setCode] = useState("");

  useEffect(() => {
    if (open && cls) {
      loadSubjects();
      setName("");
      setCode("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, cls?.id]);

  const loadSubjects = async () => {
    if (!cls) return;
    setLoading(true);
    try {
      const res = await api.get(`/schools/classes/${cls.id}/subjects`);
      setSubjects(res.data.data || []);
    } catch {
      toast.error("Failed to load subjects");
      setSubjects([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cls || !name.trim()) return;
    setAdding(true);
    try {
      const res = await api.post(`/schools/classes/${cls.id}/subjects`, {
        name: name.trim(),
        code: code.trim() || null,
      });
      setSubjects((prev) =>
        [...prev, { ...res.data.data, _count: { examResults: 0 } }].sort(
          (a, b) => a.name.localeCompare(b.name),
        ),
      );
      setName("");
      setCode("");
      toast.success("Subject added");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to add subject");
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (subjectId: string) => {
    if (!cls) return;
    setDeleting(subjectId);
    try {
      await api.delete(`/schools/classes/${cls.id}/subjects/${subjectId}`);
      setSubjects((prev) => prev.filter((s) => s.id !== subjectId));
      toast.success("Subject deleted");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to delete subject");
    } finally {
      setDeleting(null);
    }
  };

  if (!open || !cls) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-lg max-h-[85vh] overflow-hidden shadow-xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
              <BookOpen size={20} className="text-indigo-600" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-800">
                Manage Subjects
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {cls.name} · {subjects.length} subject
                {subjects.length === 1 ? "" : "s"}
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

        {/* Add form */}
        <form
          onSubmit={handleAdd}
          className="px-5 py-3 border-b border-gray-100 bg-gray-50"
        >
          <div className="flex gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Subject name (e.g. Mathematics)"
              required
              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            />
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Code"
              className="w-20 px-2 py-2 border border-gray-200 rounded-lg text-sm uppercase focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            />
            <button
              type="submit"
              disabled={adding || !name.trim()}
              className="px-3 py-2 bg-[var(--color-primary)] text-white rounded-lg text-sm font-medium hover:bg-[var(--color-primary-dark)] disabled:opacity-40 flex items-center gap-1.5"
            >
              {adding ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Plus size={14} />
              )}
              Add
            </button>
          </div>
        </form>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 size={20} className="animate-spin text-gray-300" />
            </div>
          ) : subjects.length === 0 ? (
            <div className="text-center py-12 px-6">
              <BookOpen size={28} className="mx-auto text-gray-200 mb-2" />
              <p className="text-sm text-gray-500 font-medium">
                No subjects yet
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Add the subjects taught in {cls.name} above
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-50">
              {subjects.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center justify-between px-5 py-3 hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                      <BookOpen size={14} className="text-indigo-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {s.name}
                      </p>
                      {s.code && (
                        <p className="text-[11px] text-gray-400 font-mono">
                          {s.code}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {s._count?.examResults > 0 && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                        {s._count.examResults} results
                      </span>
                    )}
                    <button
                      onClick={() => handleDelete(s.id)}
                      disabled={deleting === s.id || s._count?.examResults > 0}
                      title={
                        s._count?.examResults > 0
                          ? "Cannot delete — exam results exist"
                          : "Delete subject"
                      }
                      className="p-1.5 text-gray-400 hover:text-red-600 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      {deleting === s.id ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Trash2 size={14} />
                      )}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-white"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
