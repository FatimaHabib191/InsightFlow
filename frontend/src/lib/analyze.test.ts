import { describe, expect, it } from 'vitest';
import { LIMITS, chartData, computeStats, filterRows, observations, parseCsvText, toCsv } from './analyze';

describe('parseCsvText', () => {
  it('parses rows and infers column types', () => {
    const r = parseCsvText('n,c,d\n1,x,2024-01-05\n2,y,2024-02-10');
    expect(r.columns.map(c => c.type)).toEqual(['numeric', 'categorical', 'date']);
    expect(r.rows[0]).toEqual({ n: 1, c: 'x', d: '2024-01-05' });
  });
  it('rejects duplicate headers', () => expect(() => parseCsvText('a,a\n1,2')).toThrow(/Duplicate/));
  it('rejects empty header names', () => expect(() => parseCsvText('a,\n1,2')).toThrow(/empty column/));
  it('rejects header-only files', () => expect(() => parseCsvText('a,b')).toThrow(/at least one data row/));
  it('rejects oversized files', () => expect(() => parseCsvText('a\n1', LIMITS.maxBytes + 1)).toThrow(/limit/));
  it('skips malformed rows with a warning', () => {
    const r = parseCsvText('a,b\n1,2\n3');
    expect(r.rows).toHaveLength(1);
    expect(r.warnings[0]).toMatch(/1 malformed/);
  });
  it('treats blanks as missing (null)', () => expect(parseCsvText('a,b\n1,\n2,y').rows[0].b).toBeNull());
  it('parses numbers with thousands separators', () => expect(parseCsvText('a\n"1,200"\n3').rows.map(r => r.a)).toEqual([1200, 3]));
  it('throws when every row is malformed', () => expect(() => parseCsvText('a,b\n1\n2')).toThrow(/No valid rows/));
});

describe('computeStats', () => {
  const { columns, rows } = parseCsvText('n,m\n1,a\n2,\n3,a\n4,');
  const s = computeStats(columns, rows);
  it('counts rows and columns', () => expect([s.rowCount, s.columnCount]).toEqual([4, 2]));
  it('computes numeric summaries', () => {
    const n = s.columns[0].numeric!;
    expect([n.mean, n.median, n.min, n.max]).toEqual([2.5, 2.5, 1, 4]);
    expect(n.histogram.reduce((a, b) => a + b.count, 0)).toBe(4);
  });
  it('computes missing counts and percentages', () => expect([s.columns[1].missing, s.columns[1].missingPct]).toEqual([2, 50]));
  it('computes category frequencies', () => expect(s.columns[1].categories).toEqual([{ value: 'a', count: 2 }]));
  it('summarizes dates', () => {
    const p = parseCsvText('d\n2024-01-01\n2024-01-11');
    expect(computeStats(p.columns, p.rows).columns[0].dates).toEqual({ min: '2024-01-01', max: '2024-01-11', spanDays: 10 });
  });
  it('writes deterministic observations', () => expect(observations(s)).toContain('The dataset has 4 rows and 2 columns.'));
});

describe('filterRows', () => {
  const { rows } = parseCsvText('n,t\n1,apple\n5,banana\n9,apple pie');
  it('searches across columns, case-insensitively', () => expect(filterRows(rows, 'APPLE', [])).toHaveLength(2));
  it('applies numeric and text filters together', () => {
    expect(filterRows(rows, '', [{ column: 'n', op: 'gte', value: '5' }, { column: 't', op: 'contains', value: 'apple' }])).toHaveLength(1);
  });
  it('excludes missing values from filters', () => {
    expect(filterRows(parseCsvText('n,t\n1,\n2,x').rows, '', [{ column: 't', op: 'eq', value: 'x' }])).toHaveLength(1);
  });
});

describe('chartData', () => {
  it('updates when rows change', () => {
    const { columns, rows } = parseCsvText('c\na\na\nb');
    expect(chartData(rows, columns[0])).toEqual([{ label: 'a', value: 2 }, { label: 'b', value: 1 }]);
    expect(chartData(rows.slice(2), columns[0])).toEqual([{ label: 'b', value: 1 }]);
  });
  it('groups dates by month', () => {
    const { columns, rows } = parseCsvText('d\n2024-01-05\n2024-01-20\n2024-02-01');
    expect(chartData(rows, columns[0])).toEqual([{ label: '2024-01', value: 2 }, { label: '2024-02', value: 1 }]);
  });
});

describe('toCsv', () => {
  it('round-trips and neutralizes formula injection', () => {
    const cols = [{ name: 'x', type: 'text' as const }];
    expect(toCsv(cols, [{ x: '=SUM(1)' }])).toContain("'=SUM(1)");
    expect(toCsv(cols, [{ x: '-5' }])).toContain('-5');
    expect(toCsv(cols, [{ x: null }])).toBe('x\r\n');
  });
});
