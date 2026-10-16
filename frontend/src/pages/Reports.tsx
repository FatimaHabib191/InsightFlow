import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, type Report } from '../lib/api';

export default function Reports() {
  const [reports, setReports] = useState<Report[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(() => { api.listReports().then(r => { setReports(r); setError(null); }).catch(e => { setError((e as Error).message); setReports([]); }); }, []);
  useEffect(load, [load]);

  async function remove(r: Report) {
    if (!confirm(`Delete report "${r.title}"?`)) return;
    try { await api.deleteReport(r._id); load(); } catch (e) { setError((e as Error).message); }
  }
  return (
    <section>
      <h1 className="mb-4 font-serif text-3xl">Saved reports</h1>
      {error && <p role="alert" className="mb-3 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
      {reports === null ? <p className="text-sm">Loading…</p> : reports.length === 0 ? (
        <p className="rounded-md border border-line bg-white p-6 text-sm text-charcoal/70">No reports yet. Open a dataset, apply any filters, and choose “Create report”.</p>
      ) : (
        <ul className="divide-y divide-line rounded-md border border-line bg-white">{reports.map(r => (
          <li key={r._id} className="flex items-center justify-between gap-4 px-4 py-3">
            <div><Link to={`/reports/${r._id}`} className="font-medium text-forest hover:underline">{r.title}</Link>
              <p className="text-sm text-charcoal/70">{r.filters.rowsIncluded.toLocaleString()} rows, saved {new Date(r.createdAt).toLocaleString()}</p></div>
            <button className="btn-ghost" onClick={() => remove(r)}>Delete</button>
          </li>))}</ul>)}
    </section>
  );
}
