import {
  Calendar,
  Camera,
  ChevronLeft,
  ChevronRight,
  Coffee,
  Cookie,
  PenLine,
  Plus,
  ScanBarcode,
  Search,
  Soup,
  UtensilsCrossed,
  X,
  type LucideIcon,
} from 'lucide-react';
import CalorieRing from '../components/CalorieRing';
import MacroBars from '../components/MacroBars';
import PromptBanner from '../components/PromptBanner';
import WaterCard from '../components/WaterCard';
import { addDays, dateKey, dayLabel, isToday, shortLabel, timeLabel } from '../lib/dates';
import { roundKcal, sumEntries } from '../lib/nutrition';
import { useStore } from '../lib/store';
import { MEAL_SLOTS, SLOT_LABELS, type LogEntry, type MealSlot } from '../lib/types';

const SLOT_ICONS: Record<MealSlot, LucideIcon> = {
  breakfast: Coffee,
  lunch: Soup,
  dinner: UtensilsCrossed,
  snack: Cookie,
};

const SOURCE_ICONS: Record<LogEntry['source'], LucideIcon> = {
  photo: Camera,
  search: Search,
  barcode: ScanBarcode,
  custom: PenLine,
};

interface Props {
  date: string;
  onDateChange: (date: string) => void;
  onGoAdd: (slot: MealSlot) => void;
}

export default function TodayScreen({ date, onDateChange, onGoAdd }: Props) {
  const { state, dispatch, targets, entriesByDate } = useStore();
  const entries = entriesByDate.get(date) ?? [];
  const totals = sumEntries(entries);
  const water = state.water[date] ?? 0;
  const future = date >= dateKey();

  return (
    <div>
      <div className="daynav">
        <button
          className="icon-btn"
          onClick={() => onDateChange(addDays(date, -1))}
          aria-label="Previous day"
        >
          <ChevronLeft aria-hidden="true" />
        </button>
        <div className="label">
          {dayLabel(date)}
          <small>{shortLabel(date)}</small>
        </div>
        <button
          className="icon-btn"
          onClick={() => onDateChange(addDays(date, 1))}
          disabled={future}
          aria-label="Next day"
        >
          <ChevronRight aria-hidden="true" />
        </button>
      </div>

      {!isToday(date) && (
        <PromptBanner
          icon={Calendar}
          actionLabel="Back to today"
          onAction={() => onDateChange(dateKey())}
        >
          Viewing {dayLabel(date).toLowerCase()}.
        </PromptBanner>
      )}

      <CalorieRing consumed={totals.kcal} target={targets.kcal} />

      <div className="card">
        <h2>Macros</h2>
        <MacroBars totals={totals} targets={targets} />
      </div>

      <WaterCard
        ml={water}
        targetMl={state.settings.waterTargetMl}
        glassMl={state.settings.waterGlassMl}
        onChange={(ml) => dispatch({ type: 'water/set', date, ml })}
      />

      <div className="section">
        <h2 className="section-title">Meals</h2>

        {MEAL_SLOTS.map((slot) => {
          const slotEntries = entries.filter((e) => e.slot === slot);
          const slotKcal = sumEntries(slotEntries).kcal;
          const SlotIcon = SLOT_ICONS[slot];
          return (
            <div className="slot" key={slot}>
              <div className="slot-head">
                <h3>{SLOT_LABELS[slot]}</h3>
                <span className="slot-kcal">
                  {slotEntries.length ? `${roundKcal(slotKcal)} kcal` : ''}
                </span>
              </div>

              {slotEntries.length === 0 ? (
                <div className="meal-empty">
                  <span className="meal-icon">
                    <SlotIcon aria-hidden="true" />
                  </span>
                  <span className="meal-empty-text">No meal added</span>
                  <button onClick={() => onGoAdd(slot)}>
                    <Plus aria-hidden="true" />
                    Add
                  </button>
                </div>
              ) : (
                slotEntries.map((entry) => {
                  const SourceIcon = SOURCE_ICONS[entry.source];
                  return (
                    <div className="entry" key={entry.id}>
                      {entry.imageThumb ? (
                        <img src={entry.imageThumb} alt="" />
                      ) : (
                        <div className="noimg">
                          <SourceIcon aria-hidden="true" />
                        </div>
                      )}
                      <div className="entry-body">
                        <div className="entry-title">
                          {entry.items.map((i) => i.foodName).join(', ') || 'Meal'}
                        </div>
                        <div className="entry-meta">
                          {timeLabel(entry.savedAt)} · {Math.round(entry.totals.protein)}P{' '}
                          {Math.round(entry.totals.carbs)}C {Math.round(entry.totals.fat)}F
                        </div>
                      </div>
                      <span className="entry-kcal">{roundKcal(entry.totals.kcal)}</span>
                      <button
                        className="item-remove"
                        aria-label="Delete this entry"
                        onClick={() => dispatch({ type: 'entry/delete', id: entry.id })}
                      >
                        <X aria-hidden="true" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          );
        })}
      </div>

      <p className="footnote">
        <strong>Estimates only.</strong> Calories come from a table of typical Nigerian portions,
        and a photo cannot show the oil at the bottom of the bowl. Useful for spotting patterns
        week to week, not a measurement, and not dietary advice.
      </p>
    </div>
  );
}
