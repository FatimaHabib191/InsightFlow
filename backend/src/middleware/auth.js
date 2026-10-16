import jwt from 'jsonwebtoken';
import { HttpError } from './error.js';

export const signToken = userId => jwt.sign({ sub: String(userId) }, process.env.JWT_SECRET, { expiresIn: '7d' });

export const requireAuth = (req, res, next) => {
  try {
    const token = (req.headers.authorization || '').replace(/^Bearer /, '');
    req.userId = jwt.verify(token, process.env.JWT_SECRET).sub;
    next();
  } catch { next(new HttpError(401, 'Please sign in')); }
};
