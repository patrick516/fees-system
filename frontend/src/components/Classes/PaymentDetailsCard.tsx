import { useState, useEffect, useRef } from "react";
import {
  Edit2,
  Plus,
  Trash2,
  Loader2,
  AlertTriangle,
  X,
  Upload,
} from "lucide-react";
import api from "../../lib/axios";

export default function PaymentDetailsCard() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [hasSaved, setHasSaved] = useState(false);

  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [mobileMoney, setMobileMoney] = useState({
    airtelMoneyNumber: "",
    airtelMoneyName: "",
    mpambaNumber: "",
    mpambaName: "",
    paymentInstructions: "",
  });

  // Bank Form State
  const [showBankForm, setShowBankForm] = useState(false);
  const [editingBankIndex, setEditingBankIndex] = useState<number | null>(null);
  const [bankForm, setBankForm] = useState({
    bankName: "",
    accountName: "",
    accountNumber: "",
    branch: "",
    logoUrl: "",
  });

  // 🎯 Upload State
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Delete Modal State
  const [deleteModal, setDeleteModal] = useState({
    open: false,
    index: -1,
    bankName: "",
  });

  useEffect(() => {
    api
      .get("/schools/me")
      .then((res) => {
        const school = res.data.data;
        const banks = school.bankAccounts || [];
        const mm = {
          airtelMoneyNumber: school.airtelMoneyNumber || "",
          airtelMoneyName: school.airtelMoneyName || "",
          mpambaNumber: school.mpambaNumber || "",
          mpambaName: school.mpambaName || "",
          paymentInstructions: school.paymentInstructions || "",
        };
        setBankAccounts(banks);
        setMobileMoney(mm);
        setHasSaved(
          banks.length > 0 || !!mm.airtelMoneyNumber || !!mm.mpambaNumber,
        );
        setIsEditingDetails(
          banks.length === 0 && !mm.airtelMoneyNumber && !mm.mpambaNumber,
        );
      })
      .finally(() => setLoading(false));
  }, []);

  // 🎯 Handle Image Upload
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert("File must be less than 2MB");
      return;
    }

    setUploadingLogo(true);
    const formData = new FormData();
    formData.append("logo", file);

    try {
      // Reusing the school logo endpoint temporarily to get a URL
      const res = await api.post("/schools/settings/logo", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setBankForm({ ...bankForm, logoUrl: res.data.data.logo });
    } catch (err) {
      alert("Failed to upload logo. Please try again.");
    } finally {
      setUploadingLogo(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSaveDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put("/schools/payment-details", {
        bankAccounts,
        ...mobileMoney,
      });
      setHasSaved(true);
      setIsEditingDetails(false);
    } catch (err) {
      alert("Failed to save payment details. Please check your connection.");
    } finally {
      setSaving(false);
    }
  };

  const handleBankFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankForm.bankName || !bankForm.accountNumber) return;

    if (editingBankIndex !== null) {
      const updated = [...bankAccounts];
      updated[editingBankIndex] = bankForm;
      setBankAccounts(updated);
    } else {
      setBankAccounts([...bankAccounts, bankForm]);
    }
    closeBankForm();
  };

  const openEditBank = (index: number) => {
    setBankForm(bankAccounts[index]);
    setEditingBankIndex(index);
    setShowBankForm(true);
  };

  const closeBankForm = () => {
    setBankForm({
      bankName: "",
      accountName: "",
      accountNumber: "",
      branch: "",
      logoUrl: "",
    });
    setEditingBankIndex(null);
    setShowBankForm(false);
  };

  const confirmDelete = () => {
    if (deleteModal.index !== -1) {
      setBankAccounts(
        bankAccounts.filter((_, idx) => idx !== deleteModal.index),
      );
      setDeleteModal({ open: false, index: -1, bankName: "" });
    }
  };

  if (loading) {
    return (
      <div className="p-6 text-center text-gray-400">
        Loading payment details...
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="font-medium text-gray-800">
              Payment Details for Parents
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Parents will see these details on their portal
            </p>
          </div>
          <div className="flex items-center gap-3">
            {hasSaved && !isEditingDetails && (
              <button
                onClick={() => setIsEditingDetails(true)}
                className="flex items-center gap-1.5 text-sm font-medium text-[var(--color-primary)] hover:text-[var(--color-primary-dark)]"
              >
                <Edit2 size={14} /> Edit Details
              </button>
            )}
            {hasSaved && isEditingDetails && (
              <button
                onClick={() => setIsEditingDetails(false)}
                className="text-sm font-medium text-gray-500 hover:text-gray-700"
              >
                Cancel
              </button>
            )}
          </div>
        </div>

        {isEditingDetails ? (
          <form onSubmit={handleSaveDetails} className="p-6 space-y-6">
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-gray-700">
                  Bank Accounts
                </p>
                {!showBankForm && (
                  <button
                    type="button"
                    onClick={() => setShowBankForm(true)}
                    className="flex items-center gap-1.5 text-sm text-blue-600 font-medium hover:text-blue-800"
                  >
                    <Plus size={14} /> Add Bank Account
                  </button>
                )}
              </div>

              {showBankForm && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4 space-y-3 relative">
                  <button
                    type="button"
                    onClick={closeBankForm}
                    className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
                  >
                    <X size={16} />
                  </button>
                  <h4 className="text-sm font-bold text-blue-900 mb-2">
                    {editingBankIndex !== null
                      ? "Edit Bank Account"
                      : "New Bank Account"}
                  </h4>

                  <div className="grid grid-cols-2 gap-3">
                    <input
                      value={bankForm.bankName}
                      onChange={(e) =>
                        setBankForm({ ...bankForm, bankName: e.target.value })
                      }
                      placeholder="Bank Name *"
                      className="px-3 py-2 border rounded-lg text-sm"
                      required
                    />
                    <input
                      value={bankForm.accountName}
                      onChange={(e) =>
                        setBankForm({
                          ...bankForm,
                          accountName: e.target.value,
                        })
                      }
                      placeholder="Account Name *"
                      className="px-3 py-2 border rounded-lg text-sm"
                    />
                    <input
                      value={bankForm.accountNumber}
                      onChange={(e) =>
                        setBankForm({
                          ...bankForm,
                          accountNumber: e.target.value,
                        })
                      }
                      placeholder="Account Number *"
                      className="px-3 py-2 border rounded-lg text-sm"
                      required
                    />
                    <input
                      value={bankForm.branch}
                      onChange={(e) =>
                        setBankForm({ ...bankForm, branch: e.target.value })
                      }
                      placeholder="Branch (optional)"
                      className="px-3 py-2 border rounded-lg text-sm"
                    />

                    {/* 🎯 Image Upload UI */}
                    <div className="col-span-2 flex items-center gap-3 border border-gray-300 bg-white rounded-lg p-2">
                      {bankForm.logoUrl ? (
                        <div className="flex items-center gap-3 w-full">
                          <img
                            src={bankForm.logoUrl}
                            alt="Logo"
                            className="h-10 w-10 object-contain rounded bg-gray-50 p-1"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setBankForm({ ...bankForm, logoUrl: "" })
                            }
                            className="text-red-500 text-xs font-medium hover:underline ml-auto"
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <>
                          <input
                            type="file"
                            accept="image/*"
                            ref={fileInputRef}
                            onChange={handleLogoUpload}
                            className="hidden"
                          />
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploadingLogo}
                            className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-sm font-medium transition-colors w-full justify-center"
                          >
                            {uploadingLogo ? (
                              <Loader2 size={16} className="animate-spin" />
                            ) : (
                              <Upload size={16} />
                            )}
                            {uploadingLogo
                              ? "Uploading..."
                              : "Upload Bank Logo (Max 2MB)"}
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={handleBankFormSubmit}
                      className="bg-[var(--color-primary)] text-white px-4 py-2 rounded-lg text-sm font-medium"
                    >
                      {editingBankIndex !== null ? "Update Bank" : "Add Bank"}
                    </button>
                  </div>
                </div>
              )}

              {bankAccounts.length === 0 ? (
                <p className="text-sm text-gray-400 italic mb-4">
                  No banks added yet.
                </p>
              ) : (
                <div className="space-y-2 mb-4">
                  {bankAccounts.map((b, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between border border-gray-200 p-3 rounded-lg bg-white"
                    >
                      <div className="text-sm flex items-center gap-3">
                        {b.logoUrl && (
                          <img
                            src={b.logoUrl}
                            alt={b.bankName}
                            className="w-8 h-8 object-contain rounded border border-gray-100 bg-gray-50"
                          />
                        )}
                        <div>
                          <span className="font-medium text-gray-800">
                            {b.bankName}
                          </span>
                          <span className="text-gray-500 font-mono text-xs ml-2">
                            {b.accountNumber}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEditBank(i)}
                          className="p-2 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setDeleteModal({
                              open: true,
                              index: i,
                              bankName: b.bankName,
                            })
                          }
                          className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* MOBILE MONEY SECTION */}
            <div className="space-y-4">
              {/* Airtel */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">
                    Airtel Money Name
                  </label>
                  <input
                    value={mobileMoney.airtelMoneyName}
                    onChange={(e) =>
                      setMobileMoney({
                        ...mobileMoney,
                        airtelMoneyName: e.target.value,
                      })
                    }
                    placeholder="e.g. Stance Pvt Secondary School"
                    className="w-full px-4 py-2.5 border rounded-lg text-sm"
                  />
                </div>
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
                    placeholder="0999 000 000"
                    className="w-full px-4 py-2.5 border rounded-lg text-sm"
                  />
                </div>
              </div>

              {/* TNM Mpamba */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">
                    TNM Mpamba Name
                  </label>
                  <input
                    value={mobileMoney.mpambaName}
                    onChange={(e) =>
                      setMobileMoney({
                        ...mobileMoney,
                        mpambaName: e.target.value,
                      })
                    }
                    placeholder="e.g. Stance Pvt Secondary School"
                    className="w-full px-4 py-2.5 border rounded-lg text-sm"
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
                    placeholder="0888 000 000"
                    className="w-full px-4 py-2.5 border rounded-lg text-sm"
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
                rows={3}
                className="w-full px-4 py-2.5 border rounded-lg text-sm resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-dark)] disabled:opacity-40"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              {saving ? "Saving..." : "Save Payment Details"}
            </button>
          </form>
        ) : (
          <div className="p-6 space-y-6 text-sm text-gray-700">
            <div>
              <p className="font-semibold mb-2">Bank Accounts</p>
              {bankAccounts.length === 0 ? (
                <p className="text-gray-400">None added</p>
              ) : (
                bankAccounts.map((b, i) => (
                  <div key={i} className="flex items-center gap-2 mb-1">
                    {b.logoUrl && (
                      <img
                        src={b.logoUrl}
                        alt={b.bankName}
                        className="w-6 h-6 object-contain rounded"
                      />
                    )}
                    <span>
                      {b.bankName} - {b.accountNumber}
                    </span>
                  </div>
                ))
              )}
            </div>
            <div>
              <p className="font-semibold mb-2">Mobile Money</p>
              <p>
                Airtel: {mobileMoney.airtelMoneyName || "—"} (
                {mobileMoney.airtelMoneyNumber || "—"})
              </p>
              <p>
                TNM: {mobileMoney.mpambaName || "—"} (
                {mobileMoney.mpambaNumber || "—"})
              </p>
            </div>
            <div>
              <p className="font-semibold mb-1">Instructions</p>
              <p className="whitespace-pre-wrap">
                {mobileMoney.paymentInstructions || "—"}
              </p>
            </div>
          </div>
        )}
      </div>

      {deleteModal.open && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 text-center shadow-xl">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={24} className="text-red-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              Remove {deleteModal.bankName}?
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              Are you sure you want to remove this bank account? You must click{" "}
              <strong>Save Payment Details</strong> to apply the change
              permanently.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() =>
                  setDeleteModal({ open: false, index: -1, bankName: "" })
                }
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
