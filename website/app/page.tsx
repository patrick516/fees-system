"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  School,
  Eye,
  EyeOff,
  Loader2,
  ChevronRight,
  CalendarIcon,
} from "lucide-react";
import { format } from "date-fns";
import api from "../lib/axios";
import { useAuthStore } from "../store/authStore";
import { Calendar } from "../components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../components/ui/popover";
type LoginMethod = "student-id" | "phone";

const NAVY = "#0B1F44";
const NAVY_HOVER = "#0A1A3A";

/** Turn a relative logo path from the API into an absolute URL */
const resolveLogo = (logo?: string | null): string | null => {
  if (!logo) return null;
  if (/^https?:\/\//i.test(logo) || logo.startsWith("data:")) return logo;
  const origin = (process.env.NEXT_PUBLIC_API_URL || "").replace(
    /\/api\/?$/,
    "",
  );
  return `${origin}${logo.startsWith("/") ? "" : "/"}${logo}`;
};

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [method, setMethod] = useState<LoginMethod>("student-id");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Student ID login
  const [studentCode, setStudentCode] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState<Date | undefined>(undefined);
  const [dobOpen, setDobOpen] = useState(false);

  // Phone OTP login
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);

  const [schoolBranding, setSchoolBranding] = useState<{
    name: string;
    logo: string | null;
    motto?: string | null;
  } | null>(null);

  useEffect(() => {
    const loadBranding = async () => {
      const slug = process.env.NEXT_PUBLIC_SCHOOL_SLUG;

      // 1. Same endpoint the admin portal uses — reliably includes the logo.
      if (slug) {
        try {
          const res = await api.get(`/schools/by-slug/${slug}`);
          if (res.data?.data) {
            setSchoolBranding(res.data.data);
            return;
          }
        } catch {
          /* fall through to public endpoint */
        }
      }

      // 2. Fallback: public endpoint (may or may not include the logo).
      try {
        const res = await api.get("/schools/public");
        const data = Array.isArray(res.data?.data)
          ? res.data.data[0]
          : res.data?.data;
        if (data) {
          setSchoolBranding(data);
          return;
        }
      } catch {
        /* ignore */
      }

      setSchoolBranding(null);
    };

    loadBranding();
  }, []);

  const handleStudentIdLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!dateOfBirth) {
      setError("Please select your child's date of birth");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/auth/parent/login-student-id", {
        studentCode: studentCode.toUpperCase().trim(),
        dateOfBirth: format(dateOfBirth, "yyyy-MM-dd"),
      });
      const { token, student } = res.data.data;
      login(token, student);
      router.push("/dashboard");
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          "Login failed. Please check your details.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRequestOTP = async () => {
    if (!phone.trim()) return;
    setError("");
    setOtpLoading(true);
    try {
      await api.post("/auth/parent/request-otp", { phone: `+265${phone}` });
      setOtpSent(true);
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          "Failed to send code. Check your number.",
      );
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.post("/auth/parent/verify-otp", {
        phone: `+265${phone}`,
        otp,
      });
      const { token, student } = res.data.data;
      login(token, student);
      router.push("/dashboard");
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Invalid code. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const logoSrc = resolveLogo(schoolBranding?.logo);

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4 py-10">
      {/* Logo */}
      <div className="mb-6 flex flex-col items-center animate-fade-in">
        {logoSrc ? (
          <img
            src={logoSrc}
            alt={schoolBranding?.name || "School"}
            className="h-16 w-auto max-w-[180px] object-contain mb-4"
          />
        ) : (
          <div className="w-16 h-16 bg-[#0B1F44] rounded-2xl flex items-center justify-center mb-4 overflow-hidden shadow-sm">
            <School size={30} className="text-white" />
          </div>
        )}
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
          SchoolPay
        </h1>
        {schoolBranding?.name && (
          <p className="text-sm text-gray-500 font-medium mt-1">
            {schoolBranding.name}
          </p>
        )}
        <p className="text-sm text-gray-400 mt-1">
          Parent &amp; Guardian Portal
        </p>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm bg-white border border-gray-200 rounded-2xl p-6 animate-fade-in-up">
        {/* Method Toggle */}
        <div className="relative flex bg-gray-100 rounded-xl p-1 mb-6">
          {/* Sliding pill */}
          <span
            className={`absolute top-1 bottom-1 w-[calc(50%-0.25rem)] rounded-lg bg-white shadow-sm transition-transform duration-300 ease-out ${
              method === "student-id"
                ? "translate-x-0"
                : "translate-x-[calc(100%+0.5rem)]"
            }`}
            aria-hidden
          />
          <button
            type="button"
            onClick={() => {
              setMethod("student-id");
              setError("");
            }}
            className={`relative z-10 flex-1 py-2 text-sm font-medium rounded-lg transition-colors duration-300 ${
              method === "student-id"
                ? "text-[#0B1F44]"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Student ID
          </button>
          <button
            type="button"
            onClick={() => {
              setMethod("phone");
              setError("");
            }}
            className={`relative z-10 flex-1 py-2 text-sm font-medium rounded-lg transition-colors duration-300 ${
              method === "phone"
                ? "text-[#0B1F44]"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Phone Number
          </button>
        </div>

        {/* Error */}
        <div
          className={`overflow-hidden transition-all duration-300 ease-out ${
            error ? "max-h-40 opacity-100 mb-4" : "max-h-0 opacity-0 mb-0"
          }`}
        >
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
            {error}
          </div>
        </div>

        {/* Student ID Form */}
        {method === "student-id" && (
          <form
            onSubmit={handleStudentIdLogin}
            className="space-y-4 animate-fade-in"
            key="student-id"
          >
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Student ID
              </label>
              <input
                type="text"
                value={studentCode}
                onChange={(e) => setStudentCode(e.target.value.toUpperCase())}
                placeholder="eg. STP-2025-001"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm font-mono text-gray-900 placeholder-gray-400 outline-none transition-all duration-300 focus:ring-2 focus:ring-[#0B1F44] focus:border-transparent"
              />
              <p className="text-xs text-gray-400 mt-1.5">
                Found on your child&apos;s admission letter
              </p>
            </div>

            {/* Child's DOB — shadcn DatePicker */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Child&apos;s Date of Birth
              </label>
              <Popover open={dobOpen} onOpenChange={setDobOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="w-full flex items-center justify-between px-4 py-3 border border-gray-300 rounded-xl text-sm text-left outline-none transition-all duration-300 focus:ring-2 focus:ring-[#0B1F44] focus:border-transparent"
                  >
                    <span
                      className={
                        dateOfBirth ? "text-gray-900" : "text-gray-400"
                      }
                    >
                      {dateOfBirth
                        ? format(dateOfBirth, "dd/MM/yyyy")
                        : "dd/mm/yyyy"}
                    </span>
                    <CalendarIcon size={16} className="text-gray-400" />
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-[300px] p-0 bg-white border border-gray-200 rounded-xl shadow-lg"
                  align="start"
                >
                  <Calendar
                    mode="single"
                    selected={dateOfBirth}
                    onSelect={(d) => {
                      setDateOfBirth(d);
                      setDobOpen(false);
                    }}
                    disabled={(d) =>
                      d > new Date() || d < new Date("1950-01-01")
                    }
                    captionLayout="dropdown"
                    startMonth={new Date(1950, 0)}
                    endMonth={new Date(new Date().getFullYear(), 11)}
                    defaultMonth={dateOfBirth || new Date(2015, 0, 1)}
                    autoFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="group w-full flex items-center justify-center gap-2 bg-[#0B1F44] text-white py-3 rounded-xl font-medium text-sm transition-all duration-300 hover:bg-[#0A1A3A] disabled:bg-[#0B1F44]/50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Signing in...
                </>
              ) : (
                <>
                  View My Child&apos;s Account
                  <ChevronRight
                    size={16}
                    className="transition-transform duration-300 group-hover:translate-x-0.5"
                  />
                </>
              )}
            </button>
          </form>
        )}

        {/* Phone OTP Form */}
        {method === "phone" && (
          <div className="space-y-4 animate-fade-in" key="phone">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Phone Number
              </label>
              <div className="flex gap-2">
                <div
                  className={`flex-1 flex items-stretch border rounded-xl overflow-hidden transition-all duration-200 ${
                    otpSent
                      ? "bg-gray-50 border-gray-200"
                      : "bg-white border-gray-300 focus-within:border-[#0B1F44] focus-within:shadow-[0_0_0_3px_rgba(11,31,68,0.12)]"
                  }`}
                >
                  {/* Fixed +265 prefix */}
                  <span
                    className={`flex items-center pl-4 pr-1 text-sm font-medium select-none ${
                      otpSent ? "text-gray-500" : "text-gray-700"
                    }`}
                  >
                    +265
                  </span>
                  <input
                    type="tel"
                    inputMode="numeric"
                    value={phone}
                    onChange={(e) =>
                      setPhone(e.target.value.replace(/\D/g, "").slice(0, 9))
                    }
                    placeholder="991234567"
                    disabled={otpSent}
                    className={`flex-1 pr-4 py-3 bg-transparent text-sm outline-none ring-0 focus:ring-0 focus:outline-none rounded-none ${
                      otpSent
                        ? "text-gray-500 cursor-not-allowed"
                        : "text-gray-900 placeholder-gray-300"
                    }`}
                  />
                </div>
                {!otpSent && (
                  <button
                    type="button"
                    onClick={handleRequestOTP}
                    disabled={otpLoading || phone.length < 9}
                    className="px-4 py-3 bg-[#0B1F44] text-white rounded-xl text-sm font-medium transition-all duration-300 hover:bg-[#0A1A3A] disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap flex items-center justify-center min-w-[92px]"
                  >
                    {otpLoading ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      "Send Code"
                    )}
                  </button>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-1.5">
                Use the phone number registered with the school
              </p>
            </div>

            <div
              className={`overflow-hidden transition-all duration-500 ease-out ${
                otpSent ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
              }`}
            >
              <form onSubmit={handleVerifyOTP} className="space-y-4 pt-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Verification Code
                  </label>
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    placeholder="Enter 6-digit code"
                    maxLength={6}
                    required
                    autoFocus
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl text-center text-lg font-mono tracking-[0.5em] text-gray-900 placeholder-gray-300 outline-none transition-all duration-300 focus:ring-2 focus:ring-[#0B1F44] focus:border-transparent"
                  />
                  <p className="text-xs text-gray-400 mt-1.5 text-center">
                    Code sent to +265{phone}
                  </p>
                </div>
                <button
                  type="submit"
                  disabled={loading || otp.length < 6}
                  className="group w-full flex items-center justify-center gap-2 bg-[#0B1F44] text-white py-3 rounded-xl font-medium text-sm transition-all duration-300 hover:bg-[#0A1A3A] disabled:bg-[#0B1F44]/50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />{" "}
                      Verifying...
                    </>
                  ) : (
                    <>
                      Verify &amp; Continue
                      <ChevronRight
                        size={16}
                        className="transition-transform duration-300 group-hover:translate-x-0.5"
                      />
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOtpSent(false);
                    setOtp("");
                    setPhone("");
                  }}
                  className="w-full text-sm text-gray-500 hover:text-gray-800 transition-colors duration-300"
                >
                  Use a different number
                </button>
              </form>
            </div>
          </div>
        )}

        <p className="text-center text-xs text-gray-400 mt-6">
          Having trouble? Contact your school office.
        </p>
      </div>

      <p className="text-xs text-gray-400 mt-6">
        SchoolPay Malawi © {new Date().getFullYear()}
      </p>
    </div>
  );
}
