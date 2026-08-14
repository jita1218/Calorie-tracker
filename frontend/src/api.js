const BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  getProfile: () => request('/api/profile'),
  saveProfile: (profile) => request('/api/profile', { method: 'PUT', body: JSON.stringify(profile) }),

  getLogs: (date) => request(`/api/logs?date=${date}`),
  addLog: (entry) => request('/api/logs', { method: 'POST', body: JSON.stringify(entry) }),
  deleteLog: (id) => request(`/api/logs/${id}`, { method: 'DELETE' }),
  getSummary: (date) => request(`/api/logs/summary?date=${date}`),

  analyzeImage: (imageDataUrl) => request('/api/analyze', { method: 'POST', body: JSON.stringify({ image: imageDataUrl }) }),
};

export function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
