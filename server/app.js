// Express app, shared by the local server (index.js) and the Vercel function (/api/index.js)
import 'dotenv/config';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { connectDB, jwtSecret } from './config/db.js';
import routes from './routes/index.js';
import { sanitize } from './middleware/sanitize.js';
import { notFound, errorHandler } from './middleware/error.js';
import { Sport } from './models/index.js';
import { seed } from './seed/seed.js';

jwtSecret(); // fail fast in production without a secret
const app = express();
const origins = (process.env.CLIENT_URL || 'http://localhost:5173').split(',').map((s) => s.trim());

if (process.env.VERCEL) app.set('trust proxy', 1); // correct client IPs for rate limiting
app.disable('x-powered-by');
app.use(helmet({ crossOriginResourcePolicy: { policy: 'same-site' } }));
// Allow the configured client origins, plus same-origin requests (frontend and API on one domain)
app.use(cors((req, cb) => {
  const origin = req.headers.origin;
  const ok = !origin || origins.includes(origin) || origin === `https://${req.headers.host}`;
  cb(ok ? null : new Error('Not allowed by CORS'), { origin: ok, credentials: true, methods: ['GET', 'POST', 'PUT', 'DELETE'] });
}));
app.use(express.json({ limit: '200kb' }));
app.use(cookieParser());
app.use(sanitize);
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, limit: 1500, standardHeaders: 'draft-7', legacyHeaders: false }));

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api', routes);

// Serve the built client when self-hosting (on Vercel the CDN serves it)
const dist = path.join(path.dirname(fileURLToPath(import.meta.url)), '../client/dist');
if (!process.env.VERCEL && fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get(/^(?!\/api).*/, (req, res) => res.sendFile(path.join(dist, 'index.html')));
}
app.use('/api', notFound);
app.use(errorHandler);

// Connect once per process and seed an empty database
let readyPromise;
export const ready = () => (readyPromise ||= (async () => {
  await connectDB();
  if (!(await Sport.countDocuments())) await seed();
})().catch((e) => { readyPromise = null; throw e; }));

export default app;
