"use client";
import Link from "next/link";
import {
  CheckCircle,
  ArrowRight,
  ShieldCheck,
  Smartphone,
  BarChart3,
  Users,
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center sticky top-0 z-50">
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
          <Link
            href="/login"
            className="text-sm font-semibold text-[var(--color-primary)] bg-[var(--color-primary-light)] px-5 py-2.5 rounded-full hover:bg-[var(--color-primary)] hover:text-white transition-all"
          >
            Parent Login
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="max-w-6xl mx-auto px-6 py-20 text-center">
        <h1 className="text-5xl md:text-6xl font-extrabold text-gray-900 tracking-tight leading-tight mb-6">
          Simple, secure{" "}
          <span className="text-[var(--color-primary)]">
            school fee management
          </span>
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-10">
          Collect fees online, track debtors, and generate financial reports
          instantly. Built for Malawian schools.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Link
            href="/platform/login"
            className="flex items-center justify-center gap-2 bg-[var(--color-primary)] text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-[var(--color-primary-dark)] transition-all shadow-lg hover:shadow-xl"
          >
            School Admin Login <ArrowRight size={18} />
          </Link>
          <Link
            href="#demo"
            className="flex items-center justify-center gap-2 bg-white text-gray-700 border border-gray-300 px-8 py-4 rounded-xl text-lg font-semibold hover:bg-gray-50 transition-all"
          >
            Book a Demo
          </Link>
        </div>
      </header>

      {/* Features Section */}
      <section
        id="features"
        className="bg-white py-20 border-t border-gray-100"
      >
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-16">
            Everything your school needs
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: Smartphone,
                title: "OneKhusa Integration",
                desc: "Parents pay with Airtel Money or TNM Mpamba instantly.",
              },
              {
                icon: BarChart3,
                title: "Financial Reports",
                desc: "Track collections, debtor ageing, and daily cash-ups automatically.",
              },
              {
                icon: ShieldCheck,
                title: "Secure & Verified",
                desc: "Every payment is verified, receipted, and audit-logged.",
              },
              {
                icon: Users,
                title: "Multi-Tenant",
                desc: "Manage multiple schools under one platform effortlessly.",
              },
              {
                icon: CheckCircle,
                title: "Discounts & Bursaries",
                desc: "Apply scholarships and staff child discounts with ease.",
              },
              {
                icon: CheckCircle,
                title: "Parent Portal",
                desc: "Parents view balances, pay online, and download receipts.",
              },
            ].map((feat, i) => (
              <div
                key={i}
                className="p-6 rounded-2xl bg-gray-50 border border-gray-100 hover:border-[var(--color-primary)] hover:shadow-md transition-all"
              >
                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-[var(--color-primary)] mb-4 shadow-sm">
                  <feat.icon size={24} />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">
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
      <section id="pricing" className="py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Simple, transparent pricing
          </h2>
          <p className="text-gray-600 mb-12">
            No hidden fees. Only pay per term.
          </p>
          <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-10 max-w-lg mx-auto">
            <h3 className="text-xl font-semibold text-gray-800 mb-2">
              Term Subscription
            </h3>
            <p className="text-5xl font-extrabold text-[var(--color-primary)] mb-6">
              MWK 250,000{" "}
              <span className="text-base font-medium text-gray-400">
                / term
              </span>
            </p>
            <ul className="space-y-4 mb-8 text-left">
              {[
                "Unlimited students",
                "Unlimited staff accounts",
                "OneKhusa integration",
                "Automated receipts & SMS alerts",
                "Financial reporting suite",
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-gray-700">
                  <CheckCircle
                    size={18}
                    className="text-[var(--color-primary)] shrink-0"
                  />{" "}
                  {item}
                </li>
              ))}
            </ul>
            <Link
              href="/platform/login"
              className="block w-full bg-[var(--color-primary)] text-white py-4 rounded-xl font-bold text-lg hover:bg-[var(--color-primary-dark)] transition-colors"
            >
              Start Free Trial
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12 text-center text-sm">
        <p>
          © {new Date().getFullYear()} Tranptech Group. All rights reserved.
        </p>
        <p className="mt-2">SchoolPay is a product of Tranptech Systems.</p>
      </footer>
    </div>
  );
}
