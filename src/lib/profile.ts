import type { Activity, Profile, Targets } from './types';

const ACTIVITY_FACTORS: Record<Activity, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  'very-active': 1.9,
};

export const ACTIVITY_LABELS: Record<Activity, string> = {
  sedentary: 'Sedentary — desk job, little exercise',
  light: 'Lightly active — 1–3 days a week',
  moderate: 'Moderately active — 3–5 days a week',
  active: 'Very active — 6–7 days a week',
  'very-active': 'Extra active — hard training or manual work',
};

/** 1 kg of body fat is about 7700 kcal, so 1 kg/week is about 1100 kcal/day. */
const KCAL_PER_KG_PER_WEEK = 1100;

/** Below these the target stops being sensible without supervision. */
const FLOOR: Record<Profile['sex'], number> = { male: 1500, female: 1200 };

/** Mifflin-St Jeor — the standard estimate, and the one most apps use. */
function bmr(profile: Profile): number {
  const base =
    10 * profile.weightKg + 6.25 * profile.heightCm - 5 * profile.age;
  return profile.sex === 'male' ? base + 5 : base - 161;
}

function tdee(profile: Profile): number {
  return bmr(profile) * ACTIVITY_FACTORS[profile.activity];
}

/**
 * Calorie and macro targets. Protein is set per kg of bodyweight (higher when
 * cutting, to protect muscle), fat takes ~27% of calories, and carbs get what is
 * left — which suits a rice-and-swallow diet.
 */
export function computeTargets(profile: Profile): Targets {
  const bmrValue = bmr(profile);
  const tdeeValue = tdee(profile);

  let raw = tdeeValue;
  if (profile.goal === 'lose') raw -= profile.rateKgPerWeek * KCAL_PER_KG_PER_WEEK;
  if (profile.goal === 'gain') raw += profile.rateKgPerWeek * KCAL_PER_KG_PER_WEEK;

  const floor = FLOOR[profile.sex];
  const floored = profile.calorieOverride === null && raw < floor;
  const kcal = Math.round(profile.calorieOverride ?? Math.max(raw, floor));

  const proteinPerKg = profile.goal === 'lose' ? 2 : 1.7;
  let protein = Math.round(profile.weightKg * proteinPerKg);
  // Never let protein alone eat more than 40% of the budget.
  protein = Math.min(protein, Math.round((kcal * 0.4) / 4));

  const fat = Math.round((kcal * 0.27) / 9);
  const carbs = Math.max(50, Math.round((kcal - protein * 4 - fat * 9) / 4));

  return {
    kcal,
    protein,
    carbs,
    fat,
    bmr: Math.round(bmrValue),
    tdee: Math.round(tdeeValue),
    floored,
  };
}

/** Rough hydration guide: 35 ml per kg, rounded to the nearest 100 ml. */
export function suggestedWaterMl(weightKg: number): number {
  return Math.round((weightKg * 35) / 100) * 100;
}

export function bmi(profile: Profile): number {
  const m = profile.heightCm / 100;
  return profile.weightKg / (m * m);
}

export function bmiLabel(value: number): string {
  if (value < 18.5) return 'Underweight';
  if (value < 25) return 'Healthy range';
  if (value < 30) return 'Overweight';
  return 'Obese';
}
