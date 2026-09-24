import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import api from "../../lib/axios";
import { School, Eye, EyeOff, Loader2 } from "lucide-react";

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const { slug } = useParams();

  const [form, setForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [schoolBranding, setSchoolBranding] = useState<{
    name: string;
    logo: string | null;
    motto: string | null;
  } | null>(null);

  useEffect(() => {
    if (slug) {
      api
        .get(`/schools/by-slug/${slug}`)
        .then((res) => setSchoolBranding(res.data.data))
        .catch(() => setSchoolBranding(null));
      return;
    }
    const stored = localStorage.getItem("lastSchoolBranding");
    if (stored) {
      try {
        setSchoolBranding(JSON.parse(stored));
      } catch {
        setSchoolBranding(null);
      }
    }
  }, [slug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await api.post("/auth/staff/login", form);
      const { token, staff } = res.data.data;
      login(token, staff);

      if (staff.school) {
        localStorage.setItem(
          "lastSchoolBranding",
          JSON.stringify({
            name: staff.school.name,
            logo: staff.school.logo,
            motto: staff.school.motto,
          }),
        );
      }
      navigate("/dashboard");
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Login failed. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-[url('/images/background.png')] bg-cover bg-center bg-no-repeat">
      {/* Dark overlay for contrast */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 py-10">
        {/* Logo */}
        <div className="mb-6 flex items-center justify-center">
          {schoolBranding?.logo ? (
            <img
              src={schoolBranding.logo}
              alt={schoolBranding.name || "School"}
              className="h-16 w-auto object-contain"
            />
          ) : (
            <div className="w-14 h-14 bg-[#0B1F44] rounded-2xl flex items-center justify-center">
              <School size={28} className="text-white" />
            </div>
          )}
        </div>

        {/* Heading */}
        <h1 className="text-3xl font-bold text-white text-center tracking-tight">
          Welcome back
        </h1>
        <p className="text-sm text-white/80 mt-2 mb-8 text-center">
          Welcome back. Let&apos;s get your work done.
        </p>

        {/* Card */}
        <div className="w-full max-w-md bg-white border border-gray-200 rounded-2xl p-8">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Username
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="stAndrews"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-[#0B1F44] focus:border-transparent transition-all duration-300"
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-[#0B1F44] focus:border-transparent transition-all duration-300 pr-12"
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
              disabled={loading}
              className="w-full bg-[#0B1F44] hover:bg-[#0a1a3a] disabled:bg-[#0B1F44]/50 text-white font-medium py-3 rounded-lg transition-all duration-300 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 size={18} className="animate-spin" />}
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </div>

        {/* Divider */}
        <div className="w-full max-w-md mt-8 flex items-center gap-4">
          <div className="flex-1 h-px bg-white/30" />
          <span className="text-xs text-white/80 whitespace-nowrap">
            Contact{" "}
            <a
              href="mailto:info@stpeters.mw"
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
          © {new Date().getFullYear()}{" "}
          {schoolBranding?.name || "St. Andrew's International High School"}.
          All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default Login;
