import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { School, Eye, EyeOff, Loader2, UserPlus } from "lucide-react";
import api from "../../lib/axios";
import PasswordStrengthMeter from "../../components/shared/PasswordStrengthMeter";
import { validatePassword } from "../../lib/passwordPolicy";

const Signup = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Step 1: personal
  const [personal, setPersonal] = useState({
    fullName: "",
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

  const goStep2 = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const pwCheck = validatePassword(personal.password);
    if (!pwCheck.valid) {
      setError("Password does not meet the requirements below");
      return;
    }
    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await api.post("/auth/register", {
        ...personal,
        ...school,
      });
      // Move to OTP step
      navigate(`/verify-email?email=${encodeURIComponent(personal.email)}`);
    } catch (err: any) {
      const data = err.response?.data;
      if (data?.errors?.length) {
        setError(data.errors.join(" • "));
      } else {
        setError(data?.message || "Registration failed. Please try again.");
      }
      // If password was the problem, jump back to step 1
      if (err.response?.status === 400 && data?.message?.includes("Password")) {
        setStep(1);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-[url('/images/background.png')] bg-cover bg-center bg-no-repeat">
      <div className="absolute inset-0 bg-black/40" />

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 py-10">
        {/* Logo */}
        <div className="mb-6 flex items-center justify-center">
          <div className="w-14 h-14 bg-[var(--color-primary)] rounded-2xl flex items-center justify-center">
            <School size={28} className="text-white" />
          </div>
        </div>

        <h1 className="text-3xl font-bold text-white text-center tracking-tight">
          Create your school account
        </h1>
        <p className="text-sm text-white/80 mt-2 mb-8 text-center">
          {step === 1
            ? "Step 1 of 2 — Your details"
            : "Step 2 of 2 — School information"}
        </p>

        {/* Card */}
        <div className="w-full max-w-md bg-white border border-gray-200 rounded-2xl p-8">
          {/* Stepper */}
          <div className="flex items-center gap-2 mb-6">
            <div className="flex-1 h-1 rounded-full bg-[var(--color-primary)]" />
            <div
              className={`flex-1 h-1 rounded-full transition-colors ${
                step === 2 ? "bg-[var(--color-primary)]" : "bg-gray-200"
              }`}
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-5">
              {error}
            </div>
          )}

          {/* ==================== STEP 1 ==================== */}
          {step === 1 && (
            <form onSubmit={goStep2} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  value={personal.fullName}
                  onChange={(e) =>
                    setPersonal({ ...personal, fullName: e.target.value })
                  }
                  placeholder="John Banda"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all"
                />
                <p className="text-xs text-gray-400 mt-1.5">
                  We'll send a verification code here
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={personal.phone}
                  onChange={(e) =>
                    setPersonal({ ...personal, phone: e.target.value })
                  }
                  placeholder="+265 991 234 567"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
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
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <PasswordStrengthMeter password={personal.password} />
              </div>

              <button
                type="submit"
                className="w-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white font-medium py-3 rounded-lg transition-all flex items-center justify-center gap-2"
              >
                Continue
              </button>
            </form>
          )}

          {/* ==================== STEP 2 ==================== */}
          {step === 2 && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
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
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    School Phone
                  </label>
                  <input
                    type="tel"
                    value={school.schoolPhone}
                    onChange={(e) =>
                      setSchool({ ...school, schoolPhone: e.target.value })
                    }
                    placeholder="+265 1 234 567"
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 border border-gray-300 text-gray-700 font-medium py-3 rounded-lg hover:bg-gray-50 transition-all"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] disabled:opacity-50 text-white font-medium py-3 rounded-lg transition-all flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <UserPlus size={16} />
                  )}
                  {loading ? "Creating..." : "Create Account"}
                </button>
              </div>
            </form>
          )}

          {step === 1 && (
            <p className="text-xs text-gray-500 text-center mt-6">
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
