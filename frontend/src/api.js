import { getToken, clearToken } from './auth.js';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

async function request(path, options = {}) {
  const token = getToken();
  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...options,
    });
  } catch {
    const err = new Error("Can't reach the server right now. Check your connection and try again.");
    err.isNetworkError = true;
    throw err;
  }

  if (res.status === 401) {
    clearToken();
    window.location.reload();
    throw new Error('Session expired — please sign in again');
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  register: (username, password) => request('/api/auth/register', { method: 'POST', body: JSON.stringify({ username, password }) }),
  login: (username, password) => request('/api/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),

  getProfile: () => request('/api/profile'),
  saveProfile: (profile) => request('/api/profile', { method: 'PUT', body: JSON.stringify(profile) }),

  getLogs: (date) => request(`/api/logs?date=${date}`),
  getFrequentLogs: () => request('/api/logs/frequent'),
  addLog: (entry) => request('/api/logs', { method: 'POST', body: JSON.stringify(entry) }),
  updateLog: (id, entry) => request(`/api/logs/${id}`, { method: 'PUT', body: JSON.stringify(entry) }),
  deleteLog: (id) => request(`/api/logs/${id}`, { method: 'DELETE' }),
  getSummary: (date) => request(`/api/logs/summary?date=${date}`),

  analyzeImage: (imageDataUrl) => request('/api/analyze', { method: 'POST', body: JSON.stringify({ image: imageDataUrl }) }),
  analyzeText: (description) => request('/api/analyze/text', { method: 'POST', body: JSON.stringify({ description }) }),

  getExercise: (date) => request(`/api/exercise?date=${date}`),
  analyzeExercise: (description) => request('/api/exercise/analyze', { method: 'POST', body: JSON.stringify({ description }) }),
  addExercise: (entry) => request('/api/exercise', { method: 'POST', body: JSON.stringify(entry) }),
  updateExercise: (id, entry) => request(`/api/exercise/${id}`, { method: 'PUT', body: JSON.stringify(entry) }),
  deleteExercise: (id) => request(`/api/exercise/${id}`, { method: 'DELETE' }),
};

export function todayStr() {
  // Local calendar date, not UTC — otherwise "today" rolls over at UTC
  // midnight instead of your local midnight (late by ~5:30h for IST).
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
