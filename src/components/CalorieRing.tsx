const R = 46;
const STROKE = 12;
const CIRCUMFERENCE = 2 * Math.PI * R;

/**
 * The single largest, most prominent element on the home screen: what's left
 * to eat today. Framed as "remaining", not "eaten" — that's the number a
 * MyFitnessPal-style app leads with, since it's the one decision-relevant
 * figure while the day is still in progress.
 */
export default function CalorieRing({
  consumed,
  target,
}: {
  consumed: number;
  target: number;
}) {
  const ratio = target > 0 ? consumed / target : 0;
  const filled = Math.min(ratio, 1);
  const over = consumed > target;
  const remaining = Math.round(Math.abs(target - consumed));

  return (
    <div className="ring-card">
      <svg
        className="ring"
        width="116"
        height="116"
        viewBox="0 0 116 116"
        role="img"
        aria-label={`${Math.round(ratio * 100)}% of your ${target} calorie target used`}
      >
        <circle cx="58" cy="58" r={R} fill="none" stroke="var(--track)" strokeWidth={STROKE} />
        <circle
          className="ring-progress"
          cx="58"
          cy="58"
          r={R}
          fill="none"
          stroke={over ? 'var(--accent)' : 'var(--green)'}
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={`${filled * CIRCUMFERENCE} ${CIRCUMFERENCE}`}
          transform="rotate(-90 58 58)"
        />
      </svg>

      <div className="ring-figures">
        <div className="big">{remaining}</div>
        <div className="caption">
          {over ? 'Calories over' : 'Calories remaining'}
        </div>
        <div className="sub">
          {Math.round(consumed)} eaten of {target} kcal goal
        </div>
      </div>
    </div>
  );
}
