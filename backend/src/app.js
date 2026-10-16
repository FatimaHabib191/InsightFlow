import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import api from './routes/api.js';
import { errorHandler, notFound } from './middleware/error.js';
export const app = express();
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',') ?? false }));
app.use(rateLimit({ windowMs: 60_000, limit: 120 }));
app.use(express.json({ limit: '12mb' })); // ~5MB CSV expands slightly as JSON
app.use('/api', api);
app.use(notFound);
app.use(errorHandler);
