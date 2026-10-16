import Papa from 'papaparse';

export const LIMITS = { maxBytes: 5 * 1024 * 1024, maxRows: 50_000, maxCols: 100 } as const;
export type ColType = 'numeric' | 'categorical' | 'date' | 'text';
export type Cell = string | number | null;
export type Row = Record<string, Cell>;
export interface Column { name: string; type: ColType }
export interface ParseResult { columns: Column[]; rows: Row[]; warnings: string[] }

const isMissing = (v: unknown) => v === null || v === undefined || String(v).trim() === '';
const isNum = (s: string) => s.trim() !== '' && Number.isFinite(Number(s.replace(/,/g, '')));
const isDate = (s: string) => /^\d{4}-\d{2}-\d{2}|^\d{1,2}\/\d{1,2}\/\d{2,4}/.test(s.trim()) && !Number.isNaN(Date.parse(s));

export function inferType(values: string[]): ColType {
  const v = values.filter(x => !isMissing(x));
  if (!v.length) return 'text';
  if (v.every(isNum)) return 'numeric';
  if (v.every(isDate)) return 'date';
  return new Set(v).size <= Math.max(20, v.length * 0.5) ? 'categorical' : 'text';
}

/** Throws a user-facing Error on invalid input; never substitutes sample data. */
export function parseCsvText(text: string, size = text.length): ParseResult {
  if (size > LIMITS.maxBytes) throw new Error(`File exceeds ${LIMITS.maxBytes / 1048576}MB limit.`);
  const data = Papa.parse<string[]>(text, { skipEmptyLines: 'greedy' }).data;
  if (data.length < 2) throw new Error('CSV needs a header row and at least one data row.');
  const header = data[0].map(h => h.trim());
  if (header.some(h => !h)) throw new Error('Header row contains empty column names.');
  const dupes = header.filter((h, i) => header.indexOf(h) !== i);
  if (dupes.length) throw new Error(`Duplicate column headers: ${[...new Set(dupes)].join(', ')}.`);
  if (header.length > LIMITS.maxCols) throw new Error(`Too many columns (max ${LIMITS.maxCols}).`);
  if (data.length - 1 > LIMITS.maxRows) throw new Error(`Too many rows (max ${LIMITS.maxRows}).`);

  const warnings: string[] = [];
  let skipped = 0;
  const raw = data.slice(1).filter(r => r.length === header.length || (skipped++, false));
  if (skipped) warnings.push(`${skipped} malformed row(s) with the wrong column count were skipped.`);
  if (!raw.length) throw new Error('No valid rows after validation.');

  const columns: Column[] = header.map((name, i) => ({ name, type: inferType(raw.map(r => r[i])) }));
  const rows: Row[] = raw.map(r => Object.fromEntries(columns.map((c, i) => {
    const v = r[i];
    if (isMissing(v)) return [c.name, null];
    return [c.name, c.type === 'numeric' ? Number(v.replace(/,/g, '')) : v.trim()];
  })));
  return { columns, rows, warnings };
}

export interface ColumnStats {
  name: string; type: ColType; missing: number; missingPct: number; distinct: number;
  numeric?: { mean: number; median: number; min: number; max: number; histogram: { from: number; to: number; count: number }[] };
  categories?: { value: string; count: number }[];
  dates?: { min: string; max: string; spanDays: number };
}
export interface DatasetStats { rowCount: number; columnCount: number; columns: ColumnStats[] }

