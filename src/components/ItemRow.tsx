import { X } from 'lucide-react';
import { servingsFor } from '../lib/items';
import { itemNutrients, roundGrams, roundKcal } from '../lib/nutrition';
import { useStore } from '../lib/store';
import type { MealItem } from '../lib/types';
import NumberField from './NumberField';

const CUSTOM = '__custom__';

interface Props {
  item: MealItem;
  onChange: (next: MealItem) => void;
  onSwap: () => void;
  onRemove: () => void;
}

export default function ItemRow({ item, onChange, onSwap, onRemove }: Props) {
  const { foods } = useStore();
  // The food may have been deleted since; the row still works from its snapshot.
  const servings = servingsFor(foods.find((f) => f.id === item.foodId));

  const nutrients = itemNutrients(item);
  const usingServing = item.servingLabel !== null;
  const serving = servings.find((s) => s.label === item.servingLabel);

  function pickServing(value: string) {
    if (value === CUSTOM) {
      onChange({ ...item, servingLabel: null, quantity: 1 });
      return;
    }
    const next = servings.find((s) => s.label === value);
    if (next) {
      const qty = item.quantity || 1;
      onChange({ ...item, servingLabel: next.label, quantity: qty, grams: next.grams * qty });
    }
  }

  function setQuantity(qty: number) {
    const base = serving?.grams ?? item.grams;
    onChange({ ...item, quantity: qty, grams: base * qty });
  }

  function setGrams(grams: number) {
    onChange({ ...item, grams, servingLabel: null, quantity: 1 });
  }

  return (
    <div className="item">
      <div className="item-head">
        <button className="item-name" onClick={onSwap} title="Pick a different food">
          {item.foodName}
          <span className="swap">change</span>
        </button>
        <div className="item-kcal">
          <strong>{roundKcal(nutrients.kcal)}</strong>
          <span>kcal</span>
        </div>
        <button
          className="item-remove"
          onClick={onRemove}
          aria-label={`Remove ${item.foodName}`}
        >
          <X aria-hidden="true" />
        </button>
      </div>

      <div className="item-meta">
        <span className="chip">{roundGrams(item.grams)} g</span>
        {item.detectedAs && item.detectedAs.toLowerCase() !== item.foodName.toLowerCase() && (
          <span className="chip">AI saw: {item.detectedAs}</span>
        )}
        {item.confidence && (
          <span className={`chip ${item.confidence}`}>{item.confidence} confidence</span>
        )}
      </div>

      <div className="item-controls">
        <div className="field grow">
          <label htmlFor={`serving-${item.key}`}>Portion</label>
          <select
            id={`serving-${item.key}`}
            value={usingServing ? item.servingLabel ?? CUSTOM : CUSTOM}
            onChange={(e) => pickServing(e.target.value)}
          >
            {servings.map((s) => (
              <option key={s.label} value={s.label}>
                {/* Some labels already spell out the weight — don't say it twice. */}
                {s.label.includes(`${s.grams} g`) ? s.label : `${s.label} (${s.grams} g)`}
              </option>
            ))}
            <option value={CUSTOM}>Exact grams…</option>
          </select>
        </div>

        {usingServing ? (
          <div className="field narrow">
            <label htmlFor={`qty-${item.key}`}>How many</label>
            <NumberField
              id={`qty-${item.key}`}
              min={0.25}
              max={99}
              step="0.25"
              inputMode="decimal"
              value={item.quantity}
              onCommit={setQuantity}
            />
          </div>
        ) : (
          <div className="field narrow">
            <label htmlFor={`grams-${item.key}`}>Grams</label>
            <NumberField
              id={`grams-${item.key}`}
              min={0}
              max={5000}
              step="10"
              value={roundGrams(item.grams)}
              onCommit={setGrams}
            />
          </div>
        )}
      </div>
    </div>
  );
}
