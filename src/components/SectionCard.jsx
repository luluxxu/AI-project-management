export default function SectionCard({ title, subtitle, action, children }) {
  return (
    <section className="bg-white rounded-2xl shadow-md p-4">
      <div className="flex justify-between items-center gap-4 mb-4">
        <div>
          <h2>{title}</h2>
          {subtitle ? <p className="text-slate-500">{subtitle}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
