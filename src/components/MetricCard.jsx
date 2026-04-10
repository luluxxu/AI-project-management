export default function MetricCard({ label, value, tone = "default" }) {
  return (
    <div className={`bg-white rounded-2xl shadow-md p-4 grid gap-1 ${tone === "success" ? "border-l-[6px] border-green-600" : tone === "danger" ? "border-l-[6px] border-red-600" : ""}`}>
      <span className="text-slate-500 text-sm">{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
