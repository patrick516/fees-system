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
    // 1. If a slug is in the URL, that always takes priority (e.g. shared
    //    branded links, or a different school signing in on a shared device).
    if (slug) {
      api
        .get(`/schools/by-slug/${slug}`)
        .then((res) => setSchoolBranding(res.data.data))
        .catch(() => setSchoolBranding(null));
      return;
    }

    // 2. Otherwise, fall back to whatever school last logged in on this device.
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

      // Remember this school's branding on this device so /login shows it
      // automatically next time, without needing the slug in the URL.
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
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-blue-700 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-900 rounded-2xl flex items-center justify-center mx-auto mb-4 overflow-hidden">
            {schoolBranding?.logo ? (
              <img
                src={schoolBranding.logo}
                alt={schoolBranding.name}
                className="w-full h-full object-contain"
              />
            ) : (
              <School size={32} className="text-white" />
            )}
          </div>
          <h1 className="text-2xl font-bold text-gray-900">SchoolPay</h1>
          {schoolBranding?.name && (
            <p className="text-gray-700 text-sm font-medium mt-1">
              {schoolBranding.name}
            </p>
          )}
          <p className="text-gray-500 text-sm mt-1">
            Staff Portal — Sign in to continue
          </p>
          {schoolBranding?.motto && (
            <p className="text-blue-700 text-xs italic mt-1">
              "{schoolBranding.motto}"
            </p>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-6">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="your@email.com"
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
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
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Enter your password"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-900 hover:bg-blue-800 disabled:bg-blue-300 text-white font-medium py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {loading && <Loader2 size={18} className="animate-spin" />}
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="text-center text-gray-400 text-xs mt-8">
          SchoolPay Malawi © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
};

export default Login;
