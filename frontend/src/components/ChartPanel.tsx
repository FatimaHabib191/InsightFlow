import { useMemo, useState } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { chartData, type Column, type Row } from '../lib/analyze';

type Kind = 'bar' | 'line' | 'area';
const GREEN = '#1F4D3A', SAGE = '#A9B8A4';

export default function ChartPanel({ columns, rows }: { columns: Column[]; rows: Row[] }) {
  const [colName, setColName] = useState(columns[0]?.name ?? '');
  const [kind, setKind] = useState<Kind>('bar');
  const col = columns.find(c => c.name === colName) ?? columns[0];
  const data = useMemo(() => (col ? chartData(rows, col) : []), [rows, col]);
  const label = col?.type === 'numeric' ? 'Distribution' : col?.type === 'date' ? 'Rows per month' : 'Top values';
  const common = { data, margin: { top: 8, right: 16, bottom: 28, left: 8 } };
  const axes = (<>
    <CartesianGrid stroke="#E4DED0" vertical={false} />
    <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" label={{ value: col?.name, position: 'insideBottom', offset: -18, fontSize: 12 }} />
    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} label={{ value: 'Rows', angle: -90, position: 'insideLeft', fontSize: 12 }} />
    <Tooltip formatter={(v: number) => [v.toLocaleString(), 'Rows']} />
  </>);
  return (
    <div className="rounded-md border border-line bg-white p-4">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <h2 className="font-serif text-xl">{label}</h2>
        <select aria-label="Column" value={col?.name} onChange={e => setColName(e.target.value)} className="rounded-md border border-line px-2 py-1 text-sm">
          {columns.map(c => <option key={c.name} value={c.name}>{c.name} ({c.type})</option>)}</select>
        <select aria-label="Chart type" value={kind} onChange={e => setKind(e.target.value as Kind)} className="rounded-md border border-line px-2 py-1 text-sm">
          <option value="bar">Bar</option><option value="line">Line</option><option value="area">Area</option></select>
      </div>
      {data.length === 0 ? <p className="py-10 text-center text-sm text-charcoal/70">No data to chart for this column with the current filters.</p> : (
        <div className="h-72" role="img" aria-label={`${label} chart for ${col?.name}`}>
          <ResponsiveContainer width="100%" height="100%">
            {kind === 'bar' ? <BarChart {...common}>{axes}<Bar dataKey="value" fill={GREEN} /></BarChart>
              : kind === 'line' ? <LineChart {...common}>{axes}<Line dataKey="value" stroke={GREEN} dot={false} strokeWidth={2} /></LineChart>
              : <AreaChart {...common}>{axes}<Area dataKey="value" stroke={GREEN} fill={SAGE} /></AreaChart>}
          </ResponsiveContainer>
        </div>)}
    </div>
  );
}
