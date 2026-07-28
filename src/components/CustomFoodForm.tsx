import { useState } from 'react';
import { uid } from '../lib/items';
import type { Food } from '../lib/types';

type Basis = 'per100g' | 'perServing';

const BLANK = {
  name: '',
  kcal: '',
  protein: '',
  carbs: '',
  fat: '',
  servingGrams: '',
  servingLabel: '',
};

/**
 * Manual entry for anything not in the table — your mum's egusi, a buka plate you
 * weighed, a supplement. Values can be given per 100 g or per serving.
 */
export default function CustomFoodForm({ onCreate }: { onCreate: (food: Food) => void }) {
  const [basis, setBasis] = useState<Basis>('per100g');
  const [form, setForm] = useState({ ...BLANK });
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  function set<K extends keyof typeof BLANK>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function submit() {
    setError(null);
    setSaved(null);

    const name = form.name.trim();
    if (!name) {
      setError('Give the food a name.');
      return;
    }
    const kcal = Number(form.kcal);
    if (!Number.isFinite(kcal) || kcal <= 0) {
      setError('Calories must be a number greater than zero.');
      return;
    }
    const servingGrams = Number(form.servingGrams);
    if (basis === 'perServing' && (!Number.isFinite(servingGrams) || servingGrams <= 0)) {
      setError('To use per-serving values, say how many grams one serving is.');
      return;
    }

    const macro = (raw: string) => {
      const n = Number(raw);
      return Number.isFinite(n) && n > 0 ? n : 0;
    };

    // Per-serving figures are scaled back to a per-100 g basis for storage.
    const factor = basis === 'per100g' ? 1 : 100 / servingGrams;
    const grams = Number.isFinite(servingGrams) && servingGrams > 0 ? servingGrams : 100;

    const food: Food = {
      id: `custom-${uid().slice(0, 8)}`,
      name,
      aliases: [name.toLowerCase()],
      category: 'custom',
      per100g: {
        kcal: Math.round(kcal * factor),
        protein: Number((macro(form.protein) * factor).toFixed(1)),
        carbs: Number((macro(form.carbs) * factor).toFixed(1)),
        fat: Number((macro(form.fat) * factor).toFixed(1)),
      },
      servings: [
        {
          label: form.servingLabel.trim() || `1 serving (${Math.round(grams)} g)`,
          grams: Math.round(grams),
        },
        { label: '100 g', grams: 100 },
      ],
      custom: true,
    };

    onCreate(food);
    setForm({ ...BLANK });
    setSaved(`${name} saved to your foods and added to this meal.`);
  }

  const unit = basis === 'per100g' ? 'per 100 g' : 'per serving';

  return (
    <div className="card">
      <h2 className="with-hint">Create a food</h2>
      <p className="hint">
        Saved to your own list, so it shows up in search next time. Read the numbers off the pack,
        or work them out from the recipe.
      </p>

      {error && <div className="alert alert-error">{error}</div>}
      {saved && <div className="alert alert-ok">{saved}</div>}

      <div className="segmented" role="tablist" aria-label="Value basis">
        <button
          role="tab"
          aria-selected={basis === 'per100g'}
          onClick={() => setBasis('per100g')}
        >
          Per 100 g
        </button>
        <button
          role="tab"
          aria-selected={basis === 'perServing'}
          onClick={() => setBasis('perServing')}
        >
          Per serving
        </button>
      </div>

      <div className="form-grid">
        <div className="form-row full">
          <label className="lbl" htmlFor="cf-name">
            Name
          </label>
          <input
            id="cf-name"
            type="text"
            placeholder="e.g. Mum's egusi soup"
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
          />
        </div>

        <div className="form-row">
          <label className="lbl" htmlFor="cf-kcal">
            Calories ({unit})
          </label>
          <input
            id="cf-kcal"
            type="number"
            min="0"
            step="1"
            inputMode="numeric"
            value={form.kcal}
            onChange={(e) => set('kcal', e.target.value)}
          />
        </div>

        <div className="form-row">
          <label className="lbl" htmlFor="cf-serving">
            Serving size (g)
          </label>
          <input
            id="cf-serving"
            type="number"
            min="0"
            step="10"
            inputMode="numeric"
            placeholder={basis === 'perServing' ? 'required' : 'optional'}
            value={form.servingGrams}
            onChange={(e) => set('servingGrams', e.target.value)}
          />
        </div>

        <div className="form-row">
          <label className="lbl" htmlFor="cf-protein">
            Protein g ({unit})
          </label>
          <input
            id="cf-protein"
            type="number"
            min="0"
            step="0.1"
            value={form.protein}
            onChange={(e) => set('protein', e.target.value)}
          />
        </div>

        <div className="form-row">
          <label className="lbl" htmlFor="cf-carbs">
            Carbs g ({unit})
          </label>
          <input
            id="cf-carbs"
            type="number"
            min="0"
            step="0.1"
            value={form.carbs}
            onChange={(e) => set('carbs', e.target.value)}
          />
        </div>

        <div className="form-row">
          <label className="lbl" htmlFor="cf-fat">
            Fat g ({unit})
          </label>
          <input
            id="cf-fat"
            type="number"
            min="0"
            step="0.1"
            value={form.fat}
            onChange={(e) => set('fat', e.target.value)}
          />
        </div>

        <div className="form-row">
          <label className="lbl" htmlFor="cf-label">
            Portion name
          </label>
          <input
            id="cf-label"
            type="text"
            placeholder="e.g. 1 ladle"
            value={form.servingLabel}
            onChange={(e) => set('servingLabel', e.target.value)}
          />
        </div>
      </div>

      <div className="preview-actions">
        <button className="btn btn-primary" onClick={submit}>
          Save and add to meal
        </button>
      </div>
    </div>
  );
}
