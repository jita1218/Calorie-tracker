export default function FrequentFoods({ items, onAdd }) {
  if (!items || items.length === 0) return null;

  return (
    <div className="bg-plate rounded-thali p-5 shadow-sm">
      <h2 className="font-display text-2xl mb-1">Frequent</h2>
      <p className="text-sm text-cardamom mb-3">Things you log often — add straight to today's plate.</p>
      <div className="flex flex-wrap gap-2">
        {items.map((it) => (
          <button
            key={it.food_name}
            onClick={() => onAdd(it)}
            className="flex items-center gap-2 bg-steel hover:bg-turmeric/20 border border-cardamom/20 rounded-full pl-3 pr-2 py-1.5 text-sm transition-colors"
          >
            <span className="font-medium">{it.food_name}</span>
            <span className="font-mono text-cardamom">{it.calories} kcal</span>
            <span className="bg-turmeric text-white rounded-full w-5 h-5 flex items-center justify-center text-xs leading-none">+</span>
          </button>
        ))}
      </div>
    </div>
  );
}
