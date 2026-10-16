import { useRef, useState, type DragEvent } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { LIMITS, computeStats, parseCsvText, type ParseResult } from '../lib/analyze';
import { api, type DatasetMeta } from '../lib/api';

const schema = z.object({ name: z.string().trim().min(1, 'Name is required').max(120) });
type Form = z.infer<typeof schema>;
type Parsed = ParseResult & { fileName: string };

export default function CsvImport({ onImported, replacing, onCancelReplace }: { onImported: () => void; replacing?: DatasetMeta | null; onCancelReplace?: () => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [parsed, setParsed] = useState<Parsed | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<Form>({ resolver: zodResolver(schema) });

  async function handleFile(file: File | undefined) {
    setError(null); setParsed(null);
    if (!file) return;
    if (!/\.csv$/i.test(file.name) && !['text/csv', 'application/vnd.ms-excel'].includes(file.type)) return setError('Only .csv files are supported.');
    if (file.size > LIMITS.maxBytes) return setError(`File is ${(file.size / 1048576).toFixed(1)}MB; the limit is ${LIMITS.maxBytes / 1048576}MB.`);
    try {
      const result = parseCsvText(await file.text(), file.size);
      setParsed({ ...result, fileName: file.name });
      reset({ name: replacing?.name ?? file.name.replace(/\.csv$/i, '') });
    } catch (e) { setError((e as Error).message); }
  }
  const onDrop = (e: DragEvent) => { e.preventDefault(); setDrag(false); void handleFile(e.dataTransfer.files[0]); };

  async function submit({ name }: Form) {
    if (!parsed) return;
    setBusy(true); setError(null);
    try {
      await api.createDataset({ name, fileName: parsed.fileName, columns: parsed.columns, rows: parsed.rows, stats: computeStats(parsed.columns, parsed.rows) });
      if (replacing) await api.deleteDataset(replacing._id); // old data is removed only after the new import succeeded
      setParsed(null); onImported();
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }

  return (
    <div className="space-y-4">
      {replacing && <p className="flex items-center justify-between rounded-md bg-amber/10 px-3 py-2 text-sm">Replacing “{replacing.name}”. Its saved reports are deleted once the new file imports.<button type="button" className="btn-ghost" onClick={onCancelReplace}>Cancel</button></p>}
      <div role="button" tabIndex={0} onClick={() => input.current?.click()} onKeyDown={e => e.key === 'Enter' && input.current?.click()}
        onDragOver={e => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={onDrop}
        className={`cursor-pointer rounded-md border border-dashed p-8 text-center ${drag ? 'border-forest bg-white' : 'border-sage'}`}>
        <p className="font-medium">Drop a CSV here or click to choose</p>
        <p className="mt-1 text-sm text-charcoal/70">Up to {LIMITS.maxBytes / 1048576}MB, {LIMITS.maxRows.toLocaleString()} rows, {LIMITS.maxCols} columns</p>
        <input ref={input} type="file" accept=".csv,text/csv" className="hidden" onChange={e => { void handleFile(e.target.files?.[0]); e.target.value = ''; }} />
      </div>

      {error && <p role="alert" className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}

      {parsed && (
        <form onSubmit={handleSubmit(submit)} className="space-y-4 rounded-md border border-line bg-white p-4">
          {parsed.warnings.map(w => <p key={w} className="rounded-md bg-amber/10 px-3 py-2 text-sm">{w}</p>)}
          <p className="text-sm">{parsed.rows.length.toLocaleString()} rows, {parsed.columns.length} columns. Preview of the first 10 rows:</p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead><tr className="border-b border-line">{parsed.columns.map(c => (
                <th key={c.name} className="whitespace-nowrap px-2 py-1.5 font-medium">{c.name}<span className="ml-1.5 rounded bg-sage/30 px-1.5 py-0.5 text-xs font-normal">{c.type}</span></th>))}</tr></thead>
              <tbody>{parsed.rows.slice(0, 10).map((r, i) => (
                <tr key={i} className="border-b border-line/60">{parsed.columns.map(c => (
                  <td key={c.name} className="whitespace-nowrap px-2 py-1.5">{r[c.name] ?? <span className="text-charcoal/40">missing</span>}</td>))}</tr>))}</tbody>
            </table>
          </div>
          <div>
            <label htmlFor="name" className="mb-1 block text-sm font-medium">Dataset name</label>
            <input id="name" {...register('name')} className="w-full max-w-sm rounded-md border border-line px-3 py-2 text-sm" />
            {errors.name && <p className="mt-1 text-sm text-red-700">{errors.name.message}</p>}
          </div>
          <div className="flex gap-2">
            <button className="btn" disabled={busy}>{busy ? 'Importing…' : 'Import dataset'}</button>
            <button type="button" className="btn-ghost" onClick={() => setParsed(null)}>Cancel</button>
          </div>
        </form>
      )}
    </div>
  );
}
