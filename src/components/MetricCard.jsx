export default function MetricCard({ label, value, tone = "default" }) {
  return (
<<<<<<< HEAD
    <div className={`bg-white rounded-2xl shadow-md p-4 grid gap-1 ${tone === "success" ? "border-l-[6px] border-green-600" : tone === "danger" ? "border-l-[6px] border-red-600" : ""}`}>
      <span className="text-slate-500 text-sm">{label}</span>
=======
    <div className={`metric-card metric-${tone}`}>
      <span className="muted small-label">{label}</span>
>>>>>>> f230ff4d41077ea9e3a32311e6cbac8c8bb22f66
      <strong>{value}</strong>
    </div>
  );
}
