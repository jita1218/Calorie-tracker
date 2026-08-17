import 'dotenv/config';
import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { requireAuth } from './middleware/auth.js';
import authRouter from './routes/auth.js';
import profileRouter from './routes/profile.js';
import logsRouter from './routes/logs.js';
import analyzeRouter from './routes/analyze.js';
import exerciseRouter from './routes/exercise.js';

if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET is not set. Add it to backend/.env before starting the server.');
  process.exit(1);
}

const app = express();

const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(helmet());
app.use(cors({
  origin(origin, callback) {
    // Non-browser clients (native app, curl, server-to-server) send no Origin header.
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error('Not allowed by CORS'));
  },
}));
app.use(express.json({ limit: '10mb' })); // photos as base64 need headroom

const generalLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: true, legacyHeaders: false });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false });

app.use('/api', generalLimiter);

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.use('/api/auth', authLimiter, authRouter);
app.use('/api/profile', requireAuth, profileRouter);
app.use('/api/logs', requireAuth, logsRouter);
app.use('/api/analyze', requireAuth, analyzeRouter);
app.use('/api/exercise', requireAuth, exerciseRouter);

// Central error handler — never leak stack traces to clients.
app.use((err, req, res, next) => {
  console.error(err);
  const status = err.status || 500;
  const message = status === 500 ? 'Something went wrong.' : err.message;
  res.status(status).json({ error: message });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Calorie tracker backend running on http://localhost:${PORT}`);
  const provider = (process.env.AI_PROVIDER || 'gemini').toLowerCase();
  const keyVar = provider === 'anthropic' ? 'ANTHROPIC_API_KEY' : 'GEMINI_API_KEY';
  if (!process.env[keyVar]) {
    console.warn(`⚠️  AI_PROVIDER=${provider} but ${keyVar} is not set — photo analysis will fail until you add it to backend/.env`);
  }
});
