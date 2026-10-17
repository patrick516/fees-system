import { useState } from "react";
import { useAuthStore } from "../../store/authStore";
import { LogOut, Loader2 } from "lucide-react";
import api from "../../lib/axios";

export default function SubscriptionLocked() {
  const { logout } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [tanData, setTanData] = useState<{
    timedAccountNumber: string;
    amount: number;
  } | null>(null);
  const [error, setError] = useState("");

  const handlePay = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.post("/schools/subscription/pay");
      setTanData({
        timedAccountNumber: res.data.data.timedAccountNumber,
        amount: res.data.data.amount,
      });
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to initiate payment");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-gray-100 p-8 text-center">
        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg
            className="w-8 h-8"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Account Locked
        </h1>
        <p className="text-gray-500 text-sm mb-8">
          Your subscription has expired. Please renew to restore access to your
          school data.
        </p>

        {!tanData ? (
          <div className="space-y-4">
            {error && (
              <p className="text-sm text-red-600 bg-red-50 p-2 rounded">
                {error}
              </p>
            )}
            <button
              onClick={handlePay}
              disabled={loading}
              className="w-full flex justify-center items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white font-semibold py-3 rounded-lg"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                "Pay Subscription Now"
              )}
            </button>
          </div>
        ) : (
          <div className="bg-green-50 rounded-xl p-6 border border-green-200">
            <p className="text-sm text-green-800 mb-2 font-medium">
              Send exactly MWK {tanData.amount.toLocaleString()}
            </p>
            <p className="text-3xl font-mono font-bold text-green-900 tracking-wider mb-2">
              {tanData.timedAccountNumber}
            </p>
            <p className="text-xs text-green-700">
              Your account will unlock automatically once payment is received.
            </p>
          </div>
        )}

        <button
          onClick={logout}
          className="mt-8 flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-gray-800 w-full"
        >
          <LogOut size={16} /> Sign out
        </button>
      </div>
    </div>
  );
}
