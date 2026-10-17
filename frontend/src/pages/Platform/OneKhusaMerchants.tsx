import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Loader2,
  CheckCircle2,
  Search,
  AlertTriangle,
  X,
  Link as LinkIcon,
} from "lucide-react";
import platformApi from "../../lib/platformApi";

interface Merchant {
  accountNumber: string;
  accountName: string;
  status: string;
  balance: number;
  currency: string;
  dateCreated: string;
  linkedSchool: { id: string; name: string } | null;
}

interface SchoolOption {
  id: string;
  name: string;
  onekhusaMerchantAccount: string | null;
}

export default function PlatformOneKhusaMerchants() {
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [schools, setSchools] = useState<SchoolOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  // Link Modal State
  const [linkingMerchant, setLinkingMerchant] = useState<Merchant | null>(null);
  const [selectedSchoolId, setSelectedSchoolId] = useState("");
  const [isLinking, setIsLinking] = useState(false);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [merchantsRes, schoolsRes] = await Promise.all([
        platformApi.get("/platform/onekhusa/merchants"),
        platformApi.get("/platform/schools"),
      ]);
      setMerchants(merchantsRes.data.data || []);
      setSchools(schoolsRes.data.data || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to load merchants");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleLink = async () => {
    if (!linkingMerchant || !selectedSchoolId) return;
    setIsLinking(true);
    try {
      // Reuses your existing OneKhusa update endpoint
      await platformApi.put(`/platform/schools/${selectedSchoolId}/onekhusa`, {
        merchantAccount: linkingMerchant.accountNumber,
      });
      setLinkingMerchant(null);
      setSelectedSchoolId("");
      load(); // Refresh the list
    } catch (err: any) {
      alert(err?.response?.data?.message || "Failed to link school");
    } finally {
      setIsLinking(false);
    }
  };

  const filtered = merchants.filter(
    (m) =>
      m.accountName.toLowerCase().includes(search.toLowerCase()) ||
      m.accountNumber.includes(search) ||
      (m.linkedSchool?.name || "").toLowerCase().includes(search.toLowerCase()),
  );

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="animate-spin text-slate-400" size={32} />
      </div>
    );
  }

  return (
    <div className="p-8 w-full max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            OneKhusa Merchants
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Live view of your OneKhusa merchant accounts and their KYC status.
          </p>
        </div>
        <div className="relative w-72">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            placeholder="Search merchant or school..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>
      </div>

      {error && (
        <div className="mb-6 text-sm rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-3">
          {error}
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-[11px] uppercase text-left border-b border-slate-200">
              <tr>
                <th className="px-5 py-3 font-medium">Merchant / Account</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Linked School</th>
                <th className="px-5 py-3 font-medium text-right">Balance</th>
                <th className="px-5 py-3 font-medium text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-12 text-center text-slate-500"
                  >
                    No merchants found matching your search.
                  </td>
                </tr>
              ) : (
                filtered.map((m) => (
                  <tr key={m.accountNumber} className="hover:bg-slate-50">
                    <td className="px-5 py-4">
                      <p className="font-medium text-slate-900">
                        {m.accountName}
                      </p>
                      <p className="text-xs font-mono text-slate-500 mt-0.5">
                        {m.accountNumber}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full ${
                          m.status === "Active"
                            ? "bg-green-100 text-green-700"
                            : m.status.includes("Pending") ||
                                m.status.includes("KYC")
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-red-100 text-red-700"
                        }`}
                      >
                        {m.status === "Active" ? (
                          <CheckCircle2 size={12} />
                        ) : (
                          <AlertTriangle size={12} />
                        )}
                        {m.status}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      {m.linkedSchool ? (
                        <Link
                          to={`/platform/schools/${m.linkedSchool.id}`}
                          className="text-sm text-blue-700 hover:underline font-medium"
                        >
                          {m.linkedSchool.name}
                        </Link>
                      ) : (
                        <span className="text-xs text-slate-400 italic">
                          Not linked to a school
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right font-mono font-medium text-slate-900">
                      {m.currency} {Number(m.balance).toLocaleString()}
                    </td>
                    <td className="px-5 py-4 text-center">
                      {m.linkedSchool ? (
                        <Link
                          to={`/platform/schools/${m.linkedSchool.id}`}
                          className="text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition"
                        >
                          Manage
                        </Link>
                      ) : (
                        <button
                          onClick={() => setLinkingMerchant(m)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition"
                        >
                          <LinkIcon size={12} /> Link School
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ==================== LINK SCHOOL MODAL ==================== */}
      {linkingMerchant && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">
                Link Merchant to School
              </h3>
              <button
                onClick={() => setLinkingMerchant(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X size={20} />
              </button>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mb-5">
              <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold mb-1">
                Merchant Account
              </p>
              <p className="font-medium text-slate-900">
                {linkingMerchant.accountName}
              </p>
              <p className="font-mono text-xs text-slate-600 mt-0.5">
                {linkingMerchant.accountNumber}
              </p>
            </div>

            <div className="mb-5">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Select a School
              </label>
              <select
                value={selectedSchoolId}
                onChange={(e) => setSelectedSchoolId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white"
              >
                <option value="" disabled>
                  — Choose a school —
                </option>
                {schools.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}{" "}
                    {s.onekhusaMerchantAccount
                      ? `(Currently has ${s.onekhusaMerchantAccount})`
                      : ""}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-500 mt-2">
                ⚠️ Warning: If the school already has a merchant account, this
                will replace it.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setLinkingMerchant(null)}
                disabled={isLinking}
                className="rounded-lg border border-slate-300 hover:bg-slate-50 text-sm font-medium px-4 py-2"
              >
                Cancel
              </button>
              <button
                onClick={handleLink}
                disabled={isLinking || !selectedSchoolId}
                className="rounded-lg bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white text-sm font-semibold px-4 py-2 flex items-center gap-2"
              >
                {isLinking ? (
                  <>
                    <Loader2 className="animate-spin" size={14} /> Linking...
                  </>
                ) : (
                  "Confirm Link"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
