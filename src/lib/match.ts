import type { Food } from './types';

/** Words that carry no signal when matching "1 plate of jollof rice with chicken". */
const NOISE = new Set([
  'with', 'and', 'of', 'the', 'a', 'an', 'some', 'plate', 'serving', 'portion',
  'piece', 'pieces', 'cup', 'bowl', 'wrap', 'slice', 'slices', 'side', 'plus',
  'nigerian', 'african', 'homemade', 'fresh', 'cooked', 'dish', 'meal', 'style',
]);

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokens(s: string): string[] {
  return normalize(s)
    .split(' ')
    .filter((t) => t.length > 1 && !NOISE.has(t));
}

function includesPhrase(haystack: string, needle: string): boolean {
  return ` ${haystack} `.includes(` ${needle} `);
}

/** Dice coefficient over meaningful tokens. */
function tokenOverlap(a: string[], b: string[]): number {
  if (!a.length || !b.length) return 0;
  const setB = new Set(b);
  let shared = 0;
  for (const t of new Set(a)) {
    if (setB.has(t)) shared += 1;
  }
  return (2 * shared) / (new Set(a).size + setB.size);
}

/**
 * How well a food matches a free-text name. 0–100, where anything under
 * MATCH_THRESHOLD is treated as "we don't have this food".
 */
function scoreFood(query: string, food: Food): number {
  const qNorm = normalize(query);
  const qTokens = tokens(query);
  if (!qNorm) return 0;

  let best = 0;
  for (const candidate of [food.name, ...food.aliases]) {
    const cNorm = normalize(candidate);
    const cTokens = tokens(candidate);

    if (qNorm === cNorm) {
      best = Math.max(best, 100);
      continue;
    }
    // "jollof rice with chicken" contains the alias "jollof rice".
    if (includesPhrase(qNorm, cNorm)) {
      best = Math.max(best, 75 + Math.min(cNorm.length, 20));
      continue;
    }
    // Query is a fragment of a longer name: "egusi" vs "egusi soup".
    if (includesPhrase(cNorm, qNorm)) {
      best = Math.max(best, 68 + Math.min(qNorm.length, 20));
      continue;
    }
    best = Math.max(best, tokenOverlap(qTokens, cTokens) * 65);
  }
  return best;
}

const MATCH_THRESHOLD = 34;

interface MatchResult {
  food: Food;
  score: number;
}

/** Best food for an AI-detected name, or null if nothing is close. */
export function matchFood(query: string, foods: Food[]): MatchResult | null {
  let best: MatchResult | null = null;
  for (const food of foods) {
    const score = scoreFood(query, food);
    if (!best || score > best.score) best = { food, score };
  }
  if (!best || best.score < MATCH_THRESHOLD) return null;
  return best;
}

/** Ranked results for the search box. An empty query returns everything. */
export function searchFoods(query: string, foods: Food[], limit = 60): Food[] {
  if (!normalize(query)) return foods.slice(0, limit);
  return foods
    .map((food) => ({ food, score: scoreFood(query, food) }))
    .filter((r) => r.score >= 20)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((r) => r.food);
}