export function computeStats(columns: Column[], rows: Row[], bins = 10): DatasetStats {
  const out = columns.map<ColumnStats>(c => {
    const vals = rows.map(r => r[c.name]).filter((v): v is string | number => v !== null);
    const base: ColumnStats = { name: c.name, type: c.type, missing: rows.length - vals.length,
      missingPct: rows.length ? ((rows.length - vals.length) / rows.length) * 100 : 0, distinct: new Set(vals).size };
    if (c.type === 'numeric' && vals.length) {
      const n = (vals as number[]).slice().sort((a, b) => a - b);
      const min = n[0], max = n[n.length - 1], w = (max - min) / bins || 1;
      const hist = Array.from({ length: bins }, (_, i) => ({ from: min + i * w, to: min + (i + 1) * w, count: 0 }));
      n.forEach(v => { hist[Math.min(bins - 1, Math.floor((v - min) / w))].count++; });
      const mid = n.length >> 1;
      base.numeric = { mean: n.reduce((a, b) => a + b, 0) / n.length, median: n.length % 2 ? n[mid] : (n[mid - 1] + n[mid]) / 2, min, max, histogram: hist };
    } else if (c.type === 'categorical' || c.type === 'text') {
      const f = new Map<string, number>();
      vals.forEach(v => f.set(String(v), (f.get(String(v)) ?? 0) + 1));
      base.categories = [...f].map(([value, count]) => ({ value, count })).sort((a, b) => b.count - a.count).slice(0, 10);
    } else if (c.type === 'date' && vals.length) {
      const t = (vals as string[]).map(v => Date.parse(v)).sort((a, b) => a - b);
      base.dates = { min: new Date(t[0]).toISOString().slice(0, 10), max: new Date(t[t.length - 1]).toISOString().slice(0, 10), spanDays: Math.round((t[t.length - 1] - t[0]) / 864e5) };
    }
    return base;
  });
  return { rowCount: rows.length, columnCount: columns.length, columns: out };
}

/** Rule-based observations (deterministic; no AI). */
export function observations(s: DatasetStats): string[] {
  const o: string[] = [`The dataset has ${s.rowCount} rows and ${s.columnCount} columns.`];
  s.columns.filter(c => c.missingPct >= 10).forEach(c => o.push(`"${c.name}" is missing ${c.missingPct.toFixed(1)}% of values.`));
  s.columns.forEach(c => {
    if (c.numeric) o.push(`"${c.name}" ranges ${c.numeric.min} to ${c.numeric.max} (mean ${c.numeric.mean.toFixed(2)}, median ${c.numeric.median}).`);
    const top = c.categories?.[0];
    if (top) o.push(`Most common "${c.name}": ${top.value} (${top.count} rows).`);
    if (c.dates) o.push(`"${c.name}" spans ${c.dates.min} to ${c.dates.max} (${c.dates.spanDays} days).`);
  });
  return o;
}

export interface Filter { column: string; op: 'eq' | 'contains' | 'gte' | 'lte'; value: string }
export function filterRows(rows: Row[], search: string, filters: Filter[]): Row[] {
  const q = search.trim().toLowerCase();
  return rows.filter(r =>
    (!q || Object.values(r).some(v => v !== null && String(v).toLowerCase().includes(q))) &&
    filters.every(f => {
      const v = r[f.column];
      if (v === null) return false;
      if (f.op === 'eq') return String(v) === f.value;
      if (f.op === 'contains') return String(v).toLowerCase().includes(f.value.toLowerCase());
      return f.op === 'gte' ? Number(v) >= Number(f.value) : Number(v) <= Number(f.value);
    }));
}

const esc = (v: Cell) => { const s = v === null ? '' : String(v); return /^[=+\-@]/.test(s) && Number.isNaN(Number(s)) ? `'${s}` : s; };
/** CSV export; neutralizes spreadsheet formula injection. */
export function toCsv(columns: Column[], rows: Row[]): string {
  return Papa.unparse({ fields: columns.map(c => c.name), data: rows.map(r => columns.map(c => esc(r[c.name]))) });
}

export interface Point { label: string; value: number }
const fmt = (n: number) => String(Number(n.toFixed(2)));
/** Chart series derived from the given rows: histogram bins, top categories, or monthly counts. */
export function chartData(rows: Row[], col: Column): Point[] {
  const cs = computeStats([col], rows).columns[0];
  if (cs.numeric) return cs.numeric.histogram.map(b => ({ label: `${fmt(b.from)}–${fmt(b.to)}`, value: b.count }));
  if (cs.categories) return cs.categories.map(c => ({ label: c.value, value: c.count }));
  if (col.type === 'date') {
    const m = new Map<string, number>();
    rows.forEach(r => { const v = r[col.name]; if (v !== null && !Number.isNaN(Date.parse(String(v)))) { const k = new Date(String(v)).toISOString().slice(0, 7); m.set(k, (m.get(k) ?? 0) + 1); } });
    return [...m].sort(([a], [b]) => a.localeCompare(b)).map(([label, value]) => ({ label, value }));
  }
  return [];
}
