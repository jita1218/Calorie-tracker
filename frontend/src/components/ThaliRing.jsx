// The signature visual: the daily calorie budget rendered as a steel thali
// plate seen from above. The rim is the plate edge; the arc is how much of
// today's ration has been served. Overflow past the rim spills into masala
// red instead of continuing the turmeric arc, so "over budget" reads as a
// spill, not just a longer bar.

export default function ThaliRing({ consumed, target, size = 220 }) {
  const stroke = size * 0.09;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  const pct = target > 0 ? consumed / target : 0;
  const clampedPct = Math.min(pct, 1);
  const overPct = Math.max(pct - 1, 0);

  const progressLength = circumference * clampedPct;
  const overLength = circumference * Math.min(overPct, 1);

  const remaining = target - consumed;
  const isOver = remaining < 0;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        {/* plate rim */}
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#DAD3C4" strokeWidth={stroke} />
        {/* served portion */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#D89B1F"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${progressLength} ${circumference - progressLength}`}
          className="transition-all duration-700 ease-out"
        />
        {/* spill, if over budget */}
        {overLength > 0 && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#A83E2C"
            strokeWidth={stroke * 0.55}
            strokeLinecap="round"
            strokeDasharray={`${overLength} ${circumference - overLength}`}
            className="transition-all duration-700 ease-out"
          />
        )}
      </svg>
      {/* center katori (bowl) with the number */}
      <div className="absolute inset-[18%] rounded-full bg-plate shadow-inner flex flex-col items-center justify-center text-center px-2">
        <span className="font-mono text-2xl font-semibold" style={{ color: isOver ? '#A83E2C' : '#4C6444' }}>
          {Math.abs(remaining)}
        </span>
        <span className="text-[11px] uppercase tracking-wide text-cardamom mt-0.5">
          {isOver ? 'kcal over' : 'kcal left'}
        </span>
      </div>
    </div>
  );
}
