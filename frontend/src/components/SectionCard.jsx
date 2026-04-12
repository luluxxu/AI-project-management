export default function SectionCard({ title, subtitle, action, children }) {
  return (
    <section className="rounded-[28px] border border-white/70 bg-white/82 p-5 shadow-[0_18px_38px_rgba(148,163,184,0.14)] backdrop-blur-md">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h2 className="m-0 text-xl font-semibold tracking-tight text-slate-900">{title}</h2>
          {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
