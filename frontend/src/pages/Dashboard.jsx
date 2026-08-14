import { useEffect, useState, useCallback } from 'react';
import { api, todayStr } from '../api.js';
import ThaliRing from '../components/ThaliRing.jsx';
import FoodCapture from '../components/FoodCapture.jsx';
import LogTimeline from '../components/LogTimeline.jsx';

const DIRECTION_COPY = {
  lose: (kg) => `aiming to lose toward ${kg} kg`,
  gain: (kg) => `aiming to gain toward ${kg} kg`,
  maintain: (kg) => `holding steady around ${kg} kg`,
};

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [logs, setLogs] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const date = todayStr();

  const refresh = useCallback(async () => {
    const [summaryRes, logsRes, profileRes] = await Promise.all([
      api.getSummary(date),
      api.getLogs(date),
      api.getProfile(),
    ]);
    setSummary(summaryRes);
    setLogs(logsRes.logs);
    setProfile(profileRes.profile);
    setLoading(false);
  }, [date]);

  useEffect(() => { refresh(); }, [refresh]);

  async function handleDelete(id) {
    await api.deleteLog(id);
    refresh();
  }

  if (loading || !summary) {
    return <p className="text-cardamom">Setting the table…</p>;
  }

  const { totals, target, remaining, status } = summary;
  const directionLabel = profile
    ? DIRECTION_COPY[target.direction](profile.goal_weight_kg)
    : '';

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="bg-plate rounded-thali p-6 shadow-sm flex flex-col items-center text-center">
        <p className="text-sm text-cardamom mb-3">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        <ThaliRing consumed={totals.calories} target={target.target} />
        <p className="mt-4 leading-relaxed">
          You've had <span className="font-mono font-semibold">{totals.calories} kcal</span> today
          against a target of <span className="font-mono font-semibold">{target.target} kcal</span>
          {profile && <> ({directionLabel})</>}.
        </p>
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

      <FoodCapture onLogged={refresh} />

      <div className="md:col-span-2">
        <h2 className="font-display text-2xl mb-3">Today's plate</h2>
        <LogTimeline logs={logs} onDelete={handleDelete} />
      </div>
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
