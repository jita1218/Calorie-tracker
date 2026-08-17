import { useEffect, useRef, useState } from 'react';
import { api } from '../api.js';

const LOADING_MESSAGES = [
  'Identifying your food…',
  'Counting the calories…',
  'Protein getting higher…',
  'Healthy food getting added…',
];

function useLoadingMessage(active) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (!active) { setIdx(0); return; }
    const id = setInterval(() => setIdx((i) => (i + 1) % LOADING_MESSAGES.length), 1300);
    return () => clearInterval(id);
  }, [active]);
  return LOADING_MESSAGES[idx];
}

function CameraIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2l1-2h7l1 2h2A1.5 1.5 0 0 1 20 8.5v9A1.5 1.5 0 0 1 18.5 19h-13A1.5 1.5 0 0 1 4 17.5v-9Z" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  );
}

export default function FoodCapture({ onLogged, onExerciseLogged }) {
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);
  const attachMenuRef = useRef(null);
  const bottomRef = useRef(null);
  const nextTurnId = useRef(1);
  const [mode, setMode] = useState('food'); // 'food' | 'exercise'
  const [thread, setThread] = useState([]);
  const [description, setDescription] = useState('');
  const [pendingImage, setPendingImage] = useState(null); // { preview, dataUrl }
  const [attachMenuOpen, setAttachMenuOpen] = useState(false);
  const busy = thread.some((t) => t.status === 'loading' || t.status === 'saving');
  const loadingMessage = useLoadingMessage(busy);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [thread]);

  useEffect(() => {
    if (!attachMenuOpen) return;
    function onClickOutside(e) {
      if (attachMenuRef.current && !attachMenuRef.current.contains(e.target)) {
        setAttachMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [attachMenuOpen]);

  function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPendingImage({ preview: reader.result, dataUrl: reader.result });
    reader.readAsDataURL(file);
  }

  function updateTurn(id, patch) {
    setThread((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }

  function applyFoodResult(id, result, emptyMessage) {
    if (!result.items || result.items.length === 0) {
      updateTurn(id, { status: 'error', error: result.notes || emptyMessage });
    } else {
      updateTurn(id, {
        status: 'items',
        notes: result.notes || '',
        items: result.items.map((it) => ({ ...it, include: true })),
      });
    }
  }

  function applyExerciseResult(id, result) {
    if (!result.activity) {
      updateTurn(id, { status: 'error', error: result.notes || "Couldn't recognize that as an activity — try a common term like \"running\" or \"gym\"." });
    } else {
      updateTurn(id, {
        status: 'exercise-result',
        notes: result.notes || '',
        exercise: {
          activity: result.activity,
          duration_minutes: result.duration_minutes,
          calories_burned: result.calories_burned,
        },
      });
    }
  }

  async function send() {
    if (busy) return;

    if (mode === 'food' && pendingImage) {
      const image = pendingImage;
      setPendingImage(null);
      if (cameraInputRef.current) cameraInputRef.current.value = '';
      if (galleryInputRef.current) galleryInputRef.current.value = '';
      const id = nextTurnId.current++;
      setThread((prev) => [...prev, { id, kind: 'food', userType: 'image', userContent: image.preview, status: 'loading' }]);
      try {
        const result = await api.analyzeImage(image.dataUrl);
        applyFoodResult(id, result, "Couldn't identify a dish in this photo — try another angle, or type it instead.");
      } catch (err) {
        updateTurn(id, { status: 'error', error: err.message });
      }
      return;
    }

    const text = description.trim();
    if (!text) return;
    setDescription('');
    const id = nextTurnId.current++;

    if (mode === 'exercise') {
      setThread((prev) => [...prev, { id, kind: 'exercise', userType: 'text', userContent: text, status: 'loading' }]);
      try {
        const result = await api.analyzeExercise(text);
        applyExerciseResult(id, result);
      } catch (err) {
        updateTurn(id, { status: 'error', error: err.message });
      }
      return;
    }

    setThread((prev) => [...prev, { id, kind: 'food', userType: 'text', userContent: text, status: 'loading' }]);
    try {
      const result = await api.analyzeText(text);
      applyFoodResult(id, result, "Couldn't figure out that item — try being a bit more specific, e.g. \"1 banana\".");
    } catch (err) {
      updateTurn(id, { status: 'error', error: err.message });
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  function updateItem(turnId, idx, field, value) {
    setThread((prev) => prev.map((t) => {
      if (t.id !== turnId) return t;
      return { ...t, items: t.items.map((it, i) => (i === idx ? { ...it, [field]: value } : it)) };
    }));
  }

  function updateExerciseField(turnId, field, value) {
    setThread((prev) => prev.map((t) => (t.id === turnId ? { ...t, exercise: { ...t.exercise, [field]: value } } : t)));
  }

  async function confirmTurn(turnId) {
    const turn = thread.find((t) => t.id === turnId);

    if (turn.kind === 'exercise') {
      updateTurn(turnId, { status: 'saving', error: '' });
      try {
        await api.addExercise({
          activity: turn.exercise.activity,
          duration_minutes: Number(turn.exercise.duration_minutes) || 0,
          calories_burned: Number(turn.exercise.calories_burned) || 0,
        });
        onExerciseLogged?.();
        updateTurn(turnId, { status: 'added' });
      } catch (err) {
        updateTurn(turnId, { status: 'exercise-result', error: err.message });
      }
      return;
    }

    const toAdd = turn.items.filter((it) => it.include);
    if (toAdd.length === 0) return;
    updateTurn(turnId, { status: 'saving', error: '' });
    try {
      for (const it of toAdd) {
        await api.addLog({
          food_name: it.name,
          portion_desc: it.portion,
          calories: Number(it.calories) || 0,
          protein_g: Number(it.protein_g) || 0,
          carbs_g: Number(it.carbs_g) || 0,
          fat_g: Number(it.fat_g) || 0,
          source: 'ai',
        });
      }
      onLogged();
      updateTurn(turnId, { status: 'added', addedCount: toAdd.length });
    } catch (err) {
      updateTurn(turnId, { status: 'items', error: err.message });
    }
  }

  return (
    <div className="bg-plate rounded-thali shadow-sm flex flex-col h-[32rem]">
      <div className="px-5 pt-4 pb-3 border-b border-cardamom/15">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl">{mode === 'exercise' ? 'Log exercise' : 'Add a meal'}</h2>
          <div className="flex gap-1 bg-steel rounded-full p-1">
            <button
              type="button"
              onClick={() => setMode('food')}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${mode === 'food' ? 'bg-turmeric text-white' : 'text-cardamom hover:text-ink'}`}
            >
              🍽️ Food
            </button>
            <button
              type="button"
              onClick={() => setMode('exercise')}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${mode === 'exercise' ? 'bg-turmeric text-white' : 'text-cardamom hover:text-ink'}`}
            >
              🏃 Exercise
            </button>
          </div>
        </div>
        <p className="text-xs text-cardamom mt-1">
          {mode === 'exercise'
            ? "Type what you did — I'll estimate calories burned and add it back to today's budget."
            : "Type what you ate, or attach a photo — I'll work out the calories."}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {thread.length === 0 && (
          <div className="h-full flex items-center justify-center text-center text-cardamom text-sm px-8">
            {mode === 'exercise'
              ? 'Say what you did — "30 min running", "leg day", "1 hour cycling".'
              : 'Say what you ate — "1 banana", "2 roti with dal" — or snap a photo.'}
          </div>
        )}

        {thread.map((t) => (
          <div key={t.id} className="space-y-1.5">
            <div className="flex justify-end">
              <div className="max-w-[75%] bg-turmeric text-white rounded-2xl rounded-br-md px-3 py-2 text-sm">
                {t.userType === 'image' ? (
                  <img src={t.userContent} alt="Food" className="w-24 h-24 object-cover rounded-xl" />
                ) : (
                  t.userContent
                )}
              </div>
            </div>

            <div className="flex justify-start">
              <div className="max-w-[85%] bg-steel rounded-2xl rounded-bl-md px-3 py-2.5 text-sm">
                {t.status === 'loading' && (
                  <span className="text-turmeric-dark font-medium inline-flex items-center gap-1">
                    {loadingMessage}
                  </span>
                )}

                {t.status === 'error' && <span className="text-masala">{t.error}</span>}

                {t.status === 'added' && t.kind === 'exercise' && (
                  <p className="text-curry font-medium">
                    Logged {t.exercise.activity} — {t.exercise.calories_burned} kcal added to today's budget.
                  </p>
                )}

                {t.status === 'added' && t.kind !== 'exercise' && (
                  <p className="text-curry font-medium">
                    Added {t.addedCount} item{t.addedCount > 1 ? 's' : ''} to today's plate.
                  </p>
                )}

                {(t.status === 'exercise-result' || (t.status === 'saving' && t.kind === 'exercise')) && (
                  <div className="space-y-2 w-56">
                    {t.notes && <p className="text-xs text-cardamom italic">{t.notes}</p>}
                    <div className="border border-cardamom/25 rounded-xl p-2 bg-white/60 space-y-1">
                      <input
                        value={t.exercise.activity}
                        onChange={(e) => updateExerciseField(t.id, 'activity', e.target.value)}
                        className="w-full font-semibold bg-transparent border-b border-cardamom/30 focus:outline-none focus:border-turmeric text-sm"
                      />
                      <div className="grid grid-cols-2 gap-1">
                        <input
                          type="number"
                          value={t.exercise.duration_minutes}
                          onChange={(e) => updateExerciseField(t.id, 'duration_minutes', e.target.value)}
                          placeholder="minutes"
                          className="text-xs bg-transparent border-b border-cardamom/30 focus:outline-none focus:border-turmeric"
                        />
                        <input
                          type="number"
                          value={t.exercise.calories_burned}
                          onChange={(e) => updateExerciseField(t.id, 'calories_burned', e.target.value)}
                          placeholder="kcal burned"
                          className="text-xs font-mono bg-transparent border-b border-cardamom/30 focus:outline-none focus:border-turmeric"
                        />
                      </div>
                    </div>
                    {t.error && <p className="text-xs text-masala">{t.error}</p>}
                    <button
                      onClick={() => confirmTurn(t.id)}
                      disabled={t.status === 'saving'}
                      className="w-full bg-curry text-white text-xs font-medium py-1.5 rounded-full disabled:opacity-60"
                    >
                      {t.status === 'saving' ? 'Logging…' : 'Log exercise'}
                    </button>
                  </div>
                )}

                {(t.status === 'items' || (t.status === 'saving' && t.kind !== 'exercise')) && (
                  <div className="space-y-2 w-64">
                    {t.notes && <p className="text-xs text-cardamom italic">{t.notes}</p>}
                    {t.items.map((it, idx) => (
                      <div key={idx} className="border border-cardamom/25 rounded-xl p-2 bg-white/60">
                        <div className="flex items-start gap-2">
                          <input
                            type="checkbox"
                            checked={it.include}
                            onChange={(e) => updateItem(t.id, idx, 'include', e.target.checked)}
                            className="mt-1"
                          />
                          <div className="flex-1 grid grid-cols-2 gap-1">
                            <input
                              value={it.name}
                              onChange={(e) => updateItem(t.id, idx, 'name', e.target.value)}
                              className="col-span-2 font-semibold bg-transparent border-b border-cardamom/30 focus:outline-none focus:border-turmeric text-sm"
                            />
                            <input
                              value={it.portion}
                              onChange={(e) => updateItem(t.id, idx, 'portion', e.target.value)}
                              placeholder="portion"
                              className="text-xs bg-transparent border-b border-cardamom/30 focus:outline-none focus:border-turmeric"
                            />
                            <input
                              type="number"
                              value={it.calories}
                              onChange={(e) => updateItem(t.id, idx, 'calories', e.target.value)}
                              placeholder="kcal"
                              className="text-xs font-mono bg-transparent border-b border-cardamom/30 focus:outline-none focus:border-turmeric"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                    {t.error && <p className="text-xs text-masala">{t.error}</p>}
                    <button
                      onClick={() => confirmTurn(t.id)}
                      disabled={t.status === 'saving'}
                      className="w-full bg-curry text-white text-xs font-medium py-1.5 rounded-full disabled:opacity-60"
                    >
                      {t.status === 'saving' ? 'Adding…' : "Add to today's plate"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {mode === 'food' && pendingImage && (
        <div className="px-4 pt-2">
          <div className="relative inline-block">
            <img src={pendingImage.preview} alt="Attached" className="w-16 h-16 object-cover rounded-xl border border-cardamom/30" />
            <button
              type="button"
              onClick={() => {
                setPendingImage(null);
                if (cameraInputRef.current) cameraInputRef.current.value = '';
                if (galleryInputRef.current) galleryInputRef.current.value = '';
              }}
              className="absolute -top-1.5 -right-1.5 bg-masala text-white rounded-full w-5 h-5 text-xs leading-none"
              aria-label="Remove attached photo"
            >
              ×
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 px-4 py-3 border-t border-cardamom/15">
        {mode === 'food' && (
        <div ref={attachMenuRef} className="relative shrink-0">
          {attachMenuOpen && (
            <div className="absolute bottom-full left-0 mb-2 bg-plate border border-cardamom/20 rounded-2xl shadow-lg py-1.5 w-40 overflow-hidden">
              <button
                type="button"
                onClick={() => { setAttachMenuOpen(false); cameraInputRef.current?.click(); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-ink hover:bg-turmeric/10 text-left"
              >
                <span>📸</span> Camera
              </button>
              <button
                type="button"
                onClick={() => { setAttachMenuOpen(false); galleryInputRef.current?.click(); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-ink hover:bg-turmeric/10 text-left"
              >
                <span>🖼️</span> Gallery
              </button>
            </div>
          )}
          <button
            type="button"
            onClick={() => setAttachMenuOpen((v) => !v)}
            className="text-cardamom hover:text-turmeric-dark flex items-center justify-center w-9 h-9"
            aria-label="Attach a photo"
          >
            <CameraIcon />
          </button>
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFile}
            className="hidden"
          />
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*"
            onChange={handleFile}
            className="hidden"
          />
        </div>
        )}
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={mode === 'exercise' ? 'What exercise did you do?' : (pendingImage ? 'Photo attached — hit send' : 'What did you eat?')}
          disabled={mode === 'food' && !!pendingImage}
          className="flex-1 border border-cardamom/30 rounded-full px-4 py-2 text-sm bg-white/60 focus:outline-none focus:border-turmeric disabled:opacity-50"
        />
        <button
          type="button"
          onClick={send}
          disabled={busy || (!description.trim() && !pendingImage)}
          className="bg-turmeric hover:bg-turmeric-dark text-white rounded-full w-9 h-9 flex items-center justify-center shrink-0 disabled:opacity-50 text-base"
          aria-label="Send"
        >
          ➤
        </button>
      </div>
    </div>
  );
}
