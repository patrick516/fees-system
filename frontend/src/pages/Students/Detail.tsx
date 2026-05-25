import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CreditCard,
  CheckCircle,
  Clock,
  XCircle,
} from "lucide-react";
import api from "../../lib/axios";
import type { Student, Payment } from "../../types";

const statusConfig = {
  VERIFIED: {
    label: "Verified",
    color: "bg-green-100 text-green-700",
    icon: CheckCircle,
  },
  PENDING: {
    label: "Pending",
    color: "bg-yellow-100 text-yellow-700",
    icon: Clock,
  },
  REJECTED: {
    label: "Rejected",
    color: "bg-red-100 text-red-700",
    icon: XCircle,
  },
};

const StudentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState<
    (Student & { payments: Payment[]; summary: any }) | null
  >(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get(`/students/${id}`)
      .then((res) => setStudent(res.data.data))
      .catch(() => navigate("/students"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-900" />
      </div>
    );

  if (!student) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate("/students")}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <ArrowLeft size={20} className="text-gray-600" />
        </button>
        <h2 className="text-lg font-semibold text-gray-800">Student Profile</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Student Card */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-900 text-2xl font-bold mx-auto mb-3">
              {student.fullName.charAt(0)}
            </div>
            <h3 className="font-semibold text-gray-800">{student.fullName}</h3>
            <p className="text-sm text-gray-500">{student.class.name}</p>
            <span className="inline-block mt-2 text-xs font-mono bg-gray-100 px-3 py-1 rounded-full">
              {student.studentCode}
            </span>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Gender</span>
              <span className="font-medium">{student.gender}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Academic Year</span>
              <span className="font-medium">{student.academicYear}</span>
            </div>
            <div className="border-t pt-3">
              <p className="text-gray-500 mb-1">Parent / Guardian</p>
              <p className="font-medium">{student.parentName}</p>
              <p className="text-gray-500">{student.parentPhone}</p>
            </div>
          </div>

          <button
            onClick={() =>
              navigate("/payments/record", {
                state: { studentId: student.id, studentName: student.fullName },
              })
            }
            className="mt-6 w-full flex items-center justify-center gap-2 bg-blue-900 text-white py-2 rounded-lg text-sm hover:bg-blue-800 transition-colors"
          >
            <CreditCard size={16} />
            Record Payment
          </button>
        </div>

        {/* Payments */}
        <div className="lg:col-span-2 space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-green-50 rounded-xl p-4 text-center">
              <p className="text-xl font-bold text-green-600">
                MWK {(student.summary?.totalPaid || 0).toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 mt-1">Total Paid</p>
            </div>
            <div className="bg-yellow-50 rounded-xl p-4 text-center">
              <p className="text-xl font-bold text-yellow-600">
                {student.summary?.pendingCount || 0}
              </p>
              <p className="text-xs text-gray-500 mt-1">Pending</p>
            </div>
            <div className="bg-blue-50 rounded-xl p-4 text-center">
              <p className="text-xl font-bold text-blue-600">
                {student.summary?.verifiedCount || 0}
              </p>
              <p className="text-xs text-gray-500 mt-1">Verified</p>
            </div>
          </div>

          {/* Payment History */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="font-medium text-gray-800">Payment History</h3>
            </div>
            {student.payments.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-gray-400">
                <CreditCard size={32} className="mb-2 opacity-30" />
                <p className="text-sm">No payments yet</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {student.payments.map((payment) => {
                  const config = statusConfig[payment.status];
                  const Icon = config.icon;
                  return (
                    <div
                      key={payment.id}
                      className="px-6 py-4 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                          <CreditCard size={14} className="text-gray-500" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-800">
                            MWK {payment.amount.toLocaleString()}
                          </p>
                          <p className="text-xs text-gray-400">
                            {payment.term.replace("_", " ")} •{" "}
                            {payment.paymentMethod.replace(/_/g, " ")} •{" "}
                            {payment.receiptNumber}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${config.color}`}
                        >
                          <Icon size={12} />
                          {config.label}
                        </span>
                        <span className="text-xs text-gray-400">
                          {new Date(payment.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDetail;
