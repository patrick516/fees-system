import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Briefcase,
  UserPlus,
  Search,
  Loader2,
  Users,
  Wallet,
  X,
  Eye,
  Pencil,
} from "lucide-react";
import api from "../../lib/axios";
import type { Employee, Department } from "../../types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { DatePicker } from "../../components/ui/date-picker";

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-700",
  ON_LEAVE: "bg-amber-100 text-amber-700",
  TERMINATED: "bg-gray-100 text-gray-600",
};

const HONORIFICS = ["Mr", "Mrs", "Ms", "Dr", "Rev", "Prof", "Chief"];
const formatMWK = (n: number) => `MWK ${Number(n || 0).toLocaleString()}`;

const computeGross = (e: Employee) =>
  Number(e.basicSalary) +
  Number(e.housingAllowance) +
  Number(e.transportAllowance) +
  Number(e.otherAllowances);

const computeNet = (e: Employee) => {
  const deductions =
    Number(e.payeTax) + Number(e.pensionDeduction) + Number(e.otherDeductions);
  return computeGross(e) - deductions;
};

const displayName = (e: Employee) =>
  [(e as any).honorific, e.firstName, e.lastName].filter(Boolean).join(" ");

export default function EmployeesPage() {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);

  // 🎯 We will calculate this directly from the employees array
  const [summary, setSummary] = useState({
    totalEmployees: 0,
    activeCount: 0,
    grossPayroll: 0,
    totalDeductions: 0,
    monthlyNetPayroll: 0,
  });

  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);
      if (departmentFilter) params.set("departmentId", departmentFilter);

      const [empRes, deptRes] = await Promise.all([
        api.get(`/employees?${params}`),
        api.get("/departments"),
      ]);

      const fetchedEmployees: Employee[] = empRes.data.data || [];
      setEmployees(fetchedEmployees);
      setDepartments(deptRes.data.data || []);

      // 🎯 CALCULATE SUMMARY DIRECTLY FROM THE ARRAY (Guaranteed to match table)
      const activeEmployees = fetchedEmployees.filter(
        (e) => e.status === "ACTIVE",
      );
      let gross = 0;
      let deductions = 0;
      let net = 0;

      activeEmployees.forEach((e) => {
        const g = computeGross(e);
        const d =
          Number(e.payeTax) +
          Number(e.pensionDeduction) +
          Number(e.otherDeductions);
        gross += g;
        deductions += d;
        net += g - d;
      });

      setSummary({
        totalEmployees: fetchedEmployees.length,
        activeCount: activeEmployees.length,
        grossPayroll: gross,
        totalDeductions: deductions,
        monthlyNetPayroll: net,
      });
    } catch (err) {
      console.error("Load employees error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [search, statusFilter, departmentFilter]);

  const openCreate = () => {
    setEditing(null);
    setShowModal(true);
  };
  const openEdit = (e: Employee, ev: React.MouseEvent) => {
    ev.stopPropagation();
    setEditing(e);
    setShowModal(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <Briefcase size={18} className="text-[var(--color-primary)]" />{" "}
            Employees
          </h2>
          <p className="text-sm text-gray-500">
            Manage all staff — teaching and non-teaching
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-[var(--color-primary)] text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-[var(--color-primary-dark)] transition-colors"
        >
          <UserPlus size={16} /> Add Employee
        </button>
      </div>

      {/* 🎯 New 4-Card Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Employees */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Total Employees
            </p>
            <Users size={16} className="text-[var(--color-primary)]" />
          </div>
          <p className="text-2xl font-bold text-gray-800">
            {summary.totalEmployees}
          </p>
          <p className="text-xs text-green-600 mt-1">
            {summary.activeCount} active
          </p>
        </div>

        {/* Gross Payroll */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Gross Payroll
            </p>
            <Wallet size={16} className="text-blue-600" />
          </div>
          <p className="text-xl font-bold text-gray-800">
            {formatMWK(summary.grossPayroll)}
          </p>
          <p className="text-xs text-gray-400 mt-1">Before deductions</p>
        </div>

        {/* Total Deductions */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Total Deductions
            </p>
            <Wallet size={16} className="text-red-500" />
          </div>
          <p className="text-xl font-bold text-red-600">
            {formatMWK(summary.totalDeductions)}
          </p>
          <p className="text-xs text-gray-400 mt-1">PAYE, Pension, etc.</p>
        </div>

        {/* Monthly Net Payroll */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Net Payroll
            </p>
            <Wallet size={16} className="text-purple-600" />
          </div>
          <p className="text-xl font-bold text-purple-700">
            {formatMWK(summary.monthlyNetPayroll)}
          </p>
          <p className="text-xs text-gray-400 mt-1">Take-home pay</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, phone, ID, or job title..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          />
        </div>
        <Select
          value={statusFilter || "ALL"}
          onValueChange={(v) => setStatusFilter(v === "ALL" ? "" : v)}
        >
          <SelectTrigger className="w-[180px] bg-white border-gray-300 rounded-lg text-sm h-[42px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent className="bg-white">
            <SelectItem value="ALL">All Statuses</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="ON_LEAVE">On Leave</SelectItem>
            <SelectItem value="TERMINATED">Terminated</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={departmentFilter || "ALL"}
          onValueChange={(v) => setDepartmentFilter(v === "ALL" ? "" : v)}
        >
          <SelectTrigger className="w-[200px] bg-white border-gray-300 rounded-lg text-sm h-[42px]">
            <SelectValue placeholder="All Departments" />
          </SelectTrigger>
          <SelectContent className="bg-white">
            <SelectItem value="ALL">All Departments</SelectItem>
            {departments.map((d) => (
              <SelectItem key={d.id} value={d.id}>
                {d.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 size={24} className="animate-spin text-gray-300" />
          </div>
        ) : employees.length === 0 ? (
          <div className="p-12 text-center">
            <Briefcase size={40} className="mx-auto mb-3 text-gray-300" />
            <p className="text-sm font-medium text-gray-500">
              No employees yet
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Click "Add Employee" to get started
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                    Name
                  </th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                    Job Title
                  </th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                    Department
                  </th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                    Phone
                  </th>
                  <th className="text-right px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                    Basic Salary
                  </th>
                  <th className="text-right px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                    Net Salary
                  </th>
                  <th className="text-center px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                    Status
                  </th>
                  <th className="text-right px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {employees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[var(--color-primary-light)] text-[var(--color-primary)] flex items-center justify-center text-sm font-bold shrink-0">
                          {emp.firstName.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">
                            {displayName(emp)}
                          </p>
                          <p className="text-xs text-gray-400 truncate">
                            {emp.email || "—"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-600">
                      {(emp as any).jobTitle || "—"}
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-600">
                      {emp.department?.name || "—"}
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-600">
                      {emp.phone || "—"}
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-sm text-gray-700">
                      {formatMWK(emp.basicSalary)}
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-sm font-semibold text-purple-700">
                      {formatMWK(computeNet(emp))}
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span
                        className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[emp.status] || "bg-gray-100 text-gray-600"}`}
                      >
                        {emp.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          onClick={(ev) => {
                            ev.stopPropagation();
                            navigate(`/employees/${emp.id}`);
                          }}
                          className="text-gray-600 hover:text-[var(--color-primary)] hover:scale-110 transition-all"
                          title="View Details"
                        >
                          <Eye size={18} />
                        </button>
                        <button
                          onClick={(ev) => openEdit(emp, ev)}
                          className="text-gray-600 hover:text-blue-600 hover:scale-110 transition-all"
                          title="Edit"
                        >
                          <Pencil size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <EmployeeModal
          employee={editing}
          departments={departments}
          onClose={() => setShowModal(false)}
          onSaved={() => {
            setShowModal(false);
            load();
          }}
        />
      )}
    </div>
  );
}

// ==================== MODAL ====================
// (Keep the EmployeeModal exactly as it is in your file, it is correct)
function EmployeeModal({
  employee,
  departments,
  onClose,
  onSaved,
}: {
  employee: Employee | null;
  departments: Department[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!employee;

  const initialPaye = (() => {
    if (!employee) return { val: "16.5", type: "PERCENT" };
    const g =
      Number(employee.basicSalary) +
      Number(employee.housingAllowance) +
      Number(employee.transportAllowance) +
      Number(employee.otherAllowances);
    const p = Number(employee.payeTax);
    if (g > 0 && p > 0) {
      const pct = (p / g) * 100;
      if (pct < 100 && Number.isFinite(pct)) {
        return { val: pct.toFixed(1), type: "PERCENT" };
      }
    }
    return { val: String(p), type: "FIXED" };
  })();

  const [form, setForm] = useState({
    honorific: (employee as any)?.honorific || "",
    firstName: employee?.firstName || "",
    lastName: employee?.lastName || "",
    gender: (employee as any)?.gender || "",
    title: (employee as any)?.jobTitle || "",
    departmentId: employee?.departmentId || "",
    phone: employee?.phone || "",
    email: employee?.email || "",
    nationalId: employee?.nationalId || "",
    dateOfBirth: employee?.dateOfBirth
      ? employee.dateOfBirth.split("T")[0]
      : "",
    hireDate: employee?.hireDate ? employee.hireDate.split("T")[0] : "",
    basicSalary: String(employee?.basicSalary ?? 0),
    housingAllowance: String(employee?.housingAllowance ?? 0),
    transportAllowance: String(employee?.transportAllowance ?? 0),
    otherAllowances: String(employee?.otherAllowances ?? 0),
    payeInput: initialPaye.val,
    payeType: initialPaye.type as "PERCENT" | "FIXED",
    pensionDeduction: String(employee?.pensionDeduction ?? 0),
    otherDeductions: String(employee?.otherDeductions ?? 0),
    status: employee?.status || "ACTIVE",
    notes: employee?.notes || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (k: keyof typeof form, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const gross =
    Number(form.basicSalary) +
    Number(form.housingAllowance) +
    Number(form.transportAllowance) +
    Number(form.otherAllowances);

  const payeAmount =
    form.payeType === "PERCENT"
      ? (gross * (Number(form.payeInput) || 0)) / 100
      : Number(form.payeInput) || 0;

  const deductions =
    payeAmount + Number(form.pensionDeduction) + Number(form.otherDeductions);
  const net = gross - deductions;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const body: any = {
        honorific: form.honorific.trim() || null,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        gender: form.gender || null,
        title: form.title.trim() || null,
        departmentId: form.departmentId || null,
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        nationalId: form.nationalId.trim() || null,
        dateOfBirth: form.dateOfBirth || null,
        hireDate: form.hireDate || null,
        basicSalary: Number(form.basicSalary) || 0,
        housingAllowance: Number(form.housingAllowance) || 0,
        transportAllowance: Number(form.transportAllowance) || 0,
        otherAllowances: Number(form.otherAllowances) || 0,
        payePercent: Number(form.payeInput) || 0,
        payeType: form.payeType,
        pensionDeduction: Number(form.pensionDeduction) || 0,
        otherDeductions: Number(form.otherDeductions) || 0,
        status: form.status,
        notes: form.notes.trim() || null,
      };

      if (isEdit) {
        await api.put(`/employees/${employee!.id}`, body);
      } else {
        await api.post("/employees", body);
      }
      onSaved();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-2xl my-8 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-base font-semibold text-gray-800">
            {isEdit ? `Edit ${employee.fullName}` : "Add Employee"}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={18} />
          </button>
        </div>

        <form
          onSubmit={submit}
          className="p-6 space-y-5 max-h-[75vh] overflow-y-auto"
        >
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
              {error}
            </div>
          )}

          <section>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Personal Info
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Title
                </label>
                <Select
                  value={form.honorific || "NONE"}
                  onValueChange={(v) => set("honorific", v === "NONE" ? "" : v)}
                >
                  <SelectTrigger className="w-full bg-white border-gray-200 rounded-lg text-sm h-[38px]">
                    <SelectValue placeholder="Select title" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="NONE">None</SelectItem>
                    {HONORIFICS.map((h) => (
                      <SelectItem key={h} value={h}>
                        {h}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Gender
                </label>
                <Select
                  value={form.gender || "NONE"}
                  onValueChange={(v) => set("gender", v === "NONE" ? "" : v)}
                >
                  <SelectTrigger className="w-full bg-white border-gray-200 rounded-lg text-sm h-[38px]">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="NONE">Not specified</SelectItem>
                    <SelectItem value="MALE">Male</SelectItem>
                    <SelectItem value="FEMALE">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <input
                required
                value={form.firstName}
                onChange={(e) => set("firstName", e.target.value)}
                placeholder="First name *"
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
              <input
                required
                value={form.lastName}
                onChange={(e) => set("lastName", e.target.value)}
                placeholder="Last name *"
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
              <input
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                placeholder="Job title (e.g. Driver, Cook, Teacher)"
                className="col-span-2 px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />

              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Department
                </label>
                <Select
                  value={form.departmentId || "NONE"}
                  onValueChange={(v) =>
                    set("departmentId", v === "NONE" ? "" : v)
                  }
                >
                  <SelectTrigger className="w-full bg-white border-gray-200 rounded-lg text-sm h-[38px]">
                    <SelectValue placeholder="No department" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="NONE">No department</SelectItem>
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <input
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                placeholder="Phone"
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
              <input
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                placeholder="Email"
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
              <input
                value={form.nationalId}
                onChange={(e) => set("nationalId", e.target.value)}
                placeholder="National ID"
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />

              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Date of Birth
                </label>
                <DatePicker
                  value={form.dateOfBirth}
                  onChange={(v) => set("dateOfBirth", v)}
                  placeholder="Pick date of birth"
                  clearable
                  birthdateMode
                  className="w-full"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Hire Date
                </label>
                <DatePicker
                  value={form.hireDate}
                  onChange={(v) => set("hireDate", v)}
                  placeholder="Pick hire date"
                  clearable
                  className="w-full"
                />
              </div>
            </div>
          </section>

          <section>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Salary — Additions
            </p>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-xs text-gray-600">
                Basic Salary
                <input
                  type="number"
                  value={form.basicSalary}
                  onChange={(e) => set("basicSalary", e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono"
                />
              </label>
              <label className="text-xs text-gray-600">
                Housing Allowance
                <input
                  type="number"
                  value={form.housingAllowance}
                  onChange={(e) => set("housingAllowance", e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono"
                />
              </label>
              <label className="text-xs text-gray-600">
                Transport Allowance
                <input
                  type="number"
                  value={form.transportAllowance}
                  onChange={(e) => set("transportAllowance", e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono"
                />
              </label>
              <label className="text-xs text-gray-600">
                Other Allowances
                <input
                  type="number"
                  value={form.otherAllowances}
                  onChange={(e) => set("otherAllowances", e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono"
                />
              </label>
            </div>
          </section>

          <section>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Salary — Deductions
            </p>
            <div className="grid grid-cols-3 gap-3">
              <label className="text-xs text-gray-600">
                PAYE Tax
                <div className="mt-1 flex rounded-lg border border-gray-200 overflow-hidden focus-within:ring-2 focus-within:ring-[var(--color-primary)]">
                  <input
                    type="number"
                    step="0.1"
                    value={form.payeInput}
                    onChange={(e) => set("payeInput", e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono focus:outline-none"
                  />
                  <div className="border-l border-gray-200 bg-gray-50 w-[70px]">
                    <Select
                      value={form.payeType}
                      onValueChange={(v) => set("payeType", v)}
                    >
                      <SelectTrigger className="h-full border-0 bg-transparent text-xs rounded-none focus:ring-0 px-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        <SelectItem value="PERCENT">%</SelectItem>
                        <SelectItem value="FIXED">MWK</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  = {formatMWK(payeAmount)}
                </p>
              </label>
              <label className="text-xs text-gray-600">
                Pension
                <input
                  type="number"
                  value={form.pensionDeduction}
                  onChange={(e) => set("pensionDeduction", e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono"
                />
              </label>
              <label className="text-xs text-gray-600">
                Other
                <input
                  type="number"
                  value={form.otherDeductions}
                  onChange={(e) => set("otherDeductions", e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono"
                />
              </label>
            </div>
          </section>

          <section className="bg-slate-50 rounded-xl p-4 border border-slate-100">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Gross:</span>
              <span className="font-mono text-gray-700">
                {formatMWK(gross)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm mt-1">
              <span className="text-gray-500">Total Deductions:</span>
              <span className="font-mono text-red-600">
                - {formatMWK(deductions)}
              </span>
            </div>
            <div className="flex items-center justify-between text-base font-bold mt-2 pt-2 border-t border-slate-200">
              <span className="text-gray-800">Net Salary:</span>
              <span className="font-mono text-purple-700">
                {formatMWK(net)}
              </span>
            </div>
          </section>

          <section className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Status
              </label>
              <Select
                value={form.status}
                onValueChange={(v) => set("status", v)}
              >
                <SelectTrigger className="w-full bg-white border-gray-200 rounded-lg text-sm h-[38px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="ON_LEAVE">On Leave</SelectItem>
                  <SelectItem value="TERMINATED">Terminated</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <input
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="Notes (optional)"
              className="self-end px-3 py-2 border border-gray-200 rounded-lg text-sm"
            />
          </section>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 bg-[var(--color-primary)] text-white py-2.5 rounded-lg text-sm font-medium hover:bg-[var(--color-primary-dark)] disabled:opacity-40"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              {saving
                ? "Saving..."
                : isEdit
                  ? "Save Changes"
                  : "Create Employee"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
