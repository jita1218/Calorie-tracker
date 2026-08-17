import { useState } from 'react';

export default function ExerciseTimeline({ exercises, onDelete, onEdit }) {
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);

  if (exercises.length === 0) return null;

  function startEdit(ex) {
    setEditingId(ex.id);
    setDraft({ activity: ex.activity, duration_minutes: ex.duration_minutes, calories_burned: ex.calories_burned });
  }

  function cancelEdit() {
    setEditingId(null);
    setDraft(null);
  }

  async function saveEdit(id) {
    setSaving(true);
    try {
      await onEdit(id, {
        activity: draft.activity,
        duration_minutes: Number(draft.duration_minutes) || 0,
        calories_burned: Number(draft.calories_burned) || 0,
      });
      cancelEdit();
    } catch {
      // parent already surfaced the error — keep the form open so nothing is lost
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h2 className="font-display text-2xl mb-3">Today's activity</h2>
      <ol className="relative border-l-2 border-dashed border-curry/40 ml-3">
        {exercises.map((ex) => (
          <li key={ex.id} className="mb-4 ml-5">
            <span className="absolute -left-[9px] mt-1.5 h-4 w-4 rounded-full bg-curry border-2 border-plate" />

            {editingId === ex.id ? (
              <div className="bg-plate rounded-2xl px-4 py-3 shadow-sm space-y-2">
                <p className="text-xs font-mono text-cardamom">{ex.time}</p>
                <input
                  value={draft.activity}
                  onChange={(e) => setDraft({ ...draft, activity: e.target.value })}
                  className="w-full font-semibold bg-transparent border-b border-cardamom/30 focus:outline-none focus:border-turmeric"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    value={draft.duration_minutes}
                    onChange={(e) => setDraft({ ...draft, duration_minutes: e.target.value })}
                    placeholder="minutes"
                    className="text-sm font-mono bg-transparent border-b border-cardamom/30 focus:outline-none focus:border-turmeric"
                  />
                  <input
                    type="number"
                    value={draft.calories_burned}
                    onChange={(e) => setDraft({ ...draft, calories_burned: e.target.value })}
                    placeholder="kcal burned"
                    className="text-sm font-mono bg-transparent border-b border-cardamom/30 focus:outline-none focus:border-turmeric"
                  />
                </div>
                <div className="flex gap-3 justify-end pt-1">
                  <button onClick={cancelEdit} className="text-xs text-cardamom hover:text-ink">cancel</button>
                  <button
                    onClick={() => saveEdit(ex.id)}
                    disabled={saving || !draft.activity}
                    className="text-xs font-medium text-curry hover:opacity-75 disabled:opacity-60"
                  >
                    {saving ? 'saving…' : 'save'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-plate rounded-2xl px-4 py-3 flex items-start justify-between gap-3 shadow-sm">
                <div>
                  <p className="text-xs font-mono text-cardamom">{ex.time}</p>
                  <p className="font-semibold leading-snug">{ex.activity}</p>
                  <p className="text-sm text-cardamom">{ex.duration_minutes} min</p>
                </div>
                <div className="flex flex-col items-end shrink-0">
                  <span className="font-mono font-semibold text-curry">-{ex.calories_burned} kcal</span>
                  <div className="flex gap-2 mt-1">
                    <button onClick={() => startEdit(ex)} className="text-xs text-cardamom hover:text-ink" aria-label={`Edit ${ex.activity}`}>edit</button>
                    <button onClick={() => onDelete(ex.id)} className="text-xs text-masala/80 hover:text-masala" aria-label={`Remove ${ex.activity}`}>remove</button>
                  </div>
                </div>
              </div>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
