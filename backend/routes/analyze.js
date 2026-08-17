import { Router } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenAI } from '@google/genai';
import { SYSTEM_PROMPT, USER_PROMPT, TEXT_SYSTEM_PROMPT, buildTextPrompt, extractJson, parseDataUrl } from '../utils/foodAnalysis.js';
import { lookupLocalFood } from '../utils/localFoodLookup.js';
import { todayStr } from '../utils/date.js';
import db from '../db.js';

const router = Router();

// AI_PROVIDER=gemini (default, free tier available) or AI_PROVIDER=anthropic
const PROVIDER = (process.env.AI_PROVIDER || 'gemini').toLowerCase();
const DAILY_LIMIT = Number(process.env.ANALYZE_DAILY_LIMIT) || 30;

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

async function analyzeWithGemini({ mediaType, base64Data }) {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

  const response = await ai.models.generateContent({
    model,
    contents: [{
      role: 'user',
      parts: [
        { text: `${SYSTEM_PROMPT}\n\n${USER_PROMPT}` },
        { inlineData: { mimeType: mediaType, data: base64Data } },
      ],
    }],
  });

  const text = response.text;
  if (!text) throw new Error('No text response from Gemini');
  return extractJson(text);
}

async function analyzeWithAnthropic({ mediaType, base64Data }) {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5';

  const response = await anthropic.messages.create({
    model,
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64Data } },
        { type: 'text', text: USER_PROMPT },
      ],
    }],
  });

  const textBlock = response.content.find((b) => b.type === 'text');
  if (!textBlock) throw new Error('No text response from Claude');
  return extractJson(textBlock.text);
}

async function analyzeTextWithGemini(description) {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

  const response = await ai.models.generateContent({
    model,
    contents: [{
      role: 'user',
      parts: [{ text: `${TEXT_SYSTEM_PROMPT}\n\n${buildTextPrompt(description)}` }],
    }],
  });

  const text = response.text;
  if (!text) throw new Error('No text response from Gemini');
  return extractJson(text);
}

async function analyzeTextWithAnthropic(description) {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5';

  const response = await anthropic.messages.create({
    model,
    max_tokens: 1024,
    system: TEXT_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: buildTextPrompt(description) }],
  });

  const textBlock = response.content.find((b) => b.type === 'text');
  if (!textBlock) throw new Error('No text response from Claude');
  return extractJson(textBlock.text);
}

router.post('/text', async (req, res) => {
  const { description } = req.body;
  if (!description || typeof description !== 'string' || !description.trim()) {
    return res.status(400).json({ error: 'description is required, e.g. "1 banana"' });
  }

  // Common single items (e.g. "2 eggs") are answered from a local table —
  // no AI call, no daily-limit usage, near-instant.
  const localMatch = lookupLocalFood(description);
  if (localMatch) {
    return res.json(localMatch);
  }

  const date = todayStr();
  const used = getUsageCount(req.userId, date);
  if (used >= DAILY_LIMIT) {
    return res.status(429).json({ error: `Daily photo-analysis limit reached (${DAILY_LIMIT}/day). Try again tomorrow.` });
  }

  if (PROVIDER === 'gemini' && !process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: 'Server is missing GEMINI_API_KEY. Add it to backend/.env, or set AI_PROVIDER=anthropic.' });
  }
  if (PROVIDER === 'anthropic' && !process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'Server is missing ANTHROPIC_API_KEY. Add it to backend/.env, or set AI_PROVIDER=gemini.' });
  }

  try {
    const result = PROVIDER === 'anthropic'
      ? await analyzeTextWithAnthropic(description.trim())
      : await analyzeTextWithGemini(description.trim());

    incrementUsage(req.userId, date);
    res.json(result);
  } catch (err) {
    console.error('Text analyze error:', err);
    res.status(500).json({ error: "Couldn't estimate that item. Try rewording it, e.g. \"1 banana\" or \"2 roti with dal\"." });
  }
});

router.post('/', async (req, res) => {
  const date = todayStr();
  const used = getUsageCount(req.userId, date);
  if (used >= DAILY_LIMIT) {
    return res.status(429).json({ error: `Daily photo-analysis limit reached (${DAILY_LIMIT}/day). Try again tomorrow or enter the item manually.` });
  }

  try {
    const { image } = req.body;
    if (!image || typeof image !== 'string') {
      return res.status(400).json({ error: 'image (base64 data URL) is required' });
    }

    const parsed = parseDataUrl(image);
    if (!parsed) {
      return res.status(400).json({ error: 'image must be a base64 data URL, e.g. data:image/jpeg;base64,...' });
    }

    if (PROVIDER === 'gemini' && !process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'Server is missing GEMINI_API_KEY. Add it to backend/.env, or set AI_PROVIDER=anthropic.' });
    }
    if (PROVIDER === 'anthropic' && !process.env.ANTHROPIC_API_KEY) {
      return res.status(500).json({ error: 'Server is missing ANTHROPIC_API_KEY. Add it to backend/.env, or set AI_PROVIDER=gemini.' });
    }

    const result = PROVIDER === 'anthropic'
      ? await analyzeWithAnthropic(parsed)
      : await analyzeWithGemini(parsed);

    incrementUsage(req.userId, date);
    res.json(result);
  } catch (err) {
    console.error('Analyze error:', err);
    res.status(500).json({ error: 'Could not analyze the photo. Try again or enter the item manually.' });
  }
});

export default router;
