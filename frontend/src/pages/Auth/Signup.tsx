import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  School,
  Eye,
  EyeOff,
  Loader2,
  UserPlus,
  Check,
  MailCheck,
  ArrowRight,
  ArrowLeft,
  Lock,
} from "lucide-react";
import api from "../../lib/axios";
import PasswordStrengthMeter from "../../components/shared/PasswordStrengthMeter";
import { validatePassword } from "../../lib/passwordPolicy";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";

type Step = 1 | 2 | 3;

const TITLES = ["Mr", "Mrs", "Ms", "Miss", "Dr", "Prof"];

// Strips non-digits, removes leading 0 or 265 so we always store the 9-digit local number
const normalizePhone = (raw: string) => {
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("0")) digits = digits.slice(1);
  if (digits.startsWith("265")) digits = digits.slice(3);
  return digits.slice(0, 9);
};

const Signup = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(1);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [checkingSetup, setCheckingSetup] = useState(true);
  const [setupComplete, setSetupComplete] = useState(false);
  const [setupSchoolName, setSetupSchoolName] = useState<string | undefined>();

  // Step 1: personal — split name
  const [personal, setPersonal] = useState({
    title: "",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
  });

  // Step 2: school
  const [school, setSchool] = useState({
    schoolName: "",
    address: "",
    city: "",
    schoolPhone: "",
  });

  // Step 3: OTP
  const [otp, setOtp] = useState("");
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // On mount: check if the system has already been set up
  useEffect(() => {
    api
      .get("/auth/setup-status")
      .then((res) => {
        setSetupComplete(!!res.data.data.setupComplete);
        setSetupSchoolName(res.data.data.schoolName);
      })
      .catch(() => {
        setSetupComplete(false);
      })
      .finally(() => setCheckingSetup(false));
  }, []);

  // ---- Step 1 → Step 2 ----
  const goToStep2 = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const pwCheck = validatePassword(personal.password);
    if (!pwCheck.valid) {
      setError("Please set a password that meets all requirements below");
      return;
    }
    setStep(2);
  };

  // ---- Step 2 → Step 3 (submit registration) ----
  const submitRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.post("/auth/register", {
        // Split name
        title: personal.title || undefined,
        firstName: personal.firstName.trim(),
        lastName: personal.lastName.trim(),
        email: personal.email.trim(),
        phone: `+265${personal.phone}`,
        password: personal.password,
        // School
        schoolName: school.schoolName.trim(),
        address: school.address.trim(),
        city: school.city.trim(),
        schoolPhone: `+265${school.schoolPhone}`,
      });
      setStep(3);
      setCountdown(60);
    } catch (err: any) {
      const data = err.response?.data;
      if (data?.errors?.length) setError(data.errors.join(" • "));
      else setError(data?.message || "Registration failed. Please try again.");

      if (data?.message?.includes("Password")) setStep(1);
    } finally {
      setLoading(false);
    }
  };

  // ---- Step 3 → Verify + finish ----
  const submitOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setInfo("");

    if (otp.length !== 6) {
      setError("Enter the 6-digit code from your email");
      return;
    }

    setLoading(true);
    try {
      await api.post("/auth/verify-email", {
        email: personal.email,
        otp,
      });
      setInfo("Email verified! Redirecting to login...");
      setTimeout(() => navigate("/login"), 1400);
    } catch (err: any) {
      setError(err.response?.data?.message || "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  // ---- Resend OTP ----
  const handleResend = async () => {
    setError("");
    setInfo("");
    setResending(true);
    try {
      await api.post("/auth/resend-otp", { email: personal.email });
      setInfo("A new code has been sent to your email");
      setCountdown(60);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to resend code");
    } finally {
      setResending(false);
    }
  };

  // countdown effect
  if (countdown > 0) {
    setTimeout(() => setCountdown((c) => c - 1), 1000);
  }

  const stepLabels = ["Your details", "School info", "Verify email"];

  // ==================== SETUP CHECK: LOADING ====================
  if (checkingSetup) {
    return (
      <div className="fixed inset-0 w-full bg-[url('/images/background.png')] bg-cover bg-center bg-no-repeat overflow-hidden">
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative z-10 h-full flex flex-col items-center justify-center">
          <Loader2 size={28} className="animate-spin text-white" />
          <p className="text-white/80 text-xs mt-3">Checking setup...</p>
        </div>
      </div>
    );
  }

  // ==================== SETUP CHECK: BLOCKED ====================
  if (setupComplete) {
    return (
      <div className="fixed inset-0 w-full bg-[url('/images/background.png')] bg-cover bg-center bg-no-repeat overflow-hidden">
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative z-10 h-full flex flex-col items-center justify-center px-4">
          <div className="w-full max-w-md bg-white rounded-2xl p-8 text-center">
            <div className="w-16 h-16 bg-[var(--color-primary-light)] rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Lock size={28} className="text-[var(--color-primary)]" />
            </div>
            <h1 className="text-lg font-semibold text-gray-800 mb-2">
              Setup already complete
            </h1>
            <p className="text-sm text-gray-500 mb-1 leading-relaxed">
              {setupSchoolName
                ? `This system is already set up for ${setupSchoolName}.`
                : "This system has already been set up."}
            </p>
            <p className="text-sm text-gray-500 mb-6 leading-relaxed">
              To add staff members, please log in and use the{" "}
              <strong className="text-gray-700">Staff</strong> page.
            </p>
            <Link
              to="/login"
              className="inline-block bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white font-medium px-6 py-3 rounded-lg transition-all"
            >
              Go to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

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
          Create your school account
        </h1>
        <p className="text-xs text-white/80 mt-1 mb-4 text-center">
          Step {step} of 3 — {stepLabels[step - 1]}
        </p>

        <div className="w-full max-w-md bg-white border border-gray-200 rounded-2xl p-6 max-h-[calc(100vh-9rem)] overflow-y-auto">
          {/* ==================== STEPPER ==================== */}
          <div className="flex items-center justify-center gap-2 mb-5">
            {[1, 2, 3].map((n) => (
              <div key={n} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                    step === n
                      ? "bg-[var(--color-primary)] text-white ring-4 ring-[var(--color-primary)]/15"
                      : step > n
                        ? "bg-green-500 text-white"
                        : "bg-gray-100 text-gray-400"
                  }`}
                >
                  {step > n ? <Check size={14} strokeWidth={3} /> : n}
                </div>
                {n < 3 && (
                  <div
                    className={`h-0.5 w-10 sm:w-14 mx-1 rounded transition-colors duration-300 ${
                      step > n ? "bg-green-500" : "bg-gray-200"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2.5 rounded-lg text-xs mb-4">
              {error}
            </div>
          )}
          {info && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-3 py-2.5 rounded-lg text-xs mb-4">
              {info}
            </div>
          )}

          {/* ==================== STEP 1 — PERSONAL ==================== */}
          {step === 1 && (
            <form onSubmit={goToStep2} className="space-y-3">
              {/* Title */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Title
                </label>
                <Select
                  value={personal.title || "none"}
                  onValueChange={(v) =>
                    setPersonal({
                      ...personal,
                      title: v === "none" ? "" : v,
                    })
                  }
                >
                  <SelectTrigger className="w-full bg-white border-gray-300 rounded-lg text-sm h-[42px]">
                    <SelectValue placeholder="No title" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="none">No title</SelectItem>
                    {TITLES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* First + Last name */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    First Name *
                  </label>
                  <input
                    type="text"
                    value={personal.firstName}
                    onChange={(e) =>
                      setPersonal({ ...personal, firstName: e.target.value })
                    }
                    placeholder="Patrick"
                    required
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    value={personal.lastName}
                    onChange={(e) =>
                      setPersonal({ ...personal, lastName: e.target.value })
                    }
                    placeholder="Kulini"
                    required
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={personal.email}
                  onChange={(e) =>
                    setPersonal({ ...personal, email: e.target.value })
                  }
                  placeholder="you@yourschool.mw"
                  required
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-gray-300 bg-gray-50 text-sm text-gray-600 font-medium">
                    +265
                  </span>
                  <input
                    type="tel"
                    inputMode="numeric"
                    value={personal.phone}
                    onChange={(e) =>
                      setPersonal({
                        ...personal,
                        phone: normalizePhone(e.target.value),
                      })
                    }
                    placeholder="995049331"
                    maxLength={9}
                    required
                    pattern="[0-9]{9}"
                    title="Enter 9 digits (e.g. 995049331)"
                    className="flex-1 min-w-0 px-3 py-2.5 border border-gray-300 rounded-r-lg text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all"
                  />
                </div>
                <p className="text-[11px] text-gray-400 mt-1">
                  Enter 9 digits without the +265 prefix
                </p>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={personal.password}
                    onChange={(e) =>
                      setPersonal({ ...personal, password: e.target.value })
                    }
                    placeholder="Create a strong password"
                    required
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <PasswordStrengthMeter password={personal.password} compact />
              </div>

              <button
                type="submit"
                className="w-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white font-medium py-2.5 rounded-lg transition-all flex items-center justify-center gap-2 mt-1"
              >
                Continue
                <ArrowRight size={14} />
              </button>
            </form>
          )}

          {/* ==================== STEP 2 — SCHOOL ==================== */}
          {step === 2 && (
            <form onSubmit={submitRegistration} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  School Name
                </label>
                <input
                  type="text"
                  value={school.schoolName}
                  onChange={(e) =>
                    setSchool({ ...school, schoolName: e.target.value })
                  }
                  placeholder="St Peters Private School"
                  required
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Address
                </label>
                <input
                  type="text"
                  value={school.address}
                  onChange={(e) =>
                    setSchool({ ...school, address: e.target.value })
                  }
                  placeholder="123 Main Street"
                  required
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    value={school.city}
                    onChange={(e) =>
                      setSchool({ ...school, city: e.target.value })
                    }
                    placeholder="Blantyre"
                    required
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    School Phone
                  </label>
                  <div className="flex">
                    <span className="inline-flex items-center px-2.5 rounded-l-lg border border-r-0 border-gray-300 bg-gray-50 text-xs text-gray-600 font-medium">
                      +265
                    </span>
                    <input
                      type="tel"
                      inputMode="numeric"
                      value={school.schoolPhone}
                      onChange={(e) =>
                        setSchool({
                          ...school,
                          schoolPhone: normalizePhone(e.target.value),
                        })
                      }
                      placeholder="995049331"
                      maxLength={9}
                      required
                      pattern="[0-9]{9}"
                      title="Enter 9 digits (e.g. 995049331)"
                      className="flex-1 min-w-0 px-3 py-2.5 border border-gray-300 rounded-r-lg text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setError("");
                    setStep(1);
                  }}
                  className="flex items-center justify-center gap-1.5 border border-gray-300 text-gray-700 font-medium py-2.5 px-4 rounded-lg hover:bg-gray-50 transition-all"
                >
                  <ArrowLeft size={14} />
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition-all flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <UserPlus size={14} />
                  )}
                  {loading ? "Creating..." : "Create Account"}
                </button>
              </div>
            </form>
          )}

          {/* ==================== STEP 3 — VERIFY OTP ==================== */}
          {step === 3 && (
            <form onSubmit={submitOtp} className="space-y-4">
              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 bg-[var(--color-primary-light)] rounded-2xl flex items-center justify-center mb-2">
                  <MailCheck
                    size={22}
                    className="text-[var(--color-primary)]"
                  />
                </div>
                <p className="text-xs text-gray-500 leading-relaxed">
                  We sent a 6-digit code to
                  <br />
                  <span className="font-medium text-gray-800">
                    {personal.email}
                  </span>
                </p>
              </div>

              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                placeholder="000000"
                autoFocus
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-center text-2xl font-bold tracking-[0.4em] text-gray-900 outline-none focus:border-[var(--color-primary)] focus:ring-0 transition-all"
              />

              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="w-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <ArrowRight size={14} />
                )}
                {loading ? "Verifying..." : "Verify Email"}
              </button>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resending || countdown > 0}
                  className="text-xs font-medium text-[var(--color-primary)] hover:underline disabled:opacity-50 disabled:no-underline"
                >
                  {resending
                    ? "Sending..."
                    : countdown > 0
                      ? `Resend in ${countdown}s`
                      : "Resend code"}
                </button>
              </div>
            </form>
          )}

          {step === 1 && (
            <p className="text-xs text-gray-500 text-center mt-5">
              Already have an account?{" "}
              <Link
                to="/login"
                className="text-[var(--color-primary)] font-medium hover:underline"
              >
                Sign in
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Signup;
