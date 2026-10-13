import { useState } from "react";
import { Link } from "react-router-dom";
import { School, Loader2, MailCheck, ArrowLeft } from "lucide-react";
import api from "../../lib/axios";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await api.post("/auth/forgot-password", { email });
      setSent(true);
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          "Failed to send reset link. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 w-full bg-[url('/images/background.png')] bg-cover bg-center bg-no-repeat overflow-hidden">
      <div className="absolute inset-0 bg-black/40" />

      <div className="relative z-10 h-full flex flex-col items-center justify-center px-4 py-4">
        <div className="mb-4 flex items-center justify-center">
          <div className="w-12 h-12 bg-[var(--color-primary)] rounded-2xl flex items-center justify-center">
            <School size={24} className="text-white" />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-white text-center tracking-tight">
          {sent ? "Check your inbox" : "Forgot your password?"}
        </h1>
        <p className="text-xs text-white/80 mt-1 mb-4 text-center max-w-sm">
          {sent
            ? "We've sent a reset link if the email matches an account."
            : "Enter your email and we'll send you a reset link."}
        </p>

        <div className="w-full max-w-md bg-white border border-gray-200 rounded-2xl p-6 max-h-[calc(100vh-9rem)] overflow-y-auto">
          {sent ? (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-[var(--color-primary-light)] rounded-2xl flex items-center justify-center mx-auto mb-4">
                <MailCheck size={28} className="text-[var(--color-primary)]" />
              </div>
              <p className="text-sm text-gray-600 leading-relaxed mb-1">
                If an account exists with
              </p>
              <p className="text-sm font-semibold text-gray-800 mb-4 break-all">
                {email}
              </p>
              <p className="text-xs text-gray-500 leading-relaxed mb-6">
                you'll receive an email with instructions to reset your
                password. The link expires in 30 minutes.
              </p>

              <div className="text-xs text-gray-400">
                Didn't receive it? Check your spam folder, or{" "}
                <button
                  type="button"
                  onClick={() => {
                    setSent(false);
                    setEmail("");
                  }}
                  className="text-[var(--color-primary)] font-medium hover:underline"
                >
                  try a different email
                </button>
                .
              </div>

              <div className="mt-6 pt-4 border-t border-gray-100">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--color-primary)] hover:underline"
                >
                  <ArrowLeft size={12} /> Back to login
                </Link>
              </div>
            </div>
          ) : (
            <>
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2.5 rounded-lg text-xs mb-4">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@yourschool.mw"
                    required
                    autoFocus
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition-all flex items-center justify-center gap-2"
                >
                  {loading && <Loader2 size={16} className="animate-spin" />}
                  {loading ? "Sending..." : "Send reset link"}
                </button>
              </form>

              <div className="mt-5 pt-4 border-t border-gray-100 text-center">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-700"
                >
                  <ArrowLeft size={12} /> Back to login
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
