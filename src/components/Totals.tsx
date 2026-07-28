import { kcalRange, roundKcal } from '../lib/nutrition';
import type { Nutrients } from '../lib/types';
import { MACRO_COLORS } from './MacroBars';

/** Totals for the meal being built, before it is saved to a day. */
export default function Totals({ totals }: { totals: Nutrients }) {
  const [low, high] = kcalRange(totals.kcal);
  const macroGrams = [
    { label: 'Protein', value: totals.protein, color: MACRO_COLORS.protein },
    { label: 'Carbs', value: totals.carbs, color: MACRO_COLORS.carbs },
    { label: 'Fat', value: totals.fat, color: MACRO_COLORS.fat },
  ];

  return (
    <div className="card totals">
      <div className="total-kcal">
        <span className="num">{roundKcal(totals.kcal)}</span>
        <span className="unit">kcal in this meal</span>
      </div>
      <p className="range">
        Realistically between <strong>{low}</strong> and <strong>{high}</strong> kcal, since
        portions and cooking oil vary.
      </p>
      <div className="macro-list" style={{ marginTop: 14 }}>
        {macroGrams.map((m) => (
          <div className="macro-row" key={m.label}>
            <div className="macro-top">
              <span className="macro-name">
                <i className="swatch" style={{ background: m.color }} />
                {m.label}
              </span>
              <span className="macro-val">{Math.round(m.value)} g</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
