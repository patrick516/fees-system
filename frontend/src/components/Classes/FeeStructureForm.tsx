import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

const terms = [
  { value: "TERM_1", label: "Term 1" },
  { value: "TERM_2", label: "Term 2" },
  { value: "TERM_3", label: "Term 3" },
];

const ITEM_CLASS =
  "cursor-pointer mx-1 my-0.5 rounded-md pl-3 pr-7 focus:bg-gray-100 focus:text-gray-900 data-[highlighted]:bg-gray-100 data-[highlighted]:text-gray-900";

const formatCurrency = (val: string | number) => {
  if (val === undefined || val === null || val === "") return "";
  const str = String(val).replace(/,/g, "");
  if (str.endsWith(".")) return str;
  const parts = str.split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return parts.join(".");
};

interface Props {
  className: string;
  classId: string;
  existingFee: any | null;
  onCancel: () => void;
  onSuccess: () => void;
  defaultAcademicYear: string;
  defaultTerm: string;
}

export default function FeeStructureForm({
  className,
  classId,
  existingFee,
  onCancel,
  onSuccess,
  defaultAcademicYear,
  defaultTerm,
}: Props) {
  const [feeLoading, setFeeLoading] = useState(false);
  const [feeError, setFeeError] = useState("");
  const [feeSuccess, setFeeSuccess] = useState("");

  const [feeForm, setFeeForm] = useState({
    term: defaultTerm,
    academicYear: defaultAcademicYear,
    dayAmount: "",
    boardingAmount: "",
    tuitionFee: "",
    examFee: "",
    buildingLevy: "",
    uniformFee: "",
    bookFee: "",
  });

  useEffect(() => {
    if (existingFee) {
      setFeeForm({
        term: existingFee.term,
        academicYear: existingFee.academicYear,
        dayAmount: existingFee.dayAmount?.toString() || "",
        boardingAmount: existingFee.boardingAmount?.toString() || "",
        tuitionFee: existingFee.tuitionFee?.toString() || "",
        examFee: existingFee.examFee?.toString() || "",
        buildingLevy: existingFee.buildingLevy?.toString() || "",
        uniformFee: existingFee.uniformFee?.toString() || "",
        bookFee: existingFee.bookFee?.toString() || "",
      });
    }
  }, [existingFee]);

  const handleFeeChange = (field: string, value: string) => {
    setFeeForm({ ...feeForm, [field]: value });
  };

  const handleSaveFee = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeeError("");
    setFeeSuccess("");
    setFeeLoading(true);

    try {
      const payload = {
        classId,
        term: feeForm.term,
        academicYear: feeForm.academicYear,
        dayAmount: feeForm.dayAmount,
        boardingAmount: feeForm.boardingAmount,
        tuitionFee: feeForm.tuitionFee || undefined,
        examFee: feeForm.examFee || undefined,
        buildingLevy: feeForm.buildingLevy || undefined,
        uniformFee: feeForm.uniformFee || undefined,
        bookFee: feeForm.bookFee || undefined,
      };

      const { default: api } = await import("../../lib/axios");

      if (existingFee) {
        await api.put(`/schools/fee-structures/${existingFee.id}`, payload);
        setFeeSuccess("Fee structure updated successfully");
      } else {
        await api.post("/schools/fee-structures", payload);
        setFeeSuccess("Fee structure saved successfully");
      }

      setTimeout(() => {
        onSuccess();
      }, 1500);
    } catch (err: any) {
      setFeeError(
        err.response?.data?.message || "Failed to save fee structure",
      );
    } finally {
      setFeeLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSaveFee}
      className="bg-gray-50 rounded-xl p-5 border border-gray-200 space-y-4"
    >
      <div className="flex items-center justify-between">
        <p className="font-medium text-gray-800">
          {existingFee ? "Edit Fee Structure" : "New Fee Structure"} —{" "}
          {className}
        </p>
        <button
          type="button"
          onClick={onCancel}
          className="text-gray-400 hover:text-gray-600 text-sm"
        >
          Cancel
        </button>
      </div>

      {!existingFee && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Term *
            </label>
            <Select
              value={feeForm.term}
              onValueChange={(v) => setFeeForm({ ...feeForm, term: v })}
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
                setFeeForm({ ...feeForm, academicYear: e.target.value })
              }
              placeholder="eg. 2025-2026"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            />
          </div>
        </div>
      )}

      <div>
        <p className="text-xs font-medium text-gray-600 mb-2">
          Fee Breakdown <span className="text-gray-400">(optional)</span>
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
                type="text"
                value={formatCurrency((feeForm as any)[field])}
                onChange={(e) =>
                  handleFeeChange(field, e.target.value.replace(/,/g, ""))
                }
                placeholder="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border-2 border-blue-200 rounded-lg p-4">
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Day Scholar Fee (MWK) *
          </label>
          <input
            type="text"
            value={formatCurrency(feeForm.dayAmount)}
            onChange={(e) =>
              setFeeForm({
                ...feeForm,
                dayAmount: e.target.value.replace(/,/g, ""),
              })
            }
            required
            placeholder="eg. 150000"
            className="w-full px-3 py-3 border border-gray-300 rounded-lg text-lg font-bold focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          />
        </div>

        <div className="bg-white border-2 border-indigo-200 rounded-lg p-4">
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Boarding Fee (MWK) *
          </label>
          <input
            type="text"
            value={formatCurrency(feeForm.boardingAmount)}
            onChange={(e) =>
              setFeeForm({
                ...feeForm,
                boardingAmount: e.target.value.replace(/,/g, ""),
              })
            }
            required
            placeholder="eg. 300000"
            className="w-full px-3 py-3 border border-gray-300 rounded-lg text-lg font-bold focus:outline-none focus:ring-2 focus:ring-indigo-600"
          />
        </div>
      </div>

      {feeError && <p className="text-red-600 text-sm">{feeError}</p>}
      {feeSuccess && <p className="text-green-600 text-sm">{feeSuccess}</p>}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={feeLoading}
          className="flex-1 flex items-center justify-center gap-2 bg-[var(--color-primary)] text-white py-2 rounded-lg text-sm disabled:opacity-40 hover:bg-[var(--color-primary-dark)]"
        >
          {feeLoading && <Loader2 size={14} className="animate-spin" />}
          {feeLoading
            ? "Saving..."
            : existingFee
              ? "Update Fee"
              : "Save Fee Structure"}
        </button>
      </div>
    </form>
  );
}
