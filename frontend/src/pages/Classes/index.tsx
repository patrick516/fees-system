import { useEffect, useState } from "react";
import {
  Plus,
  GraduationCap,
  Loader2,
  ChevronDown,
  ChevronUp,
  Edit2,
  Trash2,
  CheckCircle,
} from "lucide-react";
import api from "../../lib/axios";

const terms = [
  { value: "TERM_1", label: "Term 1" },
  { value: "TERM_2", label: "Term 2" },
  { value: "TERM_3", label: "Term 3" },
];

const ClassesPage = () => {
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

  // Fee structure form state
  const [feeForm, setFeeForm] = useState({
    classId: "",
    term: "TERM_1",
    academicYear: "2025",
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
    academicYear: "2025",
  });
  const [activateError, setActivateError] = useState("");
  const [activateSuccess, setActivateSuccess] = useState("");

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
        totalAmount: "",
        tuitionFee: "",
        examFee: "",
        buildingLevy: "",
        uniformFee: "",
        bookFee: "",
      }));
    }
  };

  // Auto calculate total from breakdown
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

  const handleActivateTerm = async (e: React.FormEvent) => {
    e.preventDefault();
    setActivateError("");
    setActivateSuccess("");
    setActivatingTerm(true);
    try {
      const res = await api.post("/schools/activate-term", activateForm);
      setActivateSuccess(res.data.message);
      fetchActiveTerm();
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
      <div
        className={`rounded-xl p-6 border ${activeTerm ? "bg-green-50 border-green-200" : "bg-yellow-50 border-yellow-200"}`}
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-1">
              Current Active Term
            </p>
            {activeTerm ? (
              <p className="text-2xl font-bold text-green-700">
                {activeTerm.activeTerm.replace("_", " ")} —{" "}
                {activeTerm.activeAcademicYear}
              </p>
            ) : (
              <p className="text-sm text-yellow-700">
                No active term set. Activate a term to enable fee collection.
              </p>
            )}
          </div>
          <CheckCircle
            size={24}
            className={activeTerm ? "text-green-500" : "text-yellow-400"}
          />
        </div>

        {/* Activate Term Form */}
        <form
          onSubmit={handleActivateTerm}
          className="mt-4 flex flex-wrap gap-3 items-end"
        >
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Term
            </label>
            <select
              value={activateForm.term}
              onChange={(e) =>
                setActivateForm({ ...activateForm, term: e.target.value })
              }
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {terms.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
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
              placeholder="2025"
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm w-24 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            disabled={activatingTerm}
            className="flex items-center gap-2 bg-blue-900 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-800 disabled:opacity-40"
          >
            {activatingTerm ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <CheckCircle size={14} />
            )}
            {activatingTerm ? "Activating..." : "Activate Term"}
          </button>
          {activateError && (
            <p className="text-red-600 text-sm">{activateError}</p>
          )}
          {activateSuccess && (
            <p className="text-green-600 text-sm">✅ {activateSuccess}</p>
          )}
        </form>
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
            placeholder="Class name (eg. Form 1, Standard 3)"
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
        {classError && (
          <p className="text-red-600 text-sm mt-2">{classError}</p>
        )}
      </div>

      {/* Classes List with Fee Structures */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-900" />
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
              {/* Class Header */}
              <div
                className="flex items-center justify-between px-6 py-4 cursor-pointer hover:bg-gray-50"
                onClick={() =>
                  setExpandedClass(expandedClass === cls.id ? null : cls.id)
                }
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                    <GraduationCap size={18} className="text-blue-900" />
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

              {/* Expanded — Fee Structures */}
              {expandedClass === cls.id && (
                <div className="border-t border-gray-100 px-6 py-4 space-y-4">
                  {/* Existing Fee Structures */}
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
                                {fee.term.replace("_", " ")} {fee.academicYear}
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

                  {/* Add Fee Structure Button */}
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
                    /* Fee Structure Form */
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
                            <select
                              value={feeForm.term}
                              onChange={(e) =>
                                setFeeForm({ ...feeForm, term: e.target.value })
                              }
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              {terms.map((t) => (
                                <option key={t.value} value={t.value}>
                                  {t.label}
                                </option>
                              ))}
                            </select>
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
                              placeholder="2025"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                      )}

                      {/* Fee Breakdown */}
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

                      {/* Total Amount */}
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
                        <p className="text-green-600 text-sm">
                          ✅ {feeSuccess}
                        </p>
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
                          className="flex-1 flex items-center justify-center gap-2 bg-blue-900 text-white py-2 rounded-lg text-sm disabled:opacity-40 hover:bg-blue-800"
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
          {/* Bank Accounts Table */}
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

            {/* Add Bank Form */}
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
                    className="flex items-center gap-1.5 bg-blue-900 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-40 hover:bg-blue-800"
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

            {/* Banks Table */}
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

          {/* Mobile Money */}
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

          {/* Payment Instructions */}
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
              ✅ Payment details saved successfully
            </div>
          )}

          <button
            type="submit"
            disabled={paymentDetailsLoading}
            className="flex items-center gap-2 bg-blue-900 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-800 disabled:opacity-40"
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
    </div>
  );
};

export default ClassesPage;
