import { ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { ACTIVITY_LABELS, bmi, bmiLabel, computeTargets } from '../lib/profile';
import type { Activity, GoalType, Profile, Sex } from '../lib/types';
import { MACRO_COLORS } from './MacroBars';
import NumberField from './NumberField';

const GOAL_LABELS: Record<GoalType, string> = {
  lose: 'Lose weight',
  maintain: 'Stay the same',
  gain: 'Gain weight',
};

const RATES: { value: number; label: string }[] = [
  { value: 0.25, label: 'Slow' },
  { value: 0.5, label: 'Moderate' },
  { value: 0.75, label: 'Fast' },
  { value: 1, label: 'Very fast' },
];
const RECOMMENDED_RATE = 0.5;

interface Props {
  profile: Profile;
  onSave: (profile: Profile) => void;
}

/**
 * Editing is local until Save, so a half-typed height never rewrites the day's
 * targets underneath you.
 */
export default function ProfileForm({ profile, onSave }: Props) {
  const [draft, setDraft] = useState<Profile>(profile);
  const [saved, setSaved] = useState(false);
  const [overrideOn, setOverrideOn] = useState(profile.calorieOverride !== null);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  function set<K extends keyof Profile>(key: K, value: Profile[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  const preview = computeTargets({
    ...draft,
    calorieOverride: overrideOn ? draft.calorieOverride : null,
  });
  const bodyMass = bmi(draft);
  const delta = Math.round(preview.kcal - preview.tdee);

  return (
    <div>
      <p className="hint">
        Used to work out how many calories you need. Nothing leaves your device.
      </p>

      {saved && <div className="alert alert-ok">Profile saved. Targets updated.</div>}

      <div className="form-grid">
        <div className="form-row full">
          <label className="lbl" htmlFor="p-name">
            Name (optional)
          </label>
          <input
            id="p-name"
            type="text"
            value={draft.name}
            onChange={(e) => set('name', e.target.value)}
          />
        </div>

        <div className="form-row">
          <label className="lbl" htmlFor="p-sex">
            Sex
          </label>
          <select
            id="p-sex"
            value={draft.sex}
            onChange={(e) => set('sex', e.target.value as Sex)}
          >
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </div>

        <div className="form-row">
          <label className="lbl" htmlFor="p-age">
            Age
          </label>
          <NumberField
            id="p-age"
            min={13}
            max={100}
            value={draft.age}
            onCommit={(n) => set('age', n)}
          />
        </div>

        <div className="form-row">
          <label className="lbl" htmlFor="p-height">
            Height (cm)
          </label>
          <NumberField
            id="p-height"
            min={120}
            max={220}
            value={draft.heightCm}
            onCommit={(n) => set('heightCm', n)}
          />
        </div>

        <div className="form-row">
          <label className="lbl" htmlFor="p-weight">
            Weight (kg)
          </label>
          <NumberField
            id="p-weight"
            min={30}
            max={300}
            step="0.1"
            inputMode="decimal"
            value={draft.weightKg}
            onCommit={(n) => set('weightKg', n)}
          />
        </div>

        <div className="form-row full">
          <label className="lbl" htmlFor="p-activity">
            Activity level
          </label>
          <select
            id="p-activity"
            value={draft.activity}
            onChange={(e) => set('activity', e.target.value as Activity)}
          >
            {(Object.keys(ACTIVITY_LABELS) as Activity[]).map((key) => (
              <option key={key} value={key}>
                {ACTIVITY_LABELS[key]}
              </option>
            ))}
          </select>
        </div>

        <div className="form-row full">
          <label className="lbl" htmlFor="p-goal">
            Your goal
          </label>
          <select
            id="p-goal"
            value={draft.goal}
            onChange={(e) => set('goal', e.target.value as GoalType)}
          >
            {(Object.keys(GOAL_LABELS) as GoalType[]).map((key) => (
              <option key={key} value={key}>
                {GOAL_LABELS[key]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {draft.goal !== 'maintain' && (
        <div className="rate-picker">
          <p className="subhead" style={{ marginTop: 'var(--space-5)' }}>
            How fast do you want to {draft.goal === 'gain' ? 'gain' : 'lose'} weight?
          </p>
          {RATES.map((rate) => (
            <button
              key={rate.value}
              className={`rate-option${draft.rateKgPerWeek === rate.value ? ' selected' : ''}`}
              onClick={() => set('rateKgPerWeek', rate.value)}
              aria-pressed={draft.rateKgPerWeek === rate.value}
            >
              <span className="rate-radio" aria-hidden="true" />
              <span className="rate-body">
                <span className="rate-label">
                  {rate.label}
                  {rate.value === RECOMMENDED_RATE && (
                    <span className="badge-recommended">Recommended</span>
                  )}
                </span>
                <span className="rate-sub">{rate.value} kg/week</span>
              </span>
            </button>
          ))}
        </div>
      )}

      <div className="target-hero">
        <p className="subhead" style={{ marginTop: 0 }}>
          Daily calorie target
        </p>
        <div className="target-hero-num">{preview.kcal} kcal</div>
        {draft.goal !== 'maintain' && (
          <p className="hint" style={{ marginBottom: 0 }}>
            You'll eat about {Math.abs(delta)} kcal {delta >= 0 ? 'above' : 'below'} maintenance.
          </p>
        )}
      </div>

      {preview.floored && (
        <div className="alert alert-info">
          <strong>Target raised to a safe minimum</strong>
          That rate would put you under {draft.sex === 'female' ? 1200 : 1500} kcal a day. Eat this
          instead, or pick a slower rate. Very low intakes need medical supervision.
        </div>
      )}

      <div className="switch-row">
        <div className="switch-body">
          <div className="switch-title">Set my own calorie target</div>
          <div className="switch-sub">Ignore the calculation and use a number you choose.</div>
        </div>
        <button
          className="switch"
          role="switch"
          aria-checked={overrideOn}
          aria-label="Set my own calorie target"
          onClick={() => {
            const next = !overrideOn;
            setOverrideOn(next);
            set('calorieOverride', next ? preview.kcal : null);
          }}
        />
      </div>

      {overrideOn && (
        <div className="form-row" style={{ marginTop: 'var(--space-1)' }}>
          <label className="lbl" htmlFor="p-override">
            My calorie target
          </label>
          <NumberField
            id="p-override"
            min={1000}
            max={6000}
            step="50"
            value={draft.calorieOverride ?? preview.kcal}
            onCommit={(n) => set('calorieOverride', n)}
          />
        </div>
      )}

      <p className="subhead">Daily macros</p>
      <div className="target-macros">
        <div className="target-macro-row">
          <span className="macro-name">
            <i className="swatch" style={{ background: MACRO_COLORS.protein }} />
            Protein
          </span>
          <b>{preview.protein} g</b>
        </div>
        <div className="target-macro-row">
          <span className="macro-name">
            <i className="swatch" style={{ background: MACRO_COLORS.carbs }} />
            Carbs
          </span>
          <b>{preview.carbs} g</b>
        </div>
        <div className="target-macro-row">
          <span className="macro-name">
            <i className="swatch" style={{ background: MACRO_COLORS.fat }} />
            Fat
          </span>
          <b>{preview.fat} g</b>
        </div>
      </div>

      <button
        className="advanced-toggle"
        onClick={() => setAdvancedOpen((v) => !v)}
        aria-expanded={advancedOpen}
      >
        {advancedOpen ? <ChevronDown aria-hidden="true" /> : <ChevronRight aria-hidden="true" />}
        Advanced details
      </button>

      {advancedOpen && (
        <div>
          <div className="readout">
            <div>
              <b>{preview.tdee}</b>
              <span>Maintain</span>
            </div>
            <div>
              <b>{preview.bmr}</b>
              <span>At rest (BMR)</span>
            </div>
            <div>
              <b>{bodyMass.toFixed(1)}</b>
              <span>BMI</span>
            </div>
          </div>
          <p className="sub">
            BMI {bodyMass.toFixed(1)} is in the {bmiLabel(bodyMass).toLowerCase()} range. Calories
            are calculated with the Mifflin-St Jeor formula and a standard activity multiplier for
            your activity level.
          </p>
        </div>
      )}

      <div className="preview-actions">
        <button
          className="btn btn-primary"
          onClick={() => {
            onSave({
              ...draft,
              calorieOverride: overrideOn ? draft.calorieOverride ?? preview.kcal : null,
              configured: true,
            });
            setSaved(true);
          }}
        >
          Save profile
        </button>
      </div>
    </div>
  );
}
