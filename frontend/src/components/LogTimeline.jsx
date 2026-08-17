import { useState } from 'react';

export default function LogTimeline({ logs, onDelete, onEdit }) {
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);

  if (logs.length === 0) {
    return (
      <div className="text-center py-10 text-cardamom">
        <p className="font-display text-xl">The plate is empty.</p>
        <p className="text-sm mt-1">Log your first meal to get started.</p>
      </div>
    );
  }

  function startEdit(log) {
    setEditingId(log.id);
    setDraft({
      food_name: log.food_name,
      portion_desc: log.portion_desc || '',
      calories: log.calories,
      protein_g: log.protein_g,
      carbs_g: log.carbs_g,
      fat_g: log.fat_g,
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setDraft(null);
  }

  async function saveEdit(id) {
    setSaving(true);
    try {
      await onEdit(id, {
        food_name: draft.food_name,
        portion_desc: draft.portion_desc,
        calories: Number(draft.calories) || 0,
        protein_g: Number(draft.protein_g) || 0,
        carbs_g: Number(draft.carbs_g) || 0,
        fat_g: Number(draft.fat_g) || 0,
      });
      cancelEdit();
    } catch {
      // onEdit already surfaced the error to the parent — keep the form open so nothing is lost.
    } finally {
      setSaving(false);
    }
  }

  return (
    <ol className="relative border-l-2 border-dashed border-cardamom/40 ml-3">
      {logs.map((log) => (
        <li key={log.id} className="mb-4 ml-5">
          <span className="absolute -left-[9px] mt-1.5 h-4 w-4 rounded-full bg-turmeric border-2 border-plate" />

          {editingId === log.id ? (
            <div className="bg-plate rounded-2xl px-4 py-3 shadow-sm space-y-2">
              <p className="text-xs font-mono text-cardamom">{log.time}</p>
              <input
                value={draft.food_name}
                onChange={(e) => setDraft({ ...draft, food_name: e.target.value })}
                className="w-full font-semibold bg-transparent border-b border-cardamom/30 focus:outline-none focus:border-turmeric"
              />
              <input
                value={draft.portion_desc}
                onChange={(e) => setDraft({ ...draft, portion_desc: e.target.value })}
                placeholder="portion"
                className="w-full text-sm bg-transparent border-b border-cardamom/30 focus:outline-none focus:border-turmeric"
              />
              <div className="grid grid-cols-4 gap-2">
                <input
                  type="number"
                  value={draft.calories}
                  onChange={(e) => setDraft({ ...draft, calories: e.target.value })}
                  placeholder="kcal"
                  className="text-sm font-mono bg-transparent border-b border-cardamom/30 focus:outline-none focus:border-turmeric"
                />
                <input
                  type="number"
                  value={draft.protein_g}
                  onChange={(e) => setDraft({ ...draft, protein_g: e.target.value })}
                  placeholder="protein g"
                  className="text-sm font-mono bg-transparent border-b border-cardamom/30 focus:outline-none focus:border-turmeric"
                />
                <input
                  type="number"
                  value={draft.carbs_g}
                  onChange={(e) => setDraft({ ...draft, carbs_g: e.target.value })}
                  placeholder="carbs g"
                  className="text-sm font-mono bg-transparent border-b border-cardamom/30 focus:outline-none focus:border-turmeric"
                />
                <input
                  type="number"
                  value={draft.fat_g}
                  onChange={(e) => setDraft({ ...draft, fat_g: e.target.value })}
                  placeholder="fat g"
                  className="text-sm font-mono bg-transparent border-b border-cardamom/30 focus:outline-none focus:border-turmeric"
                />
              </div>
              <div className="flex gap-3 justify-end pt-1">
                <button onClick={cancelEdit} className="text-xs text-cardamom hover:text-ink">cancel</button>
                <button
                  onClick={() => saveEdit(log.id)}
                  disabled={saving || !draft.food_name}
                  className="text-xs font-medium text-curry hover:opacity-75 disabled:opacity-60"
                >
                  {saving ? 'saving…' : 'save'}
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-plate rounded-2xl px-4 py-3 flex items-start justify-between gap-3 shadow-sm">
              <div>
                <p className="text-xs font-mono text-cardamom">{log.time}</p>
                <p className="font-semibold leading-snug">{log.food_name}</p>
                {log.portion_desc && <p className="text-sm text-cardamom">{log.portion_desc}</p>}
              </div>
              <div className="flex flex-col items-end shrink-0">
                <span className="font-mono font-semibold">{log.calories} kcal</span>
                <div className="flex gap-2 mt-1">
                  <button
                    onClick={() => startEdit(log)}
                    className="text-xs text-cardamom hover:text-ink"
                    aria-label={`Edit ${log.food_name}`}
                  >
                    edit
                  </button>
                  <button
                    onClick={() => onDelete(log.id)}
                    className="text-xs text-masala/80 hover:text-masala"
                    aria-label={`Remove ${log.food_name}`}
                  >
                    remove
                  </button>
                </div>
              </div>
            </div>
          )}
        </li>
      ))}
    </ol>
  );
}
