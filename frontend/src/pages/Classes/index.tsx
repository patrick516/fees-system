import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  GraduationCap,
  Loader2,
  ChevronDown,
  ChevronUp,
  Edit2,
  Trash2,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  X,
  FileBarChart,
  History,
} from "lucide-react";
import api from "../../lib/axios";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { getCurrentAcademicYear } from "../../lib/utils";
import { useActiveTerm } from "../../hooks/useActiveTerm";

const terms = [
  { value: "TERM_1", label: "Term 1" },
  { value: "TERM_2", label: "Term 2" },
  { value: "TERM_3", label: "Term 3" },
];

const ITEM_CLASS =
  "cursor-pointer mx-1 my-0.5 rounded-md pl-3 pr-7 focus:bg-gray-100 focus:text-gray-900 data-[highlighted]:bg-gray-100 data-[highlighted]:text-gray-900";

const formatDate = (iso?: string | null) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const termLabel = (t?: string | null) =>
  t ? t.replace("_", " ").replace("TERM", "Term") : "";

const termOrder: Record<string, number> = {
  TERM_1: 1,
  TERM_2: 2,
  TERM_3: 3,
};

const ClassesPage = () => {
  const navigate = useNavigate();
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [classForm, setClassForm] = useState({ name: "", level: "" });
  const [classError, setClassError] = useState("");
  const [expandedClass, setExpandedClass] = useState<string | null>(null);

  // Payment details state
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [mobileMoney, setMobileMoney] = useState({
    airtelMoneyNumber: "",
    mpambaNumber: "",
    paymentInstructions: "",
  });
  const [paymentDetailsLoading, setPaymentDetailsLoading] = useState(false);
  const [paymentDetailsSaved, setPaymentDetailsSaved] = useState(false);
  const [showAddBank, setShowAddBank] = useState(false);
  const [newBank, setNewBank] = useState({
    bankName: "",
    accountName: "",
    accountNumber: "",
    branch: "",
  });

  // Active term — single source of truth for the whole app
  const { academicYear: activeYear, activeTerm: currentTerm } = useActiveTerm();

  // Fee structure form state
  const [feeForm, setFeeForm] = useState({
    classId: "",
    term: "TERM_1",
    academicYear: getCurrentAcademicYear(),
    totalAmount: "",
    tuitionFee: "",
    examFee: "",
    buildingLevy: "",
    uniformFee: "",
    bookFee: "",
  });
  const [feeLoading, setFeeLoading] = useState(false);
  const [feeError, setFeeError] = useState("");
  const [feeSuccess, setFeeSuccess] = useState("");
  const [showFeeForm, setShowFeeForm] = useState<string | null>(null);
  const [editingFee, setEditingFee] = useState<any>(null);

  // Active term state
  const [activeTerm, setActiveTerm] = useState<any>(null);
  const [activatingTerm, setActivatingTerm] = useState(false);
  const [activateForm, setActivateForm] = useState({
    term: "TERM_1",
    academicYear: getCurrentAcademicYear(),
    startDate: "",
    endDate: "",
  });
  const [activateError, setActivateError] = useState("");
  const [activateSuccess, setActivateSuccess] = useState("");
  const [showActivateForm, setShowActivateForm] = useState(false);

  // Confirmation modal state
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    skipWarning: string | null;
  }>({ open: false, skipWarning: null });

  // Term history state
  const [termHistory, setTermHistory] = useState<any[]>([]);
  const [termHistoryLoading, setTermHistoryLoading] = useState(true);

  // Sync the Activate Term form with the activated values as soon as they load
  useEffect(() => {
    if (activeYear) {
      setActivateForm((prev) => ({ ...prev, academicYear: activeYear }));
    }
    if (currentTerm) {
      setActivateForm((prev) => ({ ...prev, term: currentTerm }));
    }
    if (activeTerm?.activeTermStartDate) {
      setActivateForm((prev) => ({
        ...prev,
        startDate: activeTerm.activeTermStartDate.slice(0, 10),
      }));
    }
    if (activeTerm?.activeTermEndDate) {
      setActivateForm((prev) => ({
        ...prev,
        endDate: activeTerm.activeTermEndDate.slice(0, 10),
      }));
    }
  }, [
    activeYear,
    currentTerm,
    activeTerm?.activeTermStartDate,
    activeTerm?.activeTermEndDate,
  ]);

  // Keep the new fee form in sync with the activated term/year
  useEffect(() => {
    if (activeYear && showFeeForm && !editingFee) {
      setFeeForm((prev) => ({
        ...prev,
        academicYear: activeYear,
        term: currentTerm || prev.term,
      }));
    }
  }, [activeYear, currentTerm, showFeeForm, editingFee]);

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

  const fetchActiveTerm = async () => {
    try {
      const res = await api.get("/schools/active-term");
      setActiveTerm(res.data.data);
    } catch {
      setActiveTerm(null);
    }
  };

  const fetchTermHistory = async () => {
    setTermHistoryLoading(true);
    try {
      const res = await api.get("/schools/term-history");
      setTermHistory(res.data.data || []);
    } catch {
      setTermHistory([]);
    } finally {
      setTermHistoryLoading(false);
    }
  };

  const fetchPaymentDetails = async () => {
    try {
      const res = await api.get("/schools/me");
      const school = res.data.data;
      setBankAccounts(school.bankAccounts || []);
      setMobileMoney({
        airtelMoneyNumber: school.airtelMoneyNumber || "",
        mpambaNumber: school.mpambaNumber || "",
        paymentInstructions: school.paymentInstructions || "",
      });
    } catch {}
  };

  useEffect(() => {
    fetchClasses();
    fetchActiveTerm();
    fetchTermHistory();
    fetchPaymentDetails();
  }, []);

  const handleSavePaymentDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setPaymentDetailsLoading(true);
    try {
      await api.put("/schools/payment-details", {
        bankAccounts,
        ...mobileMoney,
      });
      setPaymentDetailsSaved(true);
      setTimeout(() => setPaymentDetailsSaved(false), 3000);
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to save");
    } finally {
      setPaymentDetailsLoading(false);
    }
  };

  const handleAddBank = () => {
    if (!newBank.bankName || !newBank.accountNumber) return;
    setBankAccounts((prev) => [
      ...prev,
      { ...newBank, id: Date.now().toString() },
    ]);
    setNewBank({
      bankName: "",
      accountName: "",
      accountNumber: "",
      branch: "",
    });
    setShowAddBank(false);
  };

  const handleDeleteBank = (index: number) => {
    setBankAccounts((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setClassError("");
    setAdding(true);
    try {
      await api.post("/schools/classes", {
        name: classForm.name,
        level: parseInt(classForm.level),
      });
      setClassForm({ name: "", level: "" });
      fetchClasses();
    } catch (err: any) {
      setClassError(err.response?.data?.message || "Failed to add class");
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteClass = async (classId: string) => {
    if (!confirm("Are you sure you want to delete this class?")) return;
    try {
      await api.delete(`/schools/classes/${classId}`);
      fetchClasses();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to delete class");
    }
  };

  const openFeeForm = (classId: string, existingFee?: any) => {
    setFeeError("");
    setFeeSuccess("");
    setEditingFee(existingFee || null);
    setShowFeeForm(classId);
    if (existingFee) {
      setFeeForm({
        classId,
        term: existingFee.term,
        academicYear: existingFee.academicYear,
        totalAmount: existingFee.totalAmount.toString(),
        tuitionFee: existingFee.tuitionFee?.toString() || "",
        examFee: existingFee.examFee?.toString() || "",
        buildingLevy: existingFee.buildingLevy?.toString() || "",
        uniformFee: existingFee.uniformFee?.toString() || "",
        bookFee: existingFee.bookFee?.toString() || "",
      });
    } else {
      setFeeForm((prev) => ({
        ...prev,
        classId,
        academicYear: activeYear || prev.academicYear,
        term: currentTerm || prev.term,
        totalAmount: "",
        tuitionFee: "",
        examFee: "",
        buildingLevy: "",
        uniformFee: "",
        bookFee: "",
      }));
    }
  };

  const recalculateTotal = (updated: typeof feeForm) => {
    const tuition = parseFloat(updated.tuitionFee) || 0;
    const exam = parseFloat(updated.examFee) || 0;
    const building = parseFloat(updated.buildingLevy) || 0;
    const uniform = parseFloat(updated.uniformFee) || 0;
    const book = parseFloat(updated.bookFee) || 0;
    const total = tuition + exam + building + uniform + book;
    if (total > 0) {
      return { ...updated, totalAmount: total.toString() };
    }
    return updated;
  };

  const handleFeeChange = (field: string, value: string) => {
    const updated = { ...feeForm, [field]: value };
    const recalculated = recalculateTotal(updated);
    setFeeForm(recalculated);
  };

  const handleSaveFee = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeeError("");
    setFeeSuccess("");
    setFeeLoading(true);

    try {
      if (editingFee) {
        await api.put(`/schools/fee-structures/${editingFee.id}`, {
          totalAmount: feeForm.totalAmount,
          tuitionFee: feeForm.tuitionFee || undefined,
          examFee: feeForm.examFee || undefined,
          buildingLevy: feeForm.buildingLevy || undefined,
          uniformFee: feeForm.uniformFee || undefined,
          bookFee: feeForm.bookFee || undefined,
        });
        setFeeSuccess("Fee structure updated successfully");
      } else {
        await api.post("/schools/fee-structures", {
          classId: feeForm.classId,
          term: feeForm.term,
          academicYear: feeForm.academicYear,
          totalAmount: feeForm.totalAmount,
          tuitionFee: feeForm.tuitionFee || undefined,
          examFee: feeForm.examFee || undefined,
          buildingLevy: feeForm.buildingLevy || undefined,
          uniformFee: feeForm.uniformFee || undefined,
          bookFee: feeForm.bookFee || undefined,
        });
        setFeeSuccess("Fee structure saved successfully");
      }
      fetchClasses();
      setTimeout(() => {
        setShowFeeForm(null);
        setFeeSuccess("");
        setEditingFee(null);
      }, 1500);
    } catch (err: any) {
      setFeeError(
        err.response?.data?.message || "Failed to save fee structure",
      );
    } finally {
      setFeeLoading(false);
    }
  };

  // Compute whether the new selection skips or reverses a term
  const computeSkipWarning = (): string | null => {
    if (!activeTerm?.activeTerm || !activeTerm?.activeAcademicYear) return null;
    // Year change is a fresh cycle, no skip warning
    if (activeTerm.activeAcademicYear !== activateForm.academicYear)
      return null;

    const from = termOrder[activeTerm.activeTerm];
    const to = termOrder[activateForm.term];
    if (from === undefined || to === undefined) return null;

    if (to > from + 1) {
      const skipped = `Term ${from + 1}`;
      return `You're skipping ${skipped}. The system will still activate ${termLabel(activateForm.term)}, but ${skipped} won't have a record in Term History.`;
    }
    if (to < from) {
      return `You're moving back from ${termLabel(activeTerm.activeTerm)} to ${termLabel(activateForm.term)}. The current term will be archived.`;
    }
    return null;
  };

  // Form submit → open confirmation modal (never submit directly)
  const handleActivateTerm = (e: React.FormEvent) => {
    e.preventDefault();
    setActivateError("");
    setActivateSuccess("");

    if (activateForm.startDate && activateForm.endDate) {
      if (activateForm.endDate < activateForm.startDate) {
        setActivateError("End date must be after start date");
        return;
      }
    }

    const skipWarning = computeSkipWarning();
    setConfirmModal({ open: true, skipWarning });
  };

  // Modal confirm → actually send request
  const handleConfirmActivate = async () => {
    setConfirmModal({ open: false, skipWarning: null });
    setActivateError("");
    setActivateSuccess("");
    setActivatingTerm(true);

    try {
      const res = await api.post("/schools/activate-term", activateForm);
      setActivateSuccess(res.data.message);
      await Promise.all([fetchActiveTerm(), fetchTermHistory()]);
      setTimeout(() => {
        setShowActivateForm(false);
        setActivateSuccess("");
      }, 1800);
    } catch (err: any) {
      setActivateError(
        err.response?.data?.message || "Failed to activate term",
      );
    } finally {
      setActivatingTerm(false);
    }
  };

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

      {/* Active Term Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="font-medium text-gray-800">Active Term</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Sets the default term and academic year across the whole system
            </p>
          </div>
          {activeTerm && !showActivateForm && (
            <button
              onClick={() => {
                setShowActivateForm(true);
                setActivateError("");
                setActivateSuccess("");
              }}
              className="flex items-center gap-1.5 text-sm font-medium text-blue-900 hover:text-blue-700 transition-colors"
            >
              <Edit2 size={14} /> Change
            </button>
          )}
        </div>

        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr className="text-left text-gray-500">
              <th className="px-6 py-2.5 font-medium">Term</th>
              <th className="px-6 py-2.5 font-medium">Academic Year</th>
              <th className="px-6 py-2.5 font-medium">Term Dates</th>
              <th className="px-6 py-2.5 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {activeTerm ? (
              <tr className="border-t border-gray-100">
                <td className="px-6 py-3 font-medium text-gray-800">
                  {termLabel(activeTerm.activeTerm)}
                </td>
                <td className="px-6 py-3 text-gray-700">
                  {activeTerm.activeAcademicYear}
                </td>
                <td className="px-6 py-3 text-gray-600 text-xs">
                  {activeTerm.activeTermStartDate ||
                  activeTerm.activeTermEndDate ? (
                    <>
                      {formatDate(activeTerm.activeTermStartDate)}
                      {" — "}
                      {formatDate(activeTerm.activeTermEndDate)}
                    </>
                  ) : (
                    <span className="text-gray-400 italic">No dates set</span>
                  )}
                </td>
                <td className="px-6 py-3">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium">
                    <CheckCircle size={12} /> Active
                  </span>
                </td>
              </tr>
            ) : (
              <tr className="border-t border-gray-100">
                <td colSpan={4} className="px-6 py-8 text-center">
                  <AlertCircle
                    size={24}
                    className="mx-auto mb-2 text-yellow-400"
                  />
                  <p className="text-sm text-gray-500 font-medium">
                    No active term set
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Activate a term below to enable fee collection across the
                    system
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {(!activeTerm || showActivateForm) && (
          <form
            onSubmit={handleActivateTerm}
            className="border-t border-gray-100 bg-gray-50 p-5 space-y-3"
          >
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
              {activeTerm ? "Change Active Term" : "Activate a Term"}
            </p>

            <div className="flex flex-wrap gap-3 items-end">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Term
                </label>
                <Select
                  value={activateForm.term}
                  onValueChange={(v) =>
                    setActivateForm({ ...activateForm, term: v })
                  }
                >
                  <SelectTrigger className="w-[130px] bg-white border-gray-300 rounded-lg text-sm h-[38px]">
                    <SelectValue placeholder="Select term" />
                  </SelectTrigger>
                  <SelectContent className="bg-white w-auto min-w-[130px]">
                    {terms.map((t) => (
                      <SelectItem
                        key={t.value}
                        value={t.value}
                        className={ITEM_CLASS}
                      >
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Academic Year
                </label>
                <input
                  value={activateForm.academicYear}
                  onChange={(e) =>
                    setActivateForm({
                      ...activateForm,
                      academicYear: e.target.value,
                    })
                  }
                  placeholder="eg. 2025-2026"
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm w-32 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={activateForm.startDate}
                  onChange={(e) =>
                    setActivateForm({
                      ...activateForm,
                      startDate: e.target.value,
                    })
                  }
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={activateForm.endDate}
                  onChange={(e) =>
                    setActivateForm({
                      ...activateForm,
                      endDate: e.target.value,
                    })
                  }
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>

              <button
                type="submit"
                disabled={activatingTerm}
                className="flex items-center gap-2 bg-[var(--color-primary)] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[var(--color-primary-dark)] disabled:opacity-40"
              >
                {activatingTerm ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <CheckCircle size={14} />
                )}
                {activatingTerm
                  ? "Activating..."
                  : activeTerm
                    ? "Update Active Term"
                    : "Activate Term"}
              </button>

              {activeTerm && (
                <button
                  type="button"
                  onClick={() => {
                    setShowActivateForm(false);
                    setActivateError("");
                    setActivateSuccess("");
                  }}
                  className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-white"
                >
                  Cancel
                </button>
              )}
            </div>

            {activateError && (
              <p className="text-red-600 text-sm">{activateError}</p>
            )}
            {activateSuccess && (
              <p className="text-green-600 text-sm"> {activateSuccess}</p>
            )}
          </form>
        )}
      </div>

      {/* Term History */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <History size={16} className="text-blue-900" />
          <div>
            <h3 className="font-medium text-gray-800">Term History</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Every term the school has ever run — with its financials
            </p>
          </div>
        </div>

        {termHistoryLoading ? (
          <div className="flex items-center justify-center h-24">
            <Loader2 size={18} className="animate-spin text-gray-300" />
          </div>
        ) : termHistory.length === 0 ? (
          <div className="px-6 py-8 text-center">
            <History size={28} className="mx-auto mb-2 text-gray-200" />
            <p className="text-sm text-gray-400 font-medium">
              No term history yet
            </p>
            <p className="text-xs text-gray-300 mt-1">
              Activate a term to start recording its history
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr className="text-left text-gray-500">
                  <th className="px-6 py-2.5 text-xs font-medium uppercase">
                    Term
                  </th>
                  <th className="px-6 py-2.5 text-xs font-medium uppercase">
                    Year
                  </th>
                  <th className="px-6 py-2.5 text-xs font-medium uppercase">
                    Dates
                  </th>
                  <th className="px-6 py-2.5 text-xs font-medium uppercase text-right">
                    Collected
                  </th>
                  <th className="px-6 py-2.5 text-xs font-medium uppercase text-right">
                    Outstanding
                  </th>
                  <th className="px-6 py-2.5 text-xs font-medium uppercase text-center">
                    Debtors
                  </th>
                  <th className="px-6 py-2.5 text-xs font-medium uppercase text-right">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {termHistory.map((t: any) => {
                  const isCurrentlyActive =
                    activeTerm?.activeTerm === t.term &&
                    activeTerm?.activeAcademicYear === t.academicYear;

                  return (
                    <tr
                      key={t.id}
                      className={`hover:bg-gray-50 ${
                        isCurrentlyActive ? "bg-blue-50/40" : ""
                      }`}
                    >
                      <td className="px-6 py-3 font-medium text-gray-800">
                        {termLabel(t.term)}
                        {isCurrentlyActive && (
                          <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">
                            Active
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-3 text-gray-600">
                        {t.academicYear}
                      </td>
                      <td className="px-6 py-3 text-xs text-gray-500">
                        {t.startDate || t.endDate ? (
                          <>
                            {formatDate(t.startDate)}
                            {" — "}
                            {formatDate(t.endDate)}
                          </>
                        ) : (
                          <span className="italic text-gray-400">No dates</span>
                        )}
                      </td>
                      <td className="px-6 py-3 text-right font-medium text-green-700">
                        MWK {t.totalCollected.toLocaleString()}
                      </td>
                      <td
                        className={`px-6 py-3 text-right font-medium ${
                          t.outstanding > 0 ? "text-red-600" : "text-green-600"
                        }`}
                      >
                        {t.outstanding > 0
                          ? `MWK ${t.outstanding.toLocaleString()}`
                          : "✓ Clear"}
                      </td>
                      <td className="px-6 py-3 text-center">
                        {t.debtors > 0 ? (
                          <span className="text-red-600 font-medium">
                            {t.debtors}
                          </span>
                        ) : (
                          <span className="text-gray-400">0</span>
                        )}
                      </td>
                      <td className="px-6 py-3 text-right">
                        <button
                          onClick={() =>
                            navigate(
                              `/reports?term=${t.term}&academicYear=${t.academicYear}`,
                            )
                          }
                          className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:text-blue-900"
                        >
                          <FileBarChart size={12} /> View Report
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Class Form */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h3 className="font-medium text-gray-800 mb-4">Add New Class</h3>
        <form onSubmit={handleAddClass} className="flex gap-3">
          <input
            value={classForm.name}
            onChange={(e) =>
              setClassForm({ ...classForm, name: e.target.value })
            }
            placeholder="Class name (eg. Form 1, Form 3)"
            required
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="number"
            value={classForm.level}
            onChange={(e) =>
              setClassForm({ ...classForm, level: e.target.value })
            }
            placeholder="Level"
            required
            className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={adding}
            className="flex items-center gap-2 bg-[var(--color-primary)] text-white px-4 py-2 rounded-lg text-sm hover:bg-[var(--color-primary-dark)] disabled:opacity-40"
          >
            {adding ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Plus size={14} />
            )}
            Add
          </button>
        </form>
        {classError && (
          <p className="text-red-600 text-sm mt-2">{classError}</p>
        )}
      </div>

      {/* Classes List with Fee Structures */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[var(--color-primary)]" />
          </div>
        ) : classes.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center border border-gray-100">
            <GraduationCap size={40} className="mx-auto mb-2 text-gray-300" />
            <p className="text-sm text-gray-400">No classes added yet</p>
          </div>
        ) : (
          classes.map((cls: any) => (
            <div
              key={cls.id}
              className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
            >
              <div
                className="flex items-center justify-between px-6 py-4 cursor-pointer hover:bg-gray-50"
                onClick={() =>
                  setExpandedClass(expandedClass === cls.id ? null : cls.id)
                }
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-[var(--color-primary-light)] rounded-xl flex items-center justify-center">
                    <GraduationCap
                      size={18}
                      className="text-[var(--color-primary)]"
                    />
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">{cls.name}</p>
                    <p className="text-xs text-gray-400">
                      Level {cls.level} • {cls._count?.students || 0} students
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-500">
                    {cls.feeStructures?.length || 0} fee structure
                    {cls.feeStructures?.length !== 1 ? "s" : ""} set
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteClass(cls.id);
                    }}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                  >
                    <Trash2 size={14} />
                  </button>
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
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase mb-3">
                        Current Fee Structures
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {cls.feeStructures.map((fee: any) => (
                          <div
                            key={fee.id}
                            className="border border-gray-200 rounded-lg p-4"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                                {termLabel(fee.term)} {fee.academicYear}
                              </span>
                              <button
                                onClick={() => openFeeForm(cls.id, fee)}
                                className="p-1 text-gray-400 hover:text-blue-600"
                              >
                                <Edit2 size={12} />
                              </button>
                            </div>
                            <p className="text-lg font-bold text-gray-800">
                              MWK {fee.totalAmount.toLocaleString()}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <p className="text-sm text-yellow-700">
                        No fee structures set for this class yet. Add fees
                        below.
                      </p>
                    </div>
                  )}

                  {showFeeForm !== cls.id ? (
                    <button
                      onClick={() => openFeeForm(cls.id)}
                      className="flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      <Plus size={16} />
                      {cls.feeStructures?.length > 0
                        ? "Add Another Term Fee"
                        : "Set Fee Structure"}
                    </button>
                  ) : (
                    <form
                      onSubmit={handleSaveFee}
                      className="bg-gray-50 rounded-xl p-5 border border-gray-200 space-y-4"
                    >
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-gray-800">
                          {editingFee
                            ? "Edit Fee Structure"
                            : "New Fee Structure"}{" "}
                          — {cls.name}
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setShowFeeForm(null);
                            setEditingFee(null);
                          }}
                          className="text-gray-400 hover:text-gray-600 text-sm"
                        >
                          Cancel
                        </button>
                      </div>

                      {!editingFee && (
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Term *
                            </label>
                            <Select
                              value={feeForm.term}
                              onValueChange={(v) =>
                                setFeeForm({ ...feeForm, term: v })
                              }
                            >
                              <SelectTrigger className="w-full bg-white border-gray-300 rounded-lg text-sm h-[38px]">
                                <SelectValue placeholder="Select term" />
                              </SelectTrigger>
                              <SelectContent className="bg-white w-auto min-w-[130px]">
                                {terms.map((t) => (
                                  <SelectItem
                                    key={t.value}
                                    value={t.value}
                                    className={ITEM_CLASS}
                                  >
                                    {t.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Academic Year *
                            </label>
                            <input
                              value={feeForm.academicYear}
                              onChange={(e) =>
                                setFeeForm({
                                  ...feeForm,
                                  academicYear: e.target.value,
                                })
                              }
                              placeholder="eg. 2025-2026"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                      )}

                      <div>
                        <p className="text-xs font-medium text-gray-600 mb-2">
                          Fee Breakdown{" "}
                          <span className="text-gray-400">
                            (optional — total auto-calculates)
                          </span>
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                          {[
                            { field: "tuitionFee", label: "Tuition Fee" },
                            { field: "examFee", label: "Exam Fee" },
                            { field: "buildingLevy", label: "Building Levy" },
                            { field: "uniformFee", label: "Uniform Fee" },
                            { field: "bookFee", label: "Book Fee" },
                          ].map(({ field, label }) => (
                            <div key={field}>
                              <label className="block text-xs text-gray-500 mb-1">
                                {label}
                              </label>
                              <input
                                type="number"
                                value={(feeForm as any)[field]}
                                onChange={(e) =>
                                  handleFeeChange(field, e.target.value)
                                }
                                placeholder="0"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="bg-white border-2 border-blue-200 rounded-lg p-4">
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Total Amount (MWK) *{" "}
                          <span className="text-gray-400">
                            — auto-calculated or enter manually
                          </span>
                        </label>
                        <input
                          type="number"
                          value={feeForm.totalAmount}
                          onChange={(e) =>
                            setFeeForm({
                              ...feeForm,
                              totalAmount: e.target.value,
                            })
                          }
                          required
                          placeholder="eg. 150000"
                          className="w-full px-3 py-3 border border-gray-300 rounded-lg text-lg font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      {feeError && (
                        <p className="text-red-600 text-sm">{feeError}</p>
                      )}
                      {feeSuccess && (
                        <p className="text-green-600 text-sm">{feeSuccess}</p>
                      )}

                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setShowFeeForm(null);
                            setEditingFee(null);
                          }}
                          className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={feeLoading}
                          className="flex-1 flex items-center justify-center gap-2 bg-[var(--color-primary)] text-white py-2 rounded-lg text-sm disabled:opacity-40 hover:bg-[var(--color-primary-dark)]"
                        >
                          {feeLoading && (
                            <Loader2 size={14} className="animate-spin" />
                          )}
                          {feeLoading
                            ? "Saving..."
                            : editingFee
                              ? "Update Fee"
                              : "Save Fee Structure"}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Payment Details Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-medium text-gray-800">
            Payment Details for Parents
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Parents will see these details on their portal so they know where to
            pay fees
          </p>
        </div>

        <form onSubmit={handleSavePaymentDetails} className="p-6 space-y-6">
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-gray-700">
                Bank Accounts
              </p>
              <button
                type="button"
                onClick={() => setShowAddBank(true)}
                className="flex items-center gap-1.5 text-sm text-blue-600 font-medium hover:text-blue-800"
              >
                <Plus size={14} />
                Add Bank Account
              </button>
            </div>

            {showAddBank && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4 space-y-3">
                <p className="text-sm font-medium text-blue-800">
                  Add New Bank Account
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      Bank Name *
                    </label>
                    <input
                      value={newBank.bankName}
                      onChange={(e) =>
                        setNewBank({ ...newBank, bankName: e.target.value })
                      }
                      placeholder="eg. National Bank"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      Account Name *
                    </label>
                    <input
                      value={newBank.accountName}
                      onChange={(e) =>
                        setNewBank({ ...newBank, accountName: e.target.value })
                      }
                      placeholder="eg. St Peters Private School"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      Account Number *
                    </label>
                    <input
                      value={newBank.accountNumber}
                      onChange={(e) =>
                        setNewBank({
                          ...newBank,
                          accountNumber: e.target.value,
                        })
                      }
                      placeholder="eg. 1234567890"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      Branch (optional)
                    </label>
                    <input
                      value={newBank.branch}
                      onChange={(e) =>
                        setNewBank({ ...newBank, branch: e.target.value })
                      }
                      placeholder="eg. Blantyre Branch"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleAddBank}
                    disabled={!newBank.bankName || !newBank.accountNumber}
                    className="flex items-center gap-1.5 bg-[var(--color-primary)] text-white px-4 py-2 rounded-lg text-sm disabled:opacity-40 hover:bg-[var(--color-primary-dark)]"
                  >
                    <Plus size={14} />
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddBank(false);
                      setNewBank({
                        bankName: "",
                        accountName: "",
                        accountNumber: "",
                        branch: "",
                      });
                    }}
                    className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {bankAccounts.length === 0 ? (
              <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center">
                <p className="text-sm text-gray-400">
                  No bank accounts added yet
                </p>
                <p className="text-xs text-gray-300 mt-1">
                  Click "Add Bank Account" to add one
                </p>
              </div>
            ) : (
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                        Bank
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                        Account Name
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                        Account Number
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                        Branch
                      </th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {bankAccounts.map((bank: any, index: number) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-800">
                          {bank.bankName}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {bank.accountName}
                        </td>
                        <td className="px-4 py-3 font-mono text-gray-700">
                          {bank.accountNumber}
                        </td>
                        <td className="px-4 py-3 text-gray-500">
                          {bank.branch || "—"}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => handleDeleteBank(index)}
                            className="text-red-400 hover:text-red-600 p-1 rounded hover:bg-red-50"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div>
            <p className="text-sm font-semibold text-gray-700 mb-3">
              Mobile Money
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  Airtel Money Number
                </label>
                <input
                  value={mobileMoney.airtelMoneyNumber}
                  onChange={(e) =>
                    setMobileMoney({
                      ...mobileMoney,
                      airtelMoneyNumber: e.target.value,
                    })
                  }
                  placeholder="eg. 0999 000 000"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  TNM Mpamba Number
                </label>
                <input
                  value={mobileMoney.mpambaNumber}
                  onChange={(e) =>
                    setMobileMoney({
                      ...mobileMoney,
                      mpambaNumber: e.target.value,
                    })
                  }
                  placeholder="eg. 0888 000 000"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Payment Instructions
            </label>
            <textarea
              value={mobileMoney.paymentInstructions}
              onChange={(e) =>
                setMobileMoney({
                  ...mobileMoney,
                  paymentInstructions: e.target.value,
                })
              }
              placeholder="eg. Use your child's Student ID as the payment reference. Send screenshot to school office after payment."
              rows={3}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {paymentDetailsSaved && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
              Payment details saved successfully
            </div>
          )}

          <button
            type="submit"
            disabled={paymentDetailsLoading}
            className="flex items-center gap-2 bg-[var(--color-primary)] text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-[var(--color-primary-dark)] disabled:opacity-40"
          >
            {paymentDetailsLoading ? (
              <>
                <Loader2 size={14} className="animate-spin" /> Saving...
              </>
            ) : (
              "Save Payment Details"
            )}
          </button>
        </form>
      </div>

      {/* ==================== CONFIRM ACTIVATION MODAL ==================== */}
      {confirmModal.open && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setConfirmModal({ open: false, skipWarning: null })}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                  <AlertCircle size={20} className="text-blue-700" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-800">
                    Confirm Activation
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    This will affect the whole system
                  </p>
                </div>
              </div>
              <button
                onClick={() =>
                  setConfirmModal({ open: false, skipWarning: null })
                }
                className="p-1 text-gray-400 hover:text-gray-600 rounded"
              >
                <X size={16} />
              </button>
            </div>

            {/* From → To */}
            <div className="space-y-3 mb-4">
              {activeTerm ? (
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-[11px] text-gray-500 uppercase font-medium mb-1">
                    Currently active
                  </p>
                  <p className="text-sm font-semibold text-gray-800">
                    {termLabel(activeTerm.activeTerm)} •{" "}
                    {activeTerm.activeAcademicYear}
                  </p>
                  {(activeTerm.activeTermStartDate ||
                    activeTerm.activeTermEndDate) && (
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      {formatDate(activeTerm.activeTermStartDate)}
                      {" — "}
                      {formatDate(activeTerm.activeTermEndDate)}
                    </p>
                  )}
                </div>
              ) : (
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-[11px] text-gray-500 uppercase font-medium mb-1">
                    Currently active
                  </p>
                  <p className="text-sm text-gray-500 italic">No active term</p>
                </div>
              )}

              <div className="flex justify-center text-gray-300">
                <ChevronDown size={16} />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                <p className="text-[11px] text-blue-700 uppercase font-medium mb-1">
                  New active term
                </p>
                <p className="text-sm font-semibold text-blue-900">
                  {termLabel(activateForm.term)} • {activateForm.academicYear}
                </p>
                {(activateForm.startDate || activateForm.endDate) && (
                  <p className="text-[11px] text-blue-600 mt-0.5">
                    {formatDate(activateForm.startDate)}
                    {" — "}
                    {formatDate(activateForm.endDate)}
                  </p>
                )}
              </div>
            </div>

            {/* Skip / reverse warning */}
            {confirmModal.skipWarning && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 mb-4 flex items-start gap-2">
                <AlertTriangle
                  size={16}
                  className="text-yellow-600 shrink-0 mt-0.5"
                />
                <p className="text-xs text-yellow-800">
                  {confirmModal.skipWarning}
                </p>
              </div>
            )}

            {activeTerm && (
              <p className="text-xs text-gray-500 mb-4 leading-relaxed">
                The previous term will be archived and available in{" "}
                <span className="font-medium text-gray-700">Term History</span>{" "}
                and <span className="font-medium text-gray-700">Reports</span>.
                Student credit balances (if any) will be applied to the new term
                automatically.
              </p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() =>
                  setConfirmModal({ open: false, skipWarning: null })
                }
                className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmActivate}
                disabled={activatingTerm}
                className="flex-1 flex items-center justify-center gap-2 bg-[var(--color-primary)] text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-[var(--color-primary-dark)] disabled:opacity-40"
              >
                {activatingTerm ? (
                  <>
                    <Loader2 size={14} className="animate-spin" /> Activating...
                  </>
                ) : (
                  <>
                    <CheckCircle size={14} /> Yes, Activate
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClassesPage;
