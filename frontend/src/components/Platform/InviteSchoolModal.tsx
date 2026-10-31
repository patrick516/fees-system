import { useEffect, useState } from "react";
import { CheckCircle2, Building2, Users } from "lucide-react";
import platformApi from "../../lib/platformApi";
import Modal from "./Modal";

interface Props {
  open: boolean;
  onClose: () => void;
  /** Called after an invite is sent, so the parent can refresh its list */
  onInvited?: () => void;
}

const inputCls =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600";

export default function InviteSchoolModal({ open, onClose, onInvited }: Props) {
  const [email, setEmail] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [trialDays, setTrialDays] = useState<number | "">("");
  const [adminType, setAdminType] = useState<"SINGLE_ADMIN" | "GROUP_DIRECTOR">(
    "SINGLE_ADMIN",
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);

  const reset = () => {
    setEmail("");
    setSchoolName("");
    setTrialDays("");
    setAdminType("SINGLE_ADMIN");
    setError("");
    setSentTo(null);
  };

  // Start fresh every time the modal opens
  useEffect(() => {
    if (open) reset();
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const body: any = { email, adminType };
      if (schoolName.trim()) body.schoolName = schoolName.trim();
      if (trialDays !== "" && Number(trialDays) >= 0)
        body.trialDays = Number(trialDays);

      const res = await platformApi.post("/platform/schools/invite", body);
      setSentTo(res.data.data.admin.email);
      onInvited?.();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to invite");
    } finally {
      setSubmitting(false);
    }
  };

  // ---------- Success view ----------
  if (sentTo) {
    return (
      <Modal
        open={open}
        onClose={onClose}
        title="Invitation sent"
        size="md"
        footer={
          <>
            <button
              type="button"
              onClick={reset}
              className="rounded-lg border border-slate-300 hover:bg-white text-sm font-medium px-4 py-2"
            >
              Invite another
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold px-4 py-2"
            >
              Done
            </button>
          </>
        }
      >
        <div className="text-center py-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-green-100 text-green-700 mb-4">
            <CheckCircle2 size={28} />
          </div>
          <p className="text-sm text-slate-600 mb-1">
            We&apos;ve emailed the invitation to:
          </p>
          <p className="text-sm font-medium text-slate-900 mb-4">{sentTo}</p>
          <p className="text-xs text-slate-500">
            The link expires in 7 days. When they accept, they&apos;ll complete
            the school profile themselves.
            {adminType === "GROUP_DIRECTOR" &&
              " As a Group Director, they will also be able to add and manage additional schools under their group."}
          </p>
        </div>
      </Modal>
    );
  }

  // ---------- Form view ----------
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Invite a School"
      subtitle="Create a new school and invite an admin to manage it."
      size="md"
      busy={submitting}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-lg border border-slate-300 hover:bg-white text-sm font-medium px-4 py-2"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="invite-school-form"
            disabled={submitting}
            className="rounded-lg bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white text-sm font-semibold px-4 py-2"
          >
            {submitting ? "Sending..." : "Send Invitation"}
          </button>
        </>
      }
    >
      <form
        id="invite-school-form"
        onSubmit={handleSubmit}
        className="space-y-4"
      >
        {error && (
          <div className="text-sm rounded-lg bg-red-50 border border-red-200 text-red-700 px-3 py-2">
            {error}
          </div>
        )}

        {/* 🎯 ADMIN TYPE SELECTOR */}
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-2">
            What kind of admin is this?
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setAdminType("SINGLE_ADMIN")}
              className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all ${
                adminType === "SINGLE_ADMIN"
                  ? "border-blue-600 bg-blue-50/50 ring-2 ring-blue-600/20"
                  : "border-slate-200 hover:border-slate-300 bg-white"
              }`}
            >
              <Building2
                size={24}
                className={
                  adminType === "SINGLE_ADMIN"
                    ? "text-blue-600"
                    : "text-slate-400"
                }
              />
              <span className="text-sm font-semibold text-slate-900 text-center">
                Single School
              </span>
              <span className="text-[10px] text-slate-500 text-center leading-tight">
                Manages only this school
              </span>
            </button>

            <button
              type="button"
              onClick={() => setAdminType("GROUP_DIRECTOR")}
              className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all ${
                adminType === "GROUP_DIRECTOR"
                  ? "border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-600/20"
                  : "border-slate-200 hover:border-slate-300 bg-white"
              }`}
            >
              <Users
                size={24}
                className={
                  adminType === "GROUP_DIRECTOR"
                    ? "text-indigo-600"
                    : "text-slate-400"
                }
              />
              <span className="text-sm font-semibold text-slate-900 text-center">
                Group Director
              </span>
              <span className="text-[10px] text-slate-500 text-center leading-tight">
                Manages multiple schools
              </span>
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Admin Email *
          </label>
          <input
            required
            autoFocus
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@school.mw"
            className={inputCls}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            School Name (optional)
          </label>
          <input
            value={schoolName}
            onChange={(e) => setSchoolName(e.target.value)}
            placeholder={
              adminType === "GROUP_DIRECTOR"
                ? "e.g., Tranptech Group (first school)"
                : "Leave blank to let them set it"
            }
            className={inputCls}
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
            className={inputCls}
          />
        </div>
      </form>
    </Modal>
  );
}
