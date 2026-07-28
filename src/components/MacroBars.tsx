import type { Nutrients } from '../lib/types';

export const MACRO_COLORS = {
  protein: 'var(--c-protein)',
  carbs: 'var(--c-carbs)',
  fat: 'var(--c-fat)',
} as const;

const ROWS = [
  { key: 'protein', label: 'Protein' },
  { key: 'carbs', label: 'Carbs' },
  { key: 'fat', label: 'Fat' },
] as const;

/**
 * Each macro is direct-labelled with its own numbers, so identity never rests on
 * colour alone.
 */
export default function MacroBars({
  totals,
  targets,
}: {
  totals: Nutrients;
  targets: Nutrients;
}) {
  return (
    <div className="macro-list">
      {ROWS.map(({ key, label }) => {
        const eaten = totals[key];
        const goal = targets[key];
        const pct = goal > 0 ? Math.min(100, (eaten / goal) * 100) : 0;
        const over = eaten > goal;
        return (
          <div className="macro-row" key={key}>
            <div className="macro-top">
              <span className="macro-name">
                <i className="swatch" style={{ background: MACRO_COLORS[key] }} />
                {label}
              </span>
              <span className="macro-val">
                <b>{Math.round(eaten)}</b> / {goal} g{over ? ' · over' : ''}
              </span>
            </div>
            <div className="bar-track">
              <div
                className="bar-fill"
                style={{ width: `${pct}%`, background: MACRO_COLORS[key] }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
