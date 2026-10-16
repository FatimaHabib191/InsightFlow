import 'dotenv/config';
import mongoose from 'mongoose';
import { app } from './app.js';
const { MONGODB_URI, PORT = 4000 } = process.env;
if (!MONGODB_URI) { console.error('MONGODB_URI is required'); process.exit(1); }
await mongoose.connect(MONGODB_URI);
app.listen(PORT, () => console.log(`API on :${PORT}`));
