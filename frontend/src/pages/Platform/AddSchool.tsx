// frontend/src/pages/Platform/AddSchool.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import platformApi from "../../lib/platformApi";

export default function PlatformAddSchool() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [trialDays, setTrialDays] = useState<number | "">("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<{ email: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const body: any = { email };
      if (schoolName.trim()) body.schoolName = schoolName.trim();
      if (trialDays !== "" && Number(trialDays) >= 0)
        body.trialDays = Number(trialDays);

      const res = await platformApi.post("/platform/schools/invite", body);
      setSuccess({ email: res.data.data.admin.email });
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to invite");
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="p-8 max-w-2xl">
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-green-100 text-green-700 text-2xl mb-4">
            ✓
          </div>
          <h1 className="text-xl font-semibold text-slate-900 mb-2">
            Invitation sent
          </h1>
          <p className="text-sm text-slate-600 mb-1">
            We&apos;ve emailed the invitation to:
          </p>
          <p className="text-sm font-medium text-slate-900 mb-6">
            {success.email}
          </p>
          <p className="text-xs text-slate-500 mb-6">
            The link expires in 7 days. When they accept, they&apos;ll complete
            the school profile themselves — name, address, logo, staff,
            students.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => navigate("/platform/dashboard")}
              className="rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold px-4 py-2"
            >
              Back to Dashboard
            </button>
            <button
              onClick={() => {
                setSuccess(null);
                setEmail("");
                setSchoolName("");
                setTrialDays("");
              }}
              className="rounded-lg border border-slate-300 hover:bg-slate-50 text-sm font-medium px-4 py-2"
            >
              Invite another
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-semibold text-slate-900 mb-2">
        Invite a School
      </h1>
      <p className="text-sm text-slate-500 mb-6">
        Enter the admin&apos;s email only. They will complete the school profile
        after accepting the invitation.
      </p>

      <form
        onSubmit={handleSubmit}
        className="bg-white border border-slate-200 rounded-xl p-6 space-y-5"
      >
        {error && (
          <div className="text-sm rounded-lg bg-red-50 border border-red-200 text-red-700 px-3 py-2">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Admin Email *
          </label>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@school.mw"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
          <p className="text-xs text-slate-500 mt-1">
            The invitation link and setup instructions will be sent here.
          </p>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            School Name (optional)
          </label>
          <input
            value={schoolName}
            onChange={(e) => setSchoolName(e.target.value)}
            placeholder="Leave blank to let them set it"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Trial Days (optional)
          </label>
          <input
            type="number"
            min={0}
            value={trialDays}
            onChange={(e) =>
              setTrialDays(e.target.value === "" ? "" : Number(e.target.value))
            }
            placeholder="Default from platform settings"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
          <p className="text-xs text-slate-500 mt-1">
            You can extend it later if they need more time.
          </p>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-lg border border-slate-300 hover:bg-slate-50 text-sm font-medium px-4 py-2"
          >
            Cancel
          </button>
          <button
            disabled={submitting}
            className="rounded-lg bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white text-sm font-semibold px-4 py-2"
          >
            {submitting ? "Sending..." : "Send Invitation"}
          </button>
        </div>
      </form>
    </div>
  );
}
