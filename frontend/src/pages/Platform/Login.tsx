// frontend/src/pages/Platform/Login.tsx
// Owner login page. On mount, checks /api/platform/setup-status:
//   - setupComplete=false → shows "Create Owner" form (one-time)
//   - setupComplete=true  → shows login form only (setup forever hidden)
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import platformApi from "../../lib/platformApi";
import { usePlatformAuthStore } from "../../store/platformAuthStore";

type Mode = "loading" | "setup" | "login";

export default function PlatformLogin() {
  const navigate = useNavigate();
  const { login, isAuthenticated } = usePlatformAuthStore();

  const [mode, setMode] = useState<Mode>("loading");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Setup form
  const [setupFullName, setSetupFullName] = useState("");
  const [setupEmail, setSetupEmail] = useState("");
  const [setupPhone, setSetupPhone] = useState("");
  const [setupPassword, setSetupPassword] = useState("");
  const [setupConfirm, setSetupConfirm] = useState("");

  // Login form
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Already logged in? Go straight to dashboard
  useEffect(() => {
    if (isAuthenticated) navigate("/platform/dashboard", { replace: true });
  }, [isAuthenticated, navigate]);

  // Check setup status
  useEffect(() => {
    (async () => {
      try {
        const res = await platformApi.get("/platform/setup-status");
        setMode(res.data.data.setupComplete ? "login" : "setup");
      } catch {
        setMode("login");
      }
    })();
  }, []);

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (setupPassword !== setupConfirm) {
      setError("Passwords do not match");
      return;
    }

    setSubmitting(true);
    try {
      await platformApi.post("/platform/setup", {
        fullName: setupFullName,
        email: setupEmail,
        phone: setupPhone,
        password: setupPassword,
      });
      // Auto-login after setup
      const res = await platformApi.post("/platform/auth/login", {
        email: setupEmail,
        password: setupPassword,
      });
      login(
        res.data.data.token,
        res.data.data.refreshToken,
        res.data.data.admin,
      );
      navigate("/platform/dashboard", { replace: true });
    } catch (err: any) {
      setError(err?.response?.data?.message || "Setup failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const res = await platformApi.post("/platform/auth/login", {
        email: loginEmail,
        password: loginPassword,
      });
      login(
        res.data.data.token,
        res.data.data.refreshToken,
        res.data.data.admin,
      );
      navigate("/platform/dashboard", { replace: true });
    } catch (err: any) {
      setError(err?.response?.data?.message || "Login failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (mode === "loading") {
    return (
      <div className="min-h-screen relative flex items-center justify-center">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/images/background.png')" }}
        />
        <div className="absolute inset-0 bg-slate-900/60" />
        <div className="relative w-10 h-10 rounded-full border-2 border-white/30 border-t-white animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center px-4 py-10">
      {/* Background image */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/images/background.png')" }}
      />
      {/* Dark overlay for contrast */}
      <div className="absolute inset-0 bg-slate-900/60" />

      {/* Card */}
      <div className="relative w-full max-w-md">
        <div className="text-center mb-6">
          <img
            src="/images/SchoolPayLogo.jpg"
            alt="SchoolPay"
            className="h-28 w-28 mx-auto mb-4 rounded-2xl object-contain bg-white p-3 shadow-2xl ring-4 ring-white/30"
          />
          <h1 className="text-2xl font-semibold text-white drop-shadow-md">
            SchoolPay Platform
          </h1>
          <p className="text-sm text-white/80 mt-1">
            {mode === "setup"
              ? "Create the platform owner account"
              : "Sign in to manage schools"}
          </p>
        </div>

        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
          {error && (
            <div className="mb-4 text-sm rounded-lg bg-red-50 border border-red-200 text-red-700 px-3 py-2">
              {error}
            </div>
          )}

          {mode === "setup" ? (
            <form onSubmit={handleSetup} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Full Name
                </label>
                <input
                  required
                  value={setupFullName}
                  onChange={(e) => setSetupFullName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                  placeholder="Patrick Kulini"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Email
                </label>
                <input
                  required
                  type="email"
                  value={setupEmail}
                  onChange={(e) => setSetupEmail(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                  placeholder="you@schoolpay.mw"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Phone
                </label>
                <input
                  required
                  value={setupPhone}
                  onChange={(e) => setSetupPhone(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                  placeholder="+265..."
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Password
                </label>
                <input
                  required
                  type="password"
                  value={setupPassword}
                  onChange={(e) => setSetupPassword(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Confirm Password
                </label>
                <input
                  required
                  type="password"
                  value={setupConfirm}
                  onChange={(e) => setSetupConfirm(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
              <button
                disabled={submitting}
                className="w-full rounded-lg bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white text-sm font-semibold py-2.5 transition"
              >
                {submitting ? "Creating..." : "Create Owner & Sign In"}
              </button>
              <p className="text-xs text-slate-500 text-center">
                This form is only available once. After this, only the owner can
                sign in.
              </p>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Email
                </label>
                <input
                  required
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Password
                </label>
                <input
                  required
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
              <button
                disabled={submitting}
                className="w-full rounded-lg bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white text-sm font-semibold py-2.5 transition"
              >
                {submitting ? "Signing in..." : "Sign In"}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-white/70 mt-6">
          Platform owner access only
        </p>
      </div>
    </div>
  );
}
