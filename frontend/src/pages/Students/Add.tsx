import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, CalendarIcon } from "lucide-react";
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
import { Calendar } from "../../components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../components/ui/popover";
import { getCurrentAcademicYear } from "../../lib/utils";
import { useActiveTerm } from "../../hooks/useActiveTerm";

const AddStudent = () => {
  const navigate = useNavigate();
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [dateOfBirth, setDateOfBirth] = useState<Date | undefined>(undefined);
  const [dobOpen, setDobOpen] = useState(false);

  // Active term from admin — single source of truth for academic year
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

  // Sync the form's academic year once the activated value loads
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
      setError("Please select the date of birth");
      return;
    }

    setLoading(true);

    try {
      const payload = {
        ...form,
        dateOfBirth: format(dateOfBirth, "yyyy-MM-dd"),
        parentPhone2: form.parentPhone2 || undefined,
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

            {/* Date of Birth — shadcn DatePicker */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date of Birth *
              </label>
              <Popover open={dobOpen} onOpenChange={setDobOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="w-full flex items-center justify-between px-4 py-2 border border-gray-300 rounded-lg text-sm text-left focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    endMonth={new Date()}
                    defaultMonth={dateOfBirth || new Date(2015, 0, 1)}
                    autoFocus
                  />
                </PopoverContent>
              </Popover>
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
                  <SelectItem
                    value="MALE"
                    className="cursor-pointer mx-1 my-0.5 rounded-md pl-3 pr-7 focus:bg-gray-100 focus:text-gray-900 data-[highlighted]:bg-gray-100 data-[highlighted]:text-gray-900"
                  >
                    Male
                  </SelectItem>
                  <SelectItem
                    value="FEMALE"
                    className="cursor-pointer mx-1 my-0.5 rounded-md pl-3 pr-7 focus:bg-gray-100 focus:text-gray-900 data-[highlighted]:bg-gray-100 data-[highlighted]:text-gray-900"
                  >
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
                    <SelectItem
                      key={c.id}
                      value={c.id}
                      className="cursor-pointer mx-1 my-0.5 rounded-md pl-3 pr-7 focus:bg-gray-100 focus:text-gray-900 data-[highlighted]:bg-gray-100 data-[highlighted]:text-gray-900"
                    >
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number *{" "}
                <span className="text-gray-400 font-normal">(for SMS)</span>
              </label>
              <input
                name="parentPhone"
                value={form.parentPhone}
                onChange={handleChange}
                required
                placeholder="+265999123456"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Second Phone{" "}
                <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                name="parentPhone2"
                value={form.parentPhone2}
                onChange={handleChange}
                placeholder="+265888654321"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
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
            ✅ {success}
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
