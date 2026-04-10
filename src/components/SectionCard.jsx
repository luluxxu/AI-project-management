export default function SectionCard({ title, subtitle, action, children }) {
  return (
<<<<<<< HEAD
    <section className="bg-white rounded-2xl shadow-md p-4">
      <div className="flex justify-between items-center gap-4 mb-4">
        <div>
          <h2>{title}</h2>
          {subtitle ? <p className="text-slate-500">{subtitle}</p> : null}
=======
    <section className="section-card">
      <div className="section-head">
        <div>
          <h2>{title}</h2>
          {subtitle ? <p className="muted">{subtitle}</p> : null}
>>>>>>> f230ff4d41077ea9e3a32311e6cbac8c8bb22f66
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
