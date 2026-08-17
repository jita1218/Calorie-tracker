import { Router } from 'express';
import { z } from 'zod';
import db from '../db.js';
import { calcDailyTarget } from '../utils/calorieTarget.js';
import { validate } from '../utils/validate.js';
import { clusterFrequentFoods } from '../utils/foodMatch.js';
import { todayStr } from '../utils/date.js';

const router = Router();

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;

const logSchema = z.object({
  date: z.string().regex(DATE_RE).optional(),
  time: z.string().regex(TIME_RE).optional(),
  food_name: z.string().min(1).max(200),
  portion_desc: z.string().max(200).optional().default(''),
  calories: z.coerce.number().min(0).max(10000),
  protein_g: z.coerce.number().min(0).max(2000).optional().default(0),
  carbs_g: z.coerce.number().min(0).max(2000).optional().default(0),
  fat_g: z.coerce.number().min(0).max(2000).optional().default(0),
  source: z.enum(['manual', 'photo', 'ai']).optional().default('manual'),
});

const editSchema = logSchema.omit({ date: true, time: true, source: true });

router.get('/', (req, res) => {
  const date = req.query.date || todayStr();
  const rows = db.prepare('SELECT * FROM logs WHERE user_id = ? AND date = ? ORDER BY time ASC, id ASC')
    .all(req.userId, date);
  res.json({ date, logs: rows });
});

router.post('/', validate(logSchema), (req, res) => {
  const {
    date, time, food_name, portion_desc,
    calories, protein_g, carbs_g, fat_g, source,
  } = req.body;

  const info = db.prepare(`
    INSERT INTO logs (user_id, date, time, food_name, portion_desc, calories, protein_g, carbs_g, fat_g, source)
    VALUES (@user_id, @date, @time, @food_name, @portion_desc, @calories, @protein_g, @carbs_g, @fat_g, @source)
  `).run({
    user_id: req.userId,
    date: date || todayStr(),
    time: time || new Date().toTimeString().slice(0, 5),
    food_name,
    portion_desc,
    calories: Math.round(calories),
    protein_g,
    carbs_g,
    fat_g,
    source,
  });

  const row = db.prepare('SELECT * FROM logs WHERE id = ? AND user_id = ?').get(info.lastInsertRowid, req.userId);
  res.status(201).json(row);
});

router.put('/:id', validate(editSchema), (req, res) => {
  const { food_name, portion_desc, calories, protein_g, carbs_g, fat_g } = req.body;

  const info = db.prepare(`
    UPDATE logs SET food_name = @food_name, portion_desc = @portion_desc,
      calories = @calories, protein_g = @protein_g, carbs_g = @carbs_g, fat_g = @fat_g
    WHERE id = @id AND user_id = @user_id
  `).run({
    id: req.params.id,
    user_id: req.userId,
    food_name,
    portion_desc,
    calories: Math.round(calories),
    protein_g,
    carbs_g,
    fat_g,
  });

  if (info.changes === 0) {
    return res.status(404).json({ error: 'Log entry not found' });
  }

  const row = db.prepare('SELECT * FROM logs WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  res.json(row);
});

router.delete('/:id', (req, res) => {
  const info = db.prepare('DELETE FROM logs WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
  if (info.changes === 0) {
    return res.status(404).json({ error: 'Log entry not found' });
  }
  res.status(204).end();
});

router.get('/frequent', (req, res) => {
  // Fuzzy-matched across sources (photo scan, typed AI lookup, manual entry) —
  // see utils/foodMatch.js for the clustering algorithm.
  const rows = db.prepare(`
    SELECT id, food_name, portion_desc, calories, protein_g, carbs_g, fat_g
    FROM logs WHERE user_id = ?
  `).all(req.userId);
  const items = clusterFrequentFoods(rows).slice(0, 6);
  res.json({ items });
});

router.get('/summary', (req, res) => {
  const date = req.query.date || todayStr();
  const rows = db.prepare('SELECT * FROM logs WHERE user_id = ? AND date = ?').all(req.userId, date);

  const totals = rows.reduce((acc, r) => {
    acc.calories += r.calories;
    acc.protein_g += r.protein_g;
    acc.carbs_g += r.carbs_g;
    acc.fat_g += r.fat_g;
    return acc;
  }, { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 });

  const exerciseRows = db.prepare('SELECT calories_burned FROM exercise_logs WHERE user_id = ? AND date = ?').all(req.userId, date);
  const exerciseCalories = exerciseRows.reduce((sum, r) => sum + r.calories_burned, 0);

  const profile = db.prepare('SELECT * FROM profile WHERE user_id = ?').get(req.userId)
    || { sex: 'female', age: 25, height_cm: 165, current_weight_kg: 65, goal_weight_kg: 60, activity_level: 'light', rate_kg_per_week: 0.5 };
  const target = calcDailyTarget(profile);

  // Exercise burn adds back to the day's allowance — eat closer to target,
  // burn some off, and the remaining budget grows accordingly.
  const remaining = target.target - totals.calories + exerciseCalories;

  res.json({
    date,
    totals,
    exerciseCalories,
    target,
    remaining,
    status: remaining >= 0 ? 'under' : 'over',
    entryCount: rows.length,
  });
});

export default router;
