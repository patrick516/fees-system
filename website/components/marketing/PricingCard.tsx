import { CheckCircle } from "lucide-react";

export interface Tier {
  id: string;
  name: string;
  price: number;
  maxStudents: number;
  description: string;
  features: string[];
  popular?: boolean;
}

interface PricingCardProps {
  tiers: Tier[];
  loading?: boolean;
  onSelectTier: (tierId: string) => void;
}

// Format 150000 → "150k", 1500000 → "1.5M"
const formatPrice = (price: number): string => {
  if (price >= 1_000_000) {
    return `${(price / 1_000_000).toLocaleString(undefined, { maximumFractionDigits: 1 })}M`;
  }
  if (price >= 1_000) {
    return `${(price / 1_000).toLocaleString()}k`;
  }
  return price.toLocaleString();
};

export default function PricingCard({
  tiers,
  loading,
  onSelectTier,
}: PricingCardProps) {
  // Loading skeleton
  if (loading) {
    return (
      <section
        id="pricing"
        className="py-16 bg-gray-50 border-t border-gray-100"
      >
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
              Simple, transparent pricing
            </h2>
            <p className="text-gray-600 max-w-xl mx-auto">Loading plans...</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 h-96 animate-pulse"
              >
                <div className="h-6 bg-gray-200 rounded w-1/2 mb-4" />
                <div className="h-4 bg-gray-100 rounded w-3/4 mb-6" />
                <div className="h-10 bg-gray-200 rounded w-2/3 mb-8" />
                <div className="space-y-3">
                  {[1, 2, 3, 4].map((j) => (
                    <div key={j} className="h-4 bg-gray-100 rounded w-full" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // No tiers configured
  if (!tiers || tiers.length === 0) {
    return (
      <section
        id="pricing"
        className="py-16 bg-gray-50 border-t border-gray-100"
      >
        <div className="max-w-2xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
            Contact us for pricing
          </h2>
          <p className="text-gray-600 mb-8">
            Book a free demo and our team will walk you through the best plan
            for your school's size and needs.
          </p>
          <a
            href="#demo"
            className="inline-block bg-[var(--color-primary)] text-white px-6 py-3 rounded-xl font-semibold hover:bg-[var(--color-primary-dark)] transition-colors"
          >
            Contact Us
          </a>
        </div>
      </section>
    );
  }

  // Which tier gets the "popular" badge?
  const explicitPopularIndex = tiers.findIndex((t) => t.popular === true);
  const popularIndex =
    explicitPopularIndex !== -1
      ? explicitPopularIndex
      : Math.floor(tiers.length / 2);

  // Adaptive grid based on tier count
  const gridCols =
    tiers.length === 1
      ? "grid-cols-1 max-w-md"
      : tiers.length === 2
        ? "grid-cols-1 md:grid-cols-2 max-w-3xl"
        : tiers.length === 3
          ? "grid-cols-1 md:grid-cols-3 max-w-6xl"
          : "grid-cols-1 md:grid-cols-2 lg:grid-cols-4 max-w-7xl";

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

        <div className={`grid gap-6 mx-auto ${gridCols}`}>
          {tiers.map((tier, index) => {
            const isPopular = index === popularIndex;
            return (
              <div
                key={tier.id}
                className={`bg-white rounded-2xl p-8 flex flex-col relative transition-colors ${
                  isPopular
                    ? "shadow-xl border-2 border-[var(--color-primary)] md:-translate-y-2"
                    : "shadow-sm border border-gray-200 hover:border-[var(--color-primary)]/40"
                }`}
              >
                {isPopular && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[var(--color-primary)] text-white text-xs font-bold px-4 py-1 rounded-full shadow-md whitespace-nowrap">
                    MOST POPULAR
                  </div>
                )}

                <h3 className="text-lg font-bold text-gray-800">{tier.name}</h3>
                <p className="text-xs text-gray-500 mb-4">{tier.description}</p>

                <div className="mb-6">
                  <p className="text-4xl font-extrabold text-gray-900">
                    MWK {formatPrice(tier.price)}
                  </p>
                  <p className="text-sm text-gray-500">per term</p>
                </div>

                <ul className="space-y-3 mb-8 flex-1">
                  {tier.features?.map((item, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-sm text-gray-700"
                    >
                      <CheckCircle
                        size={16}
                        className="text-[var(--color-primary)] shrink-0 mt-0.5"
                      />
                      {item}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => onSelectTier(tier.id)}
                  className={`block w-full text-center py-3 rounded-xl font-bold transition-colors ${
                    isPopular
                      ? "bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-dark)] shadow-md"
                      : "border-2 border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-primary-light)]"
                  }`}
                >
                  Start Free Trial
                </button>
              </div>
            );
          })}
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
