import { useState } from "react";
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
    logout();
    navigate("/login");
  };

  return (
    <div className="relative min-h-screen w-full bg-[url('/images/background.png')] bg-cover bg-center bg-no-repeat">
      <div className="absolute inset-0 bg-black/40" />

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 py-10">
        <div className="mb-6 flex items-center justify-center">
          <div className="w-16 h-16 bg-amber-400/90 backdrop-blur rounded-2xl flex items-center justify-center">
            <AlertTriangle size={32} className="text-white" />
          </div>
        </div>

        <h1 className="text-3xl font-bold text-white text-center tracking-tight">
          Change your password
        </h1>
        <p className="text-sm text-white/80 mt-2 mb-8 text-center max-w-sm">
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

        <div className="w-full max-w-md bg-white border border-gray-200 rounded-2xl p-8">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-5">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Current Password
              </label>
              <input
                type={showPassword ? "text" : "password"}
                value={form.currentPassword}
                onChange={(e) =>
                  setForm({ ...form, currentPassword: e.target.value })
                }
                placeholder="Enter your current password"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all"
              />
              <p className="text-xs text-gray-400 mt-1.5">
                This is the password from your invitation email
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
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
              <PasswordStrengthMeter password={form.newPassword} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirm New Password
              </label>
              <input
                type={showPassword ? "text" : "password"}
                value={form.confirm}
                onChange={(e) => setForm({ ...form, confirm: e.target.value })}
                placeholder="Re-enter new password"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all"
              />
              {form.confirm && form.newPassword !== form.confirm && (
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
              {loading ? (
                <Loader2 size={18} className="animate-spin" />
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
