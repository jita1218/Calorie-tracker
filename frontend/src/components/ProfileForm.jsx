import { useState } from 'react';
import { api } from '../api.js';

const ACTIVITY_OPTIONS = [
  { value: 'sedentary', label: 'Sedentary — desk job, little exercise' },
  { value: 'light', label: 'Light — exercise 1-3 days/week' },
  { value: 'moderate', label: 'Moderate — exercise 3-5 days/week' },
  { value: 'active', label: 'Active — exercise 6-7 days/week' },
  { value: 'very_active', label: 'Very active — hard training + physical job' },
];

export default function ProfileForm({ initial, onSaved }) {
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const result = await api.saveProfile({
        ...form,
        age: Number(form.age),
        height_cm: Number(form.height_cm),
        current_weight_kg: Number(form.current_weight_kg),
        goal_weight_kg: Number(form.goal_weight_kg),
        rate_kg_per_week: Number(form.rate_kg_per_week),
      });
      onSaved(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-plate rounded-thali p-6 shadow-sm space-y-4 max-w-lg">
      <h2 className="font-display text-2xl">Your profile</h2>
      <p className="text-sm text-cardamom -mt-2">
        This sets today's calorie ration on your thali, using your goal weight and activity level.
      </p>

      <div>
        <label className="text-sm text-cardamom block mb-1">Name</label>
        <input
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
          className="w-full border border-cardamom/30 rounded-xl px-3 py-2 bg-white/60 focus:outline-none focus:border-turmeric"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm text-cardamom block mb-1">Sex</label>
          <select
            value={form.sex}
            onChange={(e) => set('sex', e.target.value)}
            className="w-full border border-cardamom/30 rounded-xl px-3 py-2 bg-white/60 focus:outline-none focus:border-turmeric"
          >
            <option value="female">Female</option>
            <option value="male">Male</option>
          </select>
        </div>
        <div>
          <label className="text-sm text-cardamom block mb-1">Age</label>
          <input
            required type="number" value={form.age}
            onChange={(e) => set('age', e.target.value)}
            className="w-full border border-cardamom/30 rounded-xl px-3 py-2 bg-white/60 font-mono focus:outline-none focus:border-turmeric"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="text-sm text-cardamom block mb-1">Height (cm)</label>
          <input required type="number" value={form.height_cm} onChange={(e) => set('height_cm', e.target.value)} className="w-full border border-cardamom/30 rounded-xl px-3 py-2 bg-white/60 font-mono focus:outline-none focus:border-turmeric" />
        </div>
        <div>
          <label className="text-sm text-cardamom block mb-1">Current (kg)</label>
          <input required type="number" step="0.1" value={form.current_weight_kg} onChange={(e) => set('current_weight_kg', e.target.value)} className="w-full border border-cardamom/30 rounded-xl px-3 py-2 bg-white/60 font-mono focus:outline-none focus:border-turmeric" />
        </div>
        <div>
          <label className="text-sm text-cardamom block mb-1">Goal (kg)</label>
          <input required type="number" step="0.1" value={form.goal_weight_kg} onChange={(e) => set('goal_weight_kg', e.target.value)} className="w-full border border-cardamom/30 rounded-xl px-3 py-2 bg-white/60 font-mono focus:outline-none focus:border-turmeric" />
        </div>
      </div>

      <div>
        <label className="text-sm text-cardamom block mb-1">Activity level</label>
        <select
          value={form.activity_level}
          onChange={(e) => set('activity_level', e.target.value)}
          className="w-full border border-cardamom/30 rounded-xl px-3 py-2 bg-white/60 focus:outline-none focus:border-turmeric"
        >
          {ACTIVITY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-sm text-cardamom block mb-1">Target pace (kg/week toward goal)</label>
        <input
          type="number" step="0.1" min="0.1" max="1"
          value={form.rate_kg_per_week}
          onChange={(e) => set('rate_kg_per_week', e.target.value)}
          className="w-full border border-cardamom/30 rounded-xl px-3 py-2 bg-white/60 font-mono focus:outline-none focus:border-turmeric"
        />
        <p className="text-xs text-cardamom mt-1">0.5 kg/week is a common, sustainable default.</p>
      </div>

      {error && <p className="text-sm text-masala">{error}</p>}

      <button type="submit" disabled={saving} className="w-full bg-turmeric hover:bg-turmeric-dark text-white font-medium py-2.5 rounded-full disabled:opacity-60">
        {saving ? 'Saving…' : 'Save profile'}
      </button>
    </form>
  );
}
