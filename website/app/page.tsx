"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle,
  X,
  PlayCircle,
  Settings,
  Rocket,
  School,
} from "lucide-react";
import api from "../lib/axios";

import DashboardPreview from "../components/marketing/DashboardPreview";
import StatsTicker from "../components/marketing/StatsTicker";
import FeaturesGrid from "../components/marketing/FeaturesGrid";
import PricingCard, { type Tier } from "../components/marketing/PricingCard";

export default function HomePage() {
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [selectedTier, setSelectedTier] = useState<string>("SMALL");

  // 🎯 Dynamic tiers fetched from backend
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [loadingTiers, setLoadingTiers] = useState(true);

  const [form, setForm] = useState({
    name: "",
    email: "",
    schoolName: "",
    phone: "",
  });

  // 🎯 Fetch tiers from backend on mount
  useEffect(() => {
    api
      .get("/schools/tiers")
      .then((res) => setTiers(res.data.data || []))
      .catch(() => setTiers([]))
      .finally(() => setLoadingTiers(false));
  }, []);

  // 🎯 Opens modal AND sets the correct tier
  const openModalWithTier = (tierId: string) => {
    setSelectedTier(tierId);
    setSuccess(false);
    setShowDemoModal(true);
  };

  // 🎯 Get dynamic label for the selected tier (for the modal banner)
  const getTierLabel = (tierId: string): string => {
    const tier = tiers.find((t) => t.id === tierId);
    if (!tier) return tierId;
    const limit =
      tier.maxStudents >= 99999
        ? "Unlimited students"
        : `Up to ${tier.maxStudents.toLocaleString()} students`;
    return `${tier.name} (${limit})`;
  };

  const handleBookDemo = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/school-requests", {
        ...form,
        tier: selectedTier,
      });
      setSuccess(true);
    } catch (err) {
      alert("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Default tier for hero "Book a Demo" — use popular or first
  const defaultTier = (): string => {
    if (tiers.length === 0) return "SMALL";
    const explicit = tiers.find((t) => t.popular === true);
    if (explicit) return explicit.id;
    if (tiers.length > 1) return tiers[Math.floor(tiers.length / 2)].id;
    return tiers[0].id;
  };

  return (
    <div className="min-h-screen bg-white font-sans overflow-x-hidden">
      {/* Navbar */}
      <nav className="bg-white/90 backdrop-blur-md border-b border-gray-100 px-6 py-3 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <img
            src="/images/SchoolPayLogo.jpg"
            alt="SchoolPay"
            className="h-10 w-10 object-contain rounded-lg shadow-sm"
          />
          <span className="text-xl font-bold text-gray-900 tracking-tight">
            SchoolPay
          </span>
        </div>
        <div className="flex items-center gap-6">
          <Link
            href="#features"
            className="text-sm font-medium text-gray-600 hover:text-gray-900 hidden md:block"
          >
            Features
          </Link>
          <Link
            href="#pricing"
            className="text-sm font-medium text-gray-600 hover:text-gray-900 hidden md:block"
          >
            Pricing
          </Link>
          <Link
            href="/login"
            className="text-sm font-semibold text-[var(--color-primary)] bg-[var(--color-primary-light)] px-5 py-2 rounded-full hover:bg-[var(--color-primary)] hover:text-white transition-all"
          >
            Parent Login
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <header className="max-w-6xl mx-auto px-6 pt-16 pb-8 text-center relative z-10">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 font-medium text-xs mb-5 border border-blue-100 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
          Trusted by schools across Malawi
        </div>
        <h1 className="text-4xl md:text-6xl font-extrabold text-gray-900 tracking-tight leading-[1.1] mb-5">
          Simple, secure <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--color-primary)] to-blue-500">
            school fee management
          </span>
        </h1>
        <p className="text-base md:text-lg text-gray-600 max-w-2xl mx-auto mb-8 leading-relaxed">
          Collect fees online, track debtors instantly, and generate financial
          reports with one click. Built specifically for Malawian schools.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-3">
          <button
            onClick={() => openModalWithTier(defaultTier())}
            className="flex items-center justify-center gap-2 bg-[var(--color-primary)] text-white px-8 py-3.5 rounded-xl text-base font-semibold hover:bg-[var(--color-primary-dark)] transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
          >
            Book a Free Demo <ArrowRight size={18} />
          </button>
          <a
            href="https://fees-system-one.vercel.app/login"
            className="flex items-center justify-center gap-2 bg-white text-gray-700 border border-gray-200 px-8 py-3.5 rounded-xl text-base font-semibold hover:bg-gray-50 transition-all shadow-sm"
          >
            School Admin Login
          </a>
        </div>
      </header>

      <div className="relative z-10 pb-16 px-4">
        <DashboardPreview />
      </div>

      <StatsTicker />

      {/* Free Pilot Banner */}
      <section className="bg-[var(--color-primary-light)] border-b border-[var(--color-primary)]/20 py-10">
        <div className="max-w-5xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h2 className="text-2xl font-bold text-[var(--color-primary-dark)] mb-2">
              Try SchoolPay free for one full term.
            </h2>
            <p className="text-sm text-[var(--color-primary)] max-w-xl">
              We'll set up your classes, fees, and students. Training is
              included. At the end of the term, decide if you want to continue.
              If not, we hand over your data.
            </p>
          </div>
          <button
            onClick={() => openModalWithTier(defaultTier())}
            className="shrink-0 bg-white text-[var(--color-primary)] px-6 py-3 rounded-xl font-bold shadow-sm hover:shadow-md transition-all border border-gray-200"
          >
            Claim Your Pilot
          </button>
        </div>
      </section>

      <FeaturesGrid />

      {/* How it works */}
      <section className="py-16 bg-gray-50 border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">
              How it works
            </h2>
            <p className="text-gray-600">
              From demo to live in a few simple steps.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              {
                step: "1",
                title: "30-Minute Demo",
                desc: "We visit your school (or do a video call) to show you how it works.",
                icon: PlayCircle,
              },
              {
                step: "2",
                title: "Setup & Training",
                desc: "We set up your classes, fees, and student list. We train your bursar.",
                icon: Settings,
              },
              {
                step: "3",
                title: "Free Pilot Term",
                desc: "Use the full system free for one full term. No commitment.",
                icon: School,
              },
              {
                step: "4",
                title: "Go Live",
                desc: "If you love it, you continue on the termly plan. We handle the rest.",
                icon: Rocket,
              },
            ].map((item, i) => (
              <div
                key={i}
                className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm relative"
              >
                <div className="absolute -top-3 -left-3 w-8 h-8 bg-[var(--color-primary)] text-white rounded-full flex items-center justify-center font-bold text-sm border-4 border-white shadow-sm">
                  {item.step}
                </div>
                <item.icon
                  size={24}
                  className="text-[var(--color-primary)] mb-4 mt-2"
                />
                <h3 className="font-bold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-xs text-gray-600 leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 🎯 Dynamic Pricing Section */}
      <PricingCard
        tiers={tiers}
        loading={loadingTiers}
        onSelectTier={openModalWithTier}
      />

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-10 text-center text-sm border-t border-gray-800">
        <div className="flex justify-center items-center gap-3 mb-3">
          <img
            src="/images/SchoolPayLogo.jpg"
            alt="SchoolPay"
            className="h-8 w-8 object-contain rounded-lg grayscale opacity-50"
          />
          <span className="text-white font-bold text-lg">SchoolPay</span>
        </div>
        <p>
          © {new Date().getFullYear()} Tranptech Group. All rights reserved.
        </p>
        <p className="mt-1">A product of Tranptech Systems. Built in Malawi.</p>
        <div className="flex justify-center gap-4 mt-4 text-xs">
          <a href="#" className="hover:text-white transition-colors">
            Privacy Policy
          </a>
          <a href="#" className="hover:text-white transition-colors">
            Terms of Service
          </a>
          <a
            href="mailto:kulinjipatricks@gmail.com"
            className="hover:text-white transition-colors"
          >
            Contact Support
          </a>
        </div>
      </footer>

      {/* 🎯 MODAL */}
      {showDemoModal && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setShowDemoModal(false)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {success ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle size={32} className="text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Request Received!
                </h3>
                <p className="text-sm text-gray-500 mb-6">
                  We've got your details for the{" "}
                  <strong>{getTierLabel(selectedTier)}</strong> plan. Our team
                  will review it and email your school login link{" "}
                  <strong>within 24 hours</strong>.
                </p>
                <button
                  onClick={() => {
                    setShowDemoModal(false);
                    setSuccess(false);
                    setForm({ name: "", email: "", schoolName: "", phone: "" });
                  }}
                  className="w-full bg-[var(--color-primary)] text-white py-3 rounded-xl font-semibold"
                >
                  Done
                </button>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-gray-900">
                    Request Your School Account
                  </h3>
                  <button
                    onClick={() => setShowDemoModal(false)}
                    className="text-gray-400 hover:text-gray-700"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* 🎯 Dynamic tier banner */}
                <div className="bg-[var(--color-primary-light)] border border-[var(--color-primary)]/20 p-3 rounded-xl mb-4">
                  <p className="text-[10px] font-semibold text-[var(--color-primary-dark)] uppercase tracking-wide mb-0.5">
                    Selected Plan
                  </p>
                  <p className="text-sm font-bold text-[var(--color-primary)]">
                    {getTierLabel(selectedTier)}
                  </p>
                </div>

                <p className="text-xs text-gray-500 mb-4">
                  Fill in your details below. Once submitted, our team will
                  review your request and email your login link{" "}
                  <strong>within 24 hours</strong>.
                </p>

                <form onSubmit={handleBookDemo} className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Your Name *
                    </label>
                    <input
                      required
                      value={form.name}
                      onChange={(e) =>
                        setForm({ ...form, name: e.target.value })
                      }
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[var(--color-primary)] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      School Name *
                    </label>
                    <input
                      required
                      value={form.schoolName}
                      onChange={(e) =>
                        setForm({ ...form, schoolName: e.target.value })
                      }
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[var(--color-primary)] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      value={form.email}
                      onChange={(e) =>
                        setForm({ ...form, email: e.target.value })
                      }
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[var(--color-primary)] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      required
                      value={form.phone}
                      onChange={(e) =>
                        setForm({ ...form, phone: e.target.value })
                      }
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[var(--color-primary)] outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-[var(--color-primary)] text-white py-3 rounded-xl font-semibold mt-2 disabled:opacity-50"
                  >
                    {loading ? "Sending Request..." : "Submit Request"}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
