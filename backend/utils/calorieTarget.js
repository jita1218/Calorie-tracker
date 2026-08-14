// Standard Mifflin-St Jeor BMR + activity multiplier + a goal-driven
// deficit/surplus. This is a general-purpose estimate, not medical advice —
// the profile screen lets the user override the computed target directly.

const ACTIVITY_MULTIPLIERS = {
  sedentary: 1.2,      // little or no exercise
  light: 1.375,        // light exercise 1-3 days/week
  moderate: 1.55,       // moderate exercise 3-5 days/week
  active: 1.725,        // hard exercise 6-7 days/week
  very_active: 1.9,     // very hard exercise & physical job
};

const KCAL_PER_KG = 7700; // approx. energy stored per kg of body fat
const SAFETY_FLOOR = { male: 1500, female: 1200 };

export function calcBMR({ sex, age, height_cm, current_weight_kg }) {
  const base = 10 * current_weight_kg + 6.25 * height_cm - 5 * age;
  return sex === 'male' ? base + 5 : base - 161;
}

export function calcDailyTarget(profile) {
  const bmr = calcBMR(profile);
  const multiplier = ACTIVITY_MULTIPLIERS[profile.activity_level] ?? ACTIVITY_MULTIPLIERS.light;
  const tdee = bmr * multiplier;

  const weightDiff = profile.goal_weight_kg - profile.current_weight_kg;
  const dailyAdjustment = (KCAL_PER_KG * Math.abs(profile.rate_kg_per_week || 0.5)) / 7;

  let target = tdee;
  let direction = 'maintain';
  if (weightDiff <= -0.5) {
    target = tdee - dailyAdjustment;
    direction = 'lose';
  } else if (weightDiff >= 0.5) {
    target = tdee + dailyAdjustment;
    direction = 'gain';
  }

  const floor = SAFETY_FLOOR[profile.sex] ?? SAFETY_FLOOR.female;
  target = Math.max(target, floor);

  return {
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    target: Math.round(target),
    direction,
  };
}
