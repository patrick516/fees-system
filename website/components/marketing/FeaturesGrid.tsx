import {
  Smartphone,
  BarChart3,
  ShieldCheck,
  Users,
  CheckCircle,
  FileSpreadsheet,
  MessageSquare,
  GraduationCap,
  ArrowUpRight,
} from "lucide-react";

export default function FeaturesGrid() {
  const features = [
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
      icon: FileSpreadsheet,
      title: "Exam & Results",
      desc: "Upload marks from Excel. Get grades, class rankings, and analytics instantly.",
    },
    {
      icon: MessageSquare,
      title: "Bulk SMS Alerts",
      desc: "Send fee reminders and announcements. Siblings share one SMS to save costs.",
    },
    {
      icon: CheckCircle,
      title: "Discounts & Bursaries",
      desc: "Apply OVC scholarships, staff child discounts, and sibling waivers with one click.",
    },
    {
      icon: ShieldCheck,
      title: "Audit Trail",
      desc: "Every payment, login, and modification is logged. Nothing disappears.",
    },
    {
      icon: Users,
      title: "Multi-Tenant",
      desc: "Manage multiple schools under one platform effortlessly. Perfect for groups.",
    },
    {
      icon: GraduationCap,
      title: "Student Promotion",
      desc: "Move whole classes up at the end of the year with automatic student code generation.",
    },
    {
      icon: ArrowUpRight,
      title: "Parent Portal",
      desc: "Parents view balances, pay online, and download official PDF receipts anytime.",
    },
  ];

  return (
    <section id="features" className="bg-white py-16 border-t border-gray-100">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
            Everything your school needs
          </h2>
          <p className="text-gray-600 max-w-xl mx-auto">
            Stop using manual ledgers. Move your bursary to the cloud and save
            hours every week.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((feat, i) => (
            <div
              key={i}
              className="p-5 rounded-xl bg-gray-50 border border-gray-100 hover:bg-white hover:border-[var(--color-primary)]/30 hover:shadow-md transition-all duration-300"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-[var(--color-primary-light)] rounded-lg flex items-center justify-center text-[var(--color-primary)] shrink-0">
                  <feat.icon size={20} />
                </div>
                <h3 className="text-base font-bold text-gray-900">
                  {feat.title}
                </h3>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">
                {feat.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
