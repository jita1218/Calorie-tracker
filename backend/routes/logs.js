import { Router } from 'express';
import db from '../db.js';
import { calcDailyTarget } from '../utils/calorieTarget.js';

const router = Router();

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

router.get('/', (req, res) => {
  const date = req.query.date || todayStr();
  const rows = db.prepare('SELECT * FROM logs WHERE date = ? ORDER BY time ASC, id ASC').all(date);
  res.json({ date, logs: rows });
});

router.post('/', (req, res) => {
  const {
    date, time, food_name, portion_desc,
    calories, protein_g, carbs_g, fat_g, source,
  } = req.body;

  if (!food_name || calories == null) {
    return res.status(400).json({ error: 'food_name and calories are required' });
  }

  const info = db.prepare(`
    INSERT INTO logs (date, time, food_name, portion_desc, calories, protein_g, carbs_g, fat_g, source)
    VALUES (@date, @time, @food_name, @portion_desc, @calories, @protein_g, @carbs_g, @fat_g, @source)
  `).run({
    date: date || todayStr(),
    time: time || new Date().toTimeString().slice(0, 5),
    food_name,
    portion_desc: portion_desc || '',
    calories: Math.round(calories),
    protein_g: protein_g || 0,
    carbs_g: carbs_g || 0,
    fat_g: fat_g || 0,
    source: source || 'manual',
  });

  const row = db.prepare('SELECT * FROM logs WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(row);
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM logs WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

router.get('/summary', (req, res) => {
  const date = req.query.date || todayStr();
  const rows = db.prepare('SELECT * FROM logs WHERE date = ?').all(date);

  const totals = rows.reduce((acc, r) => {
    acc.calories += r.calories;
    acc.protein_g += r.protein_g;
    acc.carbs_g += r.carbs_g;
    acc.fat_g += r.fat_g;
    return acc;
  }, { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 });

  const profile = db.prepare('SELECT * FROM profile WHERE id = 1').get()
    || { sex: 'female', age: 25, height_cm: 165, current_weight_kg: 65, goal_weight_kg: 60, activity_level: 'light', rate_kg_per_week: 0.5 };
  const target = calcDailyTarget(profile);

  const remaining = target.target - totals.calories;

  res.json({
    date,
    totals,
    target,
    remaining,
    status: remaining >= 0 ? 'under' : 'over',
    entryCount: rows.length,
  });
});

export default router;
