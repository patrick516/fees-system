import { useEffect, useState } from "react";
import { CheckCircle, XCircle, Eye, Clock } from "lucide-react";
import api from "../../lib/axios";
import type { Payment } from "../../types";

const PendingPayments = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [selectedReceipt, setSelectedReceipt] = useState<string | null>(null);

  const fetchPending = async () => {
    try {
      const res = await api.get("/payments/pending");
      setPayments(res.data.data);
    } catch (err) {
      console.error("Failed to load pending payments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPending();
  }, []);

  const handleVerify = async (id: string) => {
    setActionLoading(id);
    try {
      await api.patch(`/payments/${id}/verify`);
      setPayments((prev) => prev.filter((p) => p.id !== id));
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to verify");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!rejectId || !rejectReason.trim()) return;
    setActionLoading(rejectId);
    try {
      await api.patch(`/payments/${rejectId}/reject`, { reason: rejectReason });
      setPayments((prev) => prev.filter((p) => p.id !== rejectId));
      setRejectId(null);
      setRejectReason("");
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to reject");
    } finally {
      setActionLoading(null);
    }
  };

  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-900" />
      </div>
    );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-800">
          Pending Payments
        </h2>
        <p className="text-sm text-gray-500">
          {payments.length} payment{payments.length !== 1 ? "s" : ""} waiting
          for verification
        </p>
      </div>

      {payments.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center border border-gray-100 shadow-sm">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={32} className="text-green-600" />
          </div>
          <h3 className="font-medium text-gray-800 mb-1">All caught up!</h3>
          <p className="text-sm text-gray-500">No pending payments to review</p>
        </div>
      ) : (
        <div className="space-y-4">
          {payments.map((payment) => (
            <div
              key={payment.id}
              className="bg-white rounded-xl p-6 shadow-sm border border-gray-100"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                    <Clock size={20} className="text-yellow-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">
                      {payment.student?.fullName}
                    </p>
                    <p className="text-sm text-gray-500">
                      {payment.student?.class?.name} •{" "}
                      {payment.student?.studentCode}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Parent: {payment.student?.parentName} •{" "}
                      {payment.student?.parentPhone}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-gray-800">
                    MWK {payment.amount.toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-500">
                    {payment.term?.replace("_", " ")}
                  </p>
                  <p className="text-xs text-gray-400">
                    {payment.paymentMethod?.replace(/_/g, " ")}
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3 text-xs text-gray-400">
                  <span>Receipt: {payment.receiptNumber}</span>
                  {payment.bankReference && (
                    <span>Ref: {payment.bankReference}</span>
                  )}
                  <span>{new Date(payment.createdAt).toLocaleString()}</span>
                </div>

                <div className="flex items-center gap-2">
                  {payment.receiptImage && (
                    <button
                      onClick={() => setSelectedReceipt(payment.receiptImage!)}
                      className="flex items-center gap-1 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
                    >
                      <Eye size={14} />
                      View Receipt
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setRejectId(payment.id);
                      setRejectReason("");
                    }}
                    disabled={actionLoading === payment.id}
                    className="flex items-center gap-1 px-4 py-2 border border-red-200 text-red-600 rounded-lg text-sm hover:bg-red-50 disabled:opacity-40"
                  >
                    <XCircle size={14} />
                    Reject
                  </button>
                  <button
                    onClick={() => handleVerify(payment.id)}
                    disabled={actionLoading === payment.id}
                    className="flex items-center gap-1 px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-40"
                  >
                    <CheckCircle size={14} />
                    {actionLoading === payment.id ? "Processing..." : "Verify"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reject Modal */}
      {rejectId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="font-semibold text-gray-800 mb-4">Reject Payment</h3>
            <p className="text-sm text-gray-500 mb-4">
              Please provide a reason. This will be sent to the parent via SMS.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="eg. Receipt image is unclear, please resubmit with a clearer photo"
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setRejectId(null)}
                className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectReason.trim() || !!actionLoading}
                className="flex-1 bg-red-600 text-white py-2 rounded-lg text-sm disabled:opacity-40 hover:bg-red-700"
              >
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Image Modal */}
      {selectedReceipt && (
        <div
          className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedReceipt(null)}
        >
          <img
            src={selectedReceipt}
            alt="Payment Receipt"
            className="max-w-full max-h-full rounded-xl"
          />
        </div>
      )}
    </div>
  );
};

export default PendingPayments;
