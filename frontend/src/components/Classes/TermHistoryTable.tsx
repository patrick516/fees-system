import { useNavigate } from "react-router-dom";
import { History, FileBarChart } from "lucide-react";

const formatDate = (iso?: string | null) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const termLabel = (t?: string | null) =>
  t ? t.replace("_", " ").replace("TERM", "Term") : "";

interface Props {
  history: any[];
  activeTerm: any;
}

export default function TermHistoryTable({ history, activeTerm }: Props) {
  const navigate = useNavigate();

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
        <History size={16} className="text-[var(--color-primary)]" />
        <div>
          <h3 className="font-medium text-gray-800">Term History</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Every term the school has ever run — with its financials
          </p>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr className="text-left text-gray-500">
              <th className="px-6 py-2.5 text-xs font-medium uppercase">
                Term
              </th>
              <th className="px-6 py-2.5 text-xs font-medium uppercase">
                Year
              </th>
              <th className="px-6 py-2.5 text-xs font-medium uppercase">
                Dates
              </th>
              <th className="px-6 py-2.5 text-xs font-medium uppercase text-right">
                Collected
              </th>
              <th className="px-6 py-2.5 text-xs font-medium uppercase text-right">
                Outstanding
              </th>
              <th className="px-6 py-2.5 text-xs font-medium uppercase text-center">
                Debtors
              </th>
              <th className="px-6 py-2.5 text-xs font-medium uppercase text-right">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {history.map((t: any) => {
              const isActive =
                activeTerm?.activeTerm === t.term &&
                activeTerm?.activeAcademicYear === t.academicYear;
              return (
                <tr
                  key={t.id}
                  className={`hover:bg-gray-50 ${isActive ? "bg-blue-50/40" : ""}`}
                >
                  <td className="px-6 py-3 font-medium text-gray-800">
                    {termLabel(t.term)}
                    {isActive && (
                      <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">
                        Active
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-3 text-gray-600">{t.academicYear}</td>
                  <td className="px-6 py-3 text-xs text-gray-500">
                    {t.startDate || t.endDate ? (
                      <>
                        {formatDate(t.startDate)} — {formatDate(t.endDate)}
                      </>
                    ) : (
                      <span className="italic text-gray-400">No dates</span>
                    )}
                  </td>
                  <td className="px-6 py-3 text-right font-medium text-green-700">
                    MWK {Number(t.totalCollected || 0).toLocaleString()}
                  </td>
                  <td
                    className={`px-6 py-3 text-right font-medium ${Number(t.outstanding) > 0 ? "text-red-600" : "text-green-600"}`}
                  >
                    {Number(t.outstanding) > 0
                      ? `MWK ${Number(t.outstanding).toLocaleString()}`
                      : "✓ Clear"}
                  </td>
                  <td className="px-6 py-3 text-center">
                    {t.debtors > 0 ? (
                      <span className="text-red-600 font-medium">
                        {t.debtors}
                      </span>
                    ) : (
                      <span className="text-gray-400">0</span>
                    )}
                  </td>
                  <td className="px-6 py-3 text-right">
                    <button
                      onClick={() =>
                        navigate(
                          `/reports?term=${t.term}&academicYear=${t.academicYear}`,
                        )
                      }
                      className="inline-flex items-center gap-1 text-xs font-medium text-[var(--color-primary-dark)] hover:text-[var(--color-primary)]"
                    >
                      <FileBarChart size={12} /> View Report
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
