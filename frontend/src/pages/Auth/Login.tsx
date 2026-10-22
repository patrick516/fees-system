import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import api from "../../lib/axios";
import { applyTheme } from "../../lib/theme";
import { Eye, EyeOff, Loader2, ShieldAlert } from "lucide-react";

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuthStore();

  const [lockedInfo, setLockedInfo] = useState<{
    message: string;
    minutesRemaining: number;
  } | null>(null);

  const [form, setForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    applyTheme("#1e3a8a");
  }, []);

  //  LOGIN
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await api.post("/auth/staff/login", form);
      const { token, refreshToken, staff, mustChangePassword } = res.data.data;

      login(token, refreshToken, staff, !!mustChangePassword);

      if (mustChangePassword) {
        sessionStorage.setItem("pendingCurrentPassword", form.password);
      } else {
        sessionStorage.removeItem("pendingCurrentPassword");
      }

      // Cache branding ONLY for after they log in
      if (staff.school) {
        localStorage.setItem(
          "lastSchoolBranding",
          JSON.stringify({
            name: staff.school.name,
            logo: staff.school.logo,
            motto: staff.school.motto,
            primaryColor: staff.school.primaryColor,
          }),
        );
      }

      if (mustChangePassword) {
        navigate("/force-change-password");
      } else {
        navigate("/dashboard");
      }
    } catch (err: any) {
      const data = err.response?.data;
      const status = err.response?.status;

      if (data?.code === "EMAIL_NOT_VERIFIED") {
        navigate(`/verify-email?email=${encodeURIComponent(form.email)}`);
        return;
      }

      if (status === 423 && data?.code === "ACCOUNT_LOCKED") {
        setLockedInfo({
          message: data?.message || "Account is temporarily locked.",
          minutesRemaining: data?.minutesRemaining || 0,
        });
        setError("");
        return;
      }

      setError(data?.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-[url('/images/background.png')] bg-cover bg-center bg-no-repeat">
      <div className="absolute inset-0 bg-black/40" />

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 py-10">
        {/*  Static SchoolPay Logo */}
        <div className="mb-6 flex items-center justify-center">
          <img
            src="/images/SchoolPayLogo.jpg"
            alt="SchoolPay"
            className="h-20 w-20 object-contain rounded-2xl bg-white p-2 shadow-lg"
          />
        </div>

        {/* Heading & Static Tagline */}
        <h1 className="text-3xl font-bold text-white text-center tracking-tight">
          Welcome back
        </h1>
        <p className="text-sm text-white/80 mt-2 mb-8 text-center">
          Simple, secure school fee management
        </p>

        {/* Card */}
        <div className="w-full max-w-md bg-white border border-gray-200 rounded-2xl p-8">
          {lockedInfo ? (
            <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <ShieldAlert
                  size={20}
                  className="text-red-600 shrink-0 mt-0.5"
                />
                <div>
                  <p className="text-sm font-semibold text-red-800">
                    Account temporarily locked
                  </p>
                  <p className="text-xs text-red-700 mt-1 leading-relaxed">
                    {lockedInfo.message}
                  </p>
                  <p className="text-[11px] text-red-500 mt-2">
                    If this is a mistake, contact your school administrator to
                    unlock your account.
                  </p>
                </div>
              </div>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-6">
              {error}
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="you@yourschool.mw"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all duration-300"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                  placeholder="••••••••"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all duration-300 pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors duration-300"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !!lockedInfo}
              className="w-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] disabled:opacity-50 text-white font-medium py-3 rounded-lg transition-all duration-300 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 size={18} className="animate-spin" />}
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <div className="text-center mt-6 pt-5 border-t border-gray-100">
            <Link
              to="/forgot-password"
              className="text-xs font-medium text-[var(--color-primary)] hover:underline"
            >
              Forgot your password?
            </Link>
          </div>
        </div>

        {/* Divider */}
        <div className="w-full max-w-md mt-8 flex items-center gap-4">
          <div className="flex-1 h-px bg-white/30" />
          <span className="text-xs text-white/80 whitespace-nowrap">
            Contact{" "}
            <a
              href="mailto:info@schoolpay.mw"
              className="text-white font-semibold hover:underline transition-colors duration-300"
            >
              IT
            </a>{" "}
            if you need help
          </span>
          <div className="flex-1 h-px bg-white/30" />
        </div>

        {/* Footer */}
        <p className="text-xs text-white/70 mt-8 text-center">
          © {new Date().getFullYear()} SchoolPay. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default Login;
