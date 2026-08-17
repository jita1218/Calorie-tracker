import { useEffect, useState } from 'react';
import { api } from './api.js';
import { getToken, clearToken } from './auth.js';
import Navbar from './components/Navbar.jsx';
import Login from './components/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import HistoryPage from './pages/HistoryPage.jsx';

export default function App() {
  const [page, setPage] = useState('dashboard');
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [checked, setChecked] = useState(false);
  const [loggedIn, setLoggedIn] = useState(!!getToken());

  useEffect(() => {
    if (!loggedIn) return;
    api.getProfile()
      .then((res) => {
        if (!res.profile.name) {
          setNeedsOnboarding(true);
          setPage('profile');
        }
      })
      .catch(() => {})
      .finally(() => setChecked(true));
  }, [loggedIn]);

  if (!loggedIn) {
    return <Login onLoggedIn={() => setLoggedIn(true)} />;
  }

  function handleLogout() {
    clearToken();
    setChecked(false);
    setLoggedIn(false);
  }

  return (
    <div className="min-h-screen px-4 py-6 md:px-10 md:py-8 max-w-4xl mx-auto">
      <Navbar page={page} setPage={setPage} onLogout={handleLogout} />

      {needsOnboarding && page === 'profile' && (
        <div className="mb-5 bg-turmeric/10 border border-turmeric/30 text-turmeric-dark rounded-2xl px-4 py-3 text-sm">
          Welcome! Fill in your profile so we can work out today's calorie ration from your goal weight.
        </div>
      )}

      {checked && page === 'dashboard' && <Dashboard />}
      {checked && page === 'profile' && (
        <ProfilePage onProfileSaved={() => { setNeedsOnboarding(false); setPage('dashboard'); }} />
      )}
      {checked && page === 'history' && <HistoryPage />}
    </div>
  );
}
