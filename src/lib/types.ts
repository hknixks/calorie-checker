export type Category =
  | 'swallow'
  | 'rice'
  | 'soup'
  | 'stew'
  | 'beans'
  | 'yam-plantain'
  | 'protein'
  | 'snack'
  | 'breakfast'
  | 'drink'
  | 'fruit-veg'
  | 'side'
  | 'packaged'
  | 'custom';

export interface Nutrients {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface Serving {
  /** How a Nigerian eater would describe it: "1 wrap", "1 ladle", "1 plate". */
  label: string;
  grams: number;
}

export interface Food {
  id: string;
  name: string;
  /** Extra spellings and local names, used to match whatever the AI calls it. */
  aliases: string[];
  category: Category;
  /** Per 100 g as eaten (cooked, with the oil it is normally cooked in). */
  per100g: Nutrients;
  /** First serving is the default. */
  servings: Serving[];
  note?: string;
  /** Set on foods the user created or pulled in from a barcode. */
  custom?: boolean;
  brand?: string;
  barcode?: string;
}

export type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export const MEAL_SLOTS: MealSlot[] = ['breakfast', 'lunch', 'dinner', 'snack'];

export const SLOT_LABELS: Record<MealSlot, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snacks',
};

/**
 * One line in a meal. Nutrition is snapshotted from the food at the moment it is
 * added, so editing or deleting a food later never rewrites past days.
 */
export interface MealItem {
  key: string;
  foodId: string;
  foodName: string;
  per100g: Nutrients;
  grams: number;
  /** Which named serving is selected, or null when grams were typed by hand. */
  servingLabel: string | null;
  quantity: number;
  /** What the AI called it, kept so you can see what it guessed. */
  detectedAs?: string;
  confidence?: 'high' | 'medium' | 'low';
}

export type EntrySource = 'photo' | 'search' | 'barcode' | 'custom';

export interface LogEntry {
  id: string;
  /** Local calendar day, YYYY-MM-DD. */
  date: string;
  savedAt: string;
  slot: MealSlot;
  items: MealItem[];
  totals: Nutrients;
  imageThumb?: string;
  source: EntrySource;
}

export type Sex = 'male' | 'female';
export type Activity = 'sedentary' | 'light' | 'moderate' | 'active' | 'very-active';
export type GoalType = 'lose' | 'maintain' | 'gain';

export interface Profile {
  name: string;
  sex: Sex;
  age: number;
  heightCm: number;
  weightKg: number;
  activity: Activity;
  goal: GoalType;
  /** kg per week to lose or gain. Ignored when goal is maintain. */
  rateKgPerWeek: number;
  /** When set, replaces the calculated calorie target. */
  calorieOverride: number | null;
  /** False until the user saves the form once. */
  configured: boolean;
}

export interface Targets extends Nutrients {
  bmr: number;
  tdee: number;
  /** True when the calculated target was raised to the safe minimum. */
  floored: boolean;
}

export interface WeightEntry {
  id: string;
  date: string;
  kg: number;
}

export interface Reminder {
  id: string;
  label: string;
  /** 24h "HH:MM". */
  time: string;
  /** 0 = Sunday. */
  days: number[];
  enabled: boolean;
}

export type ThemeMode = 'system' | 'light' | 'dark';

export interface Settings {
  theme: ThemeMode;
  waterTargetMl: number;
  waterGlassMl: number;
}

/** Raw shape we ask Gemini to return. */
export interface DetectedFood {
  name: string;
  portion_description: string;
  estimated_grams: number;
  confidence: 'high' | 'medium' | 'low';
}
