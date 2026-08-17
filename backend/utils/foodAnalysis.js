// Shared prompt + JSON parsing for whichever AI provider is analyzing the photo.

export const SYSTEM_PROMPT = `You are a nutrition estimator specialized in Indian food (home-cooked and \
restaurant dishes across regional cuisines: North Indian, South Indian, Bengali, Gujarati, \
Maharashtrian, street food, etc.). Given a photo of a plate or meal, identify each distinct \
item you can see and estimate a realistic Indian home-portion size and its nutrition.

Respond with ONLY a JSON object, no prose, no markdown fences, matching this shape exactly:
{
  "items": [
    {
      "name": "string, e.g. Chana Masala",
      "portion": "string, e.g. 1 katori (~150g)",
      "calories": number,
      "protein_g": number,
      "carbs_g": number,
      "fat_g": number,
      "confidence": "high" | "medium" | "low"
    }
  ],
  "notes": "one short sentence with any caveat about the estimate, or empty string"
}

If you cannot identify any food in the image, return {"items": [], "notes": "explain why"}.`;

export const USER_PROMPT = 'Identify the Indian food item(s) in this photo and estimate their nutrition.';

export const TEXT_SYSTEM_PROMPT = `You are a nutrition estimator specialized in Indian food (home-cooked and \
restaurant dishes across regional cuisines: North Indian, South Indian, Bengali, Gujarati, \
Maharashtrian, street food, etc.). Given a short plain-text description of what someone ate \
(e.g. "1 banana", "2 roti with dal", "a bowl of curd rice"), identify each distinct item and \
estimate a realistic Indian home-portion size and its nutrition.

Respond with ONLY a JSON object, no prose, no markdown fences, matching this shape exactly:
{
  "items": [
    {
      "name": "string, e.g. Chana Masala",
      "portion": "string, e.g. 1 katori (~150g)",
      "calories": number,
      "protein_g": number,
      "carbs_g": number,
      "fat_g": number,
      "confidence": "high" | "medium" | "low"
    }
  ],
  "notes": "one short sentence with any caveat about the estimate, or empty string"
}

If the description doesn't name any food, return {"items": [], "notes": "explain why"}.`;

export function buildTextPrompt(description) {
  return `Estimate the nutrition for: "${description}"`;
}

export const EXERCISE_SYSTEM_PROMPT = `You estimate calories burned from a short description of a workout or \
physical activity (e.g. "30 min running", "leg day for an hour", "cycling"). Use the person's body weight to \
scale a standard MET (metabolic equivalent) based estimate: calories = MET x weight_kg x duration_hours. If no \
duration is stated, assume 30 minutes.

Respond with ONLY a JSON object, no prose, no markdown fences, matching this shape exactly:
{
  "activity": "string, e.g. Running",
  "duration_minutes": number,
  "calories_burned": number,
  "notes": "one short sentence with any caveat (e.g. assumed duration), or empty string"
}

If the description isn't a physical activity/exercise, return {"activity": "", "duration_minutes": 0, "calories_burned": 0, "notes": "explain why"}.`;

export function buildExercisePrompt(description, weightKg) {
  return `Person's body weight: ${weightKg} kg. Estimate calories burned for: "${description}"`;
}

export function extractJson(text) {
  const cleaned = text.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '');
  return JSON.parse(cleaned);
}

export function parseDataUrl(image) {
  const match = image.match(/^data:(image\/\w+);base64,(.+)$/);
  if (!match) return null;
  const [, mediaType, base64Data] = match;
  return { mediaType, base64Data };
}
