import Database from 'better-sqlite3';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database(path.join(__dirname, 'thali.db'));

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS profile (
    user_id INTEGER PRIMARY KEY REFERENCES users(id),
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
    user_id INTEGER NOT NULL REFERENCES users(id),
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

  CREATE INDEX IF NOT EXISTS idx_logs_user_date ON logs(user_id, date);

  CREATE TABLE IF NOT EXISTS exercise_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    activity TEXT NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 0,
    calories_burned INTEGER NOT NULL,
    source TEXT NOT NULL DEFAULT 'manual',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_exercise_logs_user_date ON exercise_logs(user_id, date);

  CREATE TABLE IF NOT EXISTS analyze_usage (
    user_id INTEGER NOT NULL REFERENCES users(id),
    date TEXT NOT NULL,
    count INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, date)
  );
`);

// Migrate older users table shapes (Google-Sign-In, then phone+password) to
// username+password. Recreating the table resets its AUTOINCREMENT sequence,
// so the first account registered after migrating becomes id 1 again and
// keeps any existing profile/logs rows, which are keyed on user_id.
const userColumns = db.prepare('PRAGMA table_info(users)').all().map((c) => c.name);
if (!userColumns.includes('username')) {
  // profile/logs/analyze_usage rows still reference the old users(id) — drop
  // with FK checks off so the implicit delete doesn't get rejected, then re-enable.
  db.pragma('foreign_keys = OFF');
  db.exec(`
    DROP TABLE users;
    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  db.pragma('foreign_keys = ON');
}

export default db;
