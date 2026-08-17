// Regex-matches common, single-item food descriptions against a local JSON
// table (data/commonFoods.json) so a typed entry like "2 eggs" or "1 banana"
// can be answered instantly, without spending an AI API call. Falls through
// to the AI provider (see routes/analyze.js) for anything that doesn't match
// or looks like a compound/multi-item description.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FOODS = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/commonFoods.json'), 'utf-8'));

const WORD_QUANTITIES = {
  a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6,
  seven: 7, eight: 8, nine: 9, ten: 10, couple: 2, few: 3,
};

const MAX_WORDS = 3; // beyond this it's likely a compound dish — let the AI read it

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function round1(n) {
  return Math.round(n * 10) / 10;
}

// One regex per (food, alias) pair, sorted longest-alias-first, so a specific
// multi-word alias like "egg white" is tried before a shorter one like "egg"
// that would otherwise match as a false-positive substring first.
const QUANTITY_GROUP = `(\\d+(?:\\.\\d+)?|${Object.keys(WORD_QUANTITIES).join('|')})`;
const MATCHERS = FOODS.flatMap((food) => food.aliases.map((alias) => ({
  food,
  alias,
  pattern: new RegExp(`(?:^|\\s)(?:${QUANTITY_GROUP}\\s+)?${escapeRegex(alias)}s?(?:\\s|$)`, 'i'),
}))).sort((a, b) => b.alias.length - a.alias.length);

export function lookupLocalFood(description) {
  const text = description.trim().toLowerCase();
  if (!text) return null;
  if (text.split(/\s+/).filter(Boolean).length > MAX_WORDS) return null;

  for (const { food, pattern } of MATCHERS) {
    const match = text.match(pattern);
    if (!match) continue;

    let qty = 1;
    if (match[1]) {
      const parsed = parseFloat(match[1]);
      qty = Number.isNaN(parsed) ? (WORD_QUANTITIES[match[1].toLowerCase()] ?? 1) : parsed;
    }
    qty = Math.min(Math.max(qty, 0.25), 20); // sane bounds against typos like "200 bananas"

    return {
      items: [{
        name: food.name,
        portion: qty === 1 ? food.portion : `${qty} x ${food.portion}`,
        calories: Math.round(food.calories * qty),
        protein_g: round1(food.protein_g * qty),
        carbs_g: round1(food.carbs_g * qty),
        fat_g: round1(food.fat_g * qty),
        confidence: 'high',
      }],
      notes: '',
    };
  }
  return null;
}
