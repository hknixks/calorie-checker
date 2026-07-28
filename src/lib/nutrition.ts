import type { LogEntry, MealItem, Nutrients } from './types';

export const EMPTY_TOTALS: Nutrients = { kcal: 0, protein: 0, carbs: 0, fat: 0 };

/** Nutrients for one row, scaling its snapshotted per-100 g figures by grams. */
export function itemNutrients(item: MealItem): Nutrients {
  const factor = item.grams / 100;
  return {
    kcal: item.per100g.kcal * factor,
    protein: item.per100g.protein * factor,
    carbs: item.per100g.carbs * factor,
    fat: item.per100g.fat * factor,
  };
}

export function addNutrients(a: Nutrients, b: Nutrients): Nutrients {
  return {
    kcal: a.kcal + b.kcal,
    protein: a.protein + b.protein,
    carbs: a.carbs + b.carbs,
    fat: a.fat + b.fat,
  };
}

export function sumNutrients(items: MealItem[]): Nutrients {
  return items.reduce<Nutrients>(
    (acc, item) => addNutrients(acc, itemNutrients(item)),
    { ...EMPTY_TOTALS },
  );
}

export function sumEntries(entries: LogEntry[]): Nutrients {
  return entries.reduce<Nutrients>((acc, e) => addNutrients(acc, e.totals), {
    ...EMPTY_TOTALS,
  });
}

export function roundKcal(kcal: number): number {
  return Math.round(kcal / 5) * 5;
}

export function roundGrams(g: number): number {
  return Math.round(g);
}

/**
 * Portion from a photo is a guess, so show a band rather than false precision.
 * ±20% matches how far a plate can drift from the recipe behind the table.
 */
export function kcalRange(kcal: number): [number, number] {
  return [roundKcal(kcal * 0.8), roundKcal(kcal * 1.2)];
}
