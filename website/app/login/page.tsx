"use client";
import { useState, useRef, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, ChevronRight, Search, School, Check } from "lucide-react";
import api from "../../lib/axios";
import { useAuthStore } from "../../store/authStore";

type LoginMethod = "student-id" | "phone";

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuthStore();

  // 🎯 School selection state
  const [schoolSlug, setSchoolSlug] = useState<string>("");
  const [schoolName, setSchoolName] = useState<string>("");
  const [schoolSearch, setSchoolSearch] = useState("");
  const [schoolResults, setSchoolResults] = useState<any[]>([]);
  const [searchingSchools, setSearchingSchools] = useState(false);
  const [showSchoolPicker, setShowSchoolPicker] = useState(false);

  const [method, setMethod] = useState<LoginMethod>("student-id");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Student ID login
  const [studentCode, setStudentCode] = useState("");
  const [dobDay, setDobDay] = useState("");
  const [dobMonth, setDobMonth] = useState("");
  const [dobYear, setDobYear] = useState("");
  const dayRef = useRef<HTMLInputElement>(null);
  const monthRef = useRef<HTMLInputElement>(null);
  const yearRef = useRef<HTMLInputElement>(null);

  // Phone OTP login
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);

  // 🎯 On mount: use ?school= URL param or localStorage from last visit
  useEffect(() => {
    const urlSlug = searchParams?.get("school");
    const storedSlug = localStorage.getItem("parent_school_slug");
    const storedName = localStorage.getItem("parent_school_name");
    const initialSlug = urlSlug || storedSlug || "";

    if (initialSlug) {
      setSchoolSlug(initialSlug);
      setSchoolName(storedName || "");
      api
        .get(`/schools/by-slug/${initialSlug}`)
        .then((res) => {
          setSchoolName(res.data.data.name);
          localStorage.setItem("parent_school_slug", initialSlug);
          localStorage.setItem("parent_school_name", res.data.data.name);
        })
        .catch(() => {});
    } else {
      setShowSchoolPicker(true);
    }
  }, [searchParams]);

  // 🎯 Debounced school search
  useEffect(() => {
    if (!schoolSearch || schoolSearch.trim().length < 2) {
      setSchoolResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearchingSchools(true);
      try {
        const res = await api.get(
          `/schools/search?q=${encodeURIComponent(schoolSearch.trim())}`,
        );
        setSchoolResults(res.data.data || []);
      } catch {
        setSchoolResults([]);
      } finally {
        setSearchingSchools(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [schoolSearch]);

  const selectSchool = (school: any) => {
    setSchoolSlug(school.slug);
    setSchoolName(school.name);
    setShowSchoolPicker(false);
    setSchoolSearch("");
    setSchoolResults([]);
    localStorage.setItem("parent_school_slug", school.slug);
    localStorage.setItem("parent_school_name", school.name);
  };

  const changeSchool = () => {
    setShowSchoolPicker(true);
    setSchoolSlug("");
    setSchoolName("");
    localStorage.removeItem("parent_school_slug");
    localStorage.removeItem("parent_school_name");
  };

  const onlyDigits = (v: string) => v.replace(/\D/g, "");

  const handleDobDay = (raw: string) => {
    let v = onlyDigits(raw).slice(0, 2);
    if (v.length === 1 && Number(v) > 3) v = "0" + v;
    if (v.length === 2 && Number(v) > 31) v = "31";
    if (v === "00") v = "01";
    setDobDay(v);
    if (v.length === 2) monthRef.current?.focus();
  };

  const handleDobMonth = (raw: string) => {
    let v = onlyDigits(raw).slice(0, 2);
    if (v.length === 1 && Number(v) > 1) v = "0" + v;
    if (v.length === 2 && Number(v) > 12) v = "12";
    if (v === "00") v = "01";
    setDobMonth(v);
    if (v.length === 2) yearRef.current?.focus();
  };

  const handleDobYear = (raw: string) => {
    setDobYear(onlyDigits(raw).slice(0, 4));
  };

  const dobBackspace = (
    e: React.KeyboardEvent<HTMLInputElement>,
    current: string,
    prev?: React.RefObject<HTMLInputElement | null>,
  ) => {
    if (e.key === "Backspace" && current === "") prev?.current?.focus();
  };

  const handleStudentIdLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!schoolSlug) {
      setError("Please select your school first.");
      return;
    }

    const d = Number(dobDay);
    const m = Number(dobMonth);
    const y = Number(dobYear);
    const dobDate = new Date(y, m - 1, d);
    const dobValid =
      dobDay.length === 2 &&
      dobMonth.length === 2 &&
      dobYear.length === 4 &&
      y >= 1950 &&
      dobDate.getFullYear() === y &&
      dobDate.getMonth() === m - 1 &&
      dobDate.getDate() === d &&
      dobDate <= new Date();

    if (!dobValid) {
      setError("Please enter a valid date of birth (DD-MM-YYYY)");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post(
        `/auth/parent/login-student-id?school=${schoolSlug}`,
        {
          studentCode: studentCode.toUpperCase().trim(),
          dateOfBirth: `${dobYear}-${dobMonth}-${dobDay}`,
        },
      );
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
    if (!schoolSlug) {
      setError("Please select your school first.");
      return;
    }
    setError("");
    setOtpLoading(true);
    try {
      await api.post(`/auth/parent/request-otp?school=${schoolSlug}`, {
        phone: `+265${phone}`,
      });
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
      const res = await api.post(
        `/auth/parent/verify-otp?school=${schoolSlug}`,
        {
          phone: `+265${phone}`,
          otp,
        },
      );
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

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4 py-10">
      {/* Logo */}
      <div className="mb-6 flex flex-col items-center animate-fade-in">
        <img
          src="/images/SchoolPayLogo.jpg"
          alt="SchoolPay"
          className="h-20 w-20 object-contain rounded-2xl bg-white p-2 shadow-lg mb-4"
        />
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
          SchoolPay
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          Parent &amp; Guardian Portal
        </p>
      </div>

      <div className="w-full max-w-sm bg-white border border-gray-200 rounded-2xl p-6 animate-fade-in-up">
        {/* 🎯 School selector */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Your Child&apos;s School
          </label>
          {schoolSlug && !showSchoolPicker ? (
            <div className="flex items-center justify-between px-3 py-2.5 bg-blue-50 border border-blue-300 rounded-xl">
              <div className="flex items-center gap-2 min-w-0">
                <School
                  size={16}
                  className="text-[var(--color-primary)] shrink-0"
                />
                <span className="text-sm font-medium text-[var(--color-primary-dark)] truncate">
                  {schoolName || schoolSlug}
                </span>
              </div>
              <button
                type="button"
                onClick={changeSchool}
                className="text-xs text-[var(--color-primary)] hover:underline shrink-0"
              >
                Change
              </button>
            </div>
          ) : (
            <div className="relative">
              <div className="flex items-center gap-2 px-3 py-2.5 border border-gray-300 rounded-xl focus-within:border-[var(--color-primary)] focus-within:ring-2 focus-within:ring-[var(--color-primary)]">
                <Search size={16} className="text-gray-400 shrink-0" />
                <input
                  type="text"
                  value={schoolSearch}
                  onChange={(e) => setSchoolSearch(e.target.value)}
                  placeholder="Type your school name (e.g. Stance)"
                  className="flex-1 bg-transparent text-sm outline-none text-gray-900 placeholder-gray-400"
                  autoFocus
                />
                {searchingSchools && (
                  <Loader2
                    size={14}
                    className="animate-spin text-gray-400 shrink-0"
                  />
                )}
              </div>
              {schoolSearch.length >= 2 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-56 overflow-y-auto z-10">
                  {schoolResults.length === 0 && !searchingSchools ? (
                    <p className="px-4 py-3 text-xs text-gray-500">
                      No schools found. Try a different name.
                    </p>
                  ) : (
                    schoolResults.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => selectSchool(s)}
                        className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-gray-50 text-left border-b border-gray-100 last:border-b-0"
                      >
                        <Check size={14} className="text-gray-300 shrink-0" />
                        <span className="text-sm text-gray-800">{s.name}</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Login forms — only show when school selected */}
        {schoolSlug && (
          <>
            <div className="relative flex bg-gray-100 rounded-xl p-1 mb-6">
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
                    ? "text-[var(--color-primary)]"
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
                    ? "text-[var(--color-primary)]"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Phone Number
              </button>
            </div>

            <div
              className={`overflow-hidden transition-all duration-300 ease-out ${
                error ? "max-h-40 opacity-100 mb-4" : "max-h-0 opacity-0 mb-0"
              }`}
            >
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            </div>

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
                    onChange={(e) => {
                      const clean = e.target.value
                        .toUpperCase()
                        .replace(/[\u2010-\u2015]/g, "-")
                        .replace(/[^A-Z0-9\-]/g, "");
                      setStudentCode(clean);
                    }}
                    placeholder="eg. CISF32026003 or CIS-F3-2026-003"
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm font-mono text-gray-900 placeholder-gray-400 outline-none transition-all duration-300 focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                  />
                  <p className="text-xs text-gray-400 mt-1.5">
                    Enter the ID with or without hyphens — both work
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Child&apos;s Date of Birth
                  </label>
                  <div className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 rounded-xl text-sm transition-all duration-300 focus-within:ring-2 focus-within:ring-[var(--color-primary)] focus-within:border-transparent">
                    <input
                      ref={dayRef}
                      type="text"
                      inputMode="numeric"
                      placeholder="DD"
                      value={dobDay}
                      onChange={(e) => handleDobDay(e.target.value)}
                      maxLength={2}
                      autoComplete="off"
                      className="w-14 py-1 text-center text-base bg-transparent border-0 outline-none ring-0 focus:ring-0 text-gray-900 placeholder-gray-400"
                    />
                    <span className="text-gray-400">-</span>
                    <input
                      ref={monthRef}
                      type="text"
                      inputMode="numeric"
                      placeholder="MM"
                      value={dobMonth}
                      onChange={(e) => handleDobMonth(e.target.value)}
                      onKeyDown={(e) => dobBackspace(e, dobMonth, dayRef)}
                      maxLength={2}
                      autoComplete="off"
                      className="w-14 py-1 text-center text-base bg-transparent border-0 outline-none ring-0 focus:ring-0 text-gray-900 placeholder-gray-400"
                    />
                    <span className="text-gray-400">-</span>
                    <input
                      ref={yearRef}
                      type="text"
                      inputMode="numeric"
                      placeholder="YYYY"
                      value={dobYear}
                      onChange={(e) => handleDobYear(e.target.value)}
                      onKeyDown={(e) => dobBackspace(e, dobYear, monthRef)}
                      maxLength={4}
                      autoComplete="off"
                      className="w-20 py-1 text-center text-base bg-transparent border-0 outline-none ring-0 focus:ring-0 text-gray-900 placeholder-gray-400"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="group w-full flex items-center justify-center gap-2 bg-[var(--color-primary)] text-white py-3 rounded-xl font-medium text-sm transition-all duration-300 hover:bg-[var(--color-primary-dark)] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Signing
                      in...
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
                          : "bg-white border-gray-300 focus-within:border-[var(--color-primary)] focus-within:shadow-[0_0_0_3px_var(--color-primary-ring)]"
                      }`}
                    >
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
                          setPhone(
                            e.target.value.replace(/\D/g, "").slice(0, 9),
                          )
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
                        className="px-4 py-3 bg-[var(--color-primary)] text-white rounded-xl text-sm font-medium transition-all duration-300 hover:bg-[var(--color-primary-dark)] disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap flex items-center justify-center min-w-[92px]"
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
                        onChange={(e) =>
                          setOtp(e.target.value.replace(/\D/g, ""))
                        }
                        placeholder="Enter 6-digit code"
                        maxLength={6}
                        required
                        autoFocus
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl text-center text-lg font-mono tracking-[0.5em] text-gray-900 placeholder-gray-300 outline-none transition-all duration-300 focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                      />
                      <p className="text-xs text-gray-400 mt-1.5 text-center">
                        Code sent to +265{phone}
                      </p>
                    </div>
                    <button
                      type="submit"
                      disabled={loading || otp.length < 6}
                      className="group w-full flex items-center justify-center gap-2 bg-[var(--color-primary)] text-white py-3 rounded-xl font-medium text-sm transition-all duration-300 hover:bg-[var(--color-primary-dark)] disabled:opacity-50 disabled:cursor-not-allowed"
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
          </>
        )}
      </div>

      <p className="text-xs text-gray-400 mt-6">
        SchoolPay Malawi © {new Date().getFullYear()}
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-white">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--color-primary)]" />
        </div>
      }
    >
      <LoginPageInner />
    </Suspense>
  );
}
