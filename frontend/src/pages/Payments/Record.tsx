import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Search, Loader2, CheckCircle } from "lucide-react";
import api from "../../lib/axios";
import type { Student } from "../../types";

const paymentMethods = [
  { value: "CASH", label: "Cash" },
  { value: "AIRTEL_MONEY", label: "Airtel Money" },
  { value: "TNM_MPAMBA", label: "TNM Mpamba" },
  { value: "NATIONAL_BANK", label: "National Bank" },
  { value: "STANDARD_BANK", label: "Standard Bank" },
  { value: "FDH_BANK", label: "FDH Bank" },
  { value: "NBS_BANK", label: "NBS Bank" },
  { value: "OTHER_BANK", label: "Other Bank" },
];

const terms = [
  { value: "TERM_1", label: "Term 1" },
  { value: "TERM_2", label: "Term 2" },
  { value: "TERM_3", label: "Term 3" },
];

const RecordPayment = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<any>(null);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    amount: "",
    paymentMethod: "CASH",
    term: "TERM_1",
    academicYear: new Date().getFullYear().toString(),
    notes: "",
  });

  // If navigated from student detail
  useEffect(() => {
    if (location.state?.studentId) {
      setSelectedStudent({
        id: location.state.studentId,
        fullName: location.state.studentName,
      } as Student);
    }
  }, [location.state]);

  // Search students
  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }
    const timeout = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await api.get(`/students/search?q=${searchQuery}`);
        setSearchResults(res.data.data);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;
    setError("");
    setLoading(true);

    try {
      const res = await api.post("/payments/cash", {
        studentId: selectedStudent.id,
        amount: parseFloat(form.amount),
        term: form.term,
        academicYear: form.academicYear,
        notes: form.notes || undefined,
      });
      setSuccess(res.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to record payment");
    } finally {
      setLoading(false);
    }
  };

  // Success screen
  if (success) {
    return (
      <div className="max-w-md mx-auto text-center py-12">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle size={40} className="text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          Payment Recorded!
        </h2>
        <p className="text-gray-500 mb-6">
          MWK {parseFloat(form.amount).toLocaleString()} recorded for{" "}
          {selectedStudent?.fullName}
        </p>
        <div className="bg-gray-50 rounded-xl p-4 text-left mb-6 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Receipt No.</span>
            <span className="font-mono font-medium">
              {success.receiptNumber}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Student</span>
            <span className="font-medium">{success.student?.fullName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Amount</span>
            <span className="font-medium text-green-600">
              MWK {success.amount?.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Term</span>
            <span className="font-medium">
              {success.term?.replace("_", " ")}
            </span>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => {
              setSuccess(null);
              setSelectedStudent(null);
              setForm({ ...form, amount: "", notes: "" });
            }}
            className="flex-1 border border-gray-300 text-gray-700 py-3 rounded-lg text-sm hover:bg-gray-50"
          >
            Record Another
          </button>
          <button
            onClick={() => navigate("/payments")}
            className="flex-1 bg-blue-900 text-white py-3 rounded-lg text-sm hover:bg-blue-800"
          >
            View Payments
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate("/payments")}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <ArrowLeft size={20} className="text-gray-600" />
        </button>
        <div>
          <h2 className="text-lg font-semibold text-gray-800">
            Record Cash Payment
          </h2>
          <p className="text-sm text-gray-500">
            Search for student and record payment
          </p>
        </div>
      </div>

      {/* Student Search */}
      {!selectedStudent ? (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-medium text-gray-800 mb-4">Find Student</h3>
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="Search by name, student ID, or parent phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          </div>

          {searching && (
            <div className="flex items-center justify-center py-6">
              <Loader2 size={20} className="animate-spin text-gray-400" />
            </div>
          )}

          {searchResults.length > 0 && (
            <div className="mt-3 space-y-2">
              {searchResults.map((student: any) => (
                <button
                  key={student.id}
                  onClick={() => {
                    setSelectedStudent(student);
                    setSearchQuery("");
                    setSearchResults([]);
                  }}
                  className="w-full flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-900 text-sm font-bold">
                      {student.fullName.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">
                        {student.fullName}
                      </p>
                      <p className="text-xs text-gray-400">
                        {student.className} • {student.studentCode}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">
                      {student.parentName}
                    </p>
                    <p className="text-xs text-green-600 font-medium">
                      MWK {(student.totalPaid || 0).toLocaleString()} paid
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-900 rounded-full flex items-center justify-center text-white font-bold">
              {selectedStudent.fullName.charAt(0)}
            </div>
            <div>
              <p className="font-medium text-gray-800">
                {selectedStudent.fullName}
              </p>
              <p className="text-sm text-gray-500">
                {selectedStudent.studentCode || ""}
              </p>
            </div>
          </div>
          <button
            onClick={() => setSelectedStudent(null)}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Change
          </button>
        </div>
      )}

      {/* Payment Form */}
      {selectedStudent && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 space-y-4">
            <h3 className="font-medium text-gray-800">Payment Details</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount (MWK) *
                </label>
                <input
                  type="number"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  required
                  min="1"
                  placeholder="eg. 50000"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Term *
                </label>
                <select
                  value={form.term}
                  onChange={(e) => setForm({ ...form, term: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {terms.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Method *
                </label>
                <select
                  value={form.paymentMethod}
                  onChange={(e) =>
                    setForm({ ...form, paymentMethod: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {paymentMethods.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Academic Year *
                </label>
                <input
                  value={form.academicYear}
                  onChange={(e) =>
                    setForm({ ...form, academicYear: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes (optional)
              </label>
              <input
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="eg. Partial payment, balance by Friday"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-blue-900 text-white py-3 rounded-lg font-medium hover:bg-blue-800 disabled:bg-blue-300 transition-colors"
          >
            {loading && <Loader2 size={18} className="animate-spin" />}
            {loading
              ? "Recording..."
              : `Record MWK ${form.amount ? parseFloat(form.amount).toLocaleString() : "0"} Payment`}
          </button>
        </form>
      )}
    </div>
  );
};

export default RecordPayment;
