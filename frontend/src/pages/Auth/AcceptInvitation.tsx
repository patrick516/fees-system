import { useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff, Loader2, ShieldCheck, KeyRound } from "lucide-react";
import api from "../../lib/axios";
import PasswordStrengthMeter from "../../components/shared/PasswordStrengthMeter";
import { validatePassword } from "../../lib/passwordPolicy";

const AcceptInvitation = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get("token") || "";

  const [form, setForm] = useState({ password: "", confirm: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const pwCheck = validatePassword(form.password);
    if (!pwCheck.valid) {
      setError("Password does not meet requirements");
      return;
    }
    if (form.password !== form.confirm) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      await api.post("/auth/accept-invitation", {
        token,
        newPassword: form.password,
      });
      setSuccess(true);
      setTimeout(() => navigate("/login"), 2200);
    } catch (err: any) {
      const data = err.response?.data;
      if (data?.errors?.length) setError(data.errors.join(" • "));
      else setError(data?.message || "Failed to accept invitation");
    } finally {
      setLoading(false);
    }
  };

  // No token in URL
  if (!token) {
    return (
      <div className="relative min-h-screen w-full bg-[url('/images/background.png')] bg-cover bg-center bg-no-repeat">
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4">
          <div className="w-full max-w-md bg-white rounded-2xl p-8 text-center">
            <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <KeyRound size={24} className="text-red-600" />
            </div>
            <h1 className="text-lg font-semibold text-gray-800 mb-2">
              Invalid invitation link
            </h1>
            <p className="text-sm text-gray-500 mb-6">
              This link is missing a token. Please check the email or ask your
              admin to resend it.
            </p>
            <Link
              to="/login"
              className="inline-block bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white font-medium px-6 py-2.5 rounded-lg transition-all"
            >
              Go to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Success screen
  if (success) {
    return (
      <div className="relative min-h-screen w-full bg-[url('/images/background.png')] bg-cover bg-center bg-no-repeat">
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4">
          <div className="w-full max-w-md bg-white rounded-2xl p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShieldCheck size={32} className="text-green-600" />
            </div>
            <h1 className="text-lg font-semibold text-gray-800 mb-2">
              You're all set
            </h1>
            <p className="text-sm text-gray-500">
              Your account is ready. Redirecting you to login...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full bg-[url('/images/background.png')] bg-cover bg-center bg-no-repeat">
      <div className="absolute inset-0 bg-black/40" />

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 py-10">
        <div className="mb-6 flex items-center justify-center">
          <div className="w-16 h-16 bg-white/15 backdrop-blur rounded-2xl flex items-center justify-center">
            <ShieldCheck size={32} className="text-white" />
          </div>
        </div>

        <h1 className="text-3xl font-bold text-white text-center tracking-tight">
          Accept your invitation
        </h1>
        <p className="text-sm text-white/80 mt-2 mb-8 text-center max-w-sm">
          Set your own password to finish setting up your account
        </p>

        <div className="w-full max-w-md bg-white border border-gray-200 rounded-2xl p-8">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-5">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                  placeholder="Create a strong password"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <PasswordStrengthMeter password={form.password} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirm Password
              </label>
              <input
                type={showPassword ? "text" : "password"}
                value={form.confirm}
                onChange={(e) => setForm({ ...form, confirm: e.target.value })}
                placeholder="Re-enter your password"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all"
              />
              {form.confirm && form.password !== form.confirm && (
                <p className="text-xs text-red-500 mt-1">
                  Passwords do not match
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] disabled:opacity-50 text-white font-medium py-3 rounded-lg transition-all flex items-center justify-center gap-2"
            >
              {loading && <Loader2 size={18} className="animate-spin" />}
              {loading ? "Saving..." : "Accept & Continue"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AcceptInvitation;
