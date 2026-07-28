import { addDays, dateKey } from './dates';
import { EMPTY_TOTALS, addNutrients, sumEntries } from './nutrition';
import type { LogEntry, Nutrients, WeightEntry } from './types';

export interface DaySummary {
  date: string;
  totals: Nutrients;
  entryCount: number;
  waterMl: number;
}

export function daySummaries(
  dates: string[],
  entriesByDate: Map<string, LogEntry[]>,
  water: Record<string, number>,
): DaySummary[] {
  return dates.map((date) => {
    const entries = entriesByDate.get(date) ?? [];
    return {
      date,
      totals: sumEntries(entries),
      entryCount: entries.length,
      waterMl: water[date] ?? 0,
    };
  });
}

export interface WeeklyReport {
  start: string;
  end: string;
  daysLogged: number;
  /** Days whose calories landed within 10% of target. */
  daysOnTarget: number;
  daysUnder: number;
  daysOver: number;
  average: Nutrients;
  /** Average over logged days only — an unlogged day is missing data, not a zero. */
  avgWaterMl: number;
  weightChange: number | null;
  topFoods: { name: string; count: number }[];
}

export function weeklyReport(
  startDate: string,
  entriesByDate: Map<string, LogEntry[]>,
  water: Record<string, number>,
  weights: WeightEntry[],
  targetKcal: number,
): WeeklyReport {
  const dates: string[] = [];
  for (let i = 0; i < 7; i += 1) dates.push(addDays(startDate, i));
  const end = dates[dates.length - 1];

  const summaries = daySummaries(dates, entriesByDate, water);
  const logged = summaries.filter((d) => d.entryCount > 0);

  const totals = logged.reduce<Nutrients>(
    (acc, d) => addNutrients(acc, d.totals),
    { ...EMPTY_TOTALS },
  );
  const divisor = logged.length || 1;

  const lower = targetKcal * 0.9;
  const upper = targetKcal * 1.1;
  let daysOnTarget = 0;
  let daysUnder = 0;
  let daysOver = 0;
  for (const day of logged) {
    if (day.totals.kcal < lower) daysUnder += 1;
    else if (day.totals.kcal > upper) daysOver += 1;
    else daysOnTarget += 1;
  }

  const counts = new Map<string, number>();
  for (const date of dates) {
    for (const entry of entriesByDate.get(date) ?? []) {
      for (const item of entry.items) {
        counts.set(item.foodName, (counts.get(item.foodName) ?? 0) + 1);
      }
    }
  }
  const topFoods = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  const inRange = weights
    .filter((w) => w.date >= startDate && w.date <= end)
    .sort((a, b) => a.date.localeCompare(b.date));
  const weightChange =
    inRange.length >= 2 ? inRange[inRange.length - 1].kg - inRange[0].kg : null;

  const waterLogged = summaries.filter((d) => d.waterMl > 0);

  return {
    start: startDate,
    end,
    daysLogged: logged.length,
    daysOnTarget,
    daysUnder,
    daysOver,
    average: {
      kcal: totals.kcal / divisor,
      protein: totals.protein / divisor,
      carbs: totals.carbs / divisor,
      fat: totals.fat / divisor,
    },
    avgWaterMl: waterLogged.length
      ? waterLogged.reduce((sum, d) => sum + d.waterMl, 0) / waterLogged.length
      : 0,
    weightChange,
    topFoods,
  };
}

/** Consecutive days with at least one entry, counting back from today. */
export function loggingStreak(entriesByDate: Map<string, LogEntry[]>): number {
  let streak = 0;
  let cursor = dateKey();
  // Today not being logged yet shouldn't break yesterday's streak.
  if (!(entriesByDate.get(cursor)?.length ?? 0)) cursor = addDays(cursor, -1);
  while ((entriesByDate.get(cursor)?.length ?? 0) > 0) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}
