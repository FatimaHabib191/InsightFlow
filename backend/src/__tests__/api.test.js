// Validation and error-handling tests. They never reach MongoDB, so no database is needed.
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../app.js';

let server, base;
before(() => new Promise(res => { server = app.listen(0, () => { base = `http://127.0.0.1:${server.address().port}/api`; res(); }); }));
after(() => new Promise(res => server.close(res)));

const post = (path, body, raw = false) => fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: raw ? body : JSON.stringify(body) });
const col = { name: 'a', type: 'numeric' };

describe('API validation', () => {
  it('health check', async () => { const r = await fetch(base + '/health'); assert.equal(r.status, 200); assert.deepEqual(await r.json(), { ok: true }); });
  it('unknown route returns 404', async () => assert.equal((await fetch(base + '/nope')).status, 404));
  it('rejects an empty dataset body', async () => {
    const r = await post('/datasets', {});
    assert.equal(r.status, 400);
    assert.equal((await r.json()).error, 'Validation failed');
  });
  it('rejects duplicate column names', async () => assert.equal((await post('/datasets', { name: 'x', columns: [col, col], rows: [[1]] })).status, 400));
  it('rejects invalid column types', async () => assert.equal((await post('/datasets', { name: 'x', columns: [{ name: 'a', type: 'bogus' }], rows: [[1]] })).status, 400));
  it('rejects more rows than the limit', async () => {
    const rows = Array.from({ length: 50001 }, () => [1]);
    assert.equal((await post('/datasets', { name: 'x', columns: [col], rows })).status, 400);
  });
  it('rejects rows whose length differs from the column count', async () => assert.equal((await post('/datasets', { name: 'x', columns: [col], rows: [[1, 2]] })).status, 400));
  it('rejects malformed JSON', async () => assert.equal((await post('/datasets', '{bad', true)).status, 400));
  it('rejects oversized requests with 413', async () => assert.equal((await post('/datasets', JSON.stringify({ name: 'a'.repeat(13e6) }), true)).status, 413));
  it('rejects a report with an invalid dataset id', async () => assert.equal((await post('/reports', { datasetId: 'x', title: 't', summary: {}, observations: [] })).status, 400));
});
