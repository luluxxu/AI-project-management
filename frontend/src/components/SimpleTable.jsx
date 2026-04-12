import { useState, useMemo } from "react";

export default function SimpleTable({ columns, rows, emptyLabel = "No data yet.", sortable = false }) {
  const [sortField, setSortField] = useState("");
  const [sortDir, setSortDir] = useState("asc");

  const toggleSort = (key) => {
    if (!sortable) return;
    if (sortField === key) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(key);
      setSortDir("asc");
    }
  };

  const sortedRows = useMemo(() => {
    if (!sortable || !sortField) return rows;

    const col = columns.find((c) => c.key === sortField);
    return [...rows].sort((a, b) => {
      let valA, valB;

      if (col?.sortValue) {
        valA = col.sortValue(a);
        valB = col.sortValue(b);
      } else {
        valA = a[sortField] ?? "";
        valB = b[sortField] ?? "";
      }

      let cmp;
      if (typeof valA === "number" && typeof valB === "number") {
        cmp = valA - valB;
      } else {
        cmp = String(valA).localeCompare(String(valB));
      }
      return sortDir === "desc" ? -cmp : cmp;
    });
  }, [rows, sortField, sortDir, sortable, columns]);

  if (!rows.length) return <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50/70 p-5 text-slate-500">{emptyLabel}</div>;

  return (
    <div className="overflow-x-auto rounded-3xl border border-slate-100 bg-white/65">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-slate-50/80">
            {columns.map((column) => (
              <th
                key={column.key}
                className={`border-b border-slate-100 p-3 text-left text-[0.8rem] uppercase tracking-wide text-slate-500${sortable ? " cursor-pointer select-none hover:text-slate-700" : ""}`}
                onClick={() => toggleSort(column.key)}
              >
                {column.label}
                {sortable && sortField === column.key && (
                  <span className="ml-1">{sortDir === "asc" ? "\u25B2" : "\u25BC"}</span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((row, index) => (
            <tr key={row.id || index} className="transition-colors hover:bg-slate-50/80">
              {columns.map((column) => (
                <td key={column.key} className="border-b border-slate-100 p-3 text-left text-[0.9rem]">{column.render ? column.render(row) : row[column.key]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
