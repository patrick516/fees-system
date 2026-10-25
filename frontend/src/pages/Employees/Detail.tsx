import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Loader2,
  Briefcase,
  Phone,
  Mail,
  MapPin,
  IdCard,
  Calendar,
  Wallet,
  //   Pencil,
} from "lucide-react";
import api from "../../lib/axios";
import type { Employee } from "../../types";

const formatMWK = (n: number) => `MWK ${Number(n || 0).toLocaleString()}`;
const date = (d?: string | null) =>
  d
    ? new Date(d).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-700",
  ON_LEAVE: "bg-amber-100 text-amber-700",
  TERMINATED: "bg-gray-100 text-gray-600",
};

export default function EmployeeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get(`/employees/${id}`)
      .then((res) => setEmployee(res.data.data))
      .catch(() => navigate("/employees"))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={24} className="animate-spin text-gray-300" />
      </div>
    );
  }
  if (!employee) return null;

  const gross =
    Number(employee.basicSalary) +
    Number(employee.housingAllowance) +
    Number(employee.transportAllowance) +
    Number(employee.otherAllowances);
  const deductions =
    Number(employee.payeTax) +
    Number(employee.pensionDeduction) +
    Number(employee.otherDeductions);
  const net = gross - deductions;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate("/employees")}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <ArrowLeft size={20} className="text-gray-600" />
        </button>
        <div>
          <h2 className="text-lg font-semibold text-gray-800">
            Employee Profile
          </h2>
          <p className="text-sm text-gray-400">
            Full details and payroll history
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Identity card */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="text-center mb-5">
            <div className="w-20 h-20 rounded-2xl bg-[var(--color-primary-light)] text-[var(--color-primary)] flex items-center justify-center text-3xl font-bold mx-auto mb-3">
              {employee.fullName.charAt(0)}
            </div>
            <h3 className="text-lg font-bold text-gray-800">
              {employee.fullName}
            </h3>
            <p className="text-sm text-gray-500 mt-0.5">
              {employee.title || "No title"}
            </p>
            <div className="mt-3 flex justify-center">
              <span
                className={`inline-block text-[11px] font-semibold px-2.5 py-1 rounded-full ${STATUS_COLORS[employee.status] || "bg-gray-100 text-gray-600"}`}
              >
                {employee.status.replace("_", " ")}
              </span>
            </div>
          </div>

          <div className="space-y-2.5 text-sm border-t border-gray-100 pt-4">
            {employee.department && (
              <div className="flex items-center gap-3 text-gray-600">
                <Briefcase size={14} className="text-gray-400 shrink-0" />
                <span>{employee.department.name}</span>
              </div>
            )}
            {employee.phone && (
              <div className="flex items-center gap-3 text-gray-600">
                <Phone size={14} className="text-gray-400 shrink-0" />
                <span>{employee.phone}</span>
              </div>
            )}
            {employee.email && (
              <div className="flex items-center gap-3 text-gray-600">
                <Mail size={14} className="text-gray-400 shrink-0" />
                <span className="truncate">{employee.email}</span>
              </div>
            )}
            {employee.nationalId && (
              <div className="flex items-center gap-3 text-gray-600">
                <IdCard size={14} className="text-gray-400 shrink-0" />
                <span className="font-mono text-xs">{employee.nationalId}</span>
              </div>
            )}
            {employee.dateOfBirth && (
              <div className="flex items-center gap-3 text-gray-600">
                <Calendar size={14} className="text-gray-400 shrink-0" />
                <span>Born {date(employee.dateOfBirth)}</span>
              </div>
            )}
            {employee.hireDate && (
              <div className="flex items-center gap-3 text-gray-600">
                <MapPin size={14} className="text-gray-400 shrink-0" />
                <span>Hired {date(employee.hireDate)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Salary breakdown */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
              <Wallet size={16} className="text-[var(--color-primary)]" />
              <h3 className="font-medium text-gray-800">Salary Breakdown</h3>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Additions
                </p>
                <Row label="Basic Salary" value={employee.basicSalary} />
                <Row
                  label="Housing Allowance"
                  value={employee.housingAllowance}
                />
                <Row
                  label="Transport Allowance"
                  value={employee.transportAllowance}
                />
                <Row
                  label="Other Allowances"
                  value={employee.otherAllowances}
                />
                <div className="border-t border-gray-100 mt-2 pt-2 flex justify-between text-sm font-semibold text-gray-800">
                  <span>Gross Salary</span>
                  <span className="font-mono">{formatMWK(gross)}</span>
                </div>
              </div>

              <div className="pt-2">
                <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Deductions
                </p>
                <Row label="PAYE Tax" value={employee.payeTax} negative />
                <Row
                  label="Pension"
                  value={employee.pensionDeduction}
                  negative
                />
                <Row
                  label="Other Deductions"
                  value={employee.otherDeductions}
                  negative
                />
                <div className="border-t border-gray-100 mt-2 pt-2 flex justify-between text-sm font-semibold text-red-600">
                  <span>Total Deductions</span>
                  <span className="font-mono">- {formatMWK(deductions)}</span>
                </div>
              </div>

              <div className="bg-purple-50 border border-purple-100 rounded-lg p-3 flex justify-between text-base font-bold">
                <span className="text-purple-800">Net Monthly Salary</span>
                <span className="font-mono text-purple-700">
                  {formatMWK(net)}
                </span>
              </div>
            </div>
          </div>

          {/* Payroll history */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="font-medium text-gray-800">Recent Payroll</h3>
            </div>
            {!employee.payrollRecords ||
            employee.payrollRecords.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-400">
                No payroll records yet
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {employee.payrollRecords.map((r) => (
                  <div
                    key={r.id}
                    className="px-5 py-3 flex items-center justify-between"
                  >
                    <div>
                      <p className="text-sm font-semibold text-gray-800">
                        {r.month}
                      </p>
                      <p className="text-xs text-gray-400">
                        {r.status === "PAID"
                          ? `Paid ${date(r.paidAt)}`
                          : "Pending"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-mono font-semibold text-gray-800">
                        {formatMWK(r.netSalary)}
                      </p>
                      <p className="text-[10px] text-gray-400">Net</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  negative,
}: {
  label: string;
  value: number;
  negative?: boolean;
}) {
  return (
    <div className="flex justify-between py-1 text-sm text-gray-600">
      <span>{label}</span>
      <span
        className={`font-mono ${negative ? "text-red-600" : "text-gray-700"}`}
      >
        {negative ? "- " : ""}
        {formatMWK(value)}
      </span>
    </div>
  );
}
