import { useRef, useState } from 'react';
import { api } from '../api.js';

const emptyManualItem = { name: '', portion: '', calories: '', protein_g: '', carbs_g: '', fat_g: '' };

export default function FoodCapture({ onLogged }) {
  const fileInputRef = useRef(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageDataUrl, setImageDataUrl] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [items, setItems] = useState(null); // analyzed items, editable
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [manualMode, setManualMode] = useState(false);
  const [manualItem, setManualItem] = useState(emptyManualItem);
  const [saving, setSaving] = useState(false);

  function reset() {
    setImagePreview(null);
    setImageDataUrl(null);
    setItems(null);
    setNotes('');
    setError('');
    setManualMode(false);
    setManualItem(emptyManualItem);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setItems(null);
    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result);
      setImageDataUrl(reader.result);
    };
    reader.readAsDataURL(file);
  }

  async function handleAnalyze() {
    if (!imageDataUrl) return;
    setAnalyzing(true);
    setError('');
    try {
      const result = await api.analyzeImage(imageDataUrl);
      if (!result.items || result.items.length === 0) {
        setError(result.notes || "Couldn't identify a dish in this photo — try another angle, or enter it manually.");
        setItems([]);
      } else {
        setItems(result.items.map((it) => ({ ...it, include: true })));
        setNotes(result.notes || '');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setAnalyzing(false);
    }
  }

  function updateItem(idx, field, value) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, [field]: value } : it)));
  }

  async function confirmItems() {
    const toAdd = items.filter((it) => it.include);
    if (toAdd.length === 0) return;
    setSaving(true);
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
      reset();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function submitManual(e) {
    e.preventDefault();
    if (!manualItem.name || !manualItem.calories) return;
    setSaving(true);
    setError('');
    try {
      await api.addLog({
        food_name: manualItem.name,
        portion_desc: manualItem.portion,
        calories: Number(manualItem.calories) || 0,
        protein_g: Number(manualItem.protein_g) || 0,
        carbs_g: Number(manualItem.carbs_g) || 0,
        fat_g: Number(manualItem.fat_g) || 0,
        source: 'manual',
      });
      onLogged();
      reset();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-plate rounded-thali p-5 shadow-sm">
      <h2 className="font-display text-2xl mb-3">Serve a photo</h2>

      {!manualMode && (
        <>
          <div className="flex items-center gap-3">
            <label className="cursor-pointer inline-flex items-center gap-2 bg-turmeric hover:bg-turmeric-dark text-white font-medium px-4 py-2 rounded-full transition-colors">
              <span>{imagePreview ? 'Change photo' : 'Take / upload photo'}</span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFile}
                className="hidden"
              />
            </label>
            <button
              type="button"
              onClick={() => { reset(); setManualMode(true); }}
              className="text-sm text-cardamom underline underline-offset-2"
            >
              enter manually instead
            </button>
          </div>

          {imagePreview && (
            <div className="mt-4 flex gap-4 items-start flex-wrap">
              <img src={imagePreview} alt="Food preview" className="w-28 h-28 object-cover rounded-2xl border border-cardamom/30" />
              {!items && (
                <button
                  onClick={handleAnalyze}
                  disabled={analyzing}
                  className="self-center bg-ink text-plate px-4 py-2 rounded-full font-medium disabled:opacity-60"
                >
                  {analyzing ? 'Reading the plate…' : 'Identify food'}
                </button>
              )}
            </div>
          )}

          {analyzing && (
            <div className="mt-4 h-16 rounded-2xl scan-shimmer border border-turmeric/20" />
          )}

          {error && <p className="mt-3 text-sm text-masala">{error}</p>}

          {items && items.length > 0 && (
            <div className="mt-4 space-y-3">
              {notes && <p className="text-sm text-cardamom italic">{notes}</p>}
              {items.map((it, idx) => (
                <div key={idx} className="border border-cardamom/25 rounded-2xl p-3">
                  <div className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      checked={it.include}
                      onChange={(e) => updateItem(idx, 'include', e.target.checked)}
                      className="mt-1.5"
                    />
                    <div className="flex-1 grid grid-cols-2 gap-2">
                      <input
                        value={it.name}
                        onChange={(e) => updateItem(idx, 'name', e.target.value)}
                        className="col-span-2 font-semibold bg-transparent border-b border-cardamom/30 focus:outline-none focus:border-turmeric"
                      />
                      <input
                        value={it.portion}
                        onChange={(e) => updateItem(idx, 'portion', e.target.value)}
                        placeholder="portion"
                        className="text-sm bg-transparent border-b border-cardamom/30 focus:outline-none focus:border-turmeric"
                      />
                      <input
                        type="number"
                        value={it.calories}
                        onChange={(e) => updateItem(idx, 'calories', e.target.value)}
                        placeholder="kcal"
                        className="text-sm font-mono bg-transparent border-b border-cardamom/30 focus:outline-none focus:border-turmeric"
                      />
                    </div>
                  </div>
                  <p className="text-[11px] text-cardamom mt-1 ml-6">confidence: {it.confidence || 'medium'}</p>
                </div>
              ))}
              <button
                onClick={confirmItems}
                disabled={saving}
                className="w-full bg-curry text-white font-medium py-2 rounded-full disabled:opacity-60"
              >
                {saving ? 'Adding…' : 'Add to today\u2019s plate'}
              </button>
            </div>
          )}

          {items && items.length === 0 && (
            <button
              type="button"
              onClick={() => setManualMode(true)}
              className="mt-3 text-sm underline underline-offset-2 text-turmeric-dark"
            >
              Enter this item manually
            </button>
          )}
        </>
      )}

      {manualMode && (
        <form onSubmit={submitManual} className="space-y-3">
          <div className="flex justify-between items-center">
            <p className="text-sm text-cardamom">Manual entry</p>
            <button type="button" onClick={reset} className="text-sm underline underline-offset-2 text-cardamom">
              use a photo instead
            </button>
          </div>
          <input
            required
            placeholder="Dish name, e.g. Rajma Chawal"
            value={manualItem.name}
            onChange={(e) => setManualItem({ ...manualItem, name: e.target.value })}
            className="w-full border border-cardamom/30 rounded-xl px-3 py-2 bg-white/60 focus:outline-none focus:border-turmeric"
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              placeholder="Portion, e.g. 1 bowl"
              value={manualItem.portion}
              onChange={(e) => setManualItem({ ...manualItem, portion: e.target.value })}
              className="border border-cardamom/30 rounded-xl px-3 py-2 bg-white/60 focus:outline-none focus:border-turmeric"
            />
            <input
              required
              type="number"
              placeholder="Calories"
              value={manualItem.calories}
              onChange={(e) => setManualItem({ ...manualItem, calories: e.target.value })}
              className="border border-cardamom/30 rounded-xl px-3 py-2 bg-white/60 font-mono focus:outline-none focus:border-turmeric"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <input type="number" placeholder="Protein g" value={manualItem.protein_g} onChange={(e) => setManualItem({ ...manualItem, protein_g: e.target.value })} className="border border-cardamom/30 rounded-xl px-3 py-2 bg-white/60 text-sm focus:outline-none focus:border-turmeric" />
            <input type="number" placeholder="Carbs g" value={manualItem.carbs_g} onChange={(e) => setManualItem({ ...manualItem, carbs_g: e.target.value })} className="border border-cardamom/30 rounded-xl px-3 py-2 bg-white/60 text-sm focus:outline-none focus:border-turmeric" />
            <input type="number" placeholder="Fat g" value={manualItem.fat_g} onChange={(e) => setManualItem({ ...manualItem, fat_g: e.target.value })} className="border border-cardamom/30 rounded-xl px-3 py-2 bg-white/60 text-sm focus:outline-none focus:border-turmeric" />
          </div>
          {error && <p className="text-sm text-masala">{error}</p>}
          <button type="submit" disabled={saving} className="w-full bg-curry text-white font-medium py-2 rounded-full disabled:opacity-60">
            {saving ? 'Adding…' : 'Add to today\u2019s plate'}
          </button>
        </form>
      )}
    </div>
  );
}
