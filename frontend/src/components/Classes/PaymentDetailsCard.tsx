import { useState, useEffect } from "react";
import { Edit2, Plus, Trash2, Loader2 } from "lucide-react";
import api from "../../lib/axios";

export default function PaymentDetailsCard() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [hasSaved, setHasSaved] = useState(false);

  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [mobileMoney, setMobileMoney] = useState({
    airtelMoneyNumber: "",
    airtelMoneyName: "",
    mpambaNumber: "",
    mpambaName: "",
    paymentInstructions: "",
  });
  const [showAddBank, setShowAddBank] = useState(false);
  const [newBank, setNewBank] = useState({
    bankName: "",
    accountName: "",
    accountNumber: "",
    branch: "",
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
        setIsEditing(
          banks.length === 0 && !mm.airtelMoneyNumber && !mm.mpambaNumber,
        );
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put("/schools/payment-details", {
        bankAccounts,
        ...mobileMoney,
      });
      setHasSaved(true);
      setIsEditing(false);
      setShowAddBank(false);
    } catch (err) {
      alert("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <div className="p-6 text-center text-gray-400">
        Loading payment details...
      </div>
    );

  return (
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
          {hasSaved && !isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-1.5 text-sm font-medium text-[var(--color-primary)] hover:text-[var(--color-primary-dark)]"
            >
              <Edit2 size={14} /> Edit Details
            </button>
          )}
          {hasSaved && isEditing && (
            <button
              onClick={() => setIsEditing(false)}
              className="text-sm font-medium text-gray-500 hover:text-gray-700"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {isEditing ? (
        <form onSubmit={handleSave} className="p-6 space-y-6">
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
                <Plus size={14} /> Add Bank Account
              </button>
            </div>

            {showAddBank && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <input
                    value={newBank.bankName}
                    onChange={(e) =>
                      setNewBank({ ...newBank, bankName: e.target.value })
                    }
                    placeholder="Bank Name *"
                    className="px-3 py-2 border rounded-lg text-sm"
                  />
                  <input
                    value={newBank.accountName}
                    onChange={(e) =>
                      setNewBank({ ...newBank, accountName: e.target.value })
                    }
                    placeholder="Account Name *"
                    className="px-3 py-2 border rounded-lg text-sm"
                  />
                  <input
                    value={newBank.accountNumber}
                    onChange={(e) =>
                      setNewBank({ ...newBank, accountNumber: e.target.value })
                    }
                    placeholder="Account Number *"
                    className="px-3 py-2 border rounded-lg text-sm"
                  />
                  <input
                    value={newBank.branch}
                    onChange={(e) =>
                      setNewBank({ ...newBank, branch: e.target.value })
                    }
                    placeholder="Branch (optional)"
                    className="px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (newBank.bankName && newBank.accountNumber) {
                        setBankAccounts([...bankAccounts, newBank]);
                        setNewBank({
                          bankName: "",
                          accountName: "",
                          accountNumber: "",
                          branch: "",
                        });
                        setShowAddBank(false);
                      }
                    }}
                    className="bg-[var(--color-primary)] text-white px-4 py-2 rounded-lg text-sm"
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddBank(false)}
                    className="px-4 py-2 border rounded-lg text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {bankAccounts.map((b, i) => (
              <div
                key={i}
                className="flex items-center justify-between border border-gray-200 p-3 rounded-lg mb-2"
              >
                <div className="text-sm">
                  <span className="font-medium text-gray-800">
                    {b.bankName}
                  </span>{" "}
                  - {b.accountNumber}
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setBankAccounts(bankAccounts.filter((_, idx) => idx !== i))
                  }
                  className="text-red-400 hover:text-red-600"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4">
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
            {saving && <Loader2 size={14} className="animate-spin" />}{" "}
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
                <div key={i}>
                  {b.bankName} - {b.accountNumber}
                </div>
              ))
            )}
          </div>
          <div>
            <p className="font-semibold mb-2">Mobile Money</p>
            <p>Airtel: {mobileMoney.airtelMoneyNumber || "—"}</p>
            <p>TNM: {mobileMoney.mpambaNumber || "—"}</p>
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
  );
}
