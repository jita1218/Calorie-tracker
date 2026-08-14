export default function LogTimeline({ logs, onDelete }) {
  if (logs.length === 0) {
    return (
      <div className="text-center py-10 text-cardamom">
        <p className="font-display text-xl">The plate is empty.</p>
        <p className="text-sm mt-1">Log your first meal to get started.</p>
      </div>
    );
  }

  return (
    <ol className="relative border-l-2 border-dashed border-cardamom/40 ml-3">
      {logs.map((log) => (
        <li key={log.id} className="mb-4 ml-5">
          <span className="absolute -left-[9px] mt-1.5 h-4 w-4 rounded-full bg-turmeric border-2 border-plate" />
          <div className="bg-plate rounded-2xl px-4 py-3 flex items-start justify-between gap-3 shadow-sm">
            <div>
              <p className="text-xs font-mono text-cardamom">{log.time}</p>
              <p className="font-semibold leading-snug">{log.food_name}</p>
              {log.portion_desc && <p className="text-sm text-cardamom">{log.portion_desc}</p>}
            </div>
            <div className="flex flex-col items-end shrink-0">
              <span className="font-mono font-semibold">{log.calories} kcal</span>
              <button
                onClick={() => onDelete(log.id)}
                className="text-xs text-masala/80 hover:text-masala mt-1"
                aria-label={`Remove ${log.food_name}`}
              >
                remove
              </button>
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}
