import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { UserModel } from '../models/index.js';
import { HttpError } from '../middleware/error.js';
import { signToken } from '../middleware/auth.js';

const wrap = fn => (req, res, next) => fn(req, res).catch(next);
const creds = z.object({ email: z.string().trim().email().max(254), password: z.string().min(8).max(72) }); // 72 = bcrypt limit
const r = Router();
r.use(rateLimit({ windowMs: 15 * 60_000, limit: 30 })); // slow down password guessing

r.post('/register', wrap(async (req, res) => {
  const { email, password } = creds.parse(req.body);
  if (await UserModel.exists({ email: email.toLowerCase() })) throw new HttpError(409, 'An account with this email already exists');
  const user = await UserModel.create({ email, passwordHash: await bcrypt.hash(password, 10) });
  res.status(201).json({ token: signToken(user._id), email: user.email });
}));

r.post('/login', wrap(async (req, res) => {
  const { email, password } = creds.parse(req.body);
  const user = await UserModel.findOne({ email: email.toLowerCase() });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) throw new HttpError(401, 'Wrong email or password');
  res.json({ token: signToken(user._id), email: user.email });
}));
export default r;
