import { Router } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';
import db from '../db.js';
import { validate } from '../utils/validate.js';
import { todayStr } from '../utils/date.js';
import { lookupLocalExercise } from '../utils/exerciseLookup.js';
import { EXERCISE_SYSTEM_PROMPT, buildExercisePrompt, extractJson } from '../utils/foodAnalysis.js';

const router = Router();

const PROVIDER = (process.env.AI_PROVIDER || 'gemini').toLowerCase();
const DAILY_LIMIT = Number(process.env.ANALYZE_DAILY_LIMIT) || 30;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;

const exerciseSchema = z.object({
  date: z.string().regex(DATE_RE).optional(),
  time: z.string().regex(TIME_RE).optional(),
  activity: z.string().min(1).max(200),
  duration_minutes: z.coerce.number().min(0).max(1440),
  calories_burned: z.coerce.number().min(0).max(5000),
});

const editSchema = exerciseSchema.omit({ date: true, time: true });

function getUsageCount(userId, date) {
  const row = db.prepare('SELECT count FROM analyze_usage WHERE user_id = ? AND date = ?').get(userId, date);
  return row ? row.count : 0;
}

function incrementUsage(userId, date) {
  db.prepare(`
    INSERT INTO analyze_usage (user_id, date, count) VALUES (?, ?, 1)
    ON CONFLICT(user_id, date) DO UPDATE SET count = count + 1
  `).run(userId, date);
}

function getWeightKg(userId) {
  const row = db.prepare('SELECT current_weight_kg FROM profile WHERE user_id = ?').get(userId);
  return row?.current_weight_kg || 65;
}

async function analyzeWithGemini(description, weightKg) {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const response = await ai.models.generateContent({
    model,
    contents: [{
      role: 'user',
      parts: [{ text: `${EXERCISE_SYSTEM_PROMPT}\n\n${buildExercisePrompt(description, weightKg)}` }],
    }],
  });
  const text = response.text;
  if (!text) throw new Error('No text response from Gemini');
  return extractJson(text);
}

async function analyzeWithAnthropic(description, weightKg) {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5';
  const response = await anthropic.messages.create({
    model,
    max_tokens: 512,
    system: EXERCISE_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: buildExercisePrompt(description, weightKg) }],
  });
  const textBlock = response.content.find((b) => b.type === 'text');
  if (!textBlock) throw new Error('No text response from Claude');
  return extractJson(textBlock.text);
}

router.get('/', (req, res) => {
  const date = req.query.date || todayStr();
  const rows = db.prepare('SELECT * FROM exercise_logs WHERE user_id = ? AND date = ? ORDER BY time ASC, id ASC')
    .all(req.userId, date);
  res.json({ date, exercises: rows });
});

router.post('/analyze', (req, res, next) => {
  const { description } = req.body;
  if (!description || typeof description !== 'string' || !description.trim()) {
    return res.status(400).json({ error: 'description is required, e.g. "30 min running"' });
  }

  const weightKg = getWeightKg(req.userId);

  const localMatch = lookupLocalExercise(description, weightKg);
  if (localMatch) {
    return res.json(localMatch);
  }

  next();
}, async (req, res) => {
  const { description } = req.body;
  const weightKg = getWeightKg(req.userId);
  const date = todayStr();

  const used = getUsageCount(req.userId, date);
  if (used >= DAILY_LIMIT) {
    return res.status(429).json({ error: `Daily AI-lookup limit reached (${DAILY_LIMIT}/day). Try again tomorrow, or describe a common activity like "running" or "gym".` });
  }

  if (PROVIDER === 'gemini' && !process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: 'Server is missing GEMINI_API_KEY. Add it to backend/.env, or set AI_PROVIDER=anthropic.' });
  }
  if (PROVIDER === 'anthropic' && !process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'Server is missing ANTHROPIC_API_KEY. Add it to backend/.env, or set AI_PROVIDER=gemini.' });
  }

  try {
    const result = PROVIDER === 'anthropic'
      ? await analyzeWithAnthropic(description.trim(), weightKg)
      : await analyzeWithGemini(description.trim(), weightKg);

    incrementUsage(req.userId, date);
    res.json(result);
  } catch (err) {
    console.error('Exercise analyze error:', err);
    res.status(500).json({ error: "Couldn't estimate that activity. Try a common term like \"running\", \"cycling\", or \"gym\"." });
  }
});

router.post('/', validate(exerciseSchema), (req, res) => {
  const { date, time, activity, duration_minutes, calories_burned } = req.body;

  const info = db.prepare(`
    INSERT INTO exercise_logs (user_id, date, time, activity, duration_minutes, calories_burned, source)
    VALUES (@user_id, @date, @time, @activity, @duration_minutes, @calories_burned, 'ai')
  `).run({
    user_id: req.userId,
    date: date || todayStr(),
    time: time || new Date().toTimeString().slice(0, 5),
    activity,
    duration_minutes: Math.round(duration_minutes),
    calories_burned: Math.round(calories_burned),
  });

  const row = db.prepare('SELECT * FROM exercise_logs WHERE id = ? AND user_id = ?').get(info.lastInsertRowid, req.userId);
  res.status(201).json(row);
});

router.put('/:id', validate(editSchema), (req, res) => {
  const { activity, duration_minutes, calories_burned } = req.body;

  const info = db.prepare(`
    UPDATE exercise_logs SET activity = @activity, duration_minutes = @duration_minutes, calories_burned = @calories_burned
    WHERE id = @id AND user_id = @user_id
  `).run({
    id: req.params.id,
    user_id: req.userId,
    activity,
    duration_minutes: Math.round(duration_minutes),
    calories_burned: Math.round(calories_burned),
  });

  if (info.changes === 0) {
    return res.status(404).json({ error: 'Exercise entry not found' });
  }

  const row = db.prepare('SELECT * FROM exercise_logs WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  res.json(row);
});

router.delete('/:id', (req, res) => {
  const info = db.prepare('DELETE FROM exercise_logs WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
  if (info.changes === 0) {
    return res.status(404).json({ error: 'Exercise entry not found' });
  }
  res.status(204).end();
});

export default router;
