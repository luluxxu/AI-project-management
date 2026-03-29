export default function SectionCard({ title, subtitle, action, children }) {
  return (
    <section className="section-card">
      <div className="section-head">
        <div>
          <h2>{title}</h2>
          {subtitle ? <p className="muted">{subtitle}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
