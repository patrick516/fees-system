export default function StatsTicker() {
  const stats = [
    { value: "MWK 50M+", label: "Fees Processed" },
    { value: "1,200+", label: "Active Students" },
    { value: "99.9%", label: "Uptime" },
    { value: "5 Sec", label: "Average Payment Confirmation" },
  ];

  return (
    <div className="bg-[var(--color-primary)] py-8 border-y border-blue-800/20">
      <div className="max-w-6xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-6 text-center text-white">
        {stats.map((s, i) => (
          <div key={i}>
            <p className="text-2xl md:text-3xl font-extrabold">{s.value}</p>
            <p className="text-xs md:text-sm text-blue-100 font-medium mt-1 uppercase tracking-wider">
              {s.label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
