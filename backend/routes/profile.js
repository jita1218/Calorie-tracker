import { Router } from 'express';
import { z } from 'zod';
import db from '../db.js';
import { calcDailyTarget } from '../utils/calorieTarget.js';
import { validate } from '../utils/validate.js';

const router = Router();

const profileSchema = z.object({
  name: z.string().max(100).optional().default(''),
  sex: z.enum(['male', 'female']).optional().default('female'),
  age: z.coerce.number().int().min(1).max(120).optional().default(25),
  height_cm: z.coerce.number().min(50).max(250).optional().default(165),
  current_weight_kg: z.coerce.number().min(20).max(400).optional().default(65),
  goal_weight_kg: z.coerce.number().min(20).max(400).optional().default(60),
  activity_level: z.enum(['sedentary', 'light', 'moderate', 'active', 'very_active']).optional().default('light'),
  rate_kg_per_week: z.coerce.number().min(0).max(2).optional().default(0.5),
});

function getProfileRow(userId) {
  let row = db.prepare('SELECT * FROM profile WHERE user_id = ?').get(userId);
  if (!row) {
    db.prepare('INSERT INTO profile (user_id) VALUES (?)').run(userId);
    row = db.prepare('SELECT * FROM profile WHERE user_id = ?').get(userId);
  }
  return row;
}

router.get('/', (req, res) => {
  const profile = getProfileRow(req.userId);
  const target = calcDailyTarget(profile);
  const user = db.prepare('SELECT username FROM users WHERE id = ?').get(req.userId);
  res.json({ profile, target, username: user?.username || '' });
});

router.put('/', validate(profileSchema), (req, res) => {
  const {
    name, sex, age, height_cm,
    current_weight_kg, goal_weight_kg,
    activity_level, rate_kg_per_week,
  } = req.body;

  db.prepare(`
    INSERT INTO profile (user_id, name, sex, age, height_cm, current_weight_kg, goal_weight_kg, activity_level, rate_kg_per_week, updated_at)
    VALUES (@user_id, @name, @sex, @age, @height_cm, @current_weight_kg, @goal_weight_kg, @activity_level, @rate_kg_per_week, datetime('now'))
    ON CONFLICT(user_id) DO UPDATE SET
      name=@name, sex=@sex, age=@age, height_cm=@height_cm,
      current_weight_kg=@current_weight_kg, goal_weight_kg=@goal_weight_kg,
      activity_level=@activity_level, rate_kg_per_week=@rate_kg_per_week,
      updated_at=datetime('now')
  `).run({
    user_id: req.userId,
    name, sex, age, height_cm,
    current_weight_kg, goal_weight_kg,
    activity_level, rate_kg_per_week,
  });

  const profile = getProfileRow(req.userId);
  const target = calcDailyTarget(profile);
  res.json({ profile, target });
});

export default router;
