import { useState, useRef, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Loader2, MailCheck, ArrowRight } from "lucide-react";
import api from "../../lib/axios";

const VerifyEmail = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const email = params.get("email") || "";

  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [countdown, setCountdown] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    if (!email) {
      setError("No email provided. Please sign up first.");
    }
  }, [email]);

  // Countdown for resend
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setInfo("");

    if (otp.length !== 6) {
      setError("Enter the 6-digit code from your email");
      return;
    }

    setLoading(true);
    try {
      await api.post("/auth/verify-email", { email, otp });
      setInfo("Email verified! Redirecting to login...");
      setTimeout(() => navigate("/login"), 1500);
    } catch (err: any) {
      setError(err.response?.data?.message || "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    setInfo("");
    setResending(true);
    try {
      await api.post("/auth/resend-otp", { email });
      setInfo("A new code has been sent to your email");
      setCountdown(60);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to resend code");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-[url('/images/background.png')] bg-cover bg-center bg-no-repeat">
      <div className="absolute inset-0 bg-black/40" />

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 py-10">
        <div className="mb-6 flex items-center justify-center">
          <div className="w-16 h-16 bg-white/15 backdrop-blur rounded-2xl flex items-center justify-center">
            <MailCheck size={32} className="text-white" />
          </div>
        </div>

        <h1 className="text-3xl font-bold text-white text-center tracking-tight">
          Check your inbox
        </h1>
        <p className="text-sm text-white/80 mt-2 mb-8 text-center max-w-sm">
          We sent a 6-digit verification code to
          <br />
          <span className="font-medium text-white">
            {email || "your email"}
          </span>
        </p>

        <div className="w-full max-w-md bg-white border border-gray-200 rounded-2xl p-8">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-5">
              {error}
            </div>
          )}
          {info && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm mb-5">
              {info}
            </div>
          )}

          <form onSubmit={handleVerify} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 text-center">
                Verification Code
              </label>
              <input
                ref={inputRef}
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                placeholder="000000"
                className="w-full px-4 py-4 border-2 border-gray-300 rounded-lg text-center text-3xl font-bold tracking-[0.5em] text-gray-900 outline-none focus:border-[var(--color-primary)] focus:ring-0 transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="w-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 rounded-lg transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <ArrowRight size={16} />
              )}
              {loading ? "Verifying..." : "Verify Email"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500 mb-2">
              Didn't receive the code?
            </p>
            <button
              onClick={handleResend}
              disabled={resending || countdown > 0}
              className="text-sm font-medium text-[var(--color-primary)] hover:underline disabled:opacity-50 disabled:no-underline"
            >
              {resending
                ? "Sending..."
                : countdown > 0
                  ? `Resend in ${countdown}s`
                  : "Resend code"}
            </button>
          </div>

          <p className="text-xs text-gray-500 text-center mt-6 pt-6 border-t border-gray-100">
            Wrong email?{" "}
            <Link
              to="/signup"
              className="text-[var(--color-primary)] font-medium hover:underline"
            >
              Start over
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;
