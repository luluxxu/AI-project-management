export default function SimpleTable({ columns, rows, emptyLabel = "No data yet." }) {
<<<<<<< HEAD
  if (!rows.length) return <div className="p-4 border border-dashed border-slate-300 rounded-2xl text-slate-500">{emptyLabel}</div>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} className="text-left p-3 text-sm text-slate-500 uppercase tracking-wide border-b border-slate-100">{column.label}</th>
=======
  if (!rows.length) return <div className="empty-state">{emptyLabel}</div>;

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key}>{column.label}</th>
>>>>>>> f230ff4d41077ea9e3a32311e6cbac8c8bb22f66
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.id || index}>
              {columns.map((column) => (
<<<<<<< HEAD
                <td key={column.key} className="text-left p-3 border-b border-slate-100">{column.render ? column.render(row) : row[column.key]}</td>
=======
                <td key={column.key}>{column.render ? column.render(row) : row[column.key]}</td>
>>>>>>> f230ff4d41077ea9e3a32311e6cbac8c8bb22f66
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
