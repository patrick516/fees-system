"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { School, Loader2, ChevronRight } from "lucide-react";

export default function Home() {
  const router = useRouter();
  const [slug, setSlug] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = slug
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "");
    if (!cleaned) return;
    setLoading(true);
    router.push(`/${cleaned}`);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4 py-10">
      <div className="w-16 h-16 bg-[#0B1F44] rounded-2xl flex items-center justify-center mb-4 shadow-sm">
        <School size={30} className="text-white" />
      </div>
      <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
        SchoolPay
      </h1>
      <p className="text-sm text-gray-400 mt-1 mb-8">
        Parent &amp; Guardian Portal
      </p>

      <div className="w-full max-w-sm bg-white border border-gray-200 rounded-2xl p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              School Code
            </label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase())}
              placeholder="eg. st-andrews"
              autoFocus
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm text-gray-900 placeholder-gray-400 outline-none transition-all duration-300 focus:ring-2 focus:ring-[#0B1F44] focus:border-transparent font-mono"
            />
            <p className="text-xs text-gray-400 mt-1.5">
              Ask your school office if you don&apos;t know your code
            </p>
          </div>
          <button
            type="submit"
            disabled={!slug.trim() || loading}
            className="group w-full flex items-center justify-center gap-2 bg-[#0B1F44] text-white py-3 rounded-xl font-medium text-sm transition-all duration-300 hover:bg-[#0A1A3A] disabled:bg-[#0B1F44]/50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Loading...
              </>
            ) : (
              <>
                Continue
                <ChevronRight
                  size={16}
                  className="transition-transform duration-300 group-hover:translate-x-0.5"
                />
              </>
            )}
          </button>
        </form>
      </div>

      <p className="text-xs text-gray-400 mt-6">
        SchoolPay Malawi © {new Date().getFullYear()}
      </p>
    </div>
  );
}
