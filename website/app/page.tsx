"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { School, Eye, EyeOff, Loader2, ChevronRight } from "lucide-react";
import api from "../lib/axios";
import { useAuthStore } from "../store/authStore";

type LoginMethod = "student-id" | "phone";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [method, setMethod] = useState<LoginMethod>("student-id");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Student ID login
  const [studentCode, setStudentCode] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");

  // Phone OTP login
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);

  const handleStudentIdLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.post("/auth/parent/login-student-id", {
        studentCode: studentCode.toUpperCase().trim(),
        dateOfBirth,
      });
      const { token, student } = res.data.data;
      login(token, student);
      router.push("/dashboard");
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          "Login failed. Please check your details.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRequestOTP = async () => {
    if (!phone.trim()) return;
    setError("");
    setOtpLoading(true);
    try {
      await api.post("/auth/parent/request-otp", { phone });
      setOtpSent(true);
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          "Failed to send code. Check your number.",
      );
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.post("/auth/parent/verify-otp", { phone, otp });
      const { token, student } = res.data.data;
      login(token, student);
      router.push("/dashboard");
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Invalid code. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-700 flex flex-col items-center justify-center p-4">
      {/* Logo */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
          <School size={32} className="text-blue-900" />
        </div>
        <h1 className="text-2xl font-bold text-white">SchoolPay</h1>
        <p className="text-blue-200 text-sm mt-1">Parent & Guardian Portal</p>
      </div>

      {/* Card */}
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        {/* Method Toggle */}
        <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
          <button
            onClick={() => {
              setMethod("student-id");
              setError("");
            }}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
              method === "student-id"
                ? "bg-white text-blue-900 shadow-sm"
                : "text-gray-500"
            }`}
          >
            Student ID
          </button>
          <button
            onClick={() => {
              setMethod("phone");
              setError("");
            }}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
              method === "phone"
                ? "bg-white text-blue-900 shadow-sm"
                : "text-gray-500"
            }`}
          >
            Phone Number
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm mb-4">
            {error}
          </div>
        )}

        {/* Student ID Form */}
        {method === "student-id" && (
          <form onSubmit={handleStudentIdLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Student ID
              </label>
              <input
                type="text"
                value={studentCode}
                onChange={(e) => setStudentCode(e.target.value.toUpperCase())}
                placeholder="eg. STP-2025-001"
                required
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
              <p className="text-xs text-gray-400 mt-1">
                Found on your child's admission letter
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Child's Date of Birth
              </label>
              <input
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-blue-900 text-white py-3 rounded-xl font-medium text-sm hover:bg-blue-800 disabled:bg-blue-300 transition-colors"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Signing in...
                </>
              ) : (
                <>
                  View My Child's Account <ChevronRight size={16} />
                </>
              )}
            </button>
          </form>
        )}

        {/* Phone OTP Form */}
        {method === "phone" && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Phone Number
              </label>
              <div className="flex gap-2">
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+265999123456"
                  disabled={otpSent}
                  className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                />
                {!otpSent && (
                  <button
                    onClick={handleRequestOTP}
                    disabled={otpLoading || !phone.trim()}
                    className="px-4 py-3 bg-blue-900 text-white rounded-xl text-sm font-medium disabled:opacity-40 hover:bg-blue-800 whitespace-nowrap"
                  >
                    {otpLoading ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      "Send Code"
                    )}
                  </button>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Use the phone number registered with the school
              </p>
            </div>

            {otpSent && (
              <form onSubmit={handleVerifyOTP} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Verification Code
                  </label>
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="Enter 6-digit code"
                    maxLength={6}
                    required
                    autoFocus
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-center text-lg font-mono tracking-widest"
                  />
                  <p className="text-xs text-gray-400 mt-1 text-center">
                    Code sent to {phone}
                  </p>
                </div>
                <button
                  type="submit"
                  disabled={loading || otp.length < 6}
                  className="w-full flex items-center justify-center gap-2 bg-blue-900 text-white py-3 rounded-xl font-medium text-sm hover:bg-blue-800 disabled:bg-blue-300 transition-colors"
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />{" "}
                      Verifying...
                    </>
                  ) : (
                    <>
                      Verify & Continue <ChevronRight size={16} />
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOtpSent(false);
                    setOtp("");
                    setPhone("");
                  }}
                  className="w-full text-sm text-gray-500 hover:text-gray-700"
                >
                  Use a different number
                </button>
              </form>
            )}
          </div>
        )}

        <p className="text-center text-xs text-gray-400 mt-6">
          Having trouble? Contact your school office.
        </p>
      </div>

      <p className="text-blue-300 text-xs mt-6">
        SchoolPay Malawi © {new Date().getFullYear()}
      </p>
    </div>
  );
}
