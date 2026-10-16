import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import CsvImport from '../components/CsvImport';
import { api, type DatasetMeta } from '../lib/api';

export default function Workspace() {
  const [datasets, setDatasets] = useState<DatasetMeta[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [replacing, setReplacing] = useState<DatasetMeta | null>(null);

  const load = useCallback(() => {
    api.listDatasets().then(d => { setDatasets(d); setError(null); }).catch(e => { setError((e as Error).message); setDatasets([]); });
  }, []);
  useEffect(load, [load]);

  async function remove(d: DatasetMeta) {
    if (!confirm(`Delete "${d.name}" and its reports? This cannot be undone.`)) return;
    try { await api.deleteDataset(d._id); setNotice(`Deleted "${d.name}".`); load(); } catch (e) { setError((e as Error).message); }
  }

  return (
    <div className="space-y-10">
      <section>
        <h1 className="mb-4 font-serif text-3xl">{replacing ? 'Replace dataset' : 'Import a dataset'}</h1>
        <CsvImport key={replacing?._id ?? 'new'} replacing={replacing} onCancelReplace={() => setReplacing(null)} onImported={() => { setNotice(replacing ? 'Dataset replaced.' : 'Dataset imported.'); setReplacing(null); load(); }} />
      </section>
      <section>
        <h2 className="mb-3 font-serif text-2xl">Your datasets</h2>
        {notice && <p role="status" className="mb-3 rounded-md bg-sage/25 px-3 py-2 text-sm">{notice}</p>}
        {error && <p role="alert" className="mb-3 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
        {datasets === null ? <p className="text-sm">Loading…</p> : datasets.length === 0 ? (
          <p className="rounded-md border border-line bg-white p-6 text-sm text-charcoal/70">No datasets yet. Import a CSV above to get started.</p>
        ) : (
          <ul className="divide-y divide-line rounded-md border border-line bg-white">
            {datasets.map(d => (
              <li key={d._id} className="flex items-center justify-between gap-4 px-4 py-3">
                <div><Link to={`/datasets/${d._id}`} className="font-medium text-forest hover:underline">{d.name}</Link>
                  <p className="text-sm text-charcoal/70">{d.rowCount.toLocaleString()} rows, {d.columns.length} columns, added {new Date(d.createdAt).toLocaleDateString()}</p></div>
                <div className="flex gap-2"><button className="btn-ghost" onClick={() => { setReplacing(d); window.scrollTo({ top: 0 }); }}>Replace</button><button className="btn-ghost" onClick={() => remove(d)}>Delete</button></div>
              </li>))}
          </ul>)}
      </section>
    </div>
  );
}
