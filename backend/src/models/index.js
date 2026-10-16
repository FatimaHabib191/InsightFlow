import mongoose from 'mongoose';
const { Schema, model } = mongoose;
export const LIMITS = { maxRows: 50000, maxCols: 100, chunkSize: 500 };
const User = new Schema({ email: { type: String, required: true, unique: true, lowercase: true, trim: true }, passwordHash: { type: String, required: true } }, { timestamps: true });
const owner = { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true };
const Dataset = new Schema({
  owner,
  name: { type: String, required: true, trim: true, maxlength: 120 },
  fileName: String, rowCount: Number,
  columns: [{ name: String, type: { type: String, enum: ['numeric','categorical','date','text'] }, _id: false }],
  stats: Schema.Types.Mixed,
}, { timestamps: true });
// Rows live in chunked docs so a dataset never approaches the 16MB document cap.
const RowChunk = new Schema({ datasetId: { type: Schema.Types.ObjectId, required: true }, chunk: Number, rows: [Schema.Types.Mixed] });
RowChunk.index({ datasetId: 1, chunk: 1 }, { unique: true });
const Report = new Schema({
  owner,
  datasetId: { type: Schema.Types.ObjectId, ref: 'Dataset', index: true, required: true },
  title: { type: String, required: true, maxlength: 160 },
  filters: Schema.Types.Mixed, summary: Schema.Types.Mixed, observations: [String],
}, { timestamps: true });
export const UserModel = model('User', User);
export const DatasetModel = model('Dataset', Dataset);
export const RowChunkModel = model('RowChunk', RowChunk);
export const ReportModel = model('Report', Report);
