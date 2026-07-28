import {
  Bell,
  Camera,
  ChevronDown,
  ChevronRight,
  Database,
  Download,
  GlassWater,
  Info,
  Moon,
  Trash2,
  User,
  UtensilsCrossed,
  type LucideIcon,
} from 'lucide-react';
import { useState } from 'react';
import NumberField from '../components/NumberField';
import ProfileForm from '../components/ProfileForm';
import RemindersEditor from '../components/RemindersEditor';
import { FOODS } from '../data/foods';
import { HAS_GEMINI_KEY } from '../lib/env';
import { suggestedWaterMl } from '../lib/profile';
import { useStore } from '../lib/store';
import { exportState } from '../lib/storage';
import type { ThemeMode } from '../lib/types';

const THEMES: { value: ThemeMode; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

type RowKey = 'profile' | 'water' | 'notifications' | 'foods' | 'about';

interface RowProps {
  id: RowKey;
  icon: LucideIcon;
  title: string;
  sub?: string;
  value?: string;
  expanded: RowKey | null;
  onToggle: (id: RowKey) => void;
}

function ExpandableRow({ id, icon: Icon, title, sub, value, expanded, onToggle }: RowProps) {
  const isOpen = expanded === id;
  return (
    <button
      className={`settings-row${isOpen ? ' expanded' : ''}`}
      onClick={() => onToggle(id)}
      aria-expanded={isOpen}
    >
      <span className="row-icon">
        <Icon aria-hidden="true" />
      </span>
      <span className="row-body">
        <span className="row-title">{title}</span>
        {sub && <span className="row-sub">{sub}</span>}
      </span>
      {value && <span className="row-value">{value}</span>}
      <span className="row-chevron">
        {isOpen ? <ChevronDown aria-hidden="true" /> : <ChevronRight aria-hidden="true" />}
      </span>
    </button>
  );
}

export default function SettingsScreen() {
  const { state, dispatch } = useStore();
  const { settings, profile, customFoods } = state;
  const [expanded, setExpanded] = useState<RowKey | null>(null);

  function toggle(id: RowKey) {
    setExpanded((prev) => (prev === id ? null : id));
  }

  function download() {
    const blob = new Blob([exportState(state)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `calorie-checker-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div className="settings-group">
        <p className="group-label">Preferences</p>
        <div className="group-body">
          <ExpandableRow
            id="profile"
            icon={User}
            title="Profile & goals"
            sub={profile.configured ? `${profile.weightKg} kg · ${profile.goal}` : 'Not set up'}
            expanded={expanded}
            onToggle={toggle}
          />
          {expanded === 'profile' && (
            <div className="settings-panel">
              <ProfileForm
                profile={profile}
                onSave={(next) => dispatch({ type: 'profile/set', profile: next })}
              />
            </div>
          )}

          <ExpandableRow
            id="water"
            icon={GlassWater}
            title="Water target"
            value={`${(settings.waterTargetMl / 1000).toFixed(1)} L`}
            expanded={expanded}
            onToggle={toggle}
          />
          {expanded === 'water' && (
            <div className="settings-panel">
              <p className="hint">
                A rough guide for your weight is {suggestedWaterMl(profile.weightKg)} ml a day.
                Drink more in the heat or when training.
              </p>
              <div className="form-grid">
                <div className="form-row">
                  <label className="lbl" htmlFor="s-water">
                    Daily target (ml)
                  </label>
                  <NumberField
                    id="s-water"
                    min={500}
                    max={6000}
                    step="100"
                    value={settings.waterTargetMl}
                    onCommit={(ml) =>
                      dispatch({ type: 'settings/set', settings: { ...settings, waterTargetMl: ml } })
                    }
                  />
                </div>
                <div className="form-row">
                  <label className="lbl" htmlFor="s-glass">
                    Glass size (ml)
                  </label>
                  <NumberField
                    id="s-glass"
                    min={100}
                    max={1000}
                    step="50"
                    value={settings.waterGlassMl}
                    onCommit={(ml) =>
                      dispatch({ type: 'settings/set', settings: { ...settings, waterGlassMl: ml } })
                    }
                  />
                </div>
              </div>
            </div>
          )}

          <ExpandableRow
            id="notifications"
            icon={Bell}
            title="Notifications"
            sub="Meal reminders"
            value={`${state.reminders.filter((r) => r.enabled).length} on`}
            expanded={expanded}
            onToggle={toggle}
          />
          {expanded === 'notifications' && (
            <div className="settings-panel">
              <RemindersEditor
                reminders={state.reminders}
                onUpsert={(reminder) => dispatch({ type: 'reminder/upsert', reminder })}
                onDelete={(id) => dispatch({ type: 'reminder/delete', id })}
              />
            </div>
          )}

          <div className="settings-row">
            <span className="row-icon">
              <Moon aria-hidden="true" />
            </span>
            <span className="row-body">
              <span className="row-title">Dark mode</span>
            </span>
            <div className="segmented" style={{ margin: 0 }} role="tablist" aria-label="Theme">
              {THEMES.map((theme) => (
                <button
                  key={theme.value}
                  role="tab"
                  aria-selected={settings.theme === theme.value}
                  onClick={() =>
                    dispatch({ type: 'settings/set', settings: { ...settings, theme: theme.value } })
                  }
                >
                  {theme.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="settings-group">
        <p className="group-label">Data</p>
        <div className="group-body">
          <ExpandableRow
            id="foods"
            icon={UtensilsCrossed}
            title="Your foods"
            sub="Custom foods and scanned barcodes"
            value={String(customFoods.length)}
            expanded={expanded}
            onToggle={toggle}
          />
          {expanded === 'foods' && (
            <div className="settings-panel">
              {customFoods.length === 0 ? (
                <p className="empty" style={{ padding: 'var(--space-4) 0' }}>
                  None yet. Create one from the Log tab, or scan a barcode.
                </p>
              ) : (
                customFoods.map((food) => (
                  <div className="list-row" key={food.id}>
                    <span className="grow">
                      {food.name}
                      <br />
                      <span className="dim">
                        {food.per100g.kcal} kcal/100g
                        {food.barcode ? ` · barcode ${food.barcode}` : ''}
                      </span>
                    </span>
                    <button
                      className="item-remove"
                      aria-label={`Delete ${food.name}`}
                      onClick={() => dispatch({ type: 'food/delete', id: food.id })}
                    >
                      <Trash2 aria-hidden="true" />
                    </button>
                  </div>
                ))
              )}
              <p className="sub">
                Deleting a food here doesn't change meals you already logged. Those keep their own
                copy of the numbers.
              </p>
            </div>
          )}

          <button className="settings-row" onClick={download}>
            <span className="row-icon">
              <Download aria-hidden="true" />
            </span>
            <span className="row-body">
              <span className="row-title">Export data</span>
              <span className="row-sub">Download a backup as a file</span>
            </span>
          </button>

          <button
            className="settings-row"
            onClick={() => {
              if (
                window.confirm(
                  'Delete everything: profile, meals, weight, water and your foods? This cannot be undone.',
                )
              ) {
                dispatch({ type: 'state/reset' });
              }
            }}
          >
            <span className="row-icon" style={{ color: 'var(--danger)' }}>
              <Trash2 aria-hidden="true" />
            </span>
            <span className="row-body">
              <span className="row-title" style={{ color: 'var(--danger)' }}>
                Delete all data
              </span>
              <span className="row-sub">
                {state.entries.length} meal{state.entries.length === 1 ? '' : 's'} ·{' '}
                {state.weights.length} weight reading{state.weights.length === 1 ? '' : 's'}
              </span>
            </span>
          </button>
        </div>
      </div>

      <div className="settings-group">
        <p className="group-label">About</p>
        <div className="group-body">
          <div className="settings-row">
            <span className="row-icon">
              <Camera aria-hidden="true" />
            </span>
            <span className="row-body">
              <span className="row-title">Photo scanning</span>
              <span className="row-sub">Identify food from a picture</span>
            </span>
            <span className={`status-pill ${HAS_GEMINI_KEY ? 'on' : 'off'}`}>
              {HAS_GEMINI_KEY ? 'Available' : 'Unavailable'}
            </span>
          </div>

          <ExpandableRow
            id="about"
            icon={Info}
            title="About the numbers"
            expanded={expanded}
            onToggle={toggle}
          />
          {expanded === 'about' && (
            <div className="settings-panel">
              <p className="hint">
                <strong>{FOODS.length} Nigerian and West African foods</strong>, with calories and
                macros per 100 g as eaten, including the oil dishes are normally cooked in.
              </p>
              <p className="hint">
                Values are compiled estimates. Ingredient figures follow standard composition
                tables and composite dishes such as jollof, egusi and ayamase are calculated from
                typical home recipes. Your plate can easily sit 20% either side of these figures,
                and a buka portion is not a home portion.
              </p>
              <p className="hint" style={{ marginBottom: 0 }}>
                Calorie targets use the Mifflin-St Jeor equation with standard activity
                multipliers. This is a food diary, not a medical or dietary tool, and not advice.
                Talk to a doctor or dietitian before making big changes, especially if you are
                pregnant, diabetic or managing a health condition.
              </p>
            </div>
          )}

          <div className="settings-row">
            <span className="row-icon">
              <Database aria-hidden="true" />
            </span>
            <span className="row-body">
              <span className="row-title">Your data stays on this device</span>
              <span className="row-sub">Nothing is uploaded except a photo you choose to scan</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
