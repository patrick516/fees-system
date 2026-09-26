import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { format } from "date-fns";
import api from "../../lib/axios";
import type { Class } from "../../types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { getCurrentAcademicYear } from "../../lib/utils";
import { useActiveTerm } from "../../hooks/useActiveTerm";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const ITEM_CLASS =
  "cursor-pointer mx-1 my-0.5 rounded-md pl-3 pr-7 focus:bg-gray-100 focus:text-gray-900 data-[highlighted]:bg-gray-100 data-[highlighted]:text-gray-900";

const AddStudent = () => {
  const navigate = useNavigate();
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // DOB split into three parts (day/month/year) driven by shadcn Selects
  const [dobDay, setDobDay] = useState("");
  const [dobMonth, setDobMonth] = useState(""); // "1" .. "12"
  const [dobYear, setDobYear] = useState("");

  const { academicYear: activeYear } = useActiveTerm();

  const [form, setForm] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    gender: "",
    classId: "",
    parentName: "",
    parentPhone: "",
    parentPhone2: "",
    parentEmail: "",
    academicYear: getCurrentAcademicYear(),
  });

  // Years list — current year down to 1950
  const YEARS = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const years: number[] = [];
    for (let y = currentYear; y >= 1950; y--) years.push(y);
    return years;
  }, []);

  // Days in the selected month/year (or 31 if month not picked yet)
  const daysInMonth = useMemo(() => {
    if (!dobMonth || !dobYear) return 31;
    const y = parseInt(dobYear);
    const m = parseInt(dobMonth);
    return new Date(y, m, 0).getDate(); // 0 gives last day of previous month
  }, [dobMonth, dobYear]);

  // Derived Date object — undefined unless all three parts are set and valid
  const dateOfBirth = useMemo(() => {
    if (!dobDay || !dobMonth || !dobYear) return undefined;
    const y = parseInt(dobYear);
    const m = parseInt(dobMonth);
    const d = parseInt(dobDay);
    const date = new Date(y, m - 1, d);
    // Reject overflow (e.g. Feb 30 → Mar 2)
    if (
      date.getFullYear() !== y ||
      date.getMonth() !== m - 1 ||
      date.getDate() !== d
    ) {
      return undefined;
    }
    return date;
  }, [dobDay, dobMonth, dobYear]);

  // If the day exceeds the days in the newly chosen month, clear it
  useEffect(() => {
    if (!dobDay) return;
    const d = parseInt(dobDay);
    if (d > daysInMonth) setDobDay("");
  }, [daysInMonth, dobDay]);

  useEffect(() => {
    if (activeYear) {
      setForm((prev) => ({ ...prev, academicYear: activeYear }));
    }
  }, [activeYear]);

  useEffect(() => {
    api
      .get("/schools/classes")
      .then((res) => {
        setClasses(res.data.data);
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!form.firstName.trim() || !form.lastName.trim()) {
      setError("First name and last name are required");
      return;
    }

    if (!form.gender || !form.classId) {
      setError("Please select gender and class");
      return;
    }

    if (!dateOfBirth) {
      setError("Please select a valid date of birth");
      return;
    }

    if (form.parentPhone.length !== 9) {
      setError("Please enter the full 9-digit parent phone number");
      return;
    }

    if (form.parentPhone2 && form.parentPhone2.length !== 9) {
      setError("Second phone must be 9 digits (or leave it empty)");
      return;
    }

    setLoading(true);

    try {
      const payload = {
        ...form,
        dateOfBirth: format(dateOfBirth, "yyyy-MM-dd"),
        parentPhone: `+265${form.parentPhone}`,
        parentPhone2: form.parentPhone2
          ? `+265${form.parentPhone2}`
          : undefined,
        parentEmail: form.parentEmail || undefined,
      };
      const res = await api.post("/students", payload);
      setSuccess(
        `Student ${res.data.data.fullName} added! ID: ${res.data.data.studentCode}`,
      );
      setTimeout(() => navigate("/students"), 2000);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to add student");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handlePhoneChange = (
    field: "parentPhone" | "parentPhone2",
    value: string,
  ) => {
    const digits = value.replace(/\D/g, "").slice(0, 9);
    setForm((prev) => ({ ...prev, [field]: digits }));
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate("/students")}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft size={20} className="text-gray-600" />
        </button>
        <div>
          <h2 className="text-lg font-semibold text-gray-800">
            Add New Student
          </h2>
          <p className="text-sm text-gray-500">
            Fill in student and parent details
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Student Info */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-medium text-gray-800 mb-4">
            Student Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Student Name *
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input
                  name="firstName"
                  value={form.firstName}
                  onChange={handleChange}
                  required
                  placeholder="First name"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  name="middleName"
                  value={form.middleName}
                  onChange={handleChange}
                  placeholder="Middle name (optional)"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  name="lastName"
                  value={form.lastName}
                  onChange={handleChange}
                  required
                  placeholder="Last name"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Date of Birth — three shadcn Selects */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date of Birth *
              </label>
              <div className="grid grid-cols-[80px_1fr_100px] gap-2">
                {/* Day */}
                <Select value={dobDay} onValueChange={setDobDay}>
                  <SelectTrigger className="w-full bg-transparent border-gray-300 rounded-lg text-sm h-[38px]">
                    <SelectValue placeholder="Day" />
                  </SelectTrigger>
                  <SelectContent className="bg-white max-h-[240px] w-auto min-w-[80px]">
                    {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(
                      (d) => (
                        <SelectItem
                          key={d}
                          value={String(d)}
                          className={ITEM_CLASS}
                        >
                          {d}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>

                {/* Month */}
                <Select value={dobMonth} onValueChange={setDobMonth}>
                  <SelectTrigger className="w-full bg-transparent border-gray-300 rounded-lg text-sm h-[38px]">
                    <SelectValue placeholder="Month" />
                  </SelectTrigger>
                  <SelectContent className="bg-white max-h-[240px] w-auto min-w-[160px]">
                    {MONTHS.map((m, i) => (
                      <SelectItem
                        key={m}
                        value={String(i + 1)}
                        className={ITEM_CLASS}
                      >
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Year */}
                <Select value={dobYear} onValueChange={setDobYear}>
                  <SelectTrigger className="w-full bg-transparent border-gray-300 rounded-lg text-sm h-[38px]">
                    <SelectValue placeholder="Year" />
                  </SelectTrigger>
                  <SelectContent className="bg-white max-h-[240px] w-auto min-w-[100px]">
                    {YEARS.map((y) => (
                      <SelectItem
                        key={y}
                        value={String(y)}
                        className={ITEM_CLASS}
                      >
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-gray-400 mt-1.5">
                {dateOfBirth
                  ? `Selected: ${format(dateOfBirth, "dd MMMM yyyy")}`
                  : "Pick day, month and year"}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Gender *
              </label>
              <Select
                value={form.gender}
                onValueChange={(v) => setForm({ ...form, gender: v })}
              >
                <SelectTrigger className="w-full bg-transparent border-gray-300 rounded-lg text-sm h-[38px]">
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent className="bg-white w-auto min-w-[140px]">
                  <SelectItem value="MALE" className={ITEM_CLASS}>
                    Male
                  </SelectItem>
                  <SelectItem value="FEMALE" className={ITEM_CLASS}>
                    Female
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Class *
              </label>
              <Select
                value={form.classId}
                onValueChange={(v) => setForm({ ...form, classId: v })}
              >
                <SelectTrigger className="w-full bg-transparent border-gray-300 rounded-lg text-sm h-[38px]">
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent className="bg-white w-auto min-w-[140px]">
                  {classes.map((c) => (
                    <SelectItem key={c.id} value={c.id} className={ITEM_CLASS}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Academic Year *
              </label>
              <input
                name="academicYear"
                value={form.academicYear}
                onChange={handleChange}
                required
                placeholder="eg. 2025-2026"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Parent Info */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-medium text-gray-800 mb-4">
            Parent / Guardian Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Parent Full Name *
              </label>
              <input
                name="parentName"
                value={form.parentName}
                onChange={handleChange}
                required
                placeholder="eg. Mary Banda"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Phone Number — +265 fixed prefix */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number *{" "}
                <span className="text-gray-400 font-normal">(for SMS)</span>
              </label>
              <div className="flex items-stretch border rounded-lg overflow-hidden transition-all duration-200 bg-white border-gray-300 focus-within:border-[#0B1F44] focus-within:shadow-[0_0_0_3px_rgba(11,31,68,0.12)]">
                <span className="flex items-center pl-4 pr-1 text-sm font-medium text-gray-700 select-none">
                  +265
                </span>
                <input
                  type="tel"
                  inputMode="numeric"
                  value={form.parentPhone}
                  onChange={(e) =>
                    handlePhoneChange("parentPhone", e.target.value)
                  }
                  placeholder="994067223"
                  required
                  className="flex-1 pr-4 py-2 bg-transparent text-sm text-gray-900 placeholder-gray-300 outline-none ring-0 focus:ring-0 focus:outline-none rounded-none"
                />
              </div>
              <p className="text-xs text-gray-400 mt-1.5">
                Type the 9-digit number (e.g. 994067223)
              </p>
            </div>

            {/* Second Phone — +265 fixed prefix */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Second Phone{" "}
                <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <div className="flex items-stretch border rounded-lg overflow-hidden transition-all duration-200 bg-white border-gray-300 focus-within:border-[#0B1F44] focus-within:shadow-[0_0_0_3px_rgba(11,31,68,0.12)]">
                <span className="flex items-center pl-4 pr-1 text-sm font-medium text-gray-700 select-none">
                  +265
                </span>
                <input
                  type="tel"
                  inputMode="numeric"
                  value={form.parentPhone2}
                  onChange={(e) =>
                    handlePhoneChange("parentPhone2", e.target.value)
                  }
                  placeholder="888654321"
                  className="flex-1 pr-4 py-2 bg-transparent text-sm text-gray-900 placeholder-gray-300 outline-none ring-0 focus:ring-0 focus:outline-none rounded-none"
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email{" "}
                <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                name="parentEmail"
                type="email"
                value={form.parentEmail}
                onChange={handleChange}
                placeholder="parent@email.com"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
            {success}
          </div>
        )}

        {/* Submit */}
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => navigate("/students")}
            className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 bg-[var(--color-primary)] text-white px-6 py-3 rounded-lg text-sm hover:bg-[var(--color-primary-dark)] disabled:opacity-40 transition-colors"
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            {loading ? "Adding..." : "Add Student"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddStudent;
