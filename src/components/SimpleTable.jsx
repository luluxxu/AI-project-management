export default function SimpleTable({ columns, rows, emptyLabel = "No data yet." }) {
  if (!rows.length) return <div className="p-4 border border-dashed border-slate-300 rounded-2xl text-slate-500">{emptyLabel}</div>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} className="text-left p-3 text-sm text-slate-500 uppercase tracking-wide border-b border-slate-100">{column.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.id || index}>
              {columns.map((column) => (
                <td key={column.key} className="text-left p-3 border-b border-slate-100">{column.render ? column.render(row) : row[column.key]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
