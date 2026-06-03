import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Plus, Eye, User, AlertCircle } from "lucide-react";
import api from "../../lib/axios";
import type { Student, Class, Pagination } from "../../types";

const StudentsPage = () => {
  const navigate = useNavigate();
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [search, setSearch] = useState("");
  const [selectedClassId, setSelectedClassId] = useState("");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    api
      .get("/schools/classes")
      .then((res) => setClasses(res.data.data))
      .catch(() => {});
  }, []);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "15",
        ...(search && { search }),
        ...(selectedClassId && { classId: selectedClassId }),
        ...(statusFilter === "debtor" && { isDebtor: "true" }),
        ...(statusFilter === "paid" && { isPaidFull: "true" }),
        ...(statusFilter === "no-payment" && { noPayment: "true" }),
        ...(statusFilter === "credit" && { hasCredit: "true" }),
      });
      const res = await api.get(`/students?${params}`);
      setStudents(res.data.data);
      setPagination(res.data.pagination);
    } catch (err) {
      console.error("Failed to load students");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeout = setTimeout(fetchStudents, 300);
    return () => clearTimeout(timeout);
  }, [search, page, selectedClassId, statusFilter]);

  const handleClassFilter = (classId: string) => {
    setSelectedClassId(classId);
    setPage(1);
    setSearch("");
  };

  return (
    <div className="space-y-4 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">Students</h2>
          <p className="text-sm text-gray-500">
            {pagination?.total || 0} students
            {selectedClassId && classes.find((c) => c.id === selectedClassId)
              ? ` in ${classes.find((c) => c.id === selectedClassId)?.name}`
              : " total"}
          </p>
        </div>
        <button
          onClick={() => navigate("/students/add")}
          className="flex items-center gap-2 bg-blue-900 text-white px-3 py-2 md:px-4 rounded-lg text-sm hover:bg-blue-800 transition-colors shrink-0"
        >
          <Plus size={16} />
          <span className="hidden sm:inline">Add Student</span>
          <span className="sm:hidden">Add</span>
        </button>
      </div>

      {/* Class Filter — horizontally scrollable on mobile */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <p className="text-xs font-medium text-gray-500 mb-3 uppercase tracking-wide">
          Filter by Class
        </p>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => handleClassFilter("")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors shrink-0 ${
              selectedClassId === ""
                ? "bg-blue-900 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            All Classes
          </button>
          {classes.map((cls: any) => (
            <button
              key={cls.id}
              onClick={() => handleClassFilter(cls.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors shrink-0 ${
                selectedClassId === cls.id
                  ? "bg-blue-900 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {cls.name}
              <span
                className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${
                  selectedClassId === cls.id
                    ? "bg-blue-700 text-blue-100"
                    : "bg-gray-200 text-gray-500"
                }`}
              >
                {cls._count?.students || 0}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Status Filter — horizontally scrollable on mobile */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <p className="text-xs font-medium text-gray-500 mb-3 uppercase tracking-wide">
          Filter by Payment Status
        </p>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {[
            { value: "", label: "All Students", color: "bg-gray-800" },
            { value: "paid", label: "✓ Paid in Full", color: "bg-green-600" },
            { value: "debtor", label: "⚠ Debtors", color: "bg-red-600" },
            {
              value: "no-payment",
              label: "○ No Payment",
              color: "bg-gray-500",
            },
            { value: "credit", label: "★ Has Credit", color: "bg-purple-600" },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => {
                setStatusFilter(tab.value);
                setPage(1);
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors shrink-0 ${
                statusFilter === tab.value
                  ? `${tab.color} text-white`
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Search by name, student ID, or parent phone..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Table — wrapped for horizontal scroll */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-900" />
          </div>
        ) : students.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400">
            <User size={40} className="mb-2 opacity-30" />
            <p className="text-sm">No students found</p>
          </div>
        ) : (
          // ↓ This div is the only structural addition — enables right-scroll on mobile
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase whitespace-nowrap">
                    Student
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase whitespace-nowrap">
                    ID
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase whitespace-nowrap">
                    Class
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase whitespace-nowrap">
                    Parent
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase whitespace-nowrap">
                    Total Paid
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase whitespace-nowrap">
                    Status
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase whitespace-nowrap">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {students.map((student: any) => (
                  <tr
                    key={student.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                            (student as any).creditBalance > 0
                              ? "bg-purple-100 text-purple-700"
                              : student.isDebtor
                                ? "bg-red-100 text-red-700"
                                : "bg-blue-100 text-blue-900"
                          }`}
                        >
                          {student.fullName.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-800">
                            {student.fullName}
                          </p>
                          <p className="text-xs text-gray-400">
                            {student.gender}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">
                        {student.studentCode}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                      {student.class.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="text-sm text-gray-600">
                        {student.parentName}
                      </p>
                      <p className="text-xs text-gray-400">
                        {student.parentPhone}
                      </p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-green-600">
                        MWK {(student.totalPaid || 0).toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {(student as any).creditBalance > 0 ? (
                        <div>
                          <span className="flex items-center gap-1 w-fit text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-700">
                            ★ Has Credit
                          </span>
                          <p className="text-xs text-purple-600 mt-1">
                            MWK{" "}
                            {(student as any).creditBalance.toLocaleString()}{" "}
                            saved
                          </p>
                        </div>
                      ) : student.isDebtor ? (
                        <div>
                          <span className="flex items-center gap-1 w-fit text-xs px-2 py-1 rounded-full bg-red-100 text-red-700">
                            <AlertCircle size={10} />
                            Debtor
                          </span>
                          <p className="text-xs text-red-500 mt-1">
                            Owes MWK{" "}
                            {(student.outstandingBalance || 0).toLocaleString()}
                          </p>
                        </div>
                      ) : student.totalPaid > 0 ? (
                        <span className="flex items-center gap-1 w-fit text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">
                          ✓ Paid in Full
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 w-fit text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-500">
                          ○ No Payment
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => navigate(`/students/${student.id}`)}
                        className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm"
                      >
                        <Eye size={14} />
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 md:px-6 py-4 border-t border-gray-100 gap-3">
            <p className="text-sm text-gray-500 shrink-0">
              Page {pagination.page} of {pagination.totalPages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 border border-gray-200 rounded text-sm disabled:opacity-40 hover:bg-gray-50"
              >
                Previous
              </button>
              <button
                onClick={() =>
                  setPage((p) => Math.min(pagination.totalPages, p + 1))
                }
                disabled={page === pagination.totalPages}
                className="px-3 py-1 border border-gray-200 rounded text-sm disabled:opacity-40 hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentsPage;
