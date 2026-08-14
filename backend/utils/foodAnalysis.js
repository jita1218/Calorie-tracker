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
