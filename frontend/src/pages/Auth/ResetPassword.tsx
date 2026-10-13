import { useState, useEffect } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import {
  School,
  Eye,
  EyeOff,
  Loader2,
  ShieldCheck,
  AlertCircle,
  ArrowLeft,
} from "lucide-react";
import api from "../../lib/axios";
import PasswordStrengthMeter from "../../components/shared/PasswordStrengthMeter";
import { validatePassword } from "../../lib/passwordPolicy";

const ResetPassword = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get("token") || "";

  const [checking, setChecking] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [accountEmail, setAccountEmail] = useState<string>("");

  const [form, setForm] = useState({ newPassword: "", confirm: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Validate token when the page loads
  useEffect(() => {
    if (!token) {
      setChecking(false);
      setTokenValid(false);
      return;
    }

    api
      .get(`/auth/reset-password/${token}`)
      .then((res) => {
        setAccountEmail(res.data.data.email);
        setTokenValid(true);
      })
      .catch(() => {
        setTokenValid(false);
      })
      .finally(() => setChecking(false));
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const pwCheck = validatePassword(form.newPassword);
    if (!pwCheck.valid) {
      setError("Password does not meet requirements");
      return;
    }
    if (form.newPassword !== form.confirm) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      await api.post("/auth/reset-password", {
        token,
        newPassword: form.newPassword,
      });
      setSuccess(true);
      setTimeout(() => navigate("/login"), 2500);
    } catch (err: any) {
      const data = err.response?.data;
      if (data?.errors?.length) setError(data.errors.join(" • "));
      else setError(data?.message || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  // ==================== LOADING ====================
  if (checking) {
    return (
      <div className="fixed inset-0 w-full bg-[url('/images/background.png')] bg-cover bg-center bg-no-repeat overflow-hidden">
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative z-10 h-full flex items-center justify-center">
          <div className="w-10 h-10 rounded-full border-2 border-white/30 border-t-white animate-spin" />
        </div>
      </div>
    );
  }

  // ==================== INVALID TOKEN ====================
  if (!tokenValid) {
    return (
      <div className="fixed inset-0 w-full bg-[url('/images/background.png')] bg-cover bg-center bg-no-repeat overflow-hidden">
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative z-10 h-full flex flex-col items-center justify-center px-4">
          <div className="w-full max-w-md bg-white rounded-2xl p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <AlertCircle size={28} className="text-red-600" />
            </div>
            <h1 className="text-lg font-semibold text-gray-800 mb-2">
              Reset link expired
            </h1>
            <p className="text-sm text-gray-500 mb-6 leading-relaxed">
              This password reset link is invalid or has expired. Reset links
              are only valid for 30 minutes for security.
            </p>
            <Link
              to="/forgot-password"
              className="inline-block bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white font-medium px-6 py-3 rounded-lg transition-all"
            >
              Request a new link
            </Link>
            <div className="mt-4">
              <Link
                to="/login"
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                Back to login
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==================== SUCCESS ====================
  if (success) {
    return (
      <div className="fixed inset-0 w-full bg-[url('/images/background.png')] bg-cover bg-center bg-no-repeat overflow-hidden">
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative z-10 h-full flex flex-col items-center justify-center px-4">
          <div className="w-full max-w-md bg-white rounded-2xl p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShieldCheck size={32} className="text-green-600" />
            </div>
            <h1 className="text-lg font-semibold text-gray-800 mb-2">
              Password updated
            </h1>
            <p className="text-sm text-gray-500">Redirecting you to login...</p>
          </div>
        </div>
      </div>
    );
  }

  // ==================== VALID TOKEN → FORM ====================
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
          Set a new password
        </h1>
        <p className="text-xs text-white/80 mt-1 mb-4 text-center max-w-sm">
          Resetting password for{" "}
          <span className="font-medium text-white">{accountEmail}</span>
        </p>

        <div className="w-full max-w-md bg-white border border-gray-200 rounded-2xl p-6 max-h-[calc(100vh-9rem)] overflow-y-auto">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2.5 rounded-lg text-xs mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={form.newPassword}
                  onChange={(e) =>
                    setForm({ ...form, newPassword: e.target.value })
                  }
                  placeholder="Create a strong password"
                  required
                  autoFocus
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <PasswordStrengthMeter password={form.newPassword} compact />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Confirm New Password
              </label>
              <input
                type={showPassword ? "text" : "password"}
                value={form.confirm}
                onChange={(e) => setForm({ ...form, confirm: e.target.value })}
                placeholder="Re-enter your new password"
                required
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all"
              />
              {form.confirm && form.newPassword !== form.confirm && (
                <p className="text-[11px] text-red-500 mt-1">
                  Passwords do not match
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <ShieldCheck size={16} />
              )}
              {loading ? "Updating..." : "Update Password"}
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
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
