import { useEffect, useState } from "react";
import { CheckCircle2, AlertTriangle, Info, X } from "lucide-react";
import { subscribeToToast } from "../../lib/toast";

export default function ToastContainer() {
  const [toastState, setToastState] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);

  useEffect(() => {
    return subscribeToToast(setToastState);
  }, []);

  if (!toastState) return null;

  const bg =
    toastState.type === "success"
      ? "bg-green-50 border-green-200 text-green-800"
      : toastState.type === "error"
        ? "bg-red-50 border-red-200 text-red-800"
        : "bg-blue-50 border-blue-200 text-blue-800";

  const Icon =
    toastState.type === "success"
      ? CheckCircle2
      : toastState.type === "error"
        ? AlertTriangle
        : Info;

  return (
    <div className="fixed bottom-6 right-6 z-[100] animate-in fade-in slide-in-from-bottom-4 duration-200">
      <div
        className={`flex items-start gap-3 border rounded-xl px-4 py-3 shadow-lg max-w-sm ${bg}`}
      >
        <Icon size={18} className="shrink-0 mt-0.5" />
        <p className="text-sm font-medium flex-1">{toastState.message}</p>
        <button
          onClick={() => setToastState(null)}
          className="shrink-0 opacity-60 hover:opacity-100"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
