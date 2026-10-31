import { useEffect, useState } from "react";
import {
  Plus,
  GraduationCap,
  Loader2,
  ChevronDown,
  ChevronUp,
  Edit2,
  Trash2,
} from "lucide-react";
import api from "../../lib/axios";
import { useActiveTerm } from "../../hooks/useActiveTerm";
import { usePermission } from "../../hooks/usePermission";
import FeeStructureForm from "../../components/Classes/FeeStructureForm";
import TermActivationCard from "../../components/Classes/TermActivationCard";
import TermHistoryTable from "../../components/Classes/TermHistoryTable";
import PaymentDetailsCard from "../../components/Classes/PaymentDetailsCard";
import { isReadOnly } from "../../lib/permissions";

const termLabel = (t?: string | null) =>
  t ? t.replace("_", " ").replace("TERM", "Term") : "";

const ClassesPage = () => {
  const { can } = usePermission();
  const { academicYear: activeYear, activeTerm: currentTerm } = useActiveTerm();

  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [classForm, setClassForm] = useState({ name: "", level: "" });
  const [expandedClass, setExpandedClass] = useState<string | null>(null);

  const [deleteModal, setDeleteModal] = useState({
    open: false,
    classId: null as string | null,
    className: "",
    deleting: false,
  });

  // Fee Form State
  const [showFeeForm, setShowFeeForm] = useState<string | null>(null);
  const [editingFee, setEditingFee] = useState<any>(null);

  // Term State
  const [activeTerm, setActiveTerm] = useState<any>(null);
  const [termHistory, setTermHistory] = useState<any[]>([]);

  const fetchClasses = async () => {
    try {
      const res = await api.get("/schools/classes");
      setClasses(res.data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchActiveTerm = async () => {
    try {
      const res = await api.get("/schools/active-term");
      setActiveTerm(res.data.data);
    } catch {
      setActiveTerm(null);
    }
  };

  const fetchTermHistory = async () => {
    try {
      const res = await api.get("/schools/term-history");
      setTermHistory(res.data.data || []);
    } catch {
      setTermHistory([]);
    }
  };

  useEffect(() => {
    fetchClasses();
    fetchActiveTerm();
    fetchTermHistory();
  }, []);

  const handleAddClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!classForm.name || !classForm.level) return;
    setAdding(true);
    try {
      await api.post("/schools/classes", {
        name: classForm.name,
        level: parseInt(classForm.level),
      });
      setClassForm({ name: "", level: "" });
      fetchClasses();
    } catch (err) {
      alert("Failed to add class");
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteClass = async () => {
    if (!deleteModal.classId) return;
    setDeleteModal((prev) => ({ ...prev, deleting: true }));
    try {
      await api.delete(`/schools/classes/${deleteModal.classId}`);
      setDeleteModal({
        open: false,
        classId: null,
        className: "",
        deleting: false,
      });
      fetchClasses();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to delete");
      setDeleteModal((prev) => ({ ...prev, deleting: false }));
    }
  };

  const getActiveFee = (cls: any) =>
    cls.feeStructures?.find(
      (f: any) => f.term === currentTerm && f.academicYear === activeYear,
    );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-800">
          Classes & Fee Structures
        </h2>
        <p className="text-sm text-gray-500">
          Manage classes, set term fees, and activate terms
        </p>
      </div>

      <TermActivationCard
        activeTerm={activeTerm}
        onUpdated={() => {
          fetchActiveTerm();
          fetchTermHistory();
        }}
      />

      <TermHistoryTable history={termHistory} activeTerm={activeTerm} />

      {can("classes", "write") && !isReadOnly() && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-medium text-gray-800 mb-4">Add New Class</h3>
          <form onSubmit={handleAddClass} className="flex gap-3">
            <input
              value={classForm.name}
              onChange={(e) =>
                setClassForm({ ...classForm, name: e.target.value })
              }
              placeholder="Class name"
              required
              className="flex-1 px-4 py-2 border rounded-lg text-sm"
            />
            <input
              type="number"
              value={classForm.level}
              onChange={(e) =>
                setClassForm({ ...classForm, level: e.target.value })
              }
              placeholder="Level"
              required
              className="w-20 px-3 py-2 border rounded-lg text-sm"
            />
            <button
              type="submit"
              disabled={adding}
              className="flex items-center gap-2 bg-[var(--color-primary)] text-white px-4 py-2 rounded-lg text-sm"
            >
              {adding ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Plus size={14} />
              )}{" "}
              Add
            </button>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <Loader2 className="animate-spin mx-auto text-gray-400" />
          </div>
        ) : (
          classes.map((cls: any) => (
            <div
              key={cls.id}
              className="border-b border-gray-100 last:border-b-0"
            >
              <div
                className="grid grid-cols-12 items-center gap-2 px-6 py-3.5 cursor-pointer hover:bg-gray-50"
                onClick={() =>
                  setExpandedClass(expandedClass === cls.id ? null : cls.id)
                }
              >
                <div className="col-span-5 flex items-center gap-3">
                  <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center">
                    <GraduationCap
                      size={16}
                      className="text-[var(--color-primary)]"
                    />
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">{cls.name}</p>
                    <p className="text-xs text-gray-400">Level {cls.level}</p>
                  </div>
                </div>
                <div className="col-span-2 text-sm text-gray-600">
                  {cls._count?.students || 0}
                </div>
                <div className="col-span-3">
                  {getActiveFee(cls) ? (
                    <span className="font-semibold text-gray-800">
                      MWK {Number(getActiveFee(cls).dayAmount).toLocaleString()}{" "}
                      <span className="text-gray-400 font-normal">(Day)</span>
                    </span>
                  ) : (
                    <span className="text-yellow-600 text-xs">Not set</span>
                  )}
                </div>
                <div className="col-span-2 flex justify-end gap-1">
                  {can("payments", "write") && !isReadOnly() && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedClass(cls.id);
                        setEditingFee(getActiveFee(cls) || null);
                        setShowFeeForm(cls.id);
                      }}
                      className="p-1.5 text-gray-400 hover:text-[var(--color-primary)]"
                    >
                      <Edit2 size={14} />
                    </button>
                  )}
                  {can("classes", "delete") && !isReadOnly() && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteModal({
                          open: true,
                          classId: cls.id,
                          className: cls.name,
                          deleting: false,
                        });
                      }}
                      className="p-1.5 text-gray-400 hover:text-red-500"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                  {expandedClass === cls.id ? (
                    <ChevronUp size={18} className="text-gray-400" />
                  ) : (
                    <ChevronDown size={18} className="text-gray-400" />
                  )}
                </div>
              </div>

              {expandedClass === cls.id && (
                <div className="border-t border-gray-100 px-6 py-4 space-y-4">
                  {cls.feeStructures && cls.feeStructures.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {cls.feeStructures.map((fee: any) => (
                        <div
                          key={fee.id}
                          className="border border-gray-200 rounded-lg p-4"
                        >
                          <div className="flex justify-between mb-2">
                            <span className="text-xs font-medium bg-blue-50 px-2 py-0.5 rounded text-blue-700">
                              {termLabel(fee.term)} {fee.academicYear}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Day:</span>
                            <span className="font-bold">
                              MWK {Number(fee.dayAmount).toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Boarding:</span>
                            <span className="font-bold text-indigo-600">
                              MWK {Number(fee.boardingAmount).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-yellow-700">
                      No fee structures set yet.
                    </p>
                  )}

                  {showFeeForm !== cls.id ? (
                    can("payments", "write") &&
                    !isReadOnly() && (
                      <button
                        onClick={() => {
                          setEditingFee(null);
                          setShowFeeForm(cls.id);
                        }}
                        className="flex items-center gap-2 text-[var(--color-primary)] text-sm font-medium"
                      >
                        <Plus size={16} /> Set Fee Structure
                      </button>
                    )
                  ) : (
                    <FeeStructureForm
                      className={cls.name}
                      classId={cls.id}
                      existingFee={editingFee}
                      defaultAcademicYear={activeYear || ""}
                      defaultTerm={currentTerm || "TERM_1"}
                      onCancel={() => {
                        setShowFeeForm(null);
                        setEditingFee(null);
                      }}
                      onSuccess={() => {
                        setShowFeeForm(null);
                        setEditingFee(null);
                        fetchClasses();
                      }}
                    />
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <PaymentDetailsCard />

      {deleteModal.open && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() =>
            !deleteModal.deleting &&
            setDeleteModal({ ...deleteModal, open: false })
          }
        >
          <div
            className="bg-white rounded-2xl w-full max-w-sm p-6 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <Trash2 size={24} className="text-red-600 mx-auto mb-3" />
            <h3 className="font-bold text-gray-900 mb-2">
              Delete {deleteModal.className}?
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Students must be moved to another class first.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteModal({ ...deleteModal, open: false })}
                className="flex-1 py-2 border rounded-xl text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteClass}
                disabled={deleteModal.deleting}
                className="flex-1 py-2 bg-red-600 text-white rounded-xl text-sm"
              >
                {deleteModal.deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClassesPage;
