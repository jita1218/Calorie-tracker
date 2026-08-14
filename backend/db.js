import Database from 'better-sqlite3';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database(path.join(__dirname, 'thali.db'));

db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS profile (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    name TEXT NOT NULL DEFAULT '',
    sex TEXT NOT NULL DEFAULT 'female',
    age INTEGER NOT NULL DEFAULT 25,
    height_cm REAL NOT NULL DEFAULT 165,
    current_weight_kg REAL NOT NULL DEFAULT 65,
    goal_weight_kg REAL NOT NULL DEFAULT 60,
    activity_level TEXT NOT NULL DEFAULT 'light',
    rate_kg_per_week REAL NOT NULL DEFAULT 0.5,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    food_name TEXT NOT NULL,
    portion_desc TEXT NOT NULL DEFAULT '',
    calories INTEGER NOT NULL,
    protein_g REAL NOT NULL DEFAULT 0,
    carbs_g REAL NOT NULL DEFAULT 0,
    fat_g REAL NOT NULL DEFAULT 0,
    source TEXT NOT NULL DEFAULT 'manual',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_logs_date ON logs(date);
`);

export default db;
