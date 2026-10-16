import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import ChartPanel from '../components/ChartPanel';
import DataTable from '../components/DataTable';
import { computeStats, filterRows, observations, toCsv, type Filter, type Row } from '../lib/analyze';
import { api, type DatasetMeta } from '../lib/api';

const OPS: Record<Filter['op'], string> = { eq: 'equals', contains: 'contains', gte: '≥', lte: '≤' };

export default function Dataset() {
  const { id = '' } = useParams();
  const [meta, setMeta] = useState<DatasetMeta | null>(null);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<Filter[]>([]);
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<Filter>({ column: '', op: 'contains', value: '' });

  useEffect(() => {
    setMeta(null); setRows(null); setError(null);
    api.getDataset(id).then(async m => {
      const r = await api.getRows(id, m.columns);
      setMeta(m); setRows(r); setDraft(d => ({ ...d, column: m.columns[0]?.name ?? '' }));
    }).catch(e => setError((e as Error).message));
  }, [id]);

  const filtered = useMemo(() => (rows ? filterRows(rows, search, filters) : []), [rows, search, filters]);

  function exportCsv() {
    if (!meta) return;
    const url = URL.createObjectURL(new Blob([toCsv(meta.columns, filtered)], { type: 'text/csv;charset=utf-8' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: `${meta.name}-filtered.csv` });
    a.click(); URL.revokeObjectURL(url);
  }

  async function saveReport() {
    if (!meta || !title.trim()) return;
    setSaving(true);
    try {
      const summary = computeStats(meta.columns, filtered); // stats of the filtered rows, computed deterministically
      const r = await api.createReport({ datasetId: meta._id, title: title.trim(), filters: { search, filters, rowsIncluded: filtered.length }, summary, observations: observations(summary) });
      navigate(`/reports/${r._id}`);
    } catch (e) { setError((e as Error).message); setSaving(false); }
  }

  if (error) return <div role="alert" className="space-y-3"><p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p><Link to="/workspace" className="btn-ghost">Back to workspace</Link></div>;
  if (!meta || !rows) return <p className="text-sm">Loading dataset…</p>;

  const missingTotal = meta.stats.columns.reduce((s, c) => s + c.missing, 0);
  const cards = [['Rows', meta.stats.rowCount.toLocaleString()], ['Columns', String(meta.stats.columnCount)],
    ['Missing cells', missingTotal.toLocaleString()], ['Showing', `${filtered.length.toLocaleString()} rows`]];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><Link to="/workspace" className="text-sm text-forest hover:underline">← Workspace</Link><h1 className="font-serif text-3xl">{meta.name}</h1></div>
        <button className="btn" onClick={exportCsv} disabled={!filtered.length}>Export filtered CSV</button>
      </div>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">{cards.map(([k, v]) => (
        <div key={k} className="rounded-md border border-line bg-white px-4 py-3"><dt className="text-sm text-charcoal/70">{k}</dt><dd className="font-serif text-2xl">{v}</dd></div>))}</dl>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <input aria-label="Search all columns" placeholder="Search all columns" value={search} onChange={e => setSearch(e.target.value)} className="w-56 rounded-md border border-line px-3 py-1.5 text-sm" />
          <select aria-label="Filter column" value={draft.column} onChange={e => setDraft({ ...draft, column: e.target.value })} className="rounded-md border border-line px-2 py-1.5 text-sm">
            {meta.columns.map(c => <option key={c.name}>{c.name}</option>)}</select>
          <select aria-label="Filter operator" value={draft.op} onChange={e => setDraft({ ...draft, op: e.target.value as Filter['op'] })} className="rounded-md border border-line px-2 py-1.5 text-sm">
            {Object.entries(OPS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
          <input aria-label="Filter value" placeholder="Value" value={draft.value} onChange={e => setDraft({ ...draft, value: e.target.value })} className="w-32 rounded-md border border-line px-3 py-1.5 text-sm" />
          <button className="btn-ghost" disabled={!draft.value.trim()} onClick={() => { setFilters([...filters, { ...draft, value: draft.value.trim() }]); setDraft({ ...draft, value: '' }); }}>Add filter</button>
        </div>
        {filters.length > 0 && <div className="flex flex-wrap gap-2">{filters.map((f, i) => (
          <button key={i} className="rounded-full bg-sage/30 px-3 py-1 text-xs" onClick={() => setFilters(filters.filter((_, j) => j !== i))} aria-label={`Remove filter ${f.column}`}>{f.column} {OPS[f.op]} {f.value} ✕</button>))}</div>}
      </section>

      <section className="flex flex-wrap items-end gap-2 rounded-md border border-line bg-white p-4">
        <div><label htmlFor="rt" className="mb-1 block text-sm font-medium">Save a report of the {filtered.length.toLocaleString()} rows shown</label>
          <input id="rt" value={title} maxLength={160} onChange={e => setTitle(e.target.value)} placeholder="Report title" className="w-72 rounded-md border border-line px-3 py-1.5 text-sm" /></div>
        <button className="btn" disabled={saving || !title.trim() || !filtered.length} onClick={saveReport}>{saving ? 'Saving…' : 'Create report'}</button>
      </section>

      <ChartPanel columns={meta.columns} rows={filtered} />
      <DataTable key={`${search}|${JSON.stringify(filters)}`} columns={meta.columns} rows={filtered} />
    </div>
  );
}
