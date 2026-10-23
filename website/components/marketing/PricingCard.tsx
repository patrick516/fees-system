import { CheckCircle } from "lucide-react";

interface PricingCardProps {
  onSelectTier: (tier: "SMALL" | "MEDIUM" | "LARGE") => void;
}

export default function PricingCard({ onSelectTier }: PricingCardProps) {
  return (
    <section id="pricing" className="py-16 bg-gray-50 border-t border-gray-100">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
            Simple, transparent pricing
          </h2>
          <p className="text-gray-600 max-w-xl mx-auto">
            No hidden costs. Pay per term based on your school size. Hosting,
            backups, and support included.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {/* Small School */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 flex flex-col hover:border-[var(--color-primary)]/40 transition-colors">
            <h3 className="text-lg font-bold text-gray-800">Small School</h3>
            <p className="text-xs text-gray-500 mb-4">Up to 150 students</p>
            <div className="mb-6">
              <p className="text-4xl font-extrabold text-gray-900">MWK 150k</p>
              <p className="text-sm text-gray-500">per term</p>
            </div>
            <ul className="space-y-3 mb-8 flex-1">
              {[
                "Unlimited staff accounts",
                "OneKhusa online payments",
                "Bulk SMS & Email alerts",
                "Financial reports & PDF receipts",
              ].map((item, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm text-gray-700"
                >
                  <CheckCircle
                    size={16}
                    className="text-[var(--color-primary)] shrink-0 mt-0.5"
                  />{" "}
                  {item}
                </li>
              ))}
            </ul>
            <button
              onClick={() => onSelectTier("SMALL")}
              className="block w-full text-center border-2 border-[var(--color-primary)] text-[var(--color-primary)] py-3 rounded-xl font-bold hover:bg-[var(--color-primary-light)] transition-colors"
            >
              Start Free Trial
            </button>
          </div>

          {/* Medium School (Popular) */}
          <div className="bg-white rounded-2xl shadow-xl border-2 border-[var(--color-primary)] p-8 flex flex-col relative transform md:-translate-y-2">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[var(--color-primary)] text-white text-xs font-bold px-4 py-1 rounded-full shadow-md whitespace-nowrap">
              MOST POPULAR
            </div>
            <h3 className="text-lg font-bold text-gray-800">Medium School</h3>
            <p className="text-xs text-gray-500 mb-4">151 to 400 students</p>
            <div className="mb-6">
              <p className="text-4xl font-extrabold text-gray-900">MWK 250k</p>
              <p className="text-sm text-gray-500">per term</p>
            </div>
            <ul className="space-y-3 mb-8 flex-1">
              {[
                "Everything in Small",
                "Exam results & ranking",
                "Student promotion",
                "Audit trail & advanced reports",
              ].map((item, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm text-gray-700"
                >
                  <CheckCircle
                    size={16}
                    className="text-[var(--color-primary)] shrink-0 mt-0.5"
                  />{" "}
                  {item}
                </li>
              ))}
            </ul>
            <button
              onClick={() => onSelectTier("MEDIUM")}
              className="block w-full text-center bg-[var(--color-primary)] text-white py-3 rounded-xl font-bold hover:bg-[var(--color-primary-dark)] transition-colors shadow-md"
            >
              Start Free Trial
            </button>
          </div>

          {/* Large School */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 flex flex-col hover:border-[var(--color-primary)]/40 transition-colors">
            <h3 className="text-lg font-bold text-gray-800">Large School</h3>
            <p className="text-xs text-gray-500 mb-4">Over 400 students</p>
            <div className="mb-6">
              <p className="text-4xl font-extrabold text-gray-900">MWK 400k</p>
              <p className="text-sm text-gray-500">per term</p>
            </div>
            <ul className="space-y-3 mb-8 flex-1">
              {[
                "Everything in Medium",
                "Priority WhatsApp support",
                "Dedicated onboarding",
                "Custom report templates",
              ].map((item, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm text-gray-700"
                >
                  <CheckCircle
                    size={16}
                    className="text-[var(--color-primary)] shrink-0 mt-0.5"
                  />{" "}
                  {item}
                </li>
              ))}
            </ul>
            <button
              onClick={() => onSelectTier("LARGE")}
              className="block w-full text-center border-2 border-[var(--color-primary)] text-[var(--color-primary)] py-3 rounded-xl font-bold hover:bg-[var(--color-primary-light)] transition-colors"
            >
              Start Free Trial
            </button>
          </div>
        </div>

        {/* Fine Print */}
        <div className="mt-10 max-w-4xl mx-auto text-center space-y-2">
          <p className="text-sm text-gray-600 font-medium">
            💡 Pay the full year upfront and get{" "}
            <strong className="text-[var(--color-primary)]">10% off</strong>.
          </p>
          <p className="text-xs text-gray-500">
            One-time setup & training: MWK 100,000 (waived for schools that join
            after the pilot).
          </p>
          <p className="text-xs text-gray-500">
            SMS credits: MK20 per SMS, bought in bundles (e.g., MK50,000 for
            2,500 SMS).
          </p>
        </div>
      </div>
    </section>
  );
}
