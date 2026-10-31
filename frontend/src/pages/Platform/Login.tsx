import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import platformApi from "../../lib/platformApi";
import { usePlatformAuthStore } from "../../store/platformAuthStore";
import { Eye, EyeOff, ShieldCheck, Loader2 } from "lucide-react";

type Mode = "loading" | "setup" | "login";

/* Reusable labelled input, with an eye toggle when password is true */
function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  password,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  password?: boolean;
  autoComplete?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label className="block text-xs font-medium text-slate-800 mb-1">
        {label}
      </label>
      <div className="relative">
        <input
          required
          type={password ? (show ? "text" : "password") : type}
          value={value}
          autoComplete={autoComplete}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 pr-10 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition-all hover:border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
        />
        {password && (
          <button
            type="button"
            onClick={() => setShow(!show)}
            aria-label={show ? "Hide password" : "Show password"}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition-colors hover:text-blue-700"
          >
            {show ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>
    </div>
  );
}

export default function PlatformLogin() {
  const navigate = useNavigate();
  const { login, isAuthenticated } = usePlatformAuthStore();

  const [mode, setMode] = useState<Mode>("loading");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
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
    setInfo("");
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
    setInfo("");
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

  // Background image + light wash + soft blue glow shapes
  const background = (
    <>
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/images/background.webp')" }}
      />
      <div className="absolute inset-0 bg-slate-50/85" />
      <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-blue-200/50 blur-3xl" />
      <div className="absolute -bottom-40 -right-32 h-[28rem] w-[28rem] rounded-full bg-blue-300/40 blur-3xl" />
    </>
  );

  if (mode === "loading") {
    return (
      <div className="min-h-screen relative flex items-center justify-center overflow-hidden">
        {background}
        <div className="relative w-10 h-10 rounded-full border-2 border-blue-200 border-t-blue-700 animate-spin" />
      </div>
    );
  }

  const buttonClass =
    "w-full flex items-center justify-center gap-2 rounded-lg bg-[#0b2a63] hover:bg-[#0a2350] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold py-2.5 shadow-lg  shadow-blue-900/20 transition-all";

  return (
    <div className="min-h-screen relative flex items-center justify-center px-4 py-10 overflow-hidden">
      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(20px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes shake { 0%,100% { transform: translateX(0) } 20%,60% { transform: translateX(-6px) } 40%,80% { transform: translateX(6px) } }
        .animate-fadeUp { animation: fadeUp .6s ease-out both }
        .animate-shake { animation: shake .4s ease-in-out }
      `}</style>

      {background}

      <div className="relative w-full max-w-sm animate-fadeUp">
        <div className="bg-white rounded-2xl shadow-2xl shadow-slate-300/60 border border-slate-100 px-6 py-6 sm:px-7">
          {/* Logo + titles */}

          <div className="text-center mb-5">
            <img
              src="/images/SchoolPayLogo.jpg"
              alt="SchoolPay"
              className="h-14 w-14 mx-auto mb-2 rounded-2xl object-contain"
            />
            <h1 className="text-xl sm:text-2xl font-bold text-[#0b2a63]">
              SchoolPay Platform
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              {mode === "setup"
                ? "Create the platform owner account"
                : "Sign in to manage schools"}
            </p>
          </div>

          {error && (
            <div
              key={error}
              className="mb-3 animate-shake text-xs rounded-lg bg-red-50 border border-red-200 text-red-700 px-3 py-2"
            >
              {error}
            </div>
          )}
          {info && (
            <div className="mb-3 text-xs rounded-lg bg-blue-50 border border-blue-200 text-blue-700 px-3 py-2">
              {info}
            </div>
          )}

          {mode === "setup" ? (
            <form onSubmit={handleSetup} className="space-y-3">
              <Field
                label="Full Name"
                value={setupFullName}
                onChange={setSetupFullName}
                placeholder="Patrick Kulini"
                autoComplete="name"
              />
              <Field
                label="Email"
                type="email"
                value={setupEmail}
                onChange={setSetupEmail}
                placeholder="you@schoolpay.mw"
                autoComplete="email"
              />
              <Field
                label="Phone"
                value={setupPhone}
                onChange={setSetupPhone}
                placeholder="+265..."
                autoComplete="tel"
              />
              <Field
                label="Password"
                password
                value={setupPassword}
                onChange={setSetupPassword}
                placeholder="Create a password"
                autoComplete="new-password"
              />
              <Field
                label="Confirm Password"
                password
                value={setupConfirm}
                onChange={setSetupConfirm}
                placeholder="Repeat the password"
                autoComplete="new-password"
              />
              <button disabled={submitting} className={buttonClass}>
                {submitting && <Loader2 size={18} className="animate-spin" />}
                {submitting ? "Creating..." : "Create Owner & Sign In"}
              </button>
              <p className="text-xs text-slate-500 text-center">
                This form is only available once. After this, only the owner can
                sign in.
              </p>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="space-y-3">
              <Field
                label="Email"
                type="email"
                value={loginEmail}
                onChange={setLoginEmail}
                placeholder="you@school.edu"
                autoComplete="email"
              />
              <div>
                <Field
                  label="Password"
                  password
                  value={loginPassword}
                  onChange={setLoginPassword}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                />
                <div className="flex justify-end mt-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      setInfo(
                        "Password reset is not available yet. Please contact the platform administrator.",
                      )
                    }
                    className="text-xs font-medium text-blue-700 hover:text-blue-900 hover:underline transition"
                  >
                    Forgot password?
                  </button>
                </div>
              </div>
              <button disabled={submitting} className={buttonClass}>
                {submitting && <Loader2 size={18} className="animate-spin" />}
                {submitting ? "Signing in..." : "Sign In"}
              </button>
            </form>
          )}

          <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-500">
            <ShieldCheck size={15} />
            <span>Platform owner access only</span>
          </div>
        </div>
      </div>
    </div>
  );
}
