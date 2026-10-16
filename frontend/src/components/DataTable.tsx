import { useMemo, useState } from 'react';
import type { Column, Row } from '../lib/analyze';

const PAGE = 25;
function compare(a: Row[string], b: Row[string], type: Column['type']) {
  if (a === null) return b === null ? 0 : 1; // missing values always last
  if (b === null) return -1;
  if (type === 'numeric') return Number(a) - Number(b);
  if (type === 'date') return Date.parse(String(a)) - Date.parse(String(b));
  return String(a).localeCompare(String(b));
}

export default function DataTable({ columns, rows }: { columns: Column[]; rows: Row[] }) {
  const [sort, setSort] = useState<{ col: Column; dir: 1 | -1 } | null>(null);
  const [page, setPage] = useState(0);
  const sorted = useMemo(() => {
    if (!sort) return rows;
    return rows.slice().sort((x, y) => {
      const ax = x[sort.col.name], by = y[sort.col.name];
      return ax === null || by === null ? compare(ax, by, sort.col.type) : sort.dir * compare(ax, by, sort.col.type);
    });
  }, [rows, sort]);
  const pages = Math.max(1, Math.ceil(sorted.length / PAGE));
  const cur = Math.min(page, pages - 1);
  const view = sorted.slice(cur * PAGE, (cur + 1) * PAGE);

  if (!rows.length) return <p className="rounded-md border border-line bg-white p-6 text-sm text-charcoal/70">No rows match the current search and filters.</p>;
  return (
    <div className="rounded-md border border-line bg-white">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead><tr className="border-b border-line">{columns.map(c => (
            <th key={c.name} aria-sort={sort?.col.name === c.name ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'} className="whitespace-nowrap px-3 py-2 font-medium">
              <button onClick={() => { setSort(s => (s?.col.name === c.name ? (s.dir === 1 ? { col: c, dir: -1 } : null) : { col: c, dir: 1 })); setPage(0); }} className="hover:text-forest">
                {c.name}{sort?.col.name === c.name ? (sort.dir === 1 ? ' ▲' : ' ▼') : ''}</button></th>))}</tr></thead>
          <tbody>{view.map((r, i) => (
            <tr key={i} className="border-b border-line/60">{columns.map(c => (
              <td key={c.name} className={`whitespace-nowrap px-3 py-1.5 ${c.type === 'numeric' ? 'tabular-nums' : ''}`}>{r[c.name] ?? <span className="text-charcoal/40">missing</span>}</td>))}</tr>))}</tbody>
        </table>
      </div>
      <div className="flex items-center justify-between px-3 py-2 text-sm">
        <span>{(cur * PAGE + 1).toLocaleString()}–{Math.min((cur + 1) * PAGE, sorted.length).toLocaleString()} of {sorted.length.toLocaleString()}</span>
        <div className="flex items-center gap-2">
          <button className="btn-ghost" disabled={cur === 0} onClick={() => setPage(cur - 1)}>Previous</button>
          <span>Page {cur + 1} / {pages}</span>
          <button className="btn-ghost" disabled={cur >= pages - 1} onClick={() => setPage(cur + 1)}>Next</button>
        </div>
      </div>
    </div>
  );
}
