export default function MetricCard({ label, value, tone = "default" }) {
  return (
    <div className={`metric-card metric-${tone}`}>
      <span className="muted small-label">{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
