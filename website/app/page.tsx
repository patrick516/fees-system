"use client";
import { useState } from "react";
import Link from "next/link";
import {
  CheckCircle,
  ArrowRight,
  ShieldCheck,
  Smartphone,
  BarChart3,
  Users,
  X,
} from "lucide-react";
import api from "../lib/axios";

export default function HomePage() {
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    name: "",
    email: "",
    schoolName: "",
    phone: "",
  });

  const handleBookDemo = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/schools/request-demo", form);
      setSuccess(true);
    } catch (err) {
      alert("Something went wrong. Please try again or email us directly.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white font-sans">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-100 px-6 py-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <img
            src="/images/SchoolPayLogo.jpg"
            alt="SchoolPay"
            className="h-10 w-10 object-contain rounded-lg"
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
          {/* 🎯 Parent Login stays relative (points to website/app/login) */}
          <Link
            href="/login"
            className="text-sm font-semibold text-[var(--color-primary)] bg-[var(--color-primary-light)] px-5 py-2.5 rounded-full hover:bg-[var(--color-primary)] hover:text-white transition-all"
          >
            Parent Login
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="max-w-6xl mx-auto px-6 py-24 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 text-blue-700 font-medium text-sm mb-6 border border-blue-100">
          <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
          Trusted by schools across Malawi
        </div>
        <h1 className="text-5xl md:text-7xl font-extrabold text-gray-900 tracking-tight leading-[1.1] mb-6">
          Simple, secure <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--color-primary)] to-blue-500">
            school fee management
          </span>
        </h1>
        <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto mb-10 leading-relaxed">
          Collect fees online, track debtors instantly, and generate financial
          reports with one click. Built specifically for Malawian schools.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <button
            onClick={() => setShowDemoModal(true)}
            className="flex items-center justify-center gap-2 bg-[var(--color-primary)] text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-[var(--color-primary-dark)] transition-all shadow-lg hover:shadow-xl"
          >
            Book a Free Demo <ArrowRight size={18} />
          </button>
          {/* 🎯 School Admin Login points to your separate Vercel URL */}
          <a
            href="https://fees-system-one.vercel.app/login"
            className="flex items-center justify-center gap-2 bg-gray-50 text-gray-700 border border-gray-200 px-8 py-4 rounded-xl text-lg font-semibold hover:bg-gray-100 transition-all"
          >
            School Admin Login
          </a>
        </div>
      </header>

      {/* Features Section */}
      <section
        id="features"
        className="bg-gray-50 py-24 border-t border-gray-100"
      >
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Everything your school needs
            </h2>
            <p className="text-gray-600 max-w-xl mx-auto">
              Stop using manual ledgers and messy Excel sheets. Move your
              bursary to the cloud.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: Smartphone,
                title: "OneKhusa Integration",
                desc: "Parents pay with Airtel Money or TNM Mpamba. Payments confirm automatically in seconds.",
              },
              {
                icon: BarChart3,
                title: "Financial Reports",
                desc: "Track daily collections, debtor ageing, and termly financial statements automatically.",
              },
              {
                icon: ShieldCheck,
                title: "Secure & Verified",
                desc: "Every payment is verified, receipted, and audit-logged. No more lost receipt books.",
              },
              {
                icon: Users,
                title: "Multi-Tenant",
                desc: "Manage multiple schools under one platform effortlessly. Perfect for school groups.",
              },
              {
                icon: CheckCircle,
                title: "Discounts & Bursaries",
                desc: "Apply OVC scholarships, staff child discounts, and sibling waivers with a single click.",
              },
              {
                icon: CheckCircle,
                title: "Parent Portal",
                desc: "Parents view balances, pay online, and download official PDF receipts anytime.",
              },
            ].map((feat, i) => (
              <div
                key={i}
                className="p-8 rounded-2xl bg-white border border-gray-100 hover:border-[var(--color-primary)]/30 hover:shadow-xl transition-all duration-300"
              >
                <div className="w-14 h-14 bg-[var(--color-primary-light)] rounded-xl flex items-center justify-center text-[var(--color-primary)] mb-6">
                  <feat.icon size={28} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  {feat.title}
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {feat.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 bg-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Simple, transparent pricing
          </h2>
          <p className="text-gray-600 mb-16">
            No setup fees. No hidden costs. Only pay per term.
          </p>

          <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 p-10 max-w-lg mx-auto relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-[var(--color-primary)] text-white text-xs font-bold px-4 py-1 rounded-bl-lg">
              POPULAR
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">
              Term Subscription
            </h3>
            <p className="text-5xl font-extrabold text-gray-900 mb-2">
              MWK 250,000{" "}
              <span className="text-base font-medium text-gray-400">
                / term
              </span>
            </p>
            <p className="text-sm text-gray-500 mb-8">
              Everything included. No per-student fees.
            </p>

            <ul className="space-y-4 mb-8 text-left">
              {[
                "Unlimited students",
                "Unlimited staff accounts",
                "OneKhusa integration",
                "Automated SMS & Email alerts",
                "Financial reporting suite",
                "Printable PDF receipts",
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-gray-700">
                  <CheckCircle
                    size={20}
                    className="text-[var(--color-primary)] shrink-0"
                  />{" "}
                  {item}
                </li>
              ))}
            </ul>
            {/* 🎯 Start Free Trial also points to Admin Vercel URL */}
            <a
              href="https://fees-system-one.vercel.app/signup"
              className="block w-full bg-[var(--color-primary)] text-white py-4 rounded-xl font-bold text-lg hover:bg-[var(--color-primary-dark)] transition-colors"
            >
              Start Free Trial
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12 text-center text-sm border-t border-gray-800">
        <div className="flex justify-center items-center gap-3 mb-4">
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
        <p className="mt-2">A product of Tranptech Systems. Built in Malawi.</p>
        <div className="flex justify-center gap-4 mt-6">
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

      {/* BOOK DEMO MODAL */}
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
                  Request Sent!
                </h3>
                <p className="text-sm text-gray-500 mb-6">
                  Our team will contact you within 24 hours to schedule your
                  demo.
                </p>
                <button
                  onClick={() => {
                    setShowDemoModal(false);
                    setSuccess(false);
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
                    Book a Free Demo
                  </h3>
                  <button
                    onClick={() => setShowDemoModal(false)}
                    className="text-gray-400 hover:text-gray-700"
                  >
                    <X size={20} />
                  </button>
                </div>
                <p className="text-sm text-gray-500 mb-6">
                  See how SchoolPay can transform your bursary. Fill in your
                  details below.
                </p>
                <form onSubmit={handleBookDemo} className="space-y-4">
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
                    {loading ? "Sending Request..." : "Request Demo"}
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
