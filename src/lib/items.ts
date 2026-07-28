import type { DetectedFood, Food, MealItem, Serving } from './types';

export function uid(): string {
  return crypto.randomUUID?.() ?? `id-${Math.random().toString(36).slice(2)}`;
}

/** Used for foods that arrive without a serving list, e.g. from a barcode. */
const GENERIC_SERVINGS: Serving[] = [
  { label: '1 serving (100 g)', grams: 100 },
  { label: 'Half (50 g)', grams: 50 },
  { label: '1 pack (250 g)', grams: 250 },
];

export function servingsFor(food: Food | undefined): Serving[] {
  return food?.servings?.length ? food.servings : GENERIC_SERVINGS;
}

export function itemFromFood(food: Food): MealItem {
  const serving = servingsFor(food)[0];
  return {
    key: uid(),
    foodId: food.id,
    foodName: food.name,
    per100g: food.per100g,
    grams: serving.grams,
    servingLabel: serving.label,
    quantity: 1,
  };
}

/** A detected food becomes a row using the AI's gram estimate directly. */
export function itemFromDetection(detected: DetectedFood, food: Food): MealItem {
  return {
    key: uid(),
    foodId: food.id,
    foodName: food.name,
    per100g: food.per100g,
    grams: detected.estimated_grams,
    servingLabel: null,
    quantity: 1,
    detectedAs: detected.name,
    confidence: detected.confidence,
  };
}
