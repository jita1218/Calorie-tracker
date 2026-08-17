import { useState } from 'react';
import { api } from '../api.js';
import { setToken } from '../auth.js';

function EyeIcon({ off }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {off ? (
        <>
          <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-10-8-10-8a18.6 18.6 0 0 1 4.22-5.94M9.9 4.24A10.4 10.4 0 0 1 12 4c7 0 10 8 10 8a18.6 18.6 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
          <path d="M1 1l22 22" />
        </>
      ) : (
        <>
          <path d="M2 12s3-8 10-8 10 8 10 8-3 8-10 8-10-8-10-8Z" />
          <circle cx="12" cy="12" r="3" />
        </>
      )}
    </svg>
  );
}

function PasswordInput({ value, onChange, placeholder, autoComplete }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input
        required
        type={visible ? 'text' : 'password'}
        minLength={8}
        placeholder={placeholder}
        autoComplete={autoComplete}
        value={value}
        onChange={onChange}
        className="w-full border border-cardamom/30 rounded-xl px-3 py-2 pr-10 bg-white/60 focus:outline-none focus:border-turmeric"
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-cardamom hover:text-ink"
      >
        <EyeIcon off={!visible} />
      </button>
    </div>
  );
}

const PASSWORD_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

export default function Login({ onLoggedIn }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (mode === 'register' && !PASSWORD_RE.test(password)) {
      setError('Password must have 8+ characters with an uppercase letter, a lowercase letter, a number, and a special character');
      return;
    }
    if (mode === 'register' && password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setSubmitting(true);
    try {
      const { token } = mode === 'register'
        ? await api.register(username, password)
        : await api.login(username, password);
      setToken(token);
      onLoggedIn();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-4 text-center">
      <h1 className="font-display text-4xl text-ink">🍛 Thali Tracker</h1>
      <p className="text-cardamom max-w-sm">
        {mode === 'register' ? 'Create an account to start tracking.' : 'Sign in to track your meals and see your daily calorie ration.'}
      </p>

      <form onSubmit={handleSubmit} className="w-full max-w-xs space-y-3 text-left">
        <input
          required
          type="text"
          placeholder="Username"
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full border border-cardamom/30 rounded-xl px-3 py-2 bg-white/60 focus:outline-none focus:border-turmeric"
        />
        <PasswordInput
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
        />
        {mode === 'register' && (
          <>
            <p className="text-xs text-cardamom -mt-2">
              8+ characters: uppercase, lowercase, a number, and a special character
            </p>
            <PasswordInput
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm password"
              autoComplete="new-password"
            />
          </>
        )}
        {error && <p className="text-sm text-masala">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-turmeric hover:bg-turmeric-dark text-white font-medium py-2 rounded-full disabled:opacity-60"
        >
          {submitting ? 'Please wait…' : mode === 'register' ? 'Create account' : 'Sign in'}
        </button>
      </form>

      <button
        type="button"
        onClick={() => { setMode(mode === 'register' ? 'login' : 'register'); setError(''); setConfirmPassword(''); }}
        className="text-sm text-cardamom underline underline-offset-2"
      >
        {mode === 'register' ? 'Already have an account? Sign in' : "New here? Create an account"}
      </button>
    </div>
  );
}
