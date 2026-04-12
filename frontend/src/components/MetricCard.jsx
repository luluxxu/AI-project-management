export default function MetricCard({ label, value, tone = "default", progress = null }) {
  const clampedProgress = typeof progress === "number" ? Math.max(0, Math.min(100, progress)) : null;
  const borderTone = tone === "success" ? "border-l-[6px] border-[#4C5C2D]" : tone === "danger" ? "border-l-[6px] border-[#1B0C0C]" : "";
  const progressTone = tone === "success" ? "bg-[#4C5C2D]" : tone === "danger" ? "bg-[#1B0C0C]" : "bg-[#FFDE42]";

  return (
    <div className={`bg-[#fff9ea] rounded-2xl shadow-md p-4 grid gap-1 ${borderTone}`}>
      <span className="text-[#5c543e] text-sm">{label}</span>
      <strong className="text-[#1B0C0C]">{value}</strong>
      {clampedProgress !== null ? (
        <div className="mt-2">
          <div className="h-2 overflow-hidden rounded-full bg-[#f0e7c3]">
            <div
              className={`${progressTone} h-full rounded-full transition-all duration-300`}
              style={{ width: `${clampedProgress}%` }}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
