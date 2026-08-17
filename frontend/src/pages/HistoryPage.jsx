import { useEffect, useState } from 'react';
import { api, todayStr } from '../api.js';
import ThaliRing from '../components/ThaliRing.jsx';
import LogTimeline from '../components/LogTimeline.jsx';
import ErrorState from '../components/ErrorState.jsx';

export default function HistoryPage() {
  const [date, setDate] = useState(todayStr());
  const [summary, setSummary] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  async function load(d) {
    setLoading(true);
    setLoadError('');
    try {
      const [summaryRes, logsRes] = await Promise.all([api.getSummary(d), api.getLogs(d)]);
      setSummary(summaryRes);
      setLogs(logsRes.logs);
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(date); }, [date]);

  async function handleDelete(id) {
    try {
      await api.deleteLog(id);
      load(date);
    } catch (err) {
      setLoadError(err.message);
    }
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <label className="text-sm text-cardamom">Date</label>
        <input
          type="date"
          value={date}
          max={todayStr()}
          onChange={(e) => setDate(e.target.value)}
          className="border border-cardamom/30 rounded-xl px-3 py-1.5 bg-plate font-mono"
        />
      </div>

      {loadError && !summary ? (
        <ErrorState message={loadError} onRetry={() => load(date)} />
      ) : loading || !summary ? (
        <p className="text-cardamom">Loading…</p>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-plate rounded-thali p-6 shadow-sm flex flex-col items-center text-center">
            <ThaliRing consumed={summary.totals.calories} target={summary.target.target} />
            <p className="mt-4">
              <span className="font-mono font-semibold">{summary.totals.calories} kcal</span> eaten of{' '}
              <span className="font-mono font-semibold">{summary.target.target} kcal</span> target
            </p>
            <p className={`mt-1 font-medium ${summary.status === 'over' ? 'text-masala' : 'text-curry'}`}>
              {summary.status === 'over'
                ? `${Math.abs(summary.remaining)} kcal over that day.`
                : `${summary.remaining} kcal under that day.`}
            </p>
          </div>
          <div>
            <h2 className="font-display text-2xl mb-3">Entries</h2>
            <LogTimeline logs={logs} onDelete={handleDelete} />
          </div>
        </div>
      )}
    </div>
  );
}
