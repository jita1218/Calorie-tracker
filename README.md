# 🍛 Thali Tracker

A calorie tracker built around Indian food: snap a photo of your plate, Claude's
vision identifies the dish(es) and estimates calories, and everything is logged
against a daily target calculated from your profile and weight goal. At any point
you get a live summary: how much you've eaten, how much is left, and whether
you're on track for the day.

## How it works

- **Profile** — enter age, sex, height, current weight, goal weight, activity
  level, and a target pace (kg/week). The backend computes your BMR (Mifflin-St
  Jeor), maintenance calories (TDEE), and a daily calorie target that nudges you
  toward your goal at that pace.
- **Photo logging** — upload or snap a photo of a meal. The backend sends it to
  the Claude API with a prompt tuned for Indian home and restaurant food, which
  returns identified item(s), a realistic portion size, and estimated
  calories/protein/carbs/fat. You can edit any field before confirming — the AI
  estimate is a starting point, not gospel.
- **Manual entry** — always available as a fallback if a photo isn't handy or
  the estimate looks off.
- **Daily summary** — a "thali ring" shows calories eaten vs. your target for
  the day (spilling into red if you go over), plus a written summary and macro
  breakdown. A History tab lets you revisit any past day.

## Project layout

```
calorie-tracker/
  backend/    Express + SQLite API, Anthropic vision calls
  frontend/   React + Vite + Tailwind UI
```

## Setup

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env
npm start
```

Runs on `http://localhost:4000` by default. Data is stored in `backend/thali.db`
(SQLite, created automatically on first run).

**AI provider for photo analysis** — set in `.env`:

- `AI_PROVIDER=gemini` (default) — free tier, no credit card. Get a key at
  https://aistudio.google.com/apikey and set `GEMINI_API_KEY`.
- `AI_PROVIDER=anthropic` — paid, generally the stronger estimator. Get a key
  at https://platform.claude.com/settings/keys and set `ANTHROPIC_API_KEY`.

Only the key for whichever provider you pick needs to be real; the other can
stay as the placeholder.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Runs on `http://localhost:5173`. If your backend isn't on `localhost:4000`,
set `VITE_API_URL` in a `frontend/.env` file before building/running.

### 3. Open the app

Visit `http://localhost:5173`, fill in your profile first (this sets your daily
ration), then start logging meals from the Today tab.

## Notes

- The daily target has a safety floor (1500 kcal for men / 1200 kcal for
  women) so an aggressive goal pace can't push it unreasonably low — adjust
  your pace in Profile if you want a bigger deficit/surplus than the default
  allows.
- Calorie estimates from photos are approximations. Portion size is the
  biggest source of error — edit the numbers before confirming if you know
  your actual serving was bigger or smaller.
- Single-user: there's no login, every request acts as the one local user.
  Data is stored in one SQLite file (`backend/thali.db`).
- The photo-analysis endpoint is capped per user per day
  (`ANALYZE_DAILY_LIMIT`, default 30) to bound AI provider costs, on top of
  general IP-based rate limiting.
