export default function Navbar({ page, setPage, onLogout }) {
  const tabs = [
    { key: 'dashboard', label: 'Today' },
    { key: 'history', label: 'History' },
    { key: 'profile', label: 'Profile' },
  ];
  return (
    <header className="flex items-center justify-between mb-6 flex-wrap gap-3">
      <h1 className="font-display text-3xl text-ink">🍛 Thali Tracker</h1>
      <div className="flex items-center gap-3">
        <nav className="flex gap-1 bg-plate rounded-full p-1 shadow-sm">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setPage(t.key)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                page === t.key ? 'bg-turmeric text-white' : 'text-cardamom hover:text-ink'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
        <button
          onClick={onLogout}
          className="text-sm text-cardamom hover:text-ink px-3 py-1.5"
        >
          Log out
        </button>
      </div>
    </header>
  );
}
