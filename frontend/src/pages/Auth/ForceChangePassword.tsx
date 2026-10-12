import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader2, AlertTriangle, ShieldCheck } from "lucide-react";
import api from "../../lib/axios";
import PasswordStrengthMeter from "../../components/shared/PasswordStrengthMeter";
import { validatePassword } from "../../lib/passwordPolicy";
import { useAuthStore } from "../../store/authStore";

const ForceChangePassword = () => {
  const navigate = useNavigate();
  const { logout, clearMustChangePassword, staff } = useAuthStore();

  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirm: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Pre-fill the current password from sessionStorage — the user just
  // typed it on the login page, no reason to ask twice.
  useEffect(() => {
    const stored = sessionStorage.getItem("pendingCurrentPassword");
    if (stored) {
      setForm((prev) => ({ ...prev, currentPassword: stored }));
    } else {
      // No stash → user must have refreshed or opened the URL directly
      // Send them back to login
      navigate("/login", { replace: true });
    }
  }, [navigate]);

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
    if (form.currentPassword === form.newPassword) {
      setError("New password must be different from current");
      return;
    }

    setLoading(true);
    try {
      await api.post("/auth/staff/change-password", {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });

      // Clean up the temporary stash
      sessionStorage.removeItem("pendingCurrentPassword");

      clearMustChangePassword();
      navigate("/dashboard");
    } catch (err: any) {
      const data = err.response?.data;
      if (data?.errors?.length) setError(data.errors.join(" • "));
      else setError(data?.message || "Failed to change password");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem("pendingCurrentPassword");
    logout();
    navigate("/login");
  };

  return (
    // Fixed overlay → page never scrolls
    <div className="fixed inset-0 w-full bg-[url('/images/background.png')] bg-cover bg-center bg-no-repeat overflow-hidden">
      <div className="absolute inset-0 bg-black/40" />

      <div className="relative z-10 h-full flex flex-col items-center justify-center px-4 py-4">
        <div className="mb-4 flex items-center justify-center">
          <div className="w-14 h-14 bg-amber-400/90 backdrop-blur rounded-2xl flex items-center justify-center">
            <AlertTriangle size={28} className="text-white" />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-white text-center tracking-tight">
          Change your password
        </h1>
        <p className="text-xs text-white/80 mt-1 mb-4 text-center max-w-sm">
          For security, you must set a new password before continuing
          {staff?.fullName && (
            <>
              <br />
              <span className="font-medium text-white">
                Welcome, {staff.fullName}
              </span>
            </>
          )}
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
                placeholder="Re-enter new password"
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

          <button
            onClick={handleLogout}
            className="w-full mt-4 text-xs text-gray-500 hover:text-gray-700 transition-colors"
          >
            Sign out instead
          </button>
        </div>
      </div>
    </div>
  );
};

export default ForceChangePassword;
