import { Router } from 'express';
import db from '../db.js';
import { calcDailyTarget } from '../utils/calorieTarget.js';

const router = Router();

function getProfileRow() {
  let row = db.prepare('SELECT * FROM profile WHERE id = 1').get();
  if (!row) {
    db.prepare(
      `INSERT INTO profile (id) VALUES (1)`
    ).run();
    row = db.prepare('SELECT * FROM profile WHERE id = 1').get();
  }
  return row;
}

router.get('/', (req, res) => {
  const profile = getProfileRow();
  const target = calcDailyTarget(profile);
  res.json({ profile, target });
});

router.put('/', (req, res) => {
  const {
    name, sex, age, height_cm,
    current_weight_kg, goal_weight_kg,
    activity_level, rate_kg_per_week,
  } = req.body;

  db.prepare(`
    INSERT INTO profile (id, name, sex, age, height_cm, current_weight_kg, goal_weight_kg, activity_level, rate_kg_per_week, updated_at)
    VALUES (1, @name, @sex, @age, @height_cm, @current_weight_kg, @goal_weight_kg, @activity_level, @rate_kg_per_week, datetime('now'))
    ON CONFLICT(id) DO UPDATE SET
      name=@name, sex=@sex, age=@age, height_cm=@height_cm,
      current_weight_kg=@current_weight_kg, goal_weight_kg=@goal_weight_kg,
      activity_level=@activity_level, rate_kg_per_week=@rate_kg_per_week,
      updated_at=datetime('now')
  `).run({
    name: name ?? '', sex: sex ?? 'female', age: age ?? 25,
    height_cm: height_cm ?? 165, current_weight_kg: current_weight_kg ?? 65,
    goal_weight_kg: goal_weight_kg ?? 60, activity_level: activity_level ?? 'light',
    rate_kg_per_week: rate_kg_per_week ?? 0.5,
  });

  const profile = getProfileRow();
  const target = calcDailyTarget(profile);
  res.json({ profile, target });
});

export default router;
