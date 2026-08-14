import { Router } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenAI } from '@google/genai';
import { SYSTEM_PROMPT, USER_PROMPT, extractJson, parseDataUrl } from '../utils/foodAnalysis.js';

const router = Router();

// AI_PROVIDER=gemini (default, free tier available) or AI_PROVIDER=anthropic
const PROVIDER = (process.env.AI_PROVIDER || 'gemini').toLowerCase();

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

router.post('/', async (req, res) => {
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

    res.json(result);
  } catch (err) {
    console.error('Analyze error:', err);
    res.status(500).json({ error: 'Could not analyze the photo. Try again or enter the item manually.' });
  }
});

export default router;
