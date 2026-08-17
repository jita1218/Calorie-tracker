import { useEffect, useState, useCallback } from 'react';
import { api, todayStr } from '../api.js';
import ThaliRing from '../components/ThaliRing.jsx';
import FoodCapture from '../components/FoodCapture.jsx';
import LogTimeline from '../components/LogTimeline.jsx';
import FrequentFoods from '../components/FrequentFoods.jsx';
import ErrorState from '../components/ErrorState.jsx';
import ExerciseTimeline from '../components/ExerciseTimeline.jsx';

const DIRECTION_COPY = {
  lose: (kg) => `aiming to lose toward ${kg} kg`,
  gain: (kg) => `aiming to gain toward ${kg} kg`,
  maintain: (kg) => `holding steady around ${kg} kg`,
};

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [logs, setLogs] = useState([]);
  const [exercises, setExercises] = useState([]);
  const [profile, setProfile] = useState(null);
  const [frequent, setFrequent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');
  const date = todayStr();

  const refresh = useCallback(async () => {
    setLoadError('');
    try {
      const [summaryRes, logsRes, profileRes, frequentRes, exerciseRes] = await Promise.all([
        api.getSummary(date),
        api.getLogs(date),
        api.getProfile(),
        api.getFrequentLogs(),
        api.getExercise(date),
      ]);
      setSummary(summaryRes);
      setLogs(logsRes.logs);
      setProfile(profileRes.profile);
      setFrequent(frequentRes.items);
      setExercises(exerciseRes.exercises);
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => { refresh(); }, [refresh]);

  async function handleDelete(id) {
    setActionError('');
    try {
      await api.deleteLog(id);
      refresh();
    } catch (err) {
      setActionError(err.message);
    }
  }

  async function handleEdit(id, entry) {
    setActionError('');
    try {
      await api.updateLog(id, entry);
      refresh();
    } catch (err) {
      setActionError(err.message);
      throw err;
    }
  }

  async function handleQuickAdd(item) {
    setActionError('');
    try {
      await api.addLog({
        food_name: item.food_name,
        portion_desc: item.portion_desc,
        calories: item.calories,
        protein_g: item.protein_g,
        carbs_g: item.carbs_g,
        fat_g: item.fat_g,
        source: 'manual',
      });
      refresh();
    } catch (err) {
      setActionError(err.message);
    }
  }

  async function handleDeleteExercise(id) {
    setActionError('');
    try {
      await api.deleteExercise(id);
      refresh();
    } catch (err) {
      setActionError(err.message);
    }
  }

  async function handleEditExercise(id, entry) {
    setActionError('');
    try {
      await api.updateExercise(id, entry);
      refresh();
    } catch (err) {
      setActionError(err.message);
      throw err;
    }
  }

  if (loadError && !summary) {
    return <ErrorState message={loadError} onRetry={refresh} />;
  }

  if (loading || !summary) {
    return <p className="text-cardamom">Setting the table…</p>;
  }

  const { totals, target, remaining, status, exerciseCalories } = summary;
  const directionLabel = profile
    ? DIRECTION_COPY[target.direction](profile.goal_weight_kg)
    : '';
  const netConsumed = Math.max(totals.calories - exerciseCalories, 0);

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {actionError && (
        <div className="md:col-span-2 bg-masala/10 border border-masala/30 text-masala rounded-2xl px-4 py-2.5 text-sm flex items-center justify-between gap-3">
          <span>{actionError}</span>
          <button onClick={() => setActionError('')} className="shrink-0 hover:opacity-70" aria-label="Dismiss">✕</button>
        </div>
      )}

      <div className="bg-plate rounded-thali p-6 shadow-sm flex flex-col items-center text-center">
        <p className="text-sm text-cardamom mb-3">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        <ThaliRing consumed={netConsumed} target={target.target} />
        <p className="mt-4 leading-relaxed">
          You've had <span className="font-mono font-semibold">{totals.calories} kcal</span> today
          against a target of <span className="font-mono font-semibold">{target.target} kcal</span>
          {profile && <> ({directionLabel})</>}.
        </p>
        {exerciseCalories > 0 && (
          <p className="text-sm text-curry mt-0.5">🔥 {exerciseCalories} kcal burned from exercise — added back to your budget.</p>
        )}
        <p className={`mt-1 font-medium ${status === 'over' ? 'text-masala' : 'text-curry'}`}>
          {status === 'over'
            ? `${Math.abs(remaining)} kcal over budget so far.`
            : `${remaining} kcal left for the rest of the day.`}
        </p>
        <div className="grid grid-cols-3 gap-3 mt-5 w-full text-sm">
          <Macro label="Protein" value={totals.protein_g} />
          <Macro label="Carbs" value={totals.carbs_g} />
          <Macro label="Fat" value={totals.fat_g} />
        </div>
      </div>

      <FoodCapture onLogged={refresh} onExerciseLogged={refresh} />

      {frequent.length > 0 && (
        <div className="md:col-span-2">
          <FrequentFoods items={frequent} onAdd={handleQuickAdd} />
        </div>
      )}

      <div className="md:col-span-2">
        <h2 className="font-display text-2xl mb-3">Today's plate</h2>
        <LogTimeline logs={logs} onDelete={handleDelete} onEdit={handleEdit} />
      </div>

      {exercises.length > 0 && (
        <div className="md:col-span-2">
          <ExerciseTimeline exercises={exercises} onDelete={handleDeleteExercise} onEdit={handleEditExercise} />
        </div>
      )}
    </div>
  );
}

function Macro({ label, value }) {
  return (
    <div className="bg-steel rounded-xl py-2">
      <p className="font-mono font-semibold">{Math.round(value)}g</p>
      <p className="text-cardamom text-xs">{label}</p>
    </div>
  );
}
