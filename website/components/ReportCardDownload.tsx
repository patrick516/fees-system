"use client";
import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import api from "../lib/axios";
import { toast } from "sonner";

interface Props {
  studentId: string;
  term: string;
  academicYear: string;
}

export default function ReportCardDownload({
  studentId,
  term,
  academicYear,
}: Props) {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      //  We use responseType: "blob" because the backend returns a PDF file
      const res = await api.get("/reports/report-card", {
        params: { studentId, term, academicYear },
        responseType: "blob",
      });

      // Create a temporary URL for the PDF blob
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Report_Card_${term}_${academicYear}.pdf`);

      // Trigger download
      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error(err);
      if (err.response?.status === 404) {
        toast.error("Report card not ready yet. Please wait for exam results.");
      } else {
        toast.error("Failed to download report card. Try again.");
      }
    } finally {
      setDownloading(false);
    }
  };

  return (
    <button
      onClick={handleDownload}
      disabled={downloading}
      className="flex items-center justify-center gap-2 w-full bg-blue-900 hover:bg-blue-800 text-white py-3 rounded-xl text-sm font-semibold transition-colors disabled:opacity-60 shadow-sm mt-2"
    >
      {downloading ? (
        <Loader2 size={16} className="animate-spin" />
      ) : (
        <Download size={16} />
      )}
      {downloading ? "Generating PDF..." : "Download Report Card (PDF)"}
    </button>
  );
}
