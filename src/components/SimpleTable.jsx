export default function SimpleTable({ columns, rows, emptyLabel = "No data yet." }) {
  if (!rows.length) return <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50/70 p-5 text-slate-500">{emptyLabel}</div>;

  return (
    <div className="overflow-x-auto rounded-3xl border border-slate-100 bg-white/65">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-slate-50/80">
            {columns.map((column) => (
              <th key={column.key} className="border-b border-slate-100 p-3 text-left text-sm uppercase tracking-wide text-slate-500">{column.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.id || index} className="transition-colors hover:bg-slate-50/80">
              {columns.map((column) => (
                <td key={column.key} className="border-b border-slate-100 p-3 text-left">{column.render ? column.render(row) : row[column.key]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
