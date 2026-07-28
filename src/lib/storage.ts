import { FOODS } from '../data/foods';
import { dateKey } from './dates';
import { suggestedWaterMl } from './profile';
import type {
  Food,
  LogEntry,
  MealItem,
  MealSlot,
  Profile,
  Reminder,
  Settings,
  WeightEntry,
} from './types';

const STATE_KEY = 'calorie-checker.state.v2';
/** The single-list history from the first version of the app. */
const LEGACY_HISTORY_KEY = 'calorie-checker.history.v1';
const LEGACY_SETTINGS_KEY = 'calorie-checker.settings.v1';

export interface AppState {
  profile: Profile;
  settings: Settings;
  entries: LogEntry[];
  weights: WeightEntry[];
  /** Millilitres drunk, keyed by YYYY-MM-DD. */
  water: Record<string, number>;
  customFoods: Food[];
  reminders: Reminder[];
}

export const DEFAULT_PROFILE: Profile = {
  name: '',
  sex: 'male',
  age: 28,
  heightCm: 172,
  weightKg: 75,
  activity: 'light',
  goal: 'maintain',
  rateKgPerWeek: 0.5,
  calorieOverride: null,
  configured: false,
};

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  waterTargetMl: suggestedWaterMl(DEFAULT_PROFILE.weightKg),
  waterGlassMl: 250,
};

export const DEFAULT_REMINDERS: Reminder[] = [
  { id: 'r-breakfast', label: 'Log your breakfast', time: '09:00', days: [0, 1, 2, 3, 4, 5, 6], enabled: false },
  { id: 'r-lunch', label: 'Log your lunch', time: '14:00', days: [0, 1, 2, 3, 4, 5, 6], enabled: false },
  { id: 'r-dinner', label: 'Log your dinner', time: '20:00', days: [0, 1, 2, 3, 4, 5, 6], enabled: false },
];

export const EMPTY_STATE: AppState = {
  profile: { ...DEFAULT_PROFILE },
  settings: { ...DEFAULT_SETTINGS },
  entries: [],
  weights: [],
  water: {},
  customFoods: [],
  reminders: DEFAULT_REMINDERS.map((r) => ({ ...r })),
};

function slotForHour(hour: number): MealSlot {
  if (hour < 11) return 'breakfast';
  if (hour < 16) return 'lunch';
  if (hour < 22) return 'dinner';
  return 'snack';
}

/**
 * v1 rows referenced foods by id only and had no date or meal slot. Rebuild what
 * we can from the built-in table and drop anything unresolvable.
 */
interface LegacyMigration {
  entries: LogEntry[];
  /** The old single daily goal, carried over as an explicit override. */
  calorieOverride: number | null;
}

function migrateLegacy(): LegacyMigration | null {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(LEGACY_HISTORY_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;

  const byId = new Map(FOODS.map((f) => [f.id, f]));
  let legacy: unknown;
  try {
    legacy = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!Array.isArray(legacy)) return null;

  const entries: LogEntry[] = [];
  for (const row of legacy as Record<string, unknown>[]) {
    const savedAt = typeof row.savedAt === 'string' ? row.savedAt : new Date().toISOString();
    const when = new Date(savedAt);
    const items: MealItem[] = [];
    for (const rawItem of (row.items as Record<string, unknown>[]) ?? []) {
      const food = byId.get(String(rawItem.foodId));
      if (!food) continue;
      items.push({
        key: String(rawItem.key ?? Math.random().toString(36).slice(2)),
        foodId: food.id,
        foodName: food.name,
        per100g: food.per100g,
        grams: Number(rawItem.grams) || food.servings[0].grams,
        servingLabel:
          typeof rawItem.servingLabel === 'string' ? rawItem.servingLabel : null,
        quantity: Number(rawItem.quantity) || 1,
        detectedAs: typeof rawItem.detectedAs === 'string' ? rawItem.detectedAs : undefined,
      });
    }
    if (!items.length) continue;
    entries.push({
      id: String(row.id ?? Math.random().toString(36).slice(2)),
      date: dateKey(when),
      savedAt,
      slot: slotForHour(when.getHours()),
      items,
      totals: items.reduce(
        (acc, i) => ({
          kcal: acc.kcal + (i.per100g.kcal * i.grams) / 100,
          protein: acc.protein + (i.per100g.protein * i.grams) / 100,
          carbs: acc.carbs + (i.per100g.carbs * i.grams) / 100,
          fat: acc.fat + (i.per100g.fat * i.grams) / 100,
        }),
        { kcal: 0, protein: 0, carbs: 0, fat: 0 },
      ),
      imageThumb: typeof row.imageThumb === 'string' ? row.imageThumb : undefined,
      source: 'photo',
    });
  }

  let calorieOverride: number | null = null;
  try {
    const rawSettings = localStorage.getItem(LEGACY_SETTINGS_KEY);
    if (rawSettings) {
      const parsed = JSON.parse(rawSettings) as { dailyGoal?: number };
      if (typeof parsed.dailyGoal === 'number' && parsed.dailyGoal > 0) {
        calorieOverride = parsed.dailyGoal;
      }
    }
  } catch {
    // Nothing worth reporting.
  }

  return entries.length ? { entries, calorieOverride } : null;
}

/** Merge stored JSON over defaults so a partial or older object still loads. */
export function loadState(): AppState {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(STATE_KEY);
  } catch {
    return { ...EMPTY_STATE };
  }

  if (!raw) {
    const migrated = migrateLegacy();
    if (migrated) {
      return {
        ...EMPTY_STATE,
        profile: { ...DEFAULT_PROFILE, calorieOverride: migrated.calorieOverride },
        entries: migrated.entries,
      };
    }
    return { ...EMPTY_STATE };
  }

  try {
    const parsed = JSON.parse(raw) as Partial<AppState>;
    return {
      profile: { ...DEFAULT_PROFILE, ...(parsed.profile ?? {}) },
      settings: { ...DEFAULT_SETTINGS, ...(parsed.settings ?? {}) },
      entries: Array.isArray(parsed.entries) ? parsed.entries : [],
      weights: Array.isArray(parsed.weights) ? parsed.weights : [],
      water:
        parsed.water && typeof parsed.water === 'object'
          ? (parsed.water as Record<string, number>)
          : {},
      customFoods: Array.isArray(parsed.customFoods) ? parsed.customFoods : [],
      reminders: Array.isArray(parsed.reminders) && parsed.reminders.length
        ? parsed.reminders
        : DEFAULT_REMINDERS.map((r) => ({ ...r })),
    };
  } catch {
    return { ...EMPTY_STATE };
  }
}

const MAX_ENTRIES = 500;

export function saveState(state: AppState): void {
  const trimmed: AppState = { ...state, entries: state.entries.slice(0, MAX_ENTRIES) };
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify(trimmed));
  } catch {
    // Photo thumbnails are the only bulky part — drop them rather than lose the log.
    try {
      localStorage.setItem(
        STATE_KEY,
        JSON.stringify({
          ...trimmed,
          entries: trimmed.entries.map(({ imageThumb: _thumb, ...e }) => e),
        }),
      );
    } catch {
      // Out of room even without images; keep running with in-memory state.
    }
  }
}

export function clearState(): void {
  try {
    localStorage.removeItem(STATE_KEY);
    localStorage.removeItem(LEGACY_HISTORY_KEY);
    localStorage.removeItem(LEGACY_SETTINGS_KEY);
  } catch {
    // Nothing useful to do.
  }
}

export function exportState(state: AppState): string {
  return JSON.stringify(state, null, 2);
}
