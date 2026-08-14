import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import profileRouter from './routes/profile.js';
import logsRouter from './routes/logs.js';
import analyzeRouter from './routes/analyze.js';

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' })); // photos as base64 need headroom

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.use('/api/profile', profileRouter);
app.use('/api/logs', logsRouter);
app.use('/api/analyze', analyzeRouter);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Calorie tracker backend running on http://localhost:${PORT}`);
  const provider = (process.env.AI_PROVIDER || 'gemini').toLowerCase();
  const keyVar = provider === 'anthropic' ? 'ANTHROPIC_API_KEY' : 'GEMINI_API_KEY';
  if (!process.env[keyVar]) {
    console.warn(`⚠️  AI_PROVIDER=${provider} but ${keyVar} is not set — photo analysis will fail until you add it to backend/.env`);
  }
});
