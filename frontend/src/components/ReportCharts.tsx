import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { ColumnStats } from '../lib/analyze';

const n = (v: number) => String(Number(v.toFixed(2)));
/** Charts drawn from the statistics saved in the report (the filtered snapshot), not live data. */
export default function ReportCharts({ columns }: { columns: ColumnStats[] }) {
  const charts = columns.flatMap(c => c.numeric
    ? [{ name: c.name, kind: 'Distribution', data: c.numeric.histogram.map(b => ({ label: `${n(b.from)}–${n(b.to)}`, value: b.count })) }]
    : c.categories?.length ? [{ name: c.name, kind: 'Top values', data: c.categories.map(x => ({ label: x.value, value: x.count })) }] : []).slice(0, 6);
  if (!charts.length) return null;
  return (
    <section>
      <h2 className="mb-2 font-serif text-xl">Charts</h2>
      <div className="grid gap-4 sm:grid-cols-2">{charts.map(c => (
        <figure key={c.name} className="break-inside-avoid rounded-md border border-line p-3">
          <figcaption className="mb-1 text-sm font-medium">{c.kind}: {c.name}</figcaption>
          <div className="h-56" role="img" aria-label={`${c.kind} chart for ${c.name}`}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={c.data} margin={{ top: 4, right: 8, bottom: 24, left: 0 }}>
                <CartesianGrid stroke="#E4DED0" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" label={{ value: c.name, position: 'insideBottom', offset: -16, fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} label={{ value: 'Rows', angle: -90, position: 'insideLeft', fontSize: 11 }} />
                <Tooltip formatter={(v: number) => [v.toLocaleString(), 'Rows']} />
                <Bar dataKey="value" fill="#1F4D3A" isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </figure>))}</div>
    </section>
  );
}
