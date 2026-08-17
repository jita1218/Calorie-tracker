// Regex-matches common workout descriptions against a local MET (metabolic
// equivalent) table so calories burned can be estimated instantly, without
// an AI call — same idea as utils/localFoodLookup.js. Formula:
//   calories = MET * bodyWeightKg * durationHours
// Falls through (returns null) to the AI for activities not in the table.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ACTIVITIES = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/exerciseMets.json'), 'utf-8'));

const DEFAULT_DURATION_MIN = 30;

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const MATCHERS = ACTIVITIES.flatMap((activity) => activity.aliases.map((alias) => ({
  activity,
  alias,
  pattern: new RegExp(`\\b${escapeRegex(alias)}\\b`, 'i'),
}))).sort((a, b) => b.alias.length - a.alias.length);

function parseDurationMinutes(text) {
  let m = text.match(/(\d+(?:\.\d+)?)\s*(?:hours?|hrs?)\b/i);
  if (m) return parseFloat(m[1]) * 60;
  m = text.match(/(\d+(?:\.\d+)?)\s*(?:minutes?|mins?)\b/i);
  if (m) return parseFloat(m[1]);
  return null;
}

export function lookupLocalExercise(description, weightKg) {
  const text = description.trim().toLowerCase();
  if (!text) return null;

  for (const { activity, pattern } of MATCHERS) {
    if (!pattern.test(text)) continue;

    const explicitDuration = parseDurationMinutes(text);
    const duration = explicitDuration ?? DEFAULT_DURATION_MIN;
    const hours = duration / 60;
    const calories = Math.round(activity.met * weightKg * hours);

    return {
      activity: activity.name,
      duration_minutes: Math.round(duration),
      calories_burned: calories,
      notes: explicitDuration === null ? `Assumed ${DEFAULT_DURATION_MIN} minutes since no duration was given — edit it below if different.` : '',
    };
  }
  return null;
}
