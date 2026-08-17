import { useEffect, useState, useCallback } from 'react';
import { api } from '../api.js';
import ProfileForm from '../components/ProfileForm.jsx';
import ErrorState from '../components/ErrorState.jsx';

export default function ProfilePage({ onProfileSaved }) {
  const [initial, setInitial] = useState(null);
  const [target, setTarget] = useState(null);
  const [savedMsg, setSavedMsg] = useState(false);
  const [loadError, setLoadError] = useState('');

  const load = useCallback(() => {
    setLoadError('');
    api.getProfile()
      .then((res) => {
        setInitial({ ...res.profile, name: res.profile.name || res.username || '' });
        setTarget(res.target);
      })
      .catch((err) => setLoadError(err.message));
  }, []);

  useEffect(() => { load(); }, [load]);

  function handleSaved(result) {
    setInitial(result.profile);
    setTarget(result.target);
    setSavedMsg(true);
    onProfileSaved?.();
    setTimeout(() => setSavedMsg(false), 2500);
  }

  if (loadError) return <ErrorState message={loadError} onRetry={load} />;
  if (!initial) return <p className="text-cardamom">Loading profile…</p>;

  return (
    <div className="flex flex-col md:flex-row gap-6 items-start">
      <ProfileForm initial={initial} onSaved={handleSaved} />
      <div className="bg-steel border border-cardamom/20 rounded-thali p-6 md:w-72">
        <h3 className="font-display text-xl mb-2">Today's ration</h3>
        {target && (
          <ul className="text-sm space-y-1.5">
            <li className="flex justify-between"><span className="text-cardamom">BMR</span><span className="font-mono">{target.bmr} kcal</span></li>
            <li className="flex justify-between"><span className="text-cardamom">Maintenance (TDEE)</span><span className="font-mono">{target.tdee} kcal</span></li>
            <li className="flex justify-between font-semibold"><span>Daily target</span><span className="font-mono">{target.target} kcal</span></li>
          </ul>
        )}
        {savedMsg && <p className="text-curry text-sm mt-3">Saved. Your ration is updated.</p>}
      </div>
    </div>
  );
}
