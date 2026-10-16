import { ZodError } from 'zod';
export class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }
export const notFound = (req, res) => res.status(404).json({ error: 'Not found' });
export const errorHandler = (err, req, res, _next) => {
  if (err instanceof ZodError) return res.status(400).json({ error: 'Validation failed', details: err.issues.map(i => ({ path: i.path.join('.'), message: i.message })) });
  if (err.name === 'CastError') return res.status(400).json({ error: 'Invalid id' });
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Request too large' });
  const status = err.status || 500;
  if (status === 500) console.error(err);
  res.status(status).json({ error: status === 500 ? 'Internal server error' : err.message });
};
