import { Router } from 'express';
import { z } from 'zod';
import { DatasetModel, RowChunkModel, ReportModel, LIMITS } from '../models/index.js';
import { HttpError } from '../middleware/error.js';

const wrap = fn => (req, res, next) => fn(req, res).catch(next);
const colSchema = z.object({ name: z.string().min(1).max(200), type: z.enum(['numeric','categorical','date','text']) });
const datasetBody = z.object({
  name: z.string().min(1).max(120), fileName: z.string().max(255).optional(),
  columns: z.array(colSchema).min(1).max(LIMITS.maxCols),
  rows: z.array(z.array(z.union([z.string(), z.number(), z.null()]))).min(1).max(LIMITS.maxRows), // cells in column order
  stats: z.record(z.any()).optional(),
}).refine(d => new Set(d.columns.map(c => c.name)).size === d.columns.length, { message: 'Duplicate column names' })
  .refine(d => d.rows.every(r => r.length === d.columns.length), { message: 'Every row must have one value per column' });
const reportBody = z.object({
  datasetId: z.string().regex(/^[0-9a-f]{24}$/), title: z.string().min(1).max(160),
  filters: z.record(z.any()).optional(), summary: z.record(z.any()), observations: z.array(z.string().max(500)).max(50),
});
const r = Router();

r.get('/health', (q, s) => s.json({ ok: true }));
r.get('/datasets', wrap(async (q, s) => s.json(await DatasetModel.find().sort({ createdAt: -1 }).lean())));

r.post('/datasets', wrap(async (req, res) => {
  const { rows, ...meta } = datasetBody.parse(req.body);
  const ds = await DatasetModel.create({ ...meta, rowCount: rows.length });
  try {
    const docs = [];
    for (let i = 0; i * LIMITS.chunkSize < rows.length; i++)
      docs.push({ datasetId: ds._id, chunk: i, rows: rows.slice(i * LIMITS.chunkSize, (i + 1) * LIMITS.chunkSize) });
    await RowChunkModel.insertMany(docs);
  } catch (e) { await DatasetModel.deleteOne({ _id: ds._id }); throw e; } // no half-saved datasets
  res.status(201).json(ds);
}));

r.get('/datasets/:id', wrap(async (req, res) => {
  const ds = await DatasetModel.findById(req.params.id).lean();
  if (!ds) throw new HttpError(404, 'Dataset not found');
  res.json(ds);
}));
r.get('/datasets/:id/rows', wrap(async (req, res) => {
  const chunks = await RowChunkModel.find({ datasetId: req.params.id }).sort({ chunk: 1 }).lean();
  if (!chunks.length) throw new HttpError(404, 'Dataset not found');
  res.json({ rows: chunks.flatMap(c => c.rows) });
}));
r.delete('/datasets/:id', wrap(async (req, res) => {
  const ds = await DatasetModel.findByIdAndDelete(req.params.id);
  if (!ds) throw new HttpError(404, 'Dataset not found');
  await Promise.all([RowChunkModel.deleteMany({ datasetId: ds._id }), ReportModel.deleteMany({ datasetId: ds._id })]);
  res.status(204).end();
}));

r.get('/reports', wrap(async (req, res) => {
  const q = req.query.datasetId ? { datasetId: String(req.query.datasetId) } : {};
  res.json(await ReportModel.find(q).sort({ createdAt: -1 }).lean());
}));
r.post('/reports', wrap(async (req, res) => {
  const body = reportBody.parse(req.body);
  if (!(await DatasetModel.exists({ _id: body.datasetId }))) throw new HttpError(404, 'Dataset not found');
  res.status(201).json(await ReportModel.create(body));
}));
r.get('/reports/:id', wrap(async (req, res) => {
  const rep = await ReportModel.findById(req.params.id).lean();
  if (!rep) throw new HttpError(404, 'Report not found');
  res.json(rep);
}));
r.delete('/reports/:id', wrap(async (req, res) => {
  if (!(await ReportModel.findByIdAndDelete(req.params.id))) throw new HttpError(404, 'Report not found');
  res.status(204).end();
}));
export default r;
