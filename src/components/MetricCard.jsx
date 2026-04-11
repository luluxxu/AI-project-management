export default function MetricCard({ label, value, tone = "default", progress = null }) {
  const clampedProgress = typeof progress === "number" ? Math.max(0, Math.min(100, progress)) : null;

  return (
    <div className={`bg-white rounded-2xl shadow-md p-4 grid gap-1 ${tone === "success" ? "border-l-[6px] border-green-600" : tone === "danger" ? "border-l-[6px] border-red-600" : ""}`}>
      <span className="text-slate-500 text-sm">{label}</span>
      <strong>{value}</strong>
      {clampedProgress !== null ? (
        <div className="mt-2">
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className={`${tone === "success" ? "bg-green-500" : tone === "danger" ? "bg-red-500" : "bg-blue-500"} h-full rounded-full transition-all duration-300`}
              style={{ width: `${clampedProgress}%` }}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
